const express = require('express');
const { query } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');
const router = express.Router();

router.use(authenticateToken, requireRole('student', 'admin'));

const getStudentId = async (userId) => {
  const r = await query('SELECT id, class_id, current_semester, current_session FROM students WHERE user_id=$1', [userId]);
  return r.rows[0];
};

router.get('/dashboard', async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const [subjects, overallAtt, recent, notifications] = await Promise.all([
      query(`SELECT sub.*, 
               COUNT(a.id) as total_classes,
               SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_count,
               ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/NULLIF(COUNT(a.id),0), 1) as percentage
             FROM subjects sub LEFT JOIN attendance a ON a.subject_id=sub.id AND a.student_id=$1
             WHERE sub.class_id=$2 GROUP BY sub.id ORDER BY sub.name`, [student.id, student.class_id]),
      query(`SELECT COUNT(*) as total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present FROM attendance WHERE student_id=$1`, [student.id]),
      query(`SELECT a.date, a.status, sub.name as subject_name FROM attendance a JOIN subjects sub ON sub.id=a.subject_id WHERE a.student_id=$1 ORDER BY a.date DESC LIMIT 10`, [student.id]),
      query(`SELECT * FROM notifications WHERE user_id=$1 AND is_read=false ORDER BY created_at DESC LIMIT 5`, [req.user.id]),
    ]);

    const total = parseInt(overallAtt.rows[0].total) || 0;
    const present = parseInt(overallAtt.rows[0].present) || 0;

    res.json({
      subjects: subjects.rows,
      totalClasses: total,
      presentCount: present,
      overallPercentage: total > 0 ? Math.round((present / total) * 100) : 0,
      recentAttendance: recent.rows,
      notifications: notifications.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/attendance', async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    const { subject_id, from, to, semester, session } = req.query;
    const params = [student.id];
    let sql = `SELECT a.*, sub.name as subject_name, sub.code as subject_code FROM attendance a JOIN subjects sub ON sub.id=a.subject_id WHERE a.student_id=$1`;
    if (subject_id) { sql += ` AND a.subject_id=$${params.length+1}`; params.push(subject_id); }
    if (from) { sql += ` AND a.date>=$${params.length+1}`; params.push(from); }
    if (to) { sql += ` AND a.date<=$${params.length+1}`; params.push(to); }
    if (semester) { sql += ` AND a.semester=$${params.length+1}`; params.push(parseInt(semester)); }
    if (session) { sql += ` AND a.session=$${params.length+1}`; params.push(session); }
    sql += ' ORDER BY a.date DESC LIMIT 300';
    const result = await query(sql, params);
    res.json({ records: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/subjects', async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    const result = await query(
      `SELECT sub.*,
         COUNT(a.id) as total_classes,
         SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_count,
         ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/NULLIF(COUNT(a.id),0), 1) as percentage,
         u.name as teacher_name
       FROM subjects sub
       LEFT JOIN attendance a ON a.subject_id=sub.id AND a.student_id=$1
       LEFT JOIN teachers t ON t.id=sub.teacher_id
       LEFT JOIN users u ON u.id=t.user_id
       WHERE sub.class_id=$2 GROUP BY sub.id, u.name ORDER BY sub.name`, [student.id, student.class_id]);
    res.json({ subjects: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET active sessions — scoped strictly to student's class only
router.get('/sessions/active', async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const result = await query(
      `SELECT sess.*, sub.name as subject_name, c.name as class_name, u.name as teacher_name
       FROM attendance_sessions sess
       JOIN subjects sub ON sub.id=sess.subject_id
       LEFT JOIN classes c ON c.id=sub.class_id
       LEFT JOIN teachers t ON t.id=sess.teacher_id
       LEFT JOIN users u ON u.id=t.user_id
       WHERE sub.class_id=$1
         AND sess.is_active=true
         AND sess.expires_at > NOW()
       ORDER BY sess.created_at DESC`,
      [student.class_id]
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST mark attendance — full validation pipeline
router.post('/attendance/mark', async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { session_id, code, geo_lat, geo_lng, face_verified, anomaly_data } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Resolve session
    let session;
    if (session_id) {
      const r = await query(
        `SELECT * FROM attendance_sessions WHERE id=$1 AND is_active=true AND expires_at>NOW()`,
        [session_id]
      );
      session = r.rows[0];
    } else if (code) {
      const r = await query(
        `SELECT * FROM attendance_sessions WHERE code=$1 AND is_active=true AND expires_at>NOW()`,
        [code.toUpperCase()]
      );
      session = r.rows[0];
    }

    if (!session) {
      return res.status(404).json({ error: 'No active session found. Check the code or ask your teacher.' });
    }

    // RBAC: verify student belongs to the session's class
    const subjectRow = await query(`SELECT class_id FROM subjects WHERE id=$1`, [session.subject_id]);
    const sessionClassId = subjectRow.rows[0]?.class_id;
    if (sessionClassId && student.class_id !== sessionClassId) {
      return res.status(403).json({ error: 'Access denied: this session is not for your class' });
    }

    // Guard: prevent duplicate attendance
    const existing = await query(
      `SELECT id FROM attendance WHERE student_id=$1 AND subject_id=$2 AND date=$3`,
      [student.id, session.subject_id, today]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Attendance already marked for today in this subject.' });
    }

    // Geofence check
    if (session.geo_lat && geo_lat) {
      const dist = getDistance(parseFloat(geo_lat), parseFloat(geo_lng), parseFloat(session.geo_lat), parseFloat(session.geo_lng));
      if (dist > session.geo_radius) {
        return res.status(400).json({ error: `You are ${Math.round(dist)}m away. Must be within ${session.geo_radius}m of the classroom.` });
      }
    }

    // Anomaly detection
    let anomalyFlag = false;
    let anomalyReason = null;
    if (anomaly_data) {
      if (anomaly_data.repeated_attempts > 3) { anomalyFlag = true; anomalyReason = 'Repeated failed attempts'; }
      if (anomaly_data.location_mismatch) { anomalyFlag = true; anomalyReason = 'Location mismatch detected'; }
      if (anomalyFlag) {
        await query(
          `INSERT INTO anomaly_logs (student_id, subject_id, session_id, flag_type, description, confidence)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [student.id, session.subject_id, session.id, 'suspicious_behavior', anomalyReason, anomaly_data.confidence || 0.8]
        );
      }
    }

    // Session lock: only allow attendance when an active academic session exists
    // and the student is enrolled in it. BUG-01 fix: no fallback — block when no session is active.
    const activeSessionRow = await query(
      `SELECT name FROM academic_sessions WHERE is_active=true LIMIT 1`
    );
    if (activeSessionRow.rows.length === 0) {
      return res.status(403).json({ error: 'Attendance is locked. No active academic session is set. Contact your administrator.' });
    }
    const activeSessionName = activeSessionRow.rows[0].name;
    if (student.current_session !== activeSessionName) {
      return res.status(403).json({ error: `Attendance is locked. You are enrolled in session ${student.current_session} but the active session is ${activeSessionName}.` });
    }

    await query(
      `INSERT INTO attendance (student_id, subject_id, session_id, date, status, method, semester, session, geo_lat, geo_lng, face_verified, anomaly_flag, anomaly_reason, marked_by)
       VALUES ($1,$2,$3,$4,'present',$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [student.id, session.subject_id, session.id, today, session.session_type,
       student.current_semester, student.current_session,
       geo_lat || null, geo_lng || null, face_verified || false,
       anomalyFlag, anomalyReason, req.user.id]
    );

    const subjectInfo = await query(`SELECT name FROM subjects WHERE id=$1`, [session.subject_id]);
    const subjectName = subjectInfo.rows[0]?.name || 'your subject';
    await createNotification(
      req.user.id,
      'Attendance Marked',
      `Your attendance for ${subjectName} on ${today} has been recorded successfully.${face_verified ? ' (Face verified)' : ''}`,
      'attendance'
    );

    res.json({
      message: 'Attendance marked successfully!',
      faceVerified: face_verified,
      anomalyFlag,
      semester: student.current_semester,
      session: student.current_session,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

router.get('/requests', async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    const result = await query(`SELECT ar.*, sub.name as subject_name FROM attendance_requests ar JOIN subjects sub ON sub.id=ar.subject_id WHERE ar.student_id=$1 ORDER BY ar.created_at DESC`, [student.id]);
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/requests', async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    const { subject_id, date, reason } = req.body;

    // Verify the subject belongs to student's class
    const subCheck = await query(`SELECT id FROM subjects WHERE id=$1 AND class_id=$2`, [subject_id, student.class_id]);
    if (subCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: subject not available for your class' });
    }

    const existing = await query(`SELECT id FROM attendance_requests WHERE student_id=$1 AND subject_id=$2 AND date=$3`, [student.id, subject_id, date]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Request already submitted for this date and subject' });
    const result = await query(`INSERT INTO attendance_requests (student_id, subject_id, date, reason) VALUES ($1,$2,$3,$4) RETURNING id`, [student.id, subject_id, date, reason]);

    const subInfo = await query(`SELECT name FROM subjects WHERE id=$1`, [subject_id]);
    await createNotification(
      req.user.id,
      'Attendance Request Submitted',
      `Your correction request for ${subInfo.rows[0]?.name || 'subject'} on ${date} has been submitted and is pending review.`,
      'request'
    );

    res.status(201).json({ id: result.rows[0].id, message: 'Request submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [req.user.id]);
    res.json({ notifications: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    await query(`UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/notifications/read-all', async (req, res) => {
  try {
    await query(`UPDATE notifications SET is_read=true WHERE user_id=$1`, [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
