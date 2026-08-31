const pool = require("../config/db");
const { verifyRecord } = require("../services/blockchainService");

const verifyIncident = async (req, res) => {
    try {
        const { incidentId } = req.params;

        const result = await pool.query(
            `
            SELECT
                incident_id,
                incident_number,
                blockchain_hash,
                blockchain_tx_id,
                created_at
            FROM incidents
            WHERE incident_id = $1
            `,
            [incidentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Incident not found."
            });
        }

        const incident = result.rows[0];

        const verification = await verifyRecord(incident.incident_id);

        return res.json({
            success: true,
            data: {
                incident_id: incident.incident_id,
                incident_number: incident.incident_number,
                blockchain_hash: incident.blockchain_hash,
                blockchain_tx_id: incident.blockchain_tx_id,
                timestamp: incident.created_at,
                verification
            }
        });

    } catch (error) {
        console.error("Blockchain verification error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    verifyIncident
};