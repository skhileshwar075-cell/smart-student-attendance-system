/*
  Seed script for SmartAttend.

  This script inserts demo Admin, Teacher, Student, branch, class, subject,
  and attendance data for development and testing. It only runs if the
  admin account `admin@smartattend.edu` is not already present.

  Use this file for reference when reviewing seeded users and the demo
  accounts configured for the application.
*/

const { query } = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    const existing = await query("SELECT id FROM users WHERE email = 'admin@smartattend.edu' LIMIT 1");
    if (existing.rows.length > 0) {
      console.log('Seed data already present, skipping...');
      return;
    }

    console.log('Seeding database...');
    const hash = (p) => bcrypt.hash(p, 10);

    const adminHash = await hash('Admin@123');
    const teacherHash = await hash('Teacher@123');
    const studentHash = await hash('Student@123');

    await query(`INSERT INTO users (name, email, password_hash, role, phone) VALUES
      ('System Admin', 'admin@smartattend.edu', $1, 'admin', '9800000001')`, [adminHash]);

    await query(`INSERT INTO academic_sessions (name, start_date, end_date, is_active) VALUES ('2024-25', '2024-07-01', '2025-05-31', true) ON CONFLICT (name) DO NOTHING`);

    const branch = await query(`INSERT INTO branches (name, code) VALUES ('Computer Science Engineering', 'CSE') RETURNING id`);
    const branchId = branch.rows[0].id;

    const cls = await query(`INSERT INTO classes (name, section, branch_id, semester, academic_year) VALUES ('B.Tech CSE', 'A', $1, 6, '2024-25') RETURNING id`, [branchId]);
    const classId = cls.rows[0].id;

    const t1User = await query(`INSERT INTO users (name, email, password_hash, role, phone) VALUES ('Dr. Priya Sharma', 'priya@smartattend.edu', $1, 'teacher', '9876543210') RETURNING id`, [teacherHash]);
    const t1 = await query(`INSERT INTO teachers (user_id, teacher_id, department, designation) VALUES ($1, 'T001', 'Computer Science', 'Associate Professor') RETURNING id`, [t1User.rows[0].id]);

    const t2User = await query(`INSERT INTO users (name, email, password_hash, role, phone) VALUES ('Prof. Rajan Kumar', 'rajan@smartattend.edu', $1, 'teacher', '9876543211') RETURNING id`, [teacherHash]);
    const t2 = await query(`INSERT INTO teachers (user_id, teacher_id, department, designation) VALUES ($1, 'T002', 'Mathematics', 'Assistant Professor') RETURNING id`, [t2User.rows[0].id]);

    const subjects = await query(`
      INSERT INTO subjects (name, code, class_id, teacher_id, credits, semester, session) VALUES
        ('Data Structures & Algorithms', 'CS601', $1, $2, 4, 6, '2024-25'),
        ('Database Management Systems', 'CS602', $1, $2, 3, 6, '2024-25'),
        ('Operating Systems', 'CS603', $1, $2, 3, 6, '2024-25'),
        ('Engineering Mathematics III', 'MA601', $1, $3, 4, 6, '2024-25')
      RETURNING id`, [classId, t1.rows[0].id, t2.rows[0].id]);

    const subjectIds = subjects.rows.map(r => r.id);

    const studentData = [
      ['Aarav Singh', 'aarav@smartattend.edu', '21CS001', 'S001'],
      ['Priya Patel', 'priya.s@smartattend.edu', '21CS002', 'S002'],
      ['Rahul Verma', 'rahul@smartattend.edu', '21CS003', 'S003'],
      ['Ananya Gupta', 'ananya@smartattend.edu', '21CS004', 'S004'],
      ['Karan Mehta', 'karan@smartattend.edu', '21CS005', 'S005'],
      ['Sneha Reddy', 'sneha@smartattend.edu', '21CS006', 'S006'],
    ];

    const studentIds = [];
    for (const [name, email, roll, sid] of studentData) {
      const u = await query(`INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'student') RETURNING id`, [name, email, studentHash]);
      const s = await query(`INSERT INTO students (user_id, student_id, roll_number, class_id, year_of_joining, current_semester, current_session, created_by) VALUES ($1, $2, $3, $4, 2021, 6, '2024-25', $5) RETURNING id`, [u.rows[0].id, sid, roll, classId, t1.rows[0].id]);
      studentIds.push(s.rows[0].id);
    }

    const today = new Date();
    const statuses = ['present', 'present', 'present', 'present', 'absent'];
    for (let d = 25; d >= 1; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const dateStr = date.toISOString().split('T')[0];

      for (const subId of subjectIds) {
        for (const stuId of studentIds) {
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          await query(`
            INSERT INTO attendance (student_id, subject_id, date, status, method, semester, session)
            VALUES ($1, $2, $3, $4, 'manual', 6, '2024-25')
            ON CONFLICT (student_id, subject_id, date) DO NOTHING`,
            [stuId, subId, dateStr, status]);
        }
      }
    }

    const adminUser = await query(`SELECT id FROM users WHERE email='admin@smartattend.edu'`);
    const adminUserId = adminUser.rows[0].id;
    const aaravUser = await query(`SELECT id FROM users WHERE email='aarav@smartattend.edu'`);
    const aaravUserId = aaravUser.rows[0].id;

    await query(`
      INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
        ($1, 'Welcome to SmartAttend', 'Your admin account is ready. Manage students, teachers, and classes from your dashboard.', 'system', false),
        ($1, 'System Ready', 'The SmartAttend platform has been initialized successfully with demo data.', 'info', true),
        ($2, 'Welcome, Dr. Priya!', 'Your teacher account is active. Start taking attendance using QR codes or session codes.', 'system', false),
        ($2, 'New Student Enrolled', 'Aarav Singh has been added to your class B.Tech CSE - A.', 'info', false),
        ($3, 'Welcome to SmartAttend!', 'Your student account is ready. Mark your attendance using session codes or QR codes from your teacher.', 'system', false),
        ($3, 'Low Attendance Alert', 'Your attendance in Engineering Mathematics III is below 75%. Please attend classes regularly.', 'warning', false),
        ($3, 'Attendance Marked', 'Your attendance for Data Structures & Algorithms has been recorded successfully.', 'attendance', true)
    `, [adminUserId, t1User.rows[0].id, aaravUserId]);

    console.log('Database seeded successfully!');
    console.log('  Admin:   admin@smartattend.edu / Admin@123');
    console.log('  Teacher: priya@smartattend.edu / Teacher@123');
    console.log('  Student: aarav@smartattend.edu / Student@123');
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

module.exports = { seed };
