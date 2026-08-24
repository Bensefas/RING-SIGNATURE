const IncidentModel = require("../models/incidentModel");
const pool = require("../config/db");
const blockchainService = require("../services/blockchainService");

const getUserId = (req) =>
  req.user?.userId || req.user?.user_id || req.user?.id;

const createIncident = async (req, res) => {
  try {
    const reporterId = getUserId(req);

    if (!reporterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      category_id,
      title,
      description,
      incident_location,
      incident_date,
      priority,
      anonymity = false,
    } = req.body;

    if (!category_id || !title || !description) {
      return res.status(400).json({
        success: false,
        message: "Category, title and description are required",
      });
    }

    const incident = await IncidentModel.createIncident({
      reporter_id: reporterId,
      category_id,
      title,
      description,
      incident_location,
      incident_date,
      priority,
      anonymity,
    });

    let blockchainTxId = null;
    try {
      const anchor = await blockchainService.anchorIncidentCreation(incident);
      blockchainTxId = anchor.txId;
      await pool.query(
        "UPDATE incidents SET blockchain_tx_id = $1 WHERE id = $2",
        [blockchainTxId, incident.id]
      );
      incident.blockchain_tx_id = blockchainTxId;
    } catch (anchorError) {
      console.error("Incident creation anchor failed:", anchorError);
    }

    await pool.query(
      `INSERT INTO incident_status_history
        (incident_id, previous_status, new_status, changed_by, comment, blockchain_tx_id)
       VALUES ($1, NULL, 'SUBMITTED', $2, $3, $4)`,
      [incident.id, reporterId, "Incident submitted", blockchainTxId]
    );

    res.status(201).json({
      success: true,
      message: "Incident reported successfully",
      incident,
    });
  } catch (error) {
    console.error("Create incident error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyIncidents = async (req, res) => {
  try {
    const reporterId = getUserId(req);

    const incidents = await IncidentModel.getIncidentsByReporter(reporterId);

    res.json({
      success: true,
      incidents,
      data: incidents,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyIncident = async (req, res) => {
  try {
    const reporterId = getUserId(req);

    const incident = await IncidentModel.getIncidentById(
      req.params.id,
      reporterId
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    res.json({
      success: true,
      incident,
      data: incidents,
      data: incident,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await IncidentModel.getCategories();

    res.json({
      success: true,
      categories,
      data: categories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getInternalIncident = async (incidentId) => {
  const result = await pool.query(
    "SELECT * FROM incidents WHERE incident_id = $1",
    [incidentId]
  );
  return result.rows[0];
};

const assignIncident = async (req, res) => {
  try {
    if (Number(req.user.role_id) !== 3) {
      return res.status(403).json({ success: false, message: "Only the DVC can assign incidents." });
    }
    const { assigned_to_user_id, assignment_note } = req.body;
    const incident = await getInternalIncident(req.params.incidentId);
    if (!incident || !assigned_to_user_id) {
      return res.status(400).json({ success: false, message: "Incident and assignee are required." });
    }
    const assignee = await pool.query(
      "SELECT id, role_id, is_active FROM users WHERE id = $1",
      [assigned_to_user_id]
    );
    if (!assignee.rows[0] || !assignee.rows[0].is_active) {
      return res.status(404).json({ success: false, message: "Active assignee not found." });
    }
    if (![5, 6, 7, 8, 9, 10, 11].includes(Number(assignee.rows[0].role_id))) {
      return res.status(400).json({ success: false, message: "That role cannot receive assignments." });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const assignment = await client.query(
        `INSERT INTO incident_assignments (incident_id, assigned_by, assigned_to, assignment_note)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [incident.id, req.user.id, assigned_to_user_id, assignment_note || null]
      );
      await client.query("UPDATE incidents SET status = 'ASSIGNED', updated_at = NOW() WHERE id = $1", [incident.id]);
      await client.query(
        `INSERT INTO incident_status_history (incident_id, previous_status, new_status, changed_by, comment)
         VALUES ($1, $2, 'ASSIGNED', $3, $4)`,
        [incident.id, incident.status || "SUBMITTED", req.user.id, assignment_note || "Incident assigned"]
      );
      await client.query(
        `INSERT INTO notifications (user_id, title, message)
         VALUES ($1, 'Incident assigned', $2)`,
        [assigned_to_user_id, `Incident ${incident.incident_id} has been assigned to you.`]
      );
      await client.query("COMMIT");
      return res.json({ success: true, data: assignment.rows[0] });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Assign incident error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateIncidentStatus = async (req, res) => {
  try {
    const actionRoles = [5, 6, 7, 8, 9, 10, 11];
    if (!actionRoles.includes(Number(req.user.role_id))) {
      return res.status(403).json({ success: false, message: "Your role cannot update incident status." });
    }
    const { new_status, comment } = req.body;
    const incident = await getInternalIncident(req.params.incidentId);
    const assignment = incident && await pool.query(
      `SELECT id FROM incident_assignments
       WHERE incident_id = $1 AND assigned_to = $2 AND completed_at IS NULL
       ORDER BY assigned_at DESC LIMIT 1`,
      [incident.id, req.user.id]
    );
    if (!incident || !assignment?.rows[0]) {
      return res.status(403).json({ success: false, message: "You are not the active assignee for this incident." });
    }
    if (!new_status) {
      return res.status(400).json({ success: false, message: "new_status is required." });
    }
    const anchor = await blockchainService.anchorStatusChange(
      incident.incident_id, incident.status, new_status, req.user.id
    ).catch((error) => {
      console.error("Status anchor failed:", error);
      return null;
    });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE incidents SET status = $1, updated_at = NOW(), blockchain_tx_id = COALESCE($2, blockchain_tx_id) WHERE id = $3", [new_status, anchor?.txId || null, incident.id]);
      await client.query(
        `INSERT INTO incident_status_history
          (incident_id, previous_status, new_status, changed_by, comment, blockchain_tx_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [incident.id, incident.status, new_status, req.user.id, comment || null, anchor?.txId || null]
      );
      await client.query("COMMIT");
      return res.json({ success: true, status: new_status, blockchain_tx_id: anchor?.txId || null });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update incident status error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const addFeedback = async (req, res) => {
  try {
    const incident = await getInternalIncident(req.params.incidentId);
    const allowed = [5, 6, 7, 8, 9, 10, 11];
    const assignment = incident && await pool.query(
      `SELECT id FROM incident_assignments
       WHERE incident_id = $1 AND assigned_to = $2 AND completed_at IS NULL
       ORDER BY assigned_at DESC LIMIT 1`,
      [incident.id, req.user.id]
    );
    if (!incident || !allowed.includes(Number(req.user.role_id)) || !assignment?.rows[0]) {
      return res.status(403).json({ success: false, message: "Feedback is not authorized." });
    }
    const { feedback, visible_to_reporter = true } = req.body;
    if (!feedback?.trim()) return res.status(400).json({ success: false, message: "Feedback is required." });
    await pool.query(
      `INSERT INTO incident_feedback (incident_id, user_id, feedback, visible_to_reporter)
       VALUES ($1, $2, $3, $4)`,
      [incident.id, req.user.id, feedback.trim(), visible_to_reporter]
    );
    if (visible_to_reporter) {
      await pool.query(
        "INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)",
        [incident.reporter_id, "Incident feedback", `New feedback was added to incident ${incident.incident_id}.`]
      );
    }
    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Add feedback error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const completeIncident = async (req, res) => {
  try {
    const incident = await getInternalIncident(req.params.incidentId);
    const result = incident && await pool.query(
      `UPDATE incident_assignments SET completed_at = NOW()
       WHERE incident_id = $1 AND assigned_to = $2 AND completed_at IS NULL
       RETURNING id`,
      [incident.id, req.user.id]
    );
    if (!incident || !result?.rows[0]) return res.status(403).json({ success: false, message: "You are not the active assignee." });
    const anchor = await blockchainService.anchorStatusChange(
      incident.incident_id, incident.status, "RESOLVED", req.user.id
    ).catch((error) => {
      console.error("Completion anchor failed:", error);
      return null;
    });
    await pool.query(
      "UPDATE incidents SET status = 'RESOLVED', updated_at = NOW(), blockchain_tx_id = COALESCE($1, blockchain_tx_id) WHERE id = $2",
      [anchor?.txId || null, incident.id]
    );
    await pool.query(
      `INSERT INTO incident_status_history
        (incident_id, previous_status, new_status, changed_by, comment, blockchain_tx_id)
       VALUES ($1, $2, 'RESOLVED', $3, 'Incident completed', $4)`,
      [incident.id, incident.status, req.user.id, anchor?.txId || null]
    );
    return res.json({ success: true, status: "RESOLVED", blockchain_tx_id: anchor?.txId || null });
  } catch (error) {
    console.error("Complete incident error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const closeIncident = async (req, res) => {
  try {
    if (Number(req.user.role_id) !== 4) {
      return res.status(403).json({ success: false, message: "Only the VC can close incidents." });
    }
    const incident = await getInternalIncident(req.params.incidentId);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found." });
    if (String(incident.status).toUpperCase() !== "RESOLVED") {
      return res.status(400).json({ success: false, message: "Only resolved incidents can be closed." });
    }
    const anchor = await blockchainService.anchorStatusChange(
      incident.incident_id, incident.status, "CLOSED", req.user.id
    ).catch((error) => {
      console.error("Close anchor failed:", error);
      return null;
    });
    await pool.query(
      "UPDATE incidents SET status = 'CLOSED', updated_at = NOW(), blockchain_tx_id = COALESCE($1, blockchain_tx_id) WHERE id = $2",
      [anchor?.txId || null, incident.id]
    );
    await pool.query(
      `INSERT INTO incident_status_history
        (incident_id, previous_status, new_status, changed_by, comment, blockchain_tx_id)
       VALUES ($1, $2, 'CLOSED', $3, 'Closed by VC', $4)`,
      [incident.id, incident.status, req.user.id, anchor?.txId || null]
    );
    return res.json({ success: true, status: "CLOSED", blockchain_tx_id: anchor?.txId || null });
  } catch (error) {
    console.error("Close incident error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const addAdvisory = async (req, res) => {
  try {
    if (![12, 13].includes(Number(req.user.role_id))) return res.status(403).json({ success: false, message: "Only SUG and SERVICOM can add advisories." });
    const incident = await getInternalIncident(req.params.incidentId);
    const { advisory } = req.body;
    if (!incident || !advisory?.trim()) return res.status(400).json({ success: false, message: "Incident and advisory are required." });
    const result = await pool.query(
      `INSERT INTO incident_advisories (incident_id, user_id, advisory) VALUES ($1, $2, $3) RETURNING *`,
      [incident.id, req.user.id, advisory.trim()]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Add advisory error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAssignableUsers = async (req, res) => {
  try {
    if (Number(req.user.role_id) !== 3) {
      return res.status(403).json({ success: false, message: "Only the DVC can view assignable users." });
    }
    const result = await pool.query(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.email,
              u.role_id, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.role_id BETWEEN 5 AND 11 AND u.is_active = TRUE
       ORDER BY u.role_id, u.first_name, u.last_name`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get assignable users error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* NEW: Admin receives every incident */
const getAllIncidents = async (req, res) => {
  try {
    if (Number(req.user.role_id) < 3 || Number(req.user.role_id) > 14) {
      return res.status(403).json({
        success: false,
        message: "Only administrative roles can view all incidents.",
      });
    }

    const incidents = await IncidentModel.getAllIncidents();

    res.json({
      success: true,
      incidents,
      data: incidents,
    });
  } catch (error) {
    console.error("Get all incidents error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createIncident,
  getMyIncidents,
  getMyIncident,
  getCategories,
  getAllIncidents,
  assignIncident,
  updateIncidentStatus,
  addFeedback,
  completeIncident,
  closeIncident,
  addAdvisory,
  getAssignableUsers,
};