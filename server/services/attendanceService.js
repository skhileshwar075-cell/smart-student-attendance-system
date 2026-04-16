const { query } = require('../db/database');

async function getLowAttendanceShortlist({ teacherId, class_id, subject_id, from, to, threshold, search }) {
  const rawThresh = parseFloat(threshold);
  const thresh = isNaN(rawThresh) ? 75 : rawThresh;
  const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const dateTo = to || new Date().toISOString().split('T')[0];
  if (dateFrom > dateTo) throw new Error('from_date must be <= to_date');

  const params = [dateFrom, dateTo];
  let sql = `
    SELECT s.id as student_id, u.name, s.student_id as student_code, s.roll_number,
      u.phone,
      c.name as class_name, c.section,
      COUNT(*) as total_classes,
      SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as absent_count,
      ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as percentage
    FROM attendance a
    JOIN students s ON s.id=a.student_id
    JOIN users u ON u.id=s.user_id
    JOIN subjects sub ON sub.id=a.subject_id
    LEFT JOIN classes c ON c.id=s.class_id
    WHERE a.date BETWEEN $1 AND $2`;

  if (teacherId) { params.push(teacherId); sql += ` AND sub.teacher_id=$${params.length}`; }
  if (class_id) { params.push(class_id); sql += ` AND s.class_id=$${params.length}`; }
  if (subject_id) { params.push(subject_id); sql += ` AND a.subject_id=$${params.length}`; }
  if (search) { params.push(`%${search}%`); sql += ` AND (u.name ILIKE $${params.length} OR s.student_id ILIKE $${params.length})`; }

  sql += ` GROUP BY s.id, u.name, u.phone, s.student_id, s.roll_number, c.name, c.section`;
  params.push(thresh);
  sql += ` HAVING ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) < $${params.length}`;
  sql += ` ORDER BY percentage ASC`;

  const result = await query(sql, params);
  return result.rows;
}

async function getClassWiseAnalytics({ from, to }) {
  const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const dateTo = to || new Date().toISOString().split('T')[0];
  const result = await query(`
    SELECT c.id, c.name as class_name, c.section,
      COUNT(DISTINCT s.id) as total_students,
      COUNT(*) as total_records,
      SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as absent_count,
      ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as avg_attendance
    FROM attendance a
    JOIN students s ON s.id=a.student_id
    LEFT JOIN classes c ON c.id=s.class_id
    WHERE a.date BETWEEN $1 AND $2
    GROUP BY c.id, c.name, c.section
    ORDER BY avg_attendance DESC
  `, [dateFrom, dateTo]);
  return result.rows;
}

async function getSubjectWiseAnalytics({ from, to, class_id }) {
  const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const dateTo = to || new Date().toISOString().split('T')[0];
  const params = [dateFrom, dateTo];
  let sql = `
    SELECT sub.id, sub.name as subject_name, sub.code,
      c.name as class_name, c.section,
      COUNT(*) as total_records,
      SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as absent_count,
      ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as avg_attendance
    FROM attendance a
    JOIN subjects sub ON sub.id=a.subject_id
    LEFT JOIN classes c ON c.id=sub.class_id
    WHERE a.date BETWEEN $1 AND $2`;
  if (class_id) { params.push(class_id); sql += ` AND sub.class_id=$${params.length}`; }
  sql += ` GROUP BY sub.id, sub.name, sub.code, c.name, c.section ORDER BY avg_attendance DESC`;
  const result = await query(sql, params);
  return result.rows;
}

async function getStudentAnalysis(studentId, { from, to }) {
  const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const dateTo = to || new Date().toISOString().split('T')[0];
  const [profile, overall, bySubject] = await Promise.all([
    query(`SELECT u.name, u.email, s.student_id as student_code, c.name as class_name, c.section
           FROM students s JOIN users u ON u.id=s.user_id LEFT JOIN classes c ON c.id=s.class_id WHERE s.id=$1`, [studentId]),
    query(`SELECT COUNT(*) as total_classes,
             SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_count,
             SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as absent_count,
             ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as percentage
           FROM attendance a WHERE a.student_id=$1 AND a.date BETWEEN $2 AND $3`, [studentId, dateFrom, dateTo]),
    query(`SELECT sub.name as subject_name, sub.code,
             COUNT(*) as total_classes,
             SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_count,
             SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as absent_count,
             ROUND(100.0*SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as percentage
           FROM attendance a JOIN subjects sub ON sub.id=a.subject_id
           WHERE a.student_id=$1 AND a.date BETWEEN $2 AND $3
           GROUP BY sub.id, sub.name, sub.code ORDER BY percentage ASC`, [studentId, dateFrom, dateTo]),
  ]);
  if (!profile.rows.length) return null;
  return { profile: profile.rows[0], overall: overall.rows[0], bySubject: bySubject.rows };
}

module.exports = { getLowAttendanceShortlist, getClassWiseAnalytics, getSubjectWiseAnalytics, getStudentAnalysis };
