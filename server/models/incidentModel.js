const pool = require("../config/db");

const incidentFields = `
    i.id, i.incident_id, i.incident_id AS incident_number, i.reporter_id, i.category_id, i.title, i.description,
    i.incident_location, i.incident_date, i.priority, i.status, i.anonymity,
    i.blockchain_hash, i.blockchain_tx_id, i.created_at, i.updated_at,
    i.status AS status_name,
    c.name AS category_name,
    reporter.first_name AS reporter_first_name,
    reporter.last_name AS reporter_last_name,
    reporter.email AS reporter_email,
    reporter.first_name,
    reporter.last_name,
    reporter.email,
    CASE WHEN i.anonymity THEN 'Anonymous'
             ELSE CONCAT(reporter.first_name, ' ', reporter.last_name) END AS reporter_name,
    ia.assigned_to,
    CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name,
    ia.assignment_note, ia.assigned_at, ia.completed_at,
    (SELECT STRING_AGG(f.feedback, E'\\n' ORDER BY f.created_at DESC)
     FROM incident_feedback f
     WHERE f.incident_id = i.id AND f.visible_to_reporter = TRUE) AS feedback`;

const joins = `
    FROM incidents i
    LEFT JOIN incident_categories c ON c.id = i.category_id
    LEFT JOIN users reporter ON reporter.id = i.reporter_id
    LEFT JOIN incident_assignments ia
        ON ia.incident_id = i.id AND ia.completed_at IS NULL
    LEFT JOIN users assignee ON assignee.id = ia.assigned_to`;

const createIncident = async (data) => {
    const result = await pool.query(
        `INSERT INTO incidents
            (reporter_id, category_id, title, description, incident_location,
             incident_date, priority, status, anonymity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUBMITTED', $8)
         RETURNING *`,
        [data.reporter_id, data.category_id, data.title, data.description,
            data.incident_location || null, data.incident_date || null,
            data.priority || "Medium", data.anonymity === true]
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
             AND ($2::bigint IS NULL OR i.reporter_id = $2)`,
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
        "SELECT id AS category_id, name AS category_name FROM incident_categories ORDER BY name"
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