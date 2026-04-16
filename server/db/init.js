const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const client = await pool.connect();
  try {
    // ── Core tables (idempotent) ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
        phone VARCHAR(20),
        profile_photo TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        section VARCHAR(10) NOT NULL,
        branch_id INTEGER REFERENCES branches(id),
        semester INTEGER NOT NULL,
        academic_year VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        teacher_id VARCHAR(50) UNIQUE NOT NULL,
        department VARCHAR(255),
        designation VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        student_id VARCHAR(50) UNIQUE NOT NULL,
        class_id INTEGER REFERENCES classes(id),
        roll_number VARCHAR(50),
        year_of_joining INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        class_id INTEGER REFERENCES classes(id),
        teacher_id INTEGER REFERENCES teachers(id),
        credits INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id),
        teacher_id INTEGER REFERENCES teachers(id),
        class_id INTEGER REFERENCES classes(id),
        session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('manual', 'qr', 'code', 'secure')),
        code VARCHAR(20),
        qr_data TEXT,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        geo_lat DOUBLE PRECISION,
        geo_lng DOUBLE PRECISION,
        geo_radius INTEGER DEFAULT 100,
        session_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        subject_id INTEGER REFERENCES subjects(id),
        session_id INTEGER REFERENCES attendance_sessions(id),
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
        method VARCHAR(50) DEFAULT 'manual',
        marked_by INTEGER REFERENCES users(id),
        verified BOOLEAN DEFAULT true,
        face_verified BOOLEAN DEFAULT false,
        anomaly_flag BOOLEAN DEFAULT false,
        anomaly_reason TEXT,
        geo_lat DOUBLE PRECISION,
        geo_lng DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, subject_id, date)
      );

      CREATE TABLE IF NOT EXISTS attendance_requests (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        subject_id INTEGER REFERENCES subjects(id),
        date DATE NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        teacher_note TEXT,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        target_type VARCHAR(100),
        target_id INTEGER,
        details JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS anomaly_logs (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        subject_id INTEGER REFERENCES subjects(id),
        session_id INTEGER REFERENCES attendance_sessions(id),
        flag_type VARCHAR(100) NOT NULL,
        description TEXT,
        confidence DOUBLE PRECISION DEFAULT 0,
        resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Safe migrations: each wrapped in a savepoint so one failure
    //    cannot poison the connection and block subsequent migrations ──────────
    const migrations = [
      `ALTER TABLE teachers ADD COLUMN IF NOT EXISTS designation VARCHAR(255)`,
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS year_of_joining INTEGER`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT`,
      `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT false`,
      `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS anomaly_flag BOOLEAN DEFAULT false`,
      `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS anomaly_reason TEXT`,
      `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION`,
      `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION`,
      `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES attendance_sessions(id)`,
      `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id)`,
      `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`,
      `ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS class_id UUID`,
    ];

    for (let i = 0; i < migrations.length; i++) {
      const sp = `mig_${i}`;
      try {
        await client.query(`SAVEPOINT ${sp}`);
        await client.query(migrations[i]);
        await client.query(`RELEASE SAVEPOINT ${sp}`);
      } catch (_) {
        await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
      }
    }

    // ── Backfill class_id in attendance_sessions from subjects ────────────────
    await client.query(`
      UPDATE attendance_sessions sess
      SET class_id = sub.class_id
      FROM subjects sub
      WHERE sess.subject_id = sub.id AND sess.class_id IS NULL
    `).catch(() => {});

    console.log('Database schema ready');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
