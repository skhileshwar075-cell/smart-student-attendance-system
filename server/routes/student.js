const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { query, withTransaction } = require("../db/database");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { createNotification } = require("../services/notificationService");
const { verifyFaceMatch, logFaceVerificationEvent, getFaceRegistrationRequired } = require('../services/faceVerificationService');
const router = express.Router();

const attendanceMarkLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attendance attempts. Please wait a minute and try again.' },
});

router.use(authenticateToken, requireRole("student", "admin"));

const getStudentId = async (userId) => {
  const r = await query(
    "SELECT id, class_id, current_semester, current_session FROM students WHERE user_id=$1",
    [userId],
  );
  return r.rows[0];
};

router.get("/dashboard", async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    if (!student)
      return res.status(404).json({ error: "Student profile not found" });

    const [subjects, overallAtt, recent, notifications] = await Promise.all([
      query(
        `SELECT sub.*, 
               COUNT(a.id) FILTER (WHERE a.status != 'holiday') as total_classes,
               SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_count,
               ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/NULLIF(COUNT(a.id) FILTER (WHERE a.status != 'holiday'),0), 1) as percentage
             FROM subjects sub LEFT JOIN attendance a ON a.subject_id=sub.id AND a.student_id=$1
             WHERE sub.class_id=$2 GROUP BY sub.id ORDER BY sub.name`,
        [student.id, student.class_id],
      ),
      query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present, SUM(CASE WHEN status='holiday' THEN 1 ELSE 0 END) as holiday FROM attendance WHERE student_id=$1`,
        [student.id],
      ),
      query(
        `SELECT a.date, a.status, sub.name as subject_name FROM attendance a JOIN subjects sub ON sub.id=a.subject_id WHERE a.student_id=$1 ORDER BY a.date DESC LIMIT 10`,
        [student.id],
      ),
      query(
        `SELECT * FROM notifications WHERE user_id=$1 AND is_read=false ORDER BY created_at DESC LIMIT 5`,
        [req.user.id],
      ),
    ]);

    const total = parseInt(overallAtt.rows[0].total) || 0;
    const present = parseInt(overallAtt.rows[0].present) || 0;
    const holiday = parseInt(overallAtt.rows[0].holiday) || 0;
    const activeTotal = Math.max(total - holiday, 0);

    res.json({
      subjects: subjects.rows,
      totalClasses: total,
      presentCount: present,
      holidayCount: holiday,
      overallPercentage:
        activeTotal > 0 ? Math.round((present / activeTotal) * 100) : 0,
      recentAttendance: recent.rows,
      notifications: notifications.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/attendance", async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    if (!student)
      return res.status(404).json({ error: "Student profile not found" });

    const { subject_id, from, to, semester, session, search } = req.query;

    let limit = parseInt(req.query.limit, 10);
    let offset = parseInt(req.query.offset, 10);
    if (isNaN(limit) || limit <= 0) limit = 30;
    if (isNaN(offset) || offset < 0) offset = 0;
    const MAX_LIMIT = 100;
    limit = Math.min(limit, MAX_LIMIT);

    const params = [student.id];
    let sql = `SELECT a.*, sub.name as subject_name, sub.code as subject_code, COUNT(*) OVER() AS total_count
               FROM attendance a JOIN subjects sub ON sub.id=a.subject_id
               WHERE a.student_id=$1`;
    if (subject_id) {
      sql += ` AND a.subject_id=$${params.length + 1}`;
      params.push(subject_id);
    }
    if (from) {
      sql += ` AND a.date>=$${params.length + 1}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND a.date<=$${params.length + 1}`;
      params.push(to);
    }
    if (semester) {
      sql += ` AND a.semester=$${params.length + 1}`;
      params.push(parseInt(semester));
    }
    if (session) {
      sql += ` AND a.session=$${params.length + 1}`;
      params.push(session);
    }
    if (search) {
      sql += ` AND sub.name ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }
    sql += ` ORDER BY a.date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    const rows = result.rows || [];
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const records = rows.map((r) => {
      const copy = { ...r };
      delete copy.total_count;
      return copy;
    });

    res.json({ records, total, limit, offset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/subjects", async (req, res) => {
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
       WHERE sub.class_id=$2 GROUP BY sub.id, u.name ORDER BY sub.name`,
      [student.id, student.class_id],
    );
    res.json({ subjects: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET active sessions — scoped strictly to student's class only
router.get("/sessions/active", async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    if (!student)
      return res.status(404).json({ error: "Student profile not found" });

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
      [student.class_id],
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST mark attendance — full validation pipeline
router.post("/attendance/mark", attendanceMarkLimiter, async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const { session_id, code, geo_lat, geo_lng, face_verified, face_embedding, anomaly_data } =
      req.body;
    if (!session_id && !code && !req.body.session_token) {
      return res
        .status(400)
        .json({ error: "Either session_id, code, or session_token is required to mark attendance." });
    }

    const today = new Date().toISOString().split("T")[0];
    const geoLat = geo_lat != null ? parseFloat(geo_lat) : null;
    const geoLng = geo_lng != null ? parseFloat(geo_lng) : null;
    const faceVerifiedBool = face_verified === true;
    const faceEmbedding = face_embedding || null;
    const normalizedCode = code ? code.toUpperCase().trim() : null;
    const normalizedToken = req.body.session_token
      ? String(req.body.session_token).trim()
      : null;
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || null;
    const userAgent = req.headers["user-agent"] || null;

    if (session_id && typeof session_id !== "string") {
      return res.status(400).json({ error: "session_id must be a string." });
    }

    if (code) {
      if (typeof code !== "string") {
        return res.status(400).json({ error: "code must be a string." });
      }
      if (!/^[A-Z0-9]{4,8}$/.test(normalizedCode)) {
        return res.status(400).json({
          error:
            "Invalid attendance code format. Use 4 to 8 alphanumeric characters.",
        });
      }
    }

    if (
      (geo_lat != null && geo_lng == null) ||
      (geo_lat == null && geo_lng != null)
    ) {
      return res
        .status(400)
        .json({ error: "Both geo_lat and geo_lng are required together." });
    }

    if (geoLat != null && (Number.isNaN(geoLat) || Number.isNaN(geoLng))) {
      return res
        .status(400)
        .json({ error: "geo_lat and geo_lng must be valid numbers." });
    }

    if (geoLat != null && (geoLat < -90 || geoLat > 90)) {
      return res.status(400).json({ error: "geo_lat must be between -90 and 90." });
    }
    if (geoLng != null && (geoLng < -180 || geoLng > 180)) {
      return res.status(400).json({ error: "geo_lng must be between -180 and 180." });
    }

    let attemptId = null;
    const logAttendanceAttempt = async (status, errorCode) => {
      if (!attemptId) return;
      try {
        await query(
          `UPDATE attendance_attempts SET status=$1, error_code=$2 WHERE id=$3`,
          [status, errorCode, attemptId],
        );
      } catch (updateErr) {
        console.warn('Failed to update attendance attempt status', updateErr);
      }
    };

    try {
      const insertedAttempt = await query(
        `INSERT INTO attendance_attempts
           (user_id, student_id, session_id, session_code, session_token, status, error_code, anomaly_info,
            ip_address, user_agent, geo_lat, geo_lng, face_payload, face_match, face_confidence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING id`,
        [
          req.user.id,
          student.id,
          null,
          normalizedCode,
          normalizedToken,
          'pending',
          null,
          anomaly_data || null,
          clientIp,
          userAgent,
          geoLat,
          geoLng,
          faceVerifiedBool,
          false,
          null,
        ],
      );
      attemptId = insertedAttempt.rows[0]?.id;
    } catch (attemptErr) {
      console.warn('Attendance attempt logging failed', attemptErr);
    }

    // Resolve session
    let session;
    if (session_id) {
      const r = await query(
        `SELECT * FROM attendance_sessions WHERE id=$1 AND is_active=true AND expires_at>NOW()`,
        [session_id],
      );
      session = r.rows[0];
    } else if (code) {
      const r = await query(
        `SELECT * FROM attendance_sessions WHERE code=$1 AND is_active=true AND expires_at>NOW()`,
        [normalizedCode],
      );
      session = r.rows[0];
    } else if (normalizedToken) {
      const r = await query(
        `SELECT * FROM attendance_sessions WHERE session_token=$1 AND is_active=true AND expires_at>NOW()`,
        [normalizedToken],
      );
      session = r.rows[0];
    }

    if (!session) {
      await logAttendanceAttempt('failed', 'session_not_found');
      return res
        .status(404)
        .json({
          error: "No active session found. Check the code or ask your teacher.",
        });
    }

    const faceRegistrationRequired = await getFaceRegistrationRequired();
    if (faceRegistrationRequired) {
      const userRow = await query(`SELECT face_encoding IS NOT NULL AS face_registered FROM users WHERE id=$1`, [req.user.id]);
      if (userRow.rows.length === 0 || !userRow.rows[0].face_registered) {
        await logAttendanceAttempt('failed', 'face_registration_required');
        return res.status(403).json({ error: 'Face registration is required before marking attendance.' });
      }
    }

    if (attemptId) {
      await query(
        `UPDATE attendance_attempts SET session_id=$1 WHERE id=$2`,
        [session.id, attemptId],
      );
    }

    // Secure sessions require live face verification OR a valid registered biometric proof plus the session token
    if (session.session_type === "secure") {
      const sessionTokenValid = normalizedToken && normalizedToken === session.session_token;
      if (!sessionTokenValid) {
        await logAttendanceAttempt('failed', 'invalid_session_token');
        return res.status(400).json({ error: "Invalid or missing session token for secure attendance." });
      }

      let faceMatchResult = null;
      if (faceEmbedding) {
        faceMatchResult = await verifyFaceMatch(req.user.id, faceEmbedding);
      }

      const faceProofPassed = faceMatchResult?.success === true;
      if (!faceProofPassed && !faceVerifiedBool) {
        await logAttendanceAttempt('failed', 'face_proof_required');
        return res.status(400).json({ error: "Secure attendance requires face proof. Please register and verify your face data." });
      }

      if (attemptId && faceMatchResult) {
        await query(
          `UPDATE attendance_attempts SET face_match=$1, face_confidence=$2 WHERE id=$3`,
          [faceMatchResult.success, faceMatchResult.confidence, attemptId],
        );
      }

      await logFaceVerificationEvent({
        userId: req.user.id,
        studentId: student.id,
        sessionId: session.id,
        sessionToken: normalizedToken,
        method: 'secure_session',
        success: faceProofPassed,
        confidence: faceMatchResult?.confidence || 0,
        details: {
          faceVerifiedFlag: faceVerifiedBool,
          faceEmbeddingProvided: !!faceEmbedding,
          verificationReason: faceMatchResult?.reason,
        },
        ipAddress: clientIp,
        userAgent,
      });
    }

    // Enforce geo-fence when the session is configured with location
    if (session.geo_lat != null && session.geo_lng != null) {
      if (
        geoLat == null ||
        geoLng == null ||
        Number.isNaN(geoLat) ||
        Number.isNaN(geoLng)
      ) {
        await logAttendanceAttempt('failed', 'geo_location_required');
        return res
          .status(400)
          .json({ error: "Location is required for geo-fenced attendance." });
      }
      const dist = getDistance(
        geoLat,
        geoLng,
        parseFloat(session.geo_lat),
        parseFloat(session.geo_lng),
      );
      if (dist > session.geo_radius) {
        await logAttendanceAttempt('failed', 'geo_fence_violation');
        return res
          .status(400)
          .json({
            error: `You are ${Math.round(dist)}m away. Must be within ${session.geo_radius}m of the classroom.`,
          });
      }
    }

    // RBAC: verify student belongs to the session's class
    const subjectRow = await query(
      `SELECT class_id FROM subjects WHERE id=$1`,
      [session.subject_id],
    );
    const sessionClassId = subjectRow.rows[0]?.class_id;
    if (sessionClassId && student.class_id !== sessionClassId) {
      await logAttendanceAttempt('failed', 'class_mismatch');
      return res
        .status(403)
        .json({ error: "Access denied: this session is not for your class" });
    }

    // Anomaly detection
    let anomalyFlag = false;
    let anomalyReason = null;
    if (anomaly_data) {
      if (anomaly_data.repeated_attempts > 3) {
        anomalyFlag = true;
        anomalyReason = "Repeated failed attempts";
      }
      if (anomaly_data.location_mismatch) {
        anomalyFlag = true;
        anomalyReason = "Location mismatch detected";
      }
      if (anomalyFlag) {
        await query(
          `INSERT INTO anomaly_logs (student_id, subject_id, session_id, flag_type, description, confidence)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            student.id,
            session.subject_id,
            session.id,
            "suspicious_behavior",
            anomalyReason,
            anomaly_data.confidence || 0.8,
          ],
        );
      }
    }

    // Session lock: only allow attendance when an active academic session exists
    // and the student is enrolled in it. BUG-01 fix: no fallback — block when no session is active.
    const activeSessionRow = await query(
      `SELECT name FROM academic_sessions WHERE is_active=true LIMIT 1`,
    );
    if (activeSessionRow.rows.length === 0) {
      await logAttendanceAttempt('failed', 'academic_session_inactive');
      return res
        .status(403)
        .json({
          error:
            "Attendance is locked. No active academic session is set. Contact your administrator.",
        });
    }
    const activeSessionName = activeSessionRow.rows[0].name;
    if (student.current_session !== activeSessionName) {
      await logAttendanceAttempt('failed', 'session_mismatch');
      return res
        .status(403)
        .json({
          error: `Attendance is locked. You are enrolled in session ${student.current_session} but the active session is ${activeSessionName}.`,
        });
    }

    const insertResult = await withTransaction(async (client) => {
      const insert = await client.query(
        `INSERT INTO attendance (student_id, subject_id, session_id, date, status, method, semester, session, geo_lat, geo_lng, face_verified, anomaly_flag, anomaly_reason, marked_by)
         VALUES ($1,$2,$3,$4,'present',$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (student_id, subject_id, date) DO NOTHING
         RETURNING id`,
        [
          student.id,
          session.subject_id,
          session.id,
          today,
          session.session_type,
          student.current_semester,
          student.current_session,
          geoLat !== null ? geoLat : null,
          geoLng !== null ? geoLng : null,
          faceVerifiedBool,
          anomalyFlag,
          anomalyReason,
          req.user.id,
        ],
      );
      return insert;
    });

    if (insertResult.rows.length === 0) {
      await logAttendanceAttempt('failed', 'duplicate_attendance');
      return res
        .status(409)
        .json({
          error:
            "Attendance already exists for today in this subject. Duplicate submissions are not allowed.",
        });
    }

    await logAttendanceAttempt('success', null);

    const subjectInfo = await query(`SELECT name FROM subjects WHERE id=$1`, [
      session.subject_id,
    ]);
    const subjectName = subjectInfo.rows[0]?.name || "your subject";
    await createNotification(
      req.user.id,
      "Attendance Marked",
      `Your attendance for ${subjectName} on ${today} has been recorded successfully.${faceVerifiedBool ? " (Face verified)" : ""}`,
      "attendance",
    );

    // Real-time notifications
    if (global.io) {
      // Notify the student
      global.io.to(`user_${req.user.id}`).emit("attendance_marked", {
        subject: subjectName,
        date: today,
        faceVerified: faceVerifiedBool,
        anomalyFlag,
        timestamp: new Date().toISOString(),
      });

      // Notify teachers and admins about new attendance
      global.io.to("role_teacher").emit("new_attendance", {
        studentId: student.id,
        studentName: req.user.name,
        subject: subjectName,
        classId: student.class_id,
        date: today,
        faceVerified: faceVerifiedBool,
        anomalyFlag,
        timestamp: new Date().toISOString(),
      });

      global.io.to("role_admin").emit("new_attendance", {
        studentId: student.id,
        studentName: req.user.name,
        subject: subjectName,
        classId: student.class_id,
        date: today,
        faceVerified: faceVerifiedBool,
        anomalyFlag,
        timestamp: new Date().toISOString(),
      });

      // Notify class-specific room
      if (student.class_id) {
        global.io
          .to(`class_${student.class_id}`)
          .emit("class_attendance_update", {
            studentId: student.id,
            studentName: req.user.name,
            subject: subjectName,
            date: today,
            status: "present",
            timestamp: new Date().toISOString(),
          });
      }
    }

    res.json({
      message: "Attendance marked successfully!",
      faceVerified: faceVerifiedBool,
      anomalyFlag,
      semester: student.current_semester,
      session: student.current_session,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get("/requests", async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    const result = await query(
      `SELECT ar.*, sub.name as subject_name FROM attendance_requests ar JOIN subjects sub ON sub.id=ar.subject_id WHERE ar.student_id=$1 ORDER BY ar.created_at DESC`,
      [student.id],
    );
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/requests", async (req, res) => {
  try {
    const student = await getStudentId(req.user.id);
    const { subject_id, date, reason } = req.body;

    // Verify the subject belongs to student's class
    const subCheck = await query(
      `SELECT id FROM subjects WHERE id=$1 AND class_id=$2`,
      [subject_id, student.class_id],
    );
    if (subCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Access denied: subject not available for your class" });
    }

    const existing = await query(
      `SELECT id FROM attendance_requests WHERE student_id=$1 AND subject_id=$2 AND date=$3`,
      [student.id, subject_id, date],
    );
    if (existing.rows.length > 0)
      return res
        .status(400)
        .json({ error: "Request already submitted for this date and subject" });
    const result = await query(
      `INSERT INTO attendance_requests (student_id, subject_id, date, reason) VALUES ($1,$2,$3,$4) RETURNING id`,
      [student.id, subject_id, date, reason],
    );

    const subInfo = await query(`SELECT name FROM subjects WHERE id=$1`, [
      subject_id,
    ]);
    await createNotification(
      req.user.id,
      "Attendance Request Submitted",
      `Your correction request for ${subInfo.rows[0]?.name || "subject"} on ${date} has been submitted and is pending review.`,
      "request",
    );

    res
      .status(201)
      .json({
        id: result.rows[0].id,
        message: "Request submitted successfully",
      });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id],
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/notifications/:id/read", async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id],
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/notifications/read-all", async (req, res) => {
  try {
    await query(`UPDATE notifications SET is_read=true WHERE user_id=$1`, [
      req.user.id,
    ]);
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
