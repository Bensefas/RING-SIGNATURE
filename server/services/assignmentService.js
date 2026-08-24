const AssignmentModel = require("../models/assignmentModel");
const IncidentModel = require("../models/incidentModel");
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
        message: "Incident ID and assigned user are required."
      });
    }

    // AssignmentModel already updates:
    // - assigned_to
    // - assigned_by
    // - status_id = 2 (Assigned)
    // - status_history
    const assignment = await AssignmentModel.assignIncident(
      incident_id,
      assigned_to,
      adminId
    );

    // Keep IncidentModel synchronized
    if (
      IncidentModel &&
      typeof IncidentModel.updateIncidentStatus === "function"
    ) {
      await IncidentModel.updateIncidentStatus(incident_id, 2);
    }

    // Audit log
    await createAuditLog({
      incidentId: incident_id,
      userId: adminId,
      action: "INCIDENT_ASSIGNED",
      details: `Incident assigned to user ${assigned_to}`
    });

    res.status(200).json({
      success: true,
      message: "Incident assigned successfully.",
      data: assignment
    });

  } catch (error) {
    console.error("Assignment Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to assign incident."
    });
  }
};

/**
 * Operational administrators retrieve only their assigned incidents.
 */
const myAssignments = async (req, res) => {
  try {
    const incidents = await AssignmentModel.getAssignedIncidents(
      req.user.user_id
    );

    res.status(200).json({
      success: true,
      data: incidents
    });

  } catch (error) {
    console.error("Fetch Assignments Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve assignments."
    });
  }
};

module.exports = {
  assignIncident,
  myAssignments
};