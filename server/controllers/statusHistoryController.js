const pool = require("../config/db");

const getHistory = async (req, res) => {
  try {
    const { incident_id } = req.params;

    const result = await pool.query(
      `
      SELECT
        h.id,
        h.incident_id,
        h.previous_status,
        h.new_status,
        h.changed_by,
        h.comment,
        h.blockchain_tx_id,
        h.created_at
      FROM incident_status_history h
      JOIN incidents i ON i.id = h.incident_id
      WHERE i.incident_id = $1 OR CAST(i.id AS TEXT) = $1
      ORDER BY h.created_at ASC
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