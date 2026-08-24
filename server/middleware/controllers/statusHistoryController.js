const pool = require("../config/db");

const getHistory = async (req, res) => {
  try {
    const { incident_id } = req.params;

    const result = await pool.query(
      `
      SELECT
        h.history_id,
        h.incident_id,
        h.status_id,
        s.status_name,
        h.changed_by,
        h.changed_at
      FROM incident_status_history h
      JOIN incident_statuses s
        ON h.status_id = s.status_id
      WHERE h.incident_id = $1
      ORDER BY h.changed_at ASC
      `,
      [incident_id]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to load status history."
    });
  }
};

module.exports = { getHistory };