const { query } = require('../db/database');

async function createNotification(userId, title, message, type = 'info', actionUrl = null, priority = 'normal') {
  if (!userId || !title || !message) return null;
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [userId, title, message, type]
    );
    return result.rows[0]?.id;
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err.message);
    return null;
  }
}

async function createNotificationForMany(userIds, title, message, type = 'info') {
  for (const userId of userIds) {
    await createNotification(userId, title, message, type);
  }
}

module.exports = { createNotification, createNotificationForMany };
