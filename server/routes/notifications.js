const express = require('express');
const { query } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const result = await query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
      [req.user.id, limit]
    );
    const unreadCount = result.rows.filter(n => !n.is_read).length;
    res.json({ notifications: result.rows, unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id=$1 AND is_read=false`,
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { user_id, title, message, type } = req.body;
    if (!user_id || !title || !message) return res.status(400).json({ error: 'user_id, title, message required' });
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4) RETURNING *`,
      [user_id, title, message, type || 'info']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await query(`UPDATE notifications SET is_read=true WHERE user_id=$1`, [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM notifications WHERE id=$1 AND user_id=$2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
