const pool = require("../config/db");

const createAuditLog = async ({ incidentId, userId, action, details }, database = pool) => {
  const result = await database.query(
    `INSERT INTO audit_logs (user_id, action, entity_name, entity_id, details)
     VALUES ($1, $2, 'incident', $3, $4)
     RETURNING *`,
    [userId, action, incidentId, details || null]
  );
  return result.rows[0];
};

module.exports = { createAuditLog };