const pool = require("../config/db");

const getAuditLogs = async (req, res) => {
  if (Number(req.user.role_id) !== 14) {
    return res.status(403).json({ success: false, message: "Administrator access is required." });
  }

  try {
    const result = await pool.query(
      `SELECT
         a.audit_id,
         a.action,
         a.entity_name,
         a.entity_id,
         a.details,
         a.created_at,
         CASE
           WHEN i.anonymous AND a.user_id = i.reporter_id THEN 'Anonymous reporter'
           WHEN u.user_id IS NULL THEN 'System'
           ELSE CONCAT(u.first_name, ' ', u.last_name)
         END AS actor_name
       FROM audit_logs a
       LEFT JOIN users u ON u.user_id = a.user_id
       LEFT JOIN incidents i
         ON a.entity_name = 'incident' AND i.incident_id = a.entity_id
       ORDER BY a.created_at DESC
       LIMIT 250`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get audit trail error:", error);
    return res.status(500).json({ success: false, message: "Unable to load the audit trail." });
  }
};

module.exports = { getAuditLogs };