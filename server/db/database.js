const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

async function initDB() {
  // Drop old tables from previous schema versions if they exist with wrong structure
  await query(`
    DROP TABLE IF EXISTS anomaly_logs CASCADE;
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS attendance_requests CASCADE;
    DROP TABLE IF EXISTS attendance CASCADE;
    DROP TABLE IF EXISTS attendance_sessions CASCADE;
    DROP TABLE IF EXISTS subjects CASCADE;
    DROP TABLE IF EXISTS students CASCADE;
    DROP TABLE IF EXISTS teachers CASCADE;
    DROP TABLE IF EXISTS classes CASCADE;
    DROP TABLE IF EXISTS branches CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('admin','teacher','student')),
      phone VARCHAR(20),
      is_active BOOLEAN DEFAULT true,
      fcm_token VARCHAR(255),
      face_encoding TEXT,
      profile_photo VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS branches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      code VARCHAR(20) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS classes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      section VARCHAR(10),
      branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
      semester INTEGER,
      academic_year VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      teacher_id VARCHAR(50) UNIQUE NOT NULL,
      department VARCHAR(100),
      designation VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      student_id VARCHAR(50) UNIQUE NOT NULL,
      roll_number VARCHAR(50),
      class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
      year_of_joining INTEGER,
      current_semester INTEGER DEFAULT 1,
      current_session VARCHAR(20) DEFAULT '2024-25',
      created_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
      is_deleted BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
      teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
      credits INTEGER DEFAULT 3,
      semester INTEGER,
      session VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
      teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
      class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
      session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('manual','qr','code','secure')),
      code VARCHAR(20),
      qr_data TEXT,
      session_date DATE NOT NULL,
      geo_lat DECIMAL(10,7),
      geo_lng DECIMAL(10,7),
      geo_radius INTEGER DEFAULT 100,
      expires_at TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
      session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL,
      date DATE NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('present','absent','late','excused')),
      method VARCHAR(20) DEFAULT 'manual',
      semester INTEGER,
      session VARCHAR(20),
      geo_lat DECIMAL(10,7),
      geo_lng DECIMAL(10,7),
      face_verified BOOLEAN DEFAULT false,
      anomaly_flag BOOLEAN DEFAULT false,
      anomaly_reason VARCHAR(255),
      marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, subject_id, date)
    );

    CREATE TABLE IF NOT EXISTS academic_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(20) UNIQUE NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_active BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS attendance_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      teacher_note TEXT,
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(20) DEFAULT 'info',
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS anomaly_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
      session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL,
      flag_type VARCHAR(50) NOT NULL,
      description TEXT,
      confidence DECIMAL(5,2),
      resolved BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      details JSONB,
      ip_address VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_reset_otps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(100) NOT NULL,
      otp VARCHAR(6) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      attempts INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Database schema ready');
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { query, withTransaction, initDB };
