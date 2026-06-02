const express = require('express');
const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getLowAttendanceShortlist, getClassWiseAnalytics, getSubjectWiseAnalytics, getStudentAnalysis } = require('../services/attendanceService');
const { createNotification } = require('../services/notificationService');
const { getAppSetting, setAppSetting } = require('../services/faceVerificationService');
const router = express.Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/stats', async (req, res) => {
  try {
    const [students, teachers, classes, subjects, todayAtt] = await Promise.all([
      query('SELECT COUNT(*) as count FROM students WHERE is_deleted = false'),
      query('SELECT COUNT(*) as count FROM teachers'),
      query('SELECT COUNT(*) as count FROM classes'),
      query('SELECT COUNT(*) as count FROM subjects'),
      // Only count DISTINCT present and holiday students — absent is derived, not DB-counted
      // This ensures students with no record today are correctly counted as absent
      query(`
        SELECT
          COUNT(DISTINCT CASE WHEN status = 'present' THEN student_id END) AS present_today,
          COUNT(DISTINCT CASE WHEN status = 'holiday' THEN student_id END) AS holiday_today
        FROM attendance
        WHERE date = CURRENT_DATE
      `),
    ]);

    const totalStudentsCount = parseInt(students.rows[0].count);
    const presentToday       = parseInt(todayAtt.rows[0]?.present_today) || 0;
    const holidayToday       = parseInt(todayAtt.rows[0]?.holiday_today) || 0;
    // Absent = all active students who are not present and not holiday today
    const absentToday        = Math.max(0, totalStudentsCount - presentToday - holidayToday);

    res.json({
      totalStudents: totalStudentsCount,
      totalTeachers: parseInt(teachers.rows[0].count),
      totalClasses:  parseInt(classes.rows[0].count),
      totalSubjects: parseInt(subjects.rows[0].count),
      presentToday,
      absentToday,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/face/registrations', async (req, res) => {
  try {
    const result = await query(
      `SELECT s.id as student_id, u.id as user_id, u.name, u.email, s.student_id as student_code,
              u.face_registered_at, u.face_encoding IS NOT NULL AS face_registered
         FROM students s
         JOIN users u ON u.id = s.user_id
        ORDER BY u.name`);
    res.json({ registrations: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/face/settings', async (req, res) => {
  try {
    const required = await getAppSetting('face_registration_required', 'false');
    res.json({ faceRegistrationRequired: required === 'true' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/face/settings', async (req, res) => {
  try {
    const { faceRegistrationRequired } = req.body;
    if (faceRegistrationRequired === undefined) {
      return res.status(400).json({ error: 'faceRegistrationRequired is required' });
    }
    await setAppSetting('face_registration_required', faceRegistrationRequired ? 'true' : 'false');
    res.json({ faceRegistrationRequired: Boolean(faceRegistrationRequired) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── STUDENTS ────────────────────────────────────────────────────────────────
router.get('/students', async (req, res) => {
  try {
    const { search, class_id, limit = 100, offset = 0 } = req.query;
    let sql = `SELECT s.*, u.name, u.email, u.phone, u.is_active, u.profile_photo,
                c.name as class_name, c.section as class_section
               FROM students s JOIN users u ON u.id = s.user_id
               LEFT JOIN classes c ON c.id = s.class_id WHERE 1=1`;
    const params = [];
    if (class_id) { sql += ` AND s.class_id = $${params.length + 1}`; params.push(class_id); }
    if (search) {
      sql += ` AND (u.name ILIKE $${params.length + 1} OR s.student_id ILIKE $${params.length + 1} OR s.roll_number ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    sql += ` ORDER BY u.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    const result = await query(sql, params);
    const total = await query(`SELECT COUNT(*) FROM students s JOIN users u ON u.id = s.user_id WHERE 1=1${class_id ? ` AND s.class_id = '${class_id}'` : ''}`);
    res.json({ students: result.rows, total: parseInt(total.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/students', async (req, res) => {
  try {
    const { name, email, phone, student_id, class_id, roll_number, password, year_of_joining } = req.body;
    if (!name || !email || !student_id) return res.status(400).json({ error: 'Name, email, and student ID are required' });
    if (!email.includes('@')) return res.status(400).json({ error: 'Invalid email format' });
    const hash = await bcrypt.hash(password || 'Student@123', 10);
    const user = await query(`INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1,$2,$3,'student',$4) RETURNING id`, [name, email, hash, phone || '']);
    const student = await query(`INSERT INTO students (user_id, student_id, roll_number, class_id, year_of_joining) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [user.rows[0].id, student_id, roll_number || '', class_id || null, year_of_joining || 2024]);
    await query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1, 'create_student', $2)`, [req.user.id, JSON.stringify({ studentId: student_id, email })]);
    await createNotification(
      user.rows[0].id,
      'Account Created',
      `Welcome to SmartAttend! Your student account has been created by the administrator. Student ID: ${student_id}. Please change your password after first login.`,
      'system'
    );
    res.status(201).json({ id: student.rows[0].id, message: 'Student created successfully' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email or student ID already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/students/:id', async (req, res) => {
  try {
    const { name, email, phone, class_id, roll_number, is_active } = req.body;
    const s = await query(`SELECT user_id FROM students WHERE id=$1`, [req.params.id]);
    if (s.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    await query(`UPDATE users SET name=$1, email=$2, phone=$3, is_active=$4, updated_at=NOW() WHERE id=$5`, [name, email, phone || '', is_active !== undefined ? is_active : true, s.rows[0].user_id]);
    await query(`UPDATE students SET class_id=$1, roll_number=$2 WHERE id=$3`, [class_id || null, roll_number || '', req.params.id]);
    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    const s = await query(`SELECT user_id FROM students WHERE id=$1`, [req.params.id]);
    if (s.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    await query(`UPDATE users SET is_active=false WHERE id=$1`, [s.rows[0].user_id]);
    await query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1, 'deactivate_student', $2)`, [req.user.id, JSON.stringify({ studentId: req.params.id })]);
    res.json({ message: 'Student deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── TEACHERS ────────────────────────────────────────────────────────────────
router.get('/teachers', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `SELECT t.*, u.name, u.email, u.phone, u.is_active FROM teachers t JOIN users u ON u.id = t.user_id WHERE 1=1`;
    const params = [];
    if (search) { sql += ` AND (u.name ILIKE $1 OR t.teacher_id ILIKE $1 OR t.department ILIKE $1)`; params.push(`%${search}%`); }
    sql += ' ORDER BY u.name';
    const result = await query(sql, params);
    res.json({ teachers: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/teachers', async (req, res) => {
  try {
    const { name, email, phone, teacher_id, department, designation, password } = req.body;
    if (!name || !email || !teacher_id) return res.status(400).json({ error: 'Name, email, and teacher ID are required' });
    if (!email.includes('@')) return res.status(400).json({ error: 'Invalid email format' });
    const hash = await bcrypt.hash(password || 'Teacher@123', 10);
    const user = await query(`INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1,$2,$3,'teacher',$4) RETURNING id`, [name, email, hash, phone || '']);
    const teacher = await query(`INSERT INTO teachers (user_id, teacher_id, department, designation) VALUES ($1,$2,$3,$4) RETURNING id`, [user.rows[0].id, teacher_id, department || '', designation || '']);
    await createNotification(
      user.rows[0].id,
      'Account Created',
      `Welcome to SmartAttend! Your teacher account has been created. Teacher ID: ${teacher_id}. Please change your password after first login.`,
      'system'
    );
    res.status(201).json({ id: teacher.rows[0].id, message: 'Teacher created successfully' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email or teacher ID already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/teachers/:id', async (req, res) => {
  try {
    const { name, email, phone, department, designation, is_active } = req.body;
    const t = await query(`SELECT user_id FROM teachers WHERE id=$1`, [req.params.id]);
    if (t.rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    await query(`UPDATE users SET name=$1, email=$2, phone=$3, is_active=$4, updated_at=NOW() WHERE id=$5`, [name, email, phone || '', is_active !== undefined ? is_active : true, t.rows[0].user_id]);
    await query(`UPDATE teachers SET department=$1, designation=$2 WHERE id=$3`, [department || '', designation || '', req.params.id]);
    res.json({ message: 'Teacher updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/teachers/:id', async (req, res) => {
  try {
    const t = await query(`SELECT user_id FROM teachers WHERE id=$1`, [req.params.id]);
    if (t.rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    await query(`UPDATE users SET is_active=false WHERE id=$1`, [t.rows[0].user_id]);
    res.json({ message: 'Teacher deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── CLASSES ─────────────────────────────────────────────────────────────────
router.get('/classes', async (req, res) => {
  try {
    const result = await query(`SELECT c.*, b.name as branch_name, COUNT(s.id) as student_count FROM classes c LEFT JOIN branches b ON b.id = c.branch_id LEFT JOIN students s ON s.class_id = c.id GROUP BY c.id, b.name ORDER BY c.name`);
    res.json({ classes: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/classes', async (req, res) => {
  try {
    const { name, section, branch_id, semester, academic_year } = req.body;
    const result = await query(`INSERT INTO classes (name, section, branch_id, semester, academic_year) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [name, section || '', branch_id || null, semester || 1, academic_year || '']);
    res.status(201).json({ id: result.rows[0].id, message: 'Class created' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/classes/:id', async (req, res) => {
  try {
    const { name, section, branch_id, semester, academic_year } = req.body;
    await query(`UPDATE classes SET name=$1, section=$2, branch_id=$3, semester=$4, academic_year=$5 WHERE id=$6`, [name, section || '', branch_id || null, semester || 1, academic_year || '', req.params.id]);
    res.json({ message: 'Class updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/classes/:id', async (req, res) => {
  try {
    await query(`DELETE FROM classes WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Class deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── BRANCHES ────────────────────────────────────────────────────────────────
router.get('/branches', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM branches ORDER BY name`);
    res.json({ branches: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/branches', async (req, res) => {
  try {
    const { name, code } = req.body;
    const result = await query(`INSERT INTO branches (name, code) VALUES ($1,$2) RETURNING *`, [name, code]);
    res.status(201).json({ branch: result.rows[0], message: 'Branch created' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Branch code already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/branches/:id', async (req, res) => {
  try {
    const { name, code } = req.body;
    await query(`UPDATE branches SET name=$1, code=$2 WHERE id=$3`, [name, code, req.params.id]);
    res.json({ message: 'Branch updated' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Branch code already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/branches/:id', async (req, res) => {
  try {
    await query(`DELETE FROM branches WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Branch deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── SUBJECTS ────────────────────────────────────────────────────────────────
router.get('/subjects', async (req, res) => {
  try {
    const { class_id, search } = req.query;
    let sql = `SELECT sub.*, c.name as class_name, c.section as class_section, u.name as teacher_name, t.teacher_id as teacher_code FROM subjects sub LEFT JOIN classes c ON c.id = sub.class_id LEFT JOIN teachers t ON t.id = sub.teacher_id LEFT JOIN users u ON u.id = t.user_id WHERE 1=1`;
    const params = [];
    if (class_id) { sql += ` AND sub.class_id = $${params.length + 1}`; params.push(class_id); }
    if (search) { sql += ` AND (sub.name ILIKE $${params.length + 1} OR sub.code ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    sql += ' ORDER BY sub.name';
    const result = await query(sql, params);
    res.json({ subjects: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/subjects', async (req, res) => {
  try {
    const { name, code, class_id, teacher_id, credits } = req.body;
    const result = await query(`INSERT INTO subjects (name, code, class_id, teacher_id, credits) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [name, code, class_id || null, teacher_id || null, credits || 3]);
    res.status(201).json({ id: result.rows[0].id, message: 'Subject created' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Subject code already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/subjects/:id', async (req, res) => {
  try {
    const { name, code, class_id, teacher_id, credits } = req.body;
    await query(`UPDATE subjects SET name=$1, code=$2, class_id=$3, teacher_id=$4, credits=$5 WHERE id=$6`, [name, code, class_id || null, teacher_id || null, credits || 3, req.params.id]);
    res.json({ message: 'Subject updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/subjects/:id', async (req, res) => {
  try {
    await query(`DELETE FROM subjects WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────
router.get('/reports', async (req, res) => {
  try {
    const { from, to, class_id, subject_id, student_id, status, semester, session, search, limit = 50, offset = 0 } = req.query;
    const params = [];
    let sql = `SELECT a.*, u.name as student_name, s.student_id as student_code,
                sub.name as subject_name, sub.code as subject_code,
                c.name as class_name, c.section,
                mu.name as marked_by_name
               FROM attendance a
               JOIN students s ON s.id = a.student_id
               JOIN users u ON u.id = s.user_id
               JOIN subjects sub ON sub.id = a.subject_id
               LEFT JOIN classes c ON c.id = sub.class_id
               LEFT JOIN users mu ON mu.id = a.marked_by
               WHERE 1=1`;
    if (from) { sql += ` AND a.date >= $${params.length+1}`; params.push(from); }
    if (to) { sql += ` AND a.date <= $${params.length+1}`; params.push(to); }
    if (subject_id) { sql += ` AND a.subject_id = $${params.length+1}`; params.push(subject_id); }
    if (student_id) { sql += ` AND a.student_id = $${params.length+1}`; params.push(student_id); }
    if (status) { sql += ` AND a.status = $${params.length+1}`; params.push(status); }
    if (class_id) { sql += ` AND sub.class_id = $${params.length+1}`; params.push(class_id); }
    if (semester) { sql += ` AND a.semester = $${params.length+1}`; params.push(parseInt(semester)); }
    if (session) { sql += ` AND a.session = $${params.length+1}`; params.push(session); }
    if (search) { sql += ` AND (u.name ILIKE $${params.length+1} OR s.student_id ILIKE $${params.length+1})`; params.push(`%${search}%`); }
    sql += ' ORDER BY a.date DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Get total count for pagination metadata
    let countSql = `SELECT COUNT(*) as total FROM attendance a
                    JOIN students s ON s.id = a.student_id
                    JOIN users u ON u.id = s.user_id
                    JOIN subjects sub ON sub.id = a.subject_id
                    LEFT JOIN classes c ON c.id = sub.class_id
                    WHERE 1=1`;
    const countParams = [];
    if (from) { countSql += ` AND a.date >= $${countParams.length+1}`; countParams.push(from); }
    if (to) { countSql += ` AND a.date <= $${countParams.length+1}`; countParams.push(to); }
    if (subject_id) { countSql += ` AND a.subject_id = $${countParams.length+1}`; countParams.push(subject_id); }
    if (student_id) { countSql += ` AND a.student_id = $${countParams.length+1}`; countParams.push(student_id); }
    if (status) { countSql += ` AND a.status = $${countParams.length+1}`; countParams.push(status); }
    if (class_id) { countSql += ` AND sub.class_id = $${countParams.length+1}`; countParams.push(class_id); }
    if (semester) { countSql += ` AND a.semester = $${countParams.length+1}`; countParams.push(parseInt(semester)); }
    if (session) { countSql += ` AND a.session = $${countParams.length+1}`; countParams.push(session); }
    if (search) { countSql += ` AND (u.name ILIKE $${countParams.length+1} OR s.student_id ILIKE $${countParams.length+1})`; countParams.push(`%${search}%`); }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      records: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + parseInt(limit) < total
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reports/pivot', async (req, res) => {
  try {
    const { from, to, class_id, subject_id, search } = req.query;
    const params = [];
    let sql = `SELECT s.id as student_id, u.name, s.student_id as student_code, s.roll_number,
                a.date, a.status
               FROM attendance a
               JOIN students s ON s.id = a.student_id
               JOIN users u ON u.id = s.user_id
               JOIN subjects sub ON sub.id = a.subject_id
               WHERE 1=1`;
    if (from)       { sql += ` AND a.date >= $${params.length+1}`; params.push(from); }
    if (to)         { sql += ` AND a.date <= $${params.length+1}`; params.push(to); }
    if (subject_id) { sql += ` AND a.subject_id = $${params.length+1}`; params.push(subject_id); }
    if (class_id)   { sql += ` AND sub.class_id = $${params.length+1}`; params.push(class_id); }
    if (search)     { sql += ` AND (u.name ILIKE $${params.length+1} OR s.student_id ILIKE $${params.length+1})`; params.push(`%${search}%`); }
    sql += ' ORDER BY s.roll_number, u.name, a.date ASC';
    const result = await query(sql, params);
    const rows = result.rows;

    const datesSet = new Set(rows.map(r => {
      const d = r.date;
      return d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
    }));
    const dates = [...datesSet].sort();

    const studentMap = {};
    for (const row of rows) {
      const sid = row.student_id;
      const dateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0];
      if (!studentMap[sid]) {
        studentMap[sid] = { name: row.name, roll_number: row.roll_number || row.student_code, student_code: row.student_code, dateMap: {} };
      }
      if (!studentMap[sid].dateMap[dateStr] || row.status === 'present') {
        studentMap[sid].dateMap[dateStr] = row.status === 'present' ? 'P' : 'A';
      }
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

router.get('/analytics', async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFrom = from || new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
    const dateTo = to || new Date().toISOString().split('T')[0];

    const [trend, lowAtt, subjectStats, anomalies] = await Promise.all([
      query(`SELECT date, status, COUNT(*) as count FROM attendance WHERE date BETWEEN $1 AND $2 GROUP BY date, status ORDER BY date`, [dateFrom, dateTo]),
      query(`SELECT s.id as student_id, u.name, s.student_id as student_code, c.name as class_name, c.section,
               COUNT(*) as total_classes, SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_count,
               ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/COUNT(*), 1) as percentage
             FROM attendance a JOIN students s ON s.id=a.student_id JOIN users u ON u.id=s.user_id JOIN classes c ON c.id=s.class_id
             WHERE a.date BETWEEN $1 AND $2 GROUP BY s.id, u.name, s.student_id, c.name, c.section
             HAVING ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/COUNT(*), 1) < 75
             ORDER BY percentage ASC`, [dateFrom, dateTo]),
      query(`SELECT sub.name, sub.code,
               COUNT(*) as total, SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present,
               ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/COUNT(*), 1) as avg_attendance
             FROM attendance a JOIN subjects sub ON sub.id=a.subject_id
             WHERE a.date BETWEEN $1 AND $2 GROUP BY sub.id, sub.name, sub.code ORDER BY avg_attendance`, [dateFrom, dateTo]),
      query(`SELECT COUNT(*) as count FROM anomaly_logs WHERE created_at >= $1`, [dateFrom]),
    ]);

    const trendMap = {};
    trend.rows.forEach(r => {
      if (!trendMap[r.date]) trendMap[r.date] = { date: r.date, present: 0, absent: 0, late: 0 };
      trendMap[r.date][r.status] = parseInt(r.count);
    });

    res.json({
      trend: Object.values(trendMap),
      lowAttendance: lowAtt.rows,
      subjectStats: subjectStats.rows,
      anomalyCount: parseInt(anomalies.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/audit-logs', async (req, res) => {
  try {
    const result = await query(`SELECT al.*, u.name as user_name, u.email FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id ORDER BY al.created_at DESC LIMIT 200`);
    res.json({ logs: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/anomalies', async (req, res) => {
  try {
    const result = await query(`SELECT al.*, u.name as student_name, s.student_id as student_code, sub.name as subject_name FROM anomaly_logs al JOIN students s ON s.id=al.student_id JOIN users u ON u.id=s.user_id LEFT JOIN subjects sub ON sub.id=al.subject_id ORDER BY al.created_at DESC LIMIT 100`);
    res.json({ anomalies: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── ADVANCED ATTENDANCE ANALYTICS ───────────────────────────────────────────

router.get('/attendance/analytics', async (req, res) => {
  try {
    const { from, to, class_id } = req.query;
    if (from && to && from > to) return res.status(400).json({ error: 'from_date must be <= to_date' });
    const [classWise, subjectWise] = await Promise.all([
      getClassWiseAnalytics({ from, to }),
      getSubjectWiseAnalytics({ from, to, class_id }),
    ]);
    res.json({ classWise, subjectWise });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/attendance/student/:id', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (from && to && from > to) return res.status(400).json({ error: 'from_date must be <= to_date' });
    const result = await getStudentAnalysis(req.params.id, { from, to });
    if (!result) return res.status(404).json({ error: 'Student not found or no attendance data' });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/attendance/low-shortlist', async (req, res) => {
  try {
    const { class_id, subject_id, from, to, threshold, search } = req.query;
    if (from && to && from > to) return res.status(400).json({ error: 'from_date must be <= to_date' });
    const rawThresh = parseFloat(threshold);
    const thresh = isNaN(rawThresh) ? 75 : rawThresh;
    if (thresh < 1 || thresh > 100) return res.status(400).json({ error: 'threshold must be between 1 and 100' });
    const students = await getLowAttendanceShortlist({ class_id, subject_id, from, to, threshold: thresh, search });
    res.json({ students, threshold: thresh });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── SESSION MANAGEMENT (Admin only) ──────────────────────────────────────────

router.get('/sessions', async (req, res) => {
  try {
    const { teacher_id, subject_id, date } = req.query;
    const params = [];
    let sql = `SELECT sess.*,
                sub.name as subject_name, sub.code as subject_code,
                c.name as class_name, c.section as class_section,
                u.name as teacher_name,
                CASE
                  WHEN sess.is_active = false THEN 'stopped'
                  WHEN sess.expires_at <= NOW() THEN 'expired'
                  ELSE 'active'
                END as status
               FROM attendance_sessions sess
               JOIN subjects sub ON sub.id=sess.subject_id
               LEFT JOIN classes c ON c.id=sub.class_id
               LEFT JOIN teachers t ON t.id=sess.teacher_id
               LEFT JOIN users u ON u.id=t.user_id
               WHERE 1=1`;
    if (teacher_id) { sql += ` AND sess.teacher_id=$${params.length+1}`; params.push(teacher_id); }
    if (subject_id) { sql += ` AND sess.subject_id=$${params.length+1}`; params.push(subject_id); }
    if (date) { sql += ` AND sess.session_date=$${params.length+1}`; params.push(date); }
    else { sql += ` AND sess.session_date=CURRENT_DATE`; }
    sql += ' ORDER BY sess.created_at DESC';
    const result = await query(sql, params);
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Force-stop any session (admin only)
router.delete('/sessions/:id', async (req, res) => {
  try {
    const result = await query(
      `UPDATE attendance_sessions SET is_active=false WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    await query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'admin_force_stop_session',$2)`,
      [req.user.id, JSON.stringify({ session_id: req.params.id })]
    );
    res.json({ message: 'Session force-stopped by admin' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── ACADEMIC SESSIONS ────────────────────────────────────────────────────────

router.get('/academic-sessions', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM academic_sessions ORDER BY start_date DESC`);
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/academic-sessions', async (req, res) => {
  try {
    const { name, start_date, end_date, is_active = false } = req.body;
    if (!name || !start_date || !end_date) return res.status(400).json({ error: 'name, start_date, end_date required' });
    if (!/^\d{4}-\d{2}$/.test(name)) return res.status(400).json({ error: 'Session name must be in format YYYY-YY (e.g. 2025-26)' });
    if (is_active) {
      await query(`UPDATE academic_sessions SET is_active = false`);
    }
    const result = await query(
      `INSERT INTO academic_sessions (name, start_date, end_date, is_active) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, start_date, end_date, is_active]
    );
    await query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'create_academic_session',$2)`,
      [req.user.id, JSON.stringify({ name })]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Academic session already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/academic-sessions/:id', async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body;
    const result = await query(
      `UPDATE academic_sessions SET name=$1, start_date=$2, end_date=$3 WHERE id=$4 RETURNING *`,
      [name, start_date, end_date, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/academic-sessions/:id/activate', async (req, res) => {
  try {
    await query(`UPDATE academic_sessions SET is_active = false`);
    const result = await query(
      `UPDATE academic_sessions SET is_active = true WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    await query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'activate_academic_session',$2)`,
      [req.user.id, JSON.stringify({ session_id: req.params.id, name: result.rows[0].name })]
    );
    res.json({ message: `Session "${result.rows[0].name}" is now active`, session: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/academic-sessions/:id', async (req, res) => {
  try {
    const check = await query(`SELECT is_active FROM academic_sessions WHERE id=$1`, [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    if (check.rows[0].is_active) return res.status(400).json({ error: 'Cannot delete the active session' });
    await query(`DELETE FROM academic_sessions WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Session deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── STUDENT PROMOTION ────────────────────────────────────────────────────────

router.post('/promote', async (req, res) => {
  try {
    const { new_session, class_id, max_semester = 8 } = req.body;
    if (!new_session) return res.status(400).json({ error: 'new_session is required' });
    if (!/^\d{4}-\d{2}$/.test(new_session)) return res.status(400).json({ error: 'new_session must be in format YYYY-YY (e.g. 2025-26)' });

    const promoted = await withTransaction(async (client) => {
      // BUG-03 fix: AND current_session != $2 prevents double-promotion
      let sql = `
        UPDATE students
        SET current_semester = LEAST(current_semester + 1, $1),
            current_session  = $2
        WHERE is_deleted = false
          AND current_semester < $1
          AND current_session != $2
      `;
      const params = [max_semester, new_session];
      if (class_id) {
        sql += ` AND class_id = $${params.length + 1}`;
        params.push(class_id);
      }
      sql += ` RETURNING id, user_id, current_semester`;

      const result = await client.query(sql, params);
      const promotedRows = result.rows;

      for (const stu of promotedRows) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'system')`,
          [
            stu.user_id,
            'Promoted to Next Semester',
            `Congratulations! You have been promoted to Semester ${stu.current_semester} for the academic session ${new_session}.`
          ]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'bulk_promote_students',$2)`,
        [req.user.id, JSON.stringify({ promoted: promotedRows.length, new_session, class_id: class_id || 'all', max_semester })]
      );

      return promotedRows.length;
    });

    res.json({ promoted, new_session, message: `${promoted} student(s) promoted to session "${new_session}"` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Preview promotion (how many students would be affected)
router.get('/promote/preview', async (req, res) => {
  try {
    const { class_id, max_semester = 8 } = req.query;
    let sql = `SELECT COUNT(*) as count FROM students WHERE is_deleted=false AND current_semester < $1`;
    const params = [parseInt(max_semester)];
    if (class_id) { sql += ` AND class_id=$${params.length+1}`; params.push(class_id); }
    const result = await query(sql, params);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
