const { query } = require('../db/database');

function parseEmbedding(value) {
  if (Array.isArray(value)) return value.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
    } catch (_) {
      return value
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((n) => !Number.isNaN(n));
    }
  }
  return null;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getAppSetting(key, fallback = null) {
  const result = await query(`SELECT value FROM app_settings WHERE key=$1`, [key]);
  if (result.rows.length === 0) {
    return fallback;
  }
  return result.rows[0].value;
}

async function setAppSetting(key, value) {
  await query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, String(value)]
  );
}

async function getFaceRegistrationRequired() {
  const value = await getAppSetting('face_registration_required', 'false');
  return String(value).toLowerCase() === 'true';
}

async function getUserFaceEncoding(userId) {
  const result = await query(`SELECT face_encoding, face_registered_at FROM users WHERE id=$1`, [userId]);
  return result.rows[0] || null;
}

async function registerFaceEmbedding(userId, rawEmbedding) {
  const normalized = parseEmbedding(rawEmbedding);
  if (!normalized || normalized.length < 16) {
    throw new Error('Invalid face embedding format or embedding too short');
  }
  await query(
    `UPDATE users SET face_encoding=$1, face_registered_at=NOW(), updated_at=NOW() WHERE id=$2`,
    [JSON.stringify(normalized), userId]
  );
  return normalized.length;
}

async function verifyFaceMatch(userId, candidateEmbedding) {
  const user = await getUserFaceEncoding(userId);
  if (!user || !user.face_encoding) {
    return { success: false, confidence: 0, reason: 'face_not_registered' };
  }
  const registered = parseEmbedding(user.face_encoding);
  const candidate = parseEmbedding(candidateEmbedding);
  if (!registered || !candidate || registered.length !== candidate.length) {
    return { success: false, confidence: 0, reason: 'invalid_embedding' };
  }
  const confidence = cosineSimilarity(registered, candidate);
  const threshold = 0.80;
  return {
    success: confidence >= threshold,
    confidence: Number(confidence.toFixed(4)),
    threshold,
    reason: confidence >= threshold ? 'match' : 'no_match',
  };
}

async function logFaceVerificationEvent({
  userId,
  studentId,
  sessionId,
  sessionToken,
  method,
  success,
  confidence,
  details,
  ipAddress,
  userAgent,
}) {
  await query(
    `INSERT INTO face_verification_logs
      (user_id, student_id, session_id, session_token, method, success, confidence, details, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [userId, studentId, sessionId, sessionToken, method || 'face_verification', success, confidence || 0, details || null, ipAddress || null, userAgent || null]
  );
}

module.exports = {
  parseEmbedding,
  getFaceRegistrationRequired,
  registerFaceEmbedding,
  verifyFaceMatch,
  logFaceVerificationEvent,
  getAppSetting,
  setAppSetting,
};
