const IncidentModel = require("../models/incidentModel");
const IncidentSignatureModel = require("../models/incidentSignatureModel");
const pool = require("../config/db");
const blockchainService = require("../services/blockchainService");
const { createAuditLog } = require("../services/auditLogService");
const DigitalReportSignatureService = require("../services/digitalReportSignatureService");
const getIncidentErrorResponse = require("../utils/incidentErrorResponse");

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
      signature,
      reportHash,
      nonce,
    } = req.body;

    if (req.body.anonymity === true) {
      return res.status(400).json({
        success: false,
        message: "Anonymous reports must use the anonymous ring-signature endpoint.",
      });
    }
    if (!category_id || !title || !description || !incident_location || !incident_date) {
      return res.status(400).json({
        success: false,
        message: "Category, title, description, location and incident date are required.",
      });
    }

    const publicKey = await IncidentSignatureModel.getPublicKey({ userId: reporterId });
    if (!publicKey) {
      return res.status(400).json({
        success: false,
        message: "Register a digital signing key before submitting this report.",
      });
    }

    const verification = await DigitalReportSignatureService.verifyDigitalReportSignature({
      report: { ...req.body, anonymity: false },
      signature,
      publicKey,
    });
    if (reportHash && reportHash !== verification.reportHash) {
      return res.status(400).json({ success: false, message: "The report hash does not match the signed report." });
    }

    const incident = await IncidentModel.createIncident({
      reporter_id: reporterId,
      category_id,
      title,
      description,
      incident_location,
      incident_date,
      priority,
      anonymity: false,
      report_hash: verification.reportHash,
      signature,
      signature_algorithm: verification.algorithm,
      signature_public_key: verification.publicKey,
      signature_verified: verification.valid,
      signature_nonce: nonce,
    });

    let blockchainTxId = null;
    let blockchainWarning = null;
    try {
      const anchor = await blockchainService.anchorIncidentCreation(incident);
      blockchainTxId = anchor.txId;
      await pool.query(
        "UPDATE incidents SET blockchain_tx_id = $1 WHERE incident_id = $2",
        [blockchainTxId, incident.incident_id]
      );
      incident.blockchain_tx_id = blockchainTxId;
    } catch (anchorError) {
      console.error("Incident creation anchor failed:", anchorError);
      blockchainWarning = "The report was saved, but blockchain anchoring failed.";
    }

    await pool.query(
      `INSERT INTO incident_status_history
        (incident_id, previous_status, new_status, changed_by, comment, blockchain_tx_id)
       VALUES ($1, NULL, 'SUBMITTED', $2, $3, $4)`,
      [incident.incident_id, reporterId, "Incident submitted", blockchainTxId]
    );

    res.status(201).json({
      success: true,
      message: "Incident digitally signed and reported successfully.",
      incident,
      blockchainWarning,
    });
  } catch (error) {
    console.error("Create incident error:", error);
    const response = error.code === "23505"
      ? { statusCode: 409, message: error.message }
      : getIncidentErrorResponse(error);
    res.status(response.statusCode).json({
      success: false,
      message: response.message,
    });
  }
};

const registerDigitalSigningKey = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const publicKey = await DigitalReportSignatureService.validatePublicJwk(req.body?.publicKey);
    await IncidentSignatureModel.registerPublicKey({ userId, publicKey });
    return res.status(200).json({ success: true, message: "Digital signing key registered." });
  } catch (error) {
    const response = getIncidentErrorResponse(error);
    if (response.statusCode >= 500) console.error("Digital signing key registration failed:", error);
    return res.status(response.statusCode).json({ success: false, message: response.message });
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
    const response = getIncidentErrorResponse(error);
    res.status(response.statusCode).json({
      success: false,
      message: response.message,
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
    });
  } catch (error) {
    console.error(error);
    const response = getIncidentErrorResponse(error);
    res.status(response.statusCode).json({
      success: false,
      message: response.message,
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
    const response = getIncidentErrorResponse(error);
    res.status(response.statusCode).json({
      success: false,
      message: response.message,
    });
  }
};

const getInternalIncident = async (incidentId) => {
  const result = await pool.query(
    `SELECT i.* FROM incidents i WHERE i.incident_id = $1`,
    [incidentId]
  );
  return result.rows[0];
};

const assignIncident = async (req, res) => {
  try {
    if (Number(req.user.role_id) !== 3) {
      return res.status(403).json({ success: false, message: "Only the DVC can assign incidents." });
    }
    const { assigned_role, assignment_note } = req.body;
    const incident = await getInternalIncident(req.params.incidentId);
    if (!incident || !assigned_role) {
      return res.status(400).json({ success: false, message: "Incident and assignee are required." });
    }
    const assignee = await pool.query(
      `SELECT u.user_id, u.role_id, u.is_active, r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE UPPER(r.role_name) = UPPER($1) AND u.is_active = TRUE
       ORDER BY u.user_id
       LIMIT 1`,
      [assigned_role]
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
        [incident.id, req.user.id, assignee.rows[0].user_id, assignment_note || null]
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
        [assignee.rows[0].user_id, `Incident ${incident.incident_id} has been assigned to you.`]
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
    const roleId = Number(req.user.role_id);
    const mayManageAll = [3, 4, 12, 13, 14].includes(roleId);
    const { new_status, comment } = req.body;
    const statusName = String(new_status || "").trim().replace(/[_-]+/g, " ");
    const statusAliases = {
      new: "Pending",
      assigned: "Under Review",
      "in progress": "Under Review",
      investigating: "Under Review",
      closed: "Resolved",
      complete: "Resolved",
      completed: "Resolved",
    };
    const requestedStatus = statusAliases[statusName.toLowerCase()] || statusName;
    if (!requestedStatus) {
      return res.status(400).json({ success: false, message: "new_status is required." });
    }

    const incidentResult = await pool.query(
      `SELECT i.incident_id, i.reporter_id, i.current_status_id, i.blockchain_tx_id,
              s.status_name AS current_status
       FROM incidents i
       LEFT JOIN incident_statuses s ON s.status_id = i.current_status_id
       WHERE i.incident_id = $1`,
      [req.params.incidentId]
    );
    const incident = incidentResult.rows[0];
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found." });
    }

    if (!mayManageAll) {
      const assignment = await pool.query(
        `SELECT assignment_id
         FROM incident_assignments
         WHERE incident_id = $1 AND assigned_to = $2 AND completed_at IS NULL
         ORDER BY assigned_at DESC
         LIMIT 1`,
        [incident.incident_id, req.user.id]
      );
      if (!assignment.rows[0]) {
        return res.status(403).json({ success: false, message: "You are not authorized to update this incident." });
      }
    }

    const statusResult = await pool.query(
      `SELECT status_id, status_name
       FROM incident_statuses
       WHERE LOWER(status_name) = LOWER($1)
       LIMIT 1`,
      [requestedStatus]
    );
    const nextStatus = statusResult.rows[0];
    if (!nextStatus) {
      return res.status(400).json({ success: false, message: "That incident status is not supported." });
    }
    if (Number(nextStatus.status_id) === Number(incident.current_status_id)) {
      return res.json({ success: true, status: nextStatus.status_name, unchanged: true });
    }

    const anchor = await blockchainService.anchorStatusChange(
      incident.incident_id,
      incident.current_status,
      nextStatus.status_name,
      req.user.id
    ).catch((error) => {
      console.error("Status anchor failed:", error);
      return null;
    });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE incidents
         SET current_status_id = $1, updated_at = NOW(),
             blockchain_tx_id = COALESCE($2, blockchain_tx_id)
         WHERE incident_id = $3`,
        [nextStatus.status_id, anchor?.txId || null, incident.incident_id]
      );
      await client.query(
        `INSERT INTO incident_status_history
          (incident_id, status_id, previous_status, new_status, changed_by, comment, blockchain_tx_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          incident.incident_id,
          nextStatus.status_id,
          incident.current_status,
          nextStatus.status_name,
          req.user.id,
          comment || null,
          anchor?.txId || null,
        ]
      );
      await createAuditLog({
        incidentId: incident.incident_id,
        userId: req.user.id,
        action: "Incident status updated",
        details: `${incident.current_status || "Unknown"} to ${nextStatus.status_name}${comment ? `: ${comment}` : ""}`,
      }, client);
      await client.query(
        `INSERT INTO notifications (user_id, title, message)
         VALUES ($1, $2, $3)`,
        [
          incident.reporter_id,
          "Incident status updated",
          `The status of incident ${incident.incident_id} is now ${nextStatus.status_name}.`,
        ]
      );
      await client.query("COMMIT");
      return res.json({
        success: true,
        status: nextStatus.status_name,
        blockchain_tx_id: anchor?.txId || null,
      });
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
        (incident_id, status_id, previous_status, new_status, changed_by, comment, blockchain_tx_id)
       VALUES ($1, (SELECT status_id FROM incident_statuses WHERE status_name = 'CLOSED'), $2, 'CLOSED', $3, 'Closed by VC', $4)`,
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
            `SELECT u.user_id, u.first_name, u.last_name, u.email,
              u.role_id, r.role_name
       FROM users u
             JOIN roles r ON r.role_id = u.role_id
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
  registerDigitalSigningKey,
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