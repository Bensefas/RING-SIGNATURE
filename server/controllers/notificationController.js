const pool = require("../config/db");

const getMyNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 25`,
      [req.user.id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: "Notification not found." });
    return res.json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getMyNotifications, markNotificationRead };
