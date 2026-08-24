const AssignmentModel = require("../models/assignmentModel");
const IncidentModel = require("../models/incidentModel");
const pool = require("../config/db");
const { createAuditLog } = require("../services/auditLogService");

/**
 * DVC assigns an incident to an operational administrator.
 */
const assignIncident = async (req, res) => {
  try {
    const { incident_id, assigned_to } = req.body;
    const adminId = req.user.user_id;

    if (!incident_id || !assigned_to) {
      return res.status(400).json({
        success: false,
        message: "Incident ID and assignee are required."
      });
    }

    const assignment = await AssignmentModel.assignIncident(
      incident_id,
      assigned_to,
      adminId
    );

    if (
      IncidentModel &&
      typeof IncidentModel.updateIncidentStatus === "function"
    ) {
      await IncidentModel.updateIncidentStatus(incident_id, 2);
    }

    await createAuditLog({
      incidentId: incident_id,
      userId: adminId,
      action: "INCIDENT_ASSIGNED",
      details: `Assigned to ${assigned_to}`
    });

    res.json({
      success: true,
      message: "Incident assigned successfully.",
      data: assignment
    });

  } catch (error) {
    console.error("Assignment Error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Operational admins retrieve only their assigned incidents.
 */
const getMyAssignments = async (req, res) => {
  try {
    const incidents = await AssignmentModel.getAssignedIncidents(
      req.user.user_id
    );

    res.json({
      success: true,
      data: incidents
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DVC retrieves assignable operational administrators.
 * Excludes Student, ICT, VC, DVC, SUG and SERVICOM.
 */
const getAssignableUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        r.role_id,
        r.role_name
      FROM users u
      JOIN roles r
        ON u.role_id = r.role_id
      WHERE r.role_id IN (3,4,5,6,7,8)
      ORDER BY r.role_name, u.first_name
      `
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Assigned admin updates investigation status.
 */
const updateAssignmentStatus = async (req, res) => {
  try {
    const { incident_id, status_id, remarks } = req.body;
    const userId = req.user.user_id;

    if (!incident_id || !status_id) {
      return res.status(400).json({
        success: false,
        message: "Incident ID and status are required."
      });
    }

    if (
      IncidentModel &&
      typeof IncidentModel.updateIncidentStatus === "function"
    ) {
      await IncidentModel.updateIncidentStatus(
        incident_id,
        status_id
      );
    }

    await pool.query(
      `
      INSERT INTO status_history
      (
        incident_id,
        user_id,
        status_id,
        remarks
      )
      VALUES($1,$2,$3,$4)
      `,
      [
        incident_id,
        userId,
        status_id,
        remarks || "Status updated"
      ]
    );

    await createAuditLog({
      incidentId: incident_id,
      userId,
      action: "STATUS_UPDATED",
      details: `Status changed to ${status_id}`
    });

    res.json({
      success: true,
      message: "Status updated successfully."
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  assignIncident,
  getMyAssignments,
  getAssignableUsers,
  updateAssignmentStatus
};