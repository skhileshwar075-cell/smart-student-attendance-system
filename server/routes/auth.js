const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { query } = require('../db/database');
const { authenticateToken, requireRole, JWT_SECRET } = require('../middleware/auth');
const { registerFaceEmbedding, getFaceRegistrationRequired } = require('../services/faceVerificationService');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ error: 'Invalid email format' });
    if (typeof password !== 'string' || password.length < 4) return res.status(400).json({ error: 'Password too short' });

    const result = await query(
      `SELECT u.*, 
        CASE WHEN u.role = 'student' THEN s.id WHEN u.role = 'teacher' THEN t.id ELSE NULL END as profile_id,
        CASE WHEN u.role = 'student' THEN s.class_id ELSE NULL END as class_id,
        CASE WHEN u.role = 'student' THEN s.student_id ELSE NULL END as student_code,
        CASE WHEN u.role = 'teacher' THEN t.teacher_id ELSE NULL END as teacher_code
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN teachers t ON t.user_id = u.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    await query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1, 'login', $2)`, [user.id, JSON.stringify({ email })]);

    const token = jwt.sign(
      { id: user.id, role: user.role, profileId: user.profile_id, classId: user.class_id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        profileId: user.profile_id, classId: user.class_id,
        studentCode: user.student_code, teacherCode: user.teacher_code,
        phone: user.phone, profilePhoto: user.profile_photo,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/face/status', authenticateToken, async (req, res) => {
  try {
    const user = await query(`SELECT face_registered_at, face_encoding IS NOT NULL AS face_registered FROM users WHERE id=$1`, [req.user.id]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const required = await getFaceRegistrationRequired();
    res.json({
      faceRegistered: user.rows[0].face_registered,
      faceRegisteredAt: user.rows[0].face_registered_at,
      required,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/face/register', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { face_encoding } = req.body;
    if (!face_encoding) {
      return res.status(400).json({ error: 'face_encoding is required for face registration' });
    }

    const embeddingLength = await registerFaceEmbedding(req.user.id, face_encoding);
    await query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'face_register',$2)`, [req.user.id, JSON.stringify({ embeddingLength })]);
    res.json({ message: 'Face registered successfully', embeddingLength });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to register face' });
  }
});

// ── OTP helpers ────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateOTP() {
  return String(Math.floor(100000 + crypto.randomInt(900000)));
}

async function sendOTPEmail(email, otp, name) {
  try {
    const mailOptions = {
      from: `"SmartAttend System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset OTP - SmartAttend',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>You requested a password reset for your SmartAttend account.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0; color: #007bff;">Your OTP Code: <strong>${otp}</strong></h3>
            <p style="margin: 10px 0 0 0; color: #666;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          </div>
          <p>If you didn't request this reset, please ignore this email.</p>
          <p>Best regards,<br>SmartAttend Team</p>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`OTP email sent successfully to ${email}`);
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    // Fallback to console logging in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n📧 OTP for ${name} (${email}): ${otp}  [expires in ${OTP_EXPIRY_MINUTES} min]\n`);
    } else {
      throw error; // In production, fail if email can't be sent
    }
  }
}

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, student_id } = req.body;
    if (!email && !student_id) return res.status(400).json({ error: 'Provide email or student ID' });

    let user;
    if (email) {
      if (!email.includes('@')) return res.status(400).json({ error: 'Invalid email format' });
      const r = await query(`SELECT u.id, u.name, u.email, u.role, u.is_active FROM users u WHERE u.email=$1`, [email]);
      user = r.rows[0];
    } else {
      const r = await query(
        `SELECT u.id, u.name, u.email, u.role, u.is_active FROM users u JOIN students s ON s.user_id=u.id WHERE s.student_id=$1`,
        [student_id]
      );
      user = r.rows[0];
    }

    if (!user || !user.is_active) {
      return res.status(404).json({ error: 'No active account found with those details' });
    }

    // Invalidate old OTPs for this user
    await query(`UPDATE password_reset_otps SET used=true WHERE user_id=$1 AND used=false`, [user.id]);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO password_reset_otps (user_id, email, otp, expires_at) VALUES ($1,$2,$3,$4)`,
      [user.id, user.email, otp, expiresAt]
    );

    await sendOTPEmail(user.email, otp, user.name);
    await query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'forgot_password',$2)`,
      [user.id, JSON.stringify({ email: user.email })]);

    res.json({
      message: `OTP sent to ${user.email.replace(/(.{2}).+(@.+)/, '$1***$2')}`,
      email_masked: user.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, student_id, otp } = req.body;
    if (!otp || otp.length !== 6) return res.status(400).json({ error: 'OTP must be 6 digits' });
    if (!email && !student_id) return res.status(400).json({ error: 'Provide email or student ID' });

    let userId;
    if (email) {
      const r = await query(`SELECT id FROM users WHERE email=$1 AND is_active=true`, [email]);
      userId = r.rows[0]?.id;
    } else {
      const r = await query(`SELECT u.id FROM users u JOIN students s ON s.user_id=u.id WHERE s.student_id=$1 AND u.is_active=true`, [student_id]);
      userId = r.rows[0]?.id;
    }
    if (!userId) return res.status(404).json({ error: 'Account not found' });

    const r = await query(
      `SELECT * FROM password_reset_otps WHERE user_id=$1 AND used=false ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const record = r.rows[0];
    if (!record) return res.status(400).json({ error: 'No active OTP found. Please request a new one.' });

    // Increment attempt counter
    await query(`UPDATE password_reset_otps SET attempts=attempts+1 WHERE id=$1`, [record.id]);

    if (record.attempts + 1 >= MAX_OTP_ATTEMPTS) {
      await query(`UPDATE password_reset_otps SET used=true WHERE id=$1`, [record.id]);
      return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
    }
    if (new Date() > new Date(record.expires_at)) {
      await query(`UPDATE password_reset_otps SET used=true WHERE id=$1`, [record.id]);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== otp) {
      const remaining = MAX_OTP_ATTEMPTS - (record.attempts + 1);
      return res.status(400).json({ error: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` });
    }

    // OTP correct — issue a short-lived reset token (don't invalidate OTP yet, reset-password will do it)
    const resetToken = jwt.sign({ userId, otpId: record.id }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ message: 'OTP verified', reset_token: resetToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { reset_token, new_password } = req.body;
    if (!reset_token || !new_password) return res.status(400).json({ error: 'reset_token and new_password are required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    let payload;
    try {
      payload = jwt.verify(reset_token, JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Reset token expired or invalid. Please start over.' });
    }

    // Check OTP record still valid
    const r = await query(`SELECT * FROM password_reset_otps WHERE id=$1 AND used=false`, [payload.otpId]);
    if (r.rows.length === 0) return res.status(400).json({ error: 'Reset session expired. Please start over.' });

    const hash = await bcrypt.hash(new_password, 10);
    await query(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [hash, payload.userId]);
    await query(`UPDATE password_reset_otps SET used=true WHERE id=$1`, [payload.otpId]);
    await query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'password_reset','{}')`, [payload.userId]);

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, student_id, roll_number, class_id } = req.body;
    if (!name || !email || !password || !student_id) {
      return res.status(400).json({ error: 'name, email, password, and student_id are required' });
    }
    if (typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ error: 'Invalid email format' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await query(`SELECT id FROM users WHERE email=$1`, [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const sidExists = await query(`SELECT id FROM students WHERE student_id=$1`, [student_id]);
    if (sidExists.rows.length > 0) return res.status(409).json({ error: 'Student ID already exists' });

    const hash = await bcrypt.hash(password, 10);
    const userRow = await query(
      `INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1,$2,$3,'student',$4) RETURNING id`,
      [name, email, hash, phone || null]
    );
    await query(
      `INSERT INTO students (user_id, student_id, roll_number, class_id) VALUES ($1,$2,$3,$4)`,
      [userRow.rows[0].id, student_id, roll_number || null, class_id || null]
    );

    const token = jwt.sign(
      { id: userRow.rows[0].id, role: 'student', name, email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.status(201).json({ message: 'Registration successful', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/classes', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.section, c.semester, c.academic_year,
              b.id as branch_id, b.name as branch_name, b.code as branch_code
       FROM classes c
       LEFT JOIN branches b ON b.id = c.branch_id
       ORDER BY b.name, c.name, c.section`
    );
    res.json({ classes: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.profile_photo, u.is_active, u.created_at,
        s.id as student_profile_id, s.student_id as student_code, s.roll_number, s.class_id,
        s.current_semester, s.current_session,
        c.name as class_name, c.section as class_section, c.semester,
        b.name as branch_name, b.code as branch_code,
        t.id as teacher_profile_id, t.teacher_id as teacher_code, t.department, t.designation
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN branches b ON b.id = c.branch_id
       LEFT JOIN teachers t ON t.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    await query(`UPDATE users SET name=$1, phone=$2, updated_at=NOW() WHERE id=$3`, [name, phone, req.user.id]);
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await query(`SELECT password_hash FROM users WHERE id=$1`, [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [hash, req.user.id]);
    await query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1, 'password_change', '{}')`, [req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile-photo', authenticateToken, async (req, res) => {
  try {
    const { photoBase64 } = req.body;
    if (!photoBase64) return res.status(400).json({ error: 'photoBase64 is required' });
    const maxSize = 2 * 1024 * 1024; // ~2MB base64
    if (photoBase64.length > maxSize) return res.status(413).json({ error: 'Image too large. Maximum size is ~1.5MB.' });
    await query(`UPDATE users SET profile_photo=$1, updated_at=NOW() WHERE id=$2`, [photoBase64, req.user.id]);
    res.json({ message: 'Profile photo updated successfully', profilePhoto: photoBase64 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/fcm-token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    await query(`UPDATE users SET fcm_token=$1 WHERE id=$2`, [token, req.user.id]);
    res.json({ message: 'FCM token updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
