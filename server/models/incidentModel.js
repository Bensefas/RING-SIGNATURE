const pool = require("../config/db");
const crypto = require("crypto");

const incidentFields = `
    i.incident_id AS id, i.incident_id, i.incident_number,
    CASE WHEN i.anonymous THEN NULL ELSE i.reporter_id END AS reporter_id,
    i.category_id, i.title, i.description,
    i.incident_location, i.incident_date, i.priority, i.current_status_id,
    s.status_name AS status, s.status_name AS status_name, i.anonymous AS anonymity,
    i.blockchain_hash, i.blockchain_tx_id, i.created_at, i.updated_at,
    c.category_name,
    CASE WHEN i.anonymous THEN NULL ELSE reporter.first_name END AS reporter_first_name,
    CASE WHEN i.anonymous THEN NULL ELSE reporter.last_name END AS reporter_last_name,
    CASE WHEN i.anonymous THEN NULL ELSE reporter.email END AS reporter_email,
    CASE WHEN i.anonymous THEN NULL ELSE reporter.first_name END AS first_name,
    CASE WHEN i.anonymous THEN NULL ELSE reporter.last_name END AS last_name,
    CASE WHEN i.anonymous THEN NULL ELSE reporter.email END AS email,
    CASE WHEN i.anonymous THEN 'Anonymous'
             ELSE CONCAT(reporter.first_name, ' ', reporter.last_name) END AS reporter_name,
    ia.assigned_to,
    CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name,
    assignee.role_id AS assigned_role_id,
    r.role_name AS assigned_role,
    ia.assignment_note, ia.assigned_at, ia.completed_at,
    (SELECT STRING_AGG(f.feedback, E'\n' ORDER BY f.created_at DESC)
     FROM incident_feedback f
    WHERE f.incident_id = i.incident_id AND f.visible_to_reporter = TRUE) AS feedback`;

const joins = `
    FROM incidents i
    LEFT JOIN incident_categories c ON c.category_id = i.category_id
    LEFT JOIN incident_statuses s ON s.status_id = i.current_status_id
    LEFT JOIN users reporter ON reporter.user_id = i.reporter_id
    LEFT JOIN incident_assignments ia
        ON ia.incident_id = i.incident_id AND ia.completed_at IS NULL
    LEFT JOIN users assignee ON assignee.user_id = ia.assigned_to
    LEFT JOIN roles r ON r.role_id = assignee.role_id`;

const createIncident = async (data, database = pool) => {
    const incidentNumber = `INC-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const result = await database.query(
        `INSERT INTO incidents
            (incident_number, reporter_id, category_id, current_status_id, title, description,
             incident_location, incident_date, priority, anonymous, report_hash, signature,
             signature_algorithm, signature_public_key, signature_verified, signature_nonce)
         SELECT $1, $2, $3,
             COALESCE(
               (SELECT status_id FROM incident_statuses
                WHERE LOWER(status_name) IN ('submitted', 'new', 'pending')
                ORDER BY CASE LOWER(status_name)
                  WHEN 'submitted' THEN 0
                  WHEN 'new' THEN 1
                  ELSE 2
                END
                LIMIT 1),
               (SELECT MIN(status_id) FROM incident_statuses)
             ),
             $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15
         RETURNING *`,
        [
          incidentNumber,
          data.reporter_id,
          data.category_id,
          data.title,
          data.description,
          data.incident_location || null,
          data.incident_date || null,
          data.priority || "Medium",
          data.anonymity === true,
          data.report_hash || null,
          data.signature || null,
          data.signature_algorithm || null,
          data.signature_public_key ? JSON.stringify(data.signature_public_key) : null,
          data.signature_verified === true,
          data.signature_nonce || null,
        ]
    );
    return result.rows[0];
};

const getIncidentsByReporter = async (reporterId) => {
    const result = await pool.query(
        `SELECT ${incidentFields} ${joins}
         WHERE i.reporter_id = $1 ORDER BY i.created_at DESC`,
        [reporterId]
    );
    return result.rows;
};

const getIncidentById = async (incidentId, reporterId = null) => {
    const result = await pool.query(
        `SELECT ${incidentFields} ${joins}
         WHERE i.incident_id = $1
             AND ($2::uuid IS NULL OR i.reporter_id = $2)`,
        [incidentId, reporterId]
    );
    return result.rows[0];
};

const getAllIncidents = async () => {
    const result = await pool.query(
        `SELECT ${incidentFields} ${joins} ORDER BY i.created_at DESC`
    );
    return result.rows;
};

const getCategories = async () => {
    const result = await pool.query(
        `SELECT category_id, category_name
         FROM incident_categories
         ORDER BY CASE WHEN LOWER(category_name) = 'other' THEN 1 ELSE 0 END,
                  category_name`
    );
    return result.rows;
};

module.exports = {
    createIncident,
    getIncidentsByReporter,
    getIncidentById,
    getAllIncidents,
    getCategories
};