const express = require('express');
const { query } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getLowAttendanceShortlist } = require('../services/attendanceService');
const { createNotification } = require('../services/notificationService');
const router = express.Router();

router.use(authenticateToken, requireRole('teacher', 'admin'));

const getTeacherId = async (userId) => {
  const r = await query('SELECT id FROM teachers WHERE user_id=$1', [userId]);
  return r.rows[0]?.id;
};

// ── Verify teacher is assigned to this subject ─────────────────────────────
const assertTeacherOwnsSubject = async (teacherId, subjectId) => {
  const r = await query(
    `SELECT id FROM subjects WHERE id=$1 AND teacher_id=$2`,
    [subjectId, teacherId]
  );
  return r.rows.length > 0;
};

// ── Verify teacher owns this session ──────────────────────────────────────
const assertTeacherOwnsSession = async (teacherId, sessionId) => {
  const r = await query(
    `SELECT id FROM attendance_sessions WHERE id=$1 AND teacher_id=$2`,
    [sessionId, teacherId]
  );
  return r.rows.length > 0;
};

router.get('/dashboard', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const [subjects, todayAtt, pending, totalStudents] = await Promise.all([
      // Each subject includes the count of enrolled students (students in same class)
      query(`
        SELECT sub.*, c.name as class_name, c.section,
          (SELECT COUNT(*) FROM students s WHERE s.class_id = sub.class_id AND s.is_deleted = false) as student_count
        FROM subjects sub
        LEFT JOIN classes c ON c.id = sub.class_id
        WHERE sub.teacher_id = $1
        ORDER BY sub.name
      `, [teacherId]),

      // Count ONLY unique present students today — absent is derived, not DB-counted
      query(`
        SELECT
          COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.student_id END) AS present
        FROM attendance a
        JOIN subjects sub ON sub.id = a.subject_id
        WHERE sub.teacher_id = $1 AND a.date = CURRENT_DATE
      `, [teacherId]),

      query(`SELECT COUNT(*) as count FROM attendance_requests ar JOIN subjects sub ON sub.id=ar.subject_id WHERE sub.teacher_id=$1 AND ar.status='pending'`, [teacherId]),

      // Total unique students enrolled in this teacher's classes
      query(`
        SELECT COUNT(DISTINCT s.id) AS total
        FROM students s
        JOIN subjects sub ON sub.class_id = s.class_id
        WHERE sub.teacher_id = $1 AND s.is_deleted = false
      `, [teacherId]),
    ]);

    const presentCount  = parseInt(todayAtt.rows[0]?.present) || 0;
    const totalEnrolled = parseInt(totalStudents.rows[0]?.total) || 0;
    // Absent = all enrolled students who are NOT present today
    // (includes students with no attendance record at all for today)
    const absentCount   = Math.max(0, totalEnrolled - presentCount);

    res.json({
      subjects: subjects.rows,
      todayStats: {
        present: presentCount,
        absent:  absentCount,
        total:   totalEnrolled,
      },
      totalStudents: totalEnrolled,
      pendingRequests: parseInt(pending.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/subjects', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const result = await query(`
      SELECT sub.*, c.name as class_name, c.section, c.semester, b.name as branch_name,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = sub.class_id AND s.is_deleted = false) as student_count
      FROM subjects sub
      LEFT JOIN classes c ON c.id = sub.class_id
      LEFT JOIN branches b ON b.id = c.branch_id
      WHERE sub.teacher_id = $1
      ORDER BY sub.name
    `, [teacherId]);
    res.json({ subjects: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/students', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const { search, subject_id, class_id, mine } = req.query;
    let sql, params = [teacherId];

    if (mine === 'true' || (!subject_id && !class_id)) {
      sql = `SELECT DISTINCT s.*, u.name, u.email, u.phone,
               c.name as class_name, c.section
             FROM students s
             JOIN users u ON u.id=s.user_id
             LEFT JOIN classes c ON c.id=s.class_id
             WHERE s.created_by=$1 AND s.is_deleted=false`;
    } else if (subject_id) {
      if (!(await assertTeacherOwnsSubject(teacherId, subject_id))) {
        return res.status(403).json({ error: 'Access denied: subject not assigned to you' });
      }
      sql = `SELECT s.*, u.name, u.email, u.phone, u.profile_photo,
               c.name as class_name, c.section
             FROM students s
             JOIN users u ON u.id=s.user_id
             JOIN subjects sub ON sub.class_id=s.class_id
             LEFT JOIN classes c ON c.id=s.class_id
             WHERE sub.teacher_id=$1 AND sub.id=$2 AND s.is_deleted=false`;
      params.push(subject_id);
    } else if (class_id) {
      sql = `SELECT s.*, u.name, u.email, u.phone, u.profile_photo,
               c.name as class_name, c.section
             FROM students s
             JOIN users u ON u.id=s.user_id
             JOIN subjects sub ON sub.class_id=s.class_id
             LEFT JOIN classes c ON c.id=s.class_id
             WHERE sub.teacher_id=$1 AND s.class_id=$2 AND s.is_deleted=false`;
      params.push(class_id);
    }
    if (search) { sql += ` AND (u.name ILIKE $${params.length+1} OR s.student_id ILIKE $${params.length+1})`; params.push(`%${search}%`); }
    sql += ' ORDER BY u.name';
    const result = await query(sql, params);
    res.json({ students: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /teacher/students — Create a new student (creates user account + student record)
router.post('/students', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    if (!teacherId) return res.status(403).json({ error: 'Teacher profile not found' });

    const { name, email, student_id, roll_number, class_id, password, phone, year_of_joining } = req.body;
    if (!name || !student_id) return res.status(400).json({ error: 'name and student_id are required' });

    const bcrypt = require('bcryptjs');
    const finalEmail = email || `${student_id.toLowerCase()}@student.smartattend.edu`;
    const finalPassword = password || 'Student@123';

    const existing = await query(`SELECT id FROM users WHERE email=$1`, [finalEmail]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already exists' });

    const sidExists = await query(`SELECT id FROM students WHERE student_id=$1`, [student_id]);
    if (sidExists.rows.length > 0) return res.status(409).json({ error: 'Student ID already exists' });

    const hash = await bcrypt.hash(finalPassword, 10);
    const userRow = await query(
      `INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1,$2,$3,'student',$4) RETURNING id`,
      [name, finalEmail, hash, phone || null]
    );
    const userId = userRow.rows[0].id;

    const stuRow = await query(
      `INSERT INTO students (user_id, student_id, roll_number, class_id, year_of_joining, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [userId, student_id, roll_number || null, class_id || null, year_of_joining || null, teacherId]
    );

    await query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'create_student',$2)`,
      [req.user.id, JSON.stringify({ student_id, name })]);

    await createNotification(
      userId,
      'Account Created',
      `Welcome to SmartAttend! Your student account has been created. Student ID: ${student_id}. Please change your password after first login.`,
      'system'
    );

    res.status(201).json({ message: 'Student created successfully', id: stuRow.rows[0].id, email: finalEmail, password: finalPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /teacher/students/:id — Update student (RBAC: only own students)
router.put('/students/:id', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const stu = await query(`SELECT s.*, u.id as user_id FROM students s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.is_deleted=false`, [req.params.id]);
    if (stu.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    if (req.user.role !== 'admin' && stu.rows[0].created_by !== teacherId) {
      return res.status(403).json({ error: 'Access denied: student was not created by you' });
    }

    const { name, phone, class_id, roll_number, year_of_joining, is_active } = req.body;
    if (name || phone) {
      await query(`UPDATE users SET name=COALESCE($1,name), phone=COALESCE($2,phone), updated_at=NOW() WHERE id=$3`,
        [name || null, phone || null, stu.rows[0].user_id]);
    }
    await query(
      `UPDATE students SET class_id=COALESCE($1,class_id), roll_number=COALESCE($2,roll_number), year_of_joining=COALESCE($3,year_of_joining) WHERE id=$4`,
      [class_id || null, roll_number || null, year_of_joining || null, req.params.id]
    );
    if (typeof is_active === 'boolean') {
      await query(`UPDATE users SET is_active=$1 WHERE id=$2`, [is_active, stu.rows[0].user_id]);
    }

    await query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'update_student',$2)`,
      [req.user.id, JSON.stringify({ student_db_id: req.params.id })]);
    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /teacher/students/:id — Soft delete (RBAC: only own students)
router.delete('/students/:id', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const stu = await query(`SELECT created_by, user_id FROM students WHERE id=$1 AND is_deleted=false`, [req.params.id]);
    if (stu.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    if (req.user.role !== 'admin' && stu.rows[0].created_by !== teacherId) {
      return res.status(403).json({ error: 'Access denied: student was not created by you' });
    }

    await query(`UPDATE students SET is_deleted=true WHERE id=$1`, [req.params.id]);
    await query(`UPDATE users SET is_active=false WHERE id=$1`, [stu.rows[0].user_id]);
    await query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'delete_student',$2)`,
      [req.user.id, JSON.stringify({ student_db_id: req.params.id })]);
    res.json({ message: 'Student removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── SESSIONS ─────────────────────────────────────────────────────────────────

// GET /teacher/sessions/active — only live sessions (active + not expired)
router.get('/sessions/active', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const result = await query(
      `SELECT sess.*, sub.name as subject_name, sub.code as subject_code,
              c.name as class_name, c.section as class_section
       FROM attendance_sessions sess
       JOIN subjects sub ON sub.id=sess.subject_id
       LEFT JOIN classes c ON c.id=sub.class_id
       WHERE sess.teacher_id=$1
         AND sess.is_active=true
         AND sess.expires_at > NOW()
       ORDER BY sess.created_at DESC`,
      [teacherId]
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /teacher/sessions — all sessions today (active, expired, stopped)
router.get('/sessions', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const result = await query(
      `SELECT sess.*,
              sub.name as subject_name, sub.code as subject_code,
              c.name as class_name, c.section as class_section,
              CASE
                WHEN sess.is_active = false THEN 'stopped'
                WHEN sess.expires_at <= NOW() THEN 'expired'
                ELSE 'active'
              END as status
       FROM attendance_sessions sess
       JOIN subjects sub ON sub.id=sess.subject_id
       LEFT JOIN classes c ON c.id=sub.class_id
       WHERE sess.teacher_id=$1
         AND sess.session_date = CURRENT_DATE
       ORDER BY sess.created_at DESC`,
      [teacherId]
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /teacher/sessions — create session with duplicate prevention + RBAC
router.post('/sessions', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    if (!teacherId) return res.status(403).json({ error: 'Teacher profile not found' });

    const { subject_id, type, geo_lat, geo_lng, geo_radius } = req.body;
    if (!subject_id || !type) return res.status(400).json({ error: 'subject_id and type are required' });

    // RBAC: verify teacher is assigned to this subject
    if (!(await assertTeacherOwnsSubject(teacherId, subject_id))) {
      return res.status(403).json({ error: 'Access denied: subject not assigned to you' });
    }

    // Guard: check if attendance already marked for this subject today
    const attExists = await query(
      `SELECT COUNT(*) as count FROM attendance a
       JOIN subjects sub ON sub.id=a.subject_id
       WHERE a.subject_id=$1 AND a.date=CURRENT_DATE AND sub.teacher_id=$2`,
      [subject_id, teacherId]
    );
    if (parseInt(attExists.rows[0].count) > 0) {
      return res.status(409).json({ error: 'Attendance already marked for today in this subject' });
    }

    // Guard: check if another active session exists for same subject
    const activeExists = await query(
      `SELECT id FROM attendance_sessions
       WHERE subject_id=$1 AND teacher_id=$2 AND is_active=true AND expires_at > NOW()`,
      [subject_id, teacherId]
    );
    if (activeExists.rows.length > 0) {
      return res.status(409).json({ error: 'Session already active for this subject. Stop it before creating a new one.' });
    }

    // Fetch class_id from subject
    const subRow = await query(`SELECT class_id FROM subjects WHERE id=$1`, [subject_id]);
    const classId = subRow.rows[0]?.class_id || null;

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const qrData = `SMARTATTEND:${subject_id}:${code}:${Date.now()}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const result = await query(
      `INSERT INTO attendance_sessions
         (subject_id, teacher_id, class_id, session_type, code, qr_data, session_date, geo_lat, geo_lng, geo_radius, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,$7,$8,$9,$10)
       RETURNING id, code, qr_data, expires_at, session_type, created_at`,
      [subject_id, teacherId, classId, type, code, qrData,
       geo_lat || null, geo_lng || null, geo_radius || 100, expiresAt]
    );

    await query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'create_session',$2)`,
      [req.user.id, JSON.stringify({ subject_id, type, class_id: classId })]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /teacher/sessions/:id — stop session with ownership check
router.delete('/sessions/:id', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);

    // Admin can stop any session; teacher can only stop their own
    if (req.user.role !== 'admin') {
      if (!(await assertTeacherOwnsSession(teacherId, req.params.id))) {
        return res.status(403).json({ error: 'Access denied: session does not belong to you' });
      }
    }

    const result = await query(
      `UPDATE attendance_sessions SET is_active=false WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    await query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'stop_session',$2)`,
      [req.user.id, JSON.stringify({ session_id: req.params.id })]
    );

    res.json({ message: 'Session stopped successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── MANUAL ATTENDANCE ────────────────────────────────────────────────────────
router.post('/attendance/manual', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const { subject_id, date, records } = req.body;

    // RBAC: verify teacher is assigned to this subject
    if (!(await assertTeacherOwnsSubject(teacherId, subject_id))) {
      return res.status(403).json({ error: 'Access denied: subject not assigned to you' });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    if (attendanceDate < today) return res.status(403).json({ error: 'Cannot edit past dates' });

    let saved = 0;
    for (const rec of records) {
      await query(
        `INSERT INTO attendance (student_id, subject_id, date, status, method, marked_by)
         VALUES ($1,$2,$3,$4,'manual',$5)
         ON CONFLICT (student_id, subject_id, date) DO UPDATE SET status=EXCLUDED.status, method=EXCLUDED.method, updated_at=NOW()`,
        [rec.student_id, subject_id, attendanceDate, rec.status, req.user.id]
      );
      saved++;
    }

    await query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'mark_attendance',$2)`, [req.user.id, JSON.stringify({ subject_id, date: attendanceDate, count: saved })]);
    res.json({ message: `Attendance saved for ${saved} students` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/attendance', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const { subject_id, from, to, student_id } = req.query;

    if (subject_id && !(await assertTeacherOwnsSubject(teacherId, subject_id))) {
      return res.status(403).json({ error: 'Access denied: subject not assigned to you' });
    }

    const params = [teacherId];
    let sql = `SELECT a.*, u.name as student_name, s.student_id as student_code, sub.name as subject_name
               FROM attendance a JOIN students s ON s.id=a.student_id JOIN users u ON u.id=s.user_id JOIN subjects sub ON sub.id=a.subject_id
               WHERE sub.teacher_id=$1`;
    if (subject_id) { sql += ` AND a.subject_id=$${params.length+1}`; params.push(subject_id); }
    if (from) { sql += ` AND a.date>=$${params.length+1}`; params.push(from); }
    if (to) { sql += ` AND a.date<=$${params.length+1}`; params.push(to); }
    if (student_id) { sql += ` AND a.student_id=$${params.length+1}`; params.push(student_id); }
    sql += ' ORDER BY a.date DESC LIMIT 500';
    const result = await query(sql, params);
    res.json({ records: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/attendance/report', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const { subject_id, from, to, semester, session } = req.query;

    if (subject_id && !(await assertTeacherOwnsSubject(teacherId, subject_id))) {
      return res.status(403).json({ error: 'Access denied: subject not assigned to you' });
    }

    const dateFrom = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const dateTo = to || new Date().toISOString().split('T')[0];

    const params = [teacherId, dateFrom, dateTo];
    let sql = `SELECT s.id as student_id, u.name, s.student_id as student_code, s.roll_number,
                COUNT(*) as total_classes,
                SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as absent_count,
                ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/COUNT(*), 1) as percentage
               FROM attendance a JOIN students s ON s.id=a.student_id JOIN users u ON u.id=s.user_id JOIN subjects sub ON sub.id=a.subject_id
               WHERE sub.teacher_id=$1 AND a.date BETWEEN $2 AND $3`;
    if (subject_id) { sql += ` AND a.subject_id=$${params.length+1}`; params.push(subject_id); }
    if (semester) { sql += ` AND a.semester=$${params.length+1}`; params.push(parseInt(semester)); }
    if (session) { sql += ` AND a.session=$${params.length+1}`; params.push(session); }
    sql += ' GROUP BY s.id, u.name, s.student_id, s.roll_number ORDER BY percentage ASC';
    const result = await query(sql, params);
    res.json({ report: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PIVOT ATTENDANCE REPORT ──────────────────────────────────────────────────
router.get('/attendance/pivot-report', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const { subject_id, from, to, semester, session } = req.query;

    if (subject_id && !(await assertTeacherOwnsSubject(teacherId, subject_id))) {
      return res.status(403).json({ error: 'Access denied: subject not assigned to you' });
    }

    const dateFrom = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const dateTo = to || new Date().toISOString().split('T')[0];

    const params = [teacherId, dateFrom, dateTo];
    let sql = `SELECT s.id as student_id, u.name, s.student_id as student_code, s.roll_number,
                a.date, a.status
               FROM attendance a
               JOIN students s ON s.id=a.student_id
               JOIN users u ON u.id=s.user_id
               JOIN subjects sub ON sub.id=a.subject_id
               WHERE sub.teacher_id=$1 AND a.date BETWEEN $2 AND $3`;
    if (subject_id) { sql += ` AND a.subject_id=$${params.length+1}`; params.push(subject_id); }
    if (semester) { sql += ` AND a.semester=$${params.length+1}`; params.push(parseInt(semester)); }
    if (session) { sql += ` AND a.session=$${params.length+1}`; params.push(session); }
    sql += ' ORDER BY s.roll_number, u.name, a.date ASC';
    const result = await query(sql, params);
    const rows = result.rows;

    // Extract unique sorted dates (YYYY-MM-DD)
    const datesSet = new Set(rows.map(r => {
      const d = r.date;
      return d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
    }));
    const dates = [...datesSet].sort();

    // Build per-student pivot
    const studentMap = {};
    for (const row of rows) {
      const sid = row.student_id;
      const dateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0];
      if (!studentMap[sid]) {
        studentMap[sid] = {
          name: row.name,
          roll_number: row.roll_number || row.student_code,
          student_code: row.student_code,
          dateMap: {}
        };
      }
      studentMap[sid].dateMap[dateStr] = row.status === 'present' ? 'P' : 'A';
    }

    const report = Object.values(studentMap).map(s => {
      let present = 0;
      const date_values = dates.map(d => {
        const v = s.dateMap[d] || 'A';
        if (v === 'P') present++;
        return v;
      });
      const total = dates.length;
      const absent = total - present;
      const percentage = total > 0 ? Math.round(100.0 * present / total * 10) / 10 : 0;
      return { name: s.name, roll_number: s.roll_number, student_code: s.student_code, date_values, total_classes: total, present_count: present, absent_count: absent, percentage };
    });

    res.json({ dates, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── ATTENDANCE REQUESTS ──────────────────────────────────────────────────────
router.get('/requests', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const { status } = req.query;
    let sql = `SELECT ar.*, u.name as student_name, s.student_id as student_code, sub.name as subject_name
               FROM attendance_requests ar JOIN students s ON s.id=ar.student_id JOIN users u ON u.id=s.user_id JOIN subjects sub ON sub.id=ar.subject_id
               WHERE sub.teacher_id=$1`;
    const params = [teacherId];
    if (status) { sql += ` AND ar.status=$${params.length+1}`; params.push(status); }
    sql += ' ORDER BY ar.created_at DESC';
    const result = await query(sql, params);
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/requests/:id', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    const { status, teacher_note } = req.body;

    const ar = await query(
      `SELECT ar.*, s.user_id, sub.teacher_id FROM attendance_requests ar
       JOIN students s ON s.id=ar.student_id
       JOIN subjects sub ON sub.id=ar.subject_id
       WHERE ar.id=$1`,
      [req.params.id]
    );
    if (ar.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const req_data = ar.rows[0];

    // RBAC: teacher can only review requests for their subjects
    if (req.user.role !== 'admin' && req_data.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied: request does not belong to your subject' });
    }

    await query(`UPDATE attendance_requests SET status=$1, teacher_note=$2, reviewed_by=$3, reviewed_at=NOW() WHERE id=$4`, [status, teacher_note || '', req.user.id, req.params.id]);

    if (status === 'approved') {
      await query(`INSERT INTO attendance (student_id, subject_id, date, status, method, marked_by)
                   VALUES ($1,$2,$3,'present','request',$4)
                   ON CONFLICT (student_id, subject_id, date) DO UPDATE SET status='present', method='request', updated_at=NOW()`,
        [req_data.student_id, req_data.subject_id, req_data.date, req.user.id]);
    }

    await query(`INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`, [
      req_data.user_id,
      `Attendance Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      `Your request for ${req_data.date} has been ${status}.${teacher_note ? ' Note: ' + teacher_note : ''}`,
      status === 'approved' ? 'success' : 'warning',
    ]);

    res.json({ message: `Request ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/alerts', async (req, res) => {
  try {
    const { student_id, message, subject_id } = req.body;
    const s = await query(`SELECT s.user_id, u.name FROM students s JOIN users u ON u.id=s.user_id WHERE s.id=$1`, [student_id]);
    if (s.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    await query(`INSERT INTO notifications (user_id, title, message, type) VALUES ($1,'Low Attendance Alert',$2,'warning')`, [s.rows[0].user_id, message || 'Your attendance is below 75%. Please attend classes regularly.']);
    res.json({ message: 'Alert sent' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── LOW ATTENDANCE SHORTLIST ─────────────────────────────────────────────────
router.get('/attendance/low-shortlist', async (req, res) => {
  try {
    const teacherId = await getTeacherId(req.user.id);
    if (!teacherId) return res.status(403).json({ error: 'Teacher profile not found' });
    const { subject_id, from, to, threshold, search } = req.query;
    if (from && to && from > to) return res.status(400).json({ error: 'from_date must be <= to_date' });
    const rawThresh = parseFloat(threshold);
    const thresh = isNaN(rawThresh) ? 75 : rawThresh;
    if (thresh < 1 || thresh > 100) return res.status(400).json({ error: 'threshold must be between 1 and 100' });

    if (subject_id) {
      if (!(await assertTeacherOwnsSubject(teacherId, subject_id))) {
        return res.status(403).json({ error: 'Access denied: subject not assigned to you' });
      }
    }

    const students = await getLowAttendanceShortlist({ teacherId, subject_id, from, to, threshold: thresh, search });
    res.json({ students, threshold: thresh });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
