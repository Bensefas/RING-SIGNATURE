const AssignmentModel = require("../models/assignmentModel");
const pool = require("../config/db");
const { createAuditLog } = require("../services/auditLogService");


/*
=========================================================
DVC ASSIGNS INCIDENT
=========================================================
*/
const assignIncident = async (req, res) => {
  try {
    const { incident_id, assigned_to, assignment_note } = req.body;

    const assignedBy = req.user.user_id;

    if (!incident_id || !assigned_to) {
      return res.status(400).json({
        success: false,
        message: "Incident ID and assignee are required."
      });
    }

    /*
    -----------------------------------------------------
    VERIFY CURRENT USER IS DVC
    -----------------------------------------------------
    */
    if (req.user.role_name !== "DVC") {
      return res.status(403).json({
        success: false,
        message: "Only the DVC can assign incidents."
      });
    }


    /*
    -----------------------------------------------------
    VERIFY ASSIGNEE IS AN ALLOWED ADMIN
    -----------------------------------------------------
    */
    const assigneeCheck = await pool.query(
      `
      SELECT
        u.user_id,
        u.first_name,
        u.last_name,
        u.is_active,
        r.role_id,
        r.role_name
      FROM users u
      INNER JOIN roles r
        ON u.role_id = r.role_id
      WHERE u.user_id = $1
      `,
      [assigned_to]
    );

    if (assigneeCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Selected administrator was not found."
      });
    }

    const assignee = assigneeCheck.rows[0];

    const allowedRoles = [
      "HOD",
      "DEAN",
      "DSA",
      "SECURITY",
      "DISCIPLINARY",
      "GUIDANCE",
      "CLINIC"
    ];

    if (!allowedRoles.includes(assignee.role_name)) {
      return res.status(403).json({
        success: false,
        message:
          "This user cannot receive DVC incident assignments."
      });
    }

    if (!assignee.is_active) {
      return res.status(403).json({
        success: false,
        message:
          "The selected administrator account is inactive."
      });
    }


    /*
    -----------------------------------------------------
    VERIFY INCIDENT EXISTS
    -----------------------------------------------------
    */
    const incidentCheck = await pool.query(
      `
      SELECT
        id,
        incident_id,
        status
      FROM incidents
      WHERE incident_id = $1
      LIMIT 1
      `,
      [incident_id]
    );

    if (incidentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Incident not found."
      });
    }

    const incident = incidentCheck.rows[0];


    /*
    -----------------------------------------------------
    PREVENT DUPLICATE ACTIVE ASSIGNMENT
    -----------------------------------------------------
    */
    const existingAssignment = await pool.query(
      `
      SELECT
        assigned_to
      FROM incident_assignments
      WHERE incident_id = $1
        AND completed_at IS NULL
      ORDER BY assigned_at DESC
      LIMIT 1
      `,
      [incident.id]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This incident is already assigned to an administrator."
      });
    }


    /*
    -----------------------------------------------------
    CREATE ASSIGNMENT
    -----------------------------------------------------
    */
    const assignment =
      await AssignmentModel.assignIncident(
        incident.id,
        assigned_to,
        assignedBy,
        assignment_note || null
      );


    /*
    -----------------------------------------------------
    UPDATE INCIDENT STATUS
    -----------------------------------------------------

    Status 2 = In Investigation
    */
    await AssignmentModel.updateIncidentStatus(
      incident.id,
      2
    );


    /*
    -----------------------------------------------------
    AUDIT LOG
    -----------------------------------------------------
    */
    await createAuditLog({
      incidentId: incident.incident_id,
      userId: assignedBy,
      action: "INCIDENT_ASSIGNED",
      details:
        `Incident assigned to ${assignee.first_name} ${assignee.last_name} (${assignee.role_name}).`
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


/*
=========================================================
GET MY ASSIGNED INCIDENTS
=========================================================
*/
const getMyAssignments = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const incidents =
      await AssignmentModel.getAssignmentsForUser(userId);

    res.json({
      success: true,
      data: incidents
    });

  } catch (error) {
    console.error(
      "Get My Assignments Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/*
=========================================================
GET ASSIGNABLE ADMINISTRATORS
=========================================================
*/
const getAssignableUsers = async (req, res) => {
  try {

    if (req.user.role_name !== "DVC") {
      return res.status(403).json({
        success: false,
        message:
          "Only the DVC can view assignable administrators."
      });
    }

    const users =
      await AssignmentModel.getAssignableUsers();

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error(
      "Get Assignable Users Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/*
=========================================================
UPDATE ASSIGNED INCIDENT STATUS
=========================================================
*/
const updateAssignmentStatus = async (req, res) => {
  try {
    const {
      incident_id,
      status_id,
      remarks
    } = req.body;

    const userId = req.user.user_id;

    if (!incident_id || !status_id) {
      return res.status(400).json({
        success: false,
        message:
          "Incident ID and status are required."
      });
    }


    /*
    -----------------------------------------------------
    VERIFY USER IS ASSIGNED TO INCIDENT
    -----------------------------------------------------
    */
    const assignment =
      await AssignmentModel.getAssignment(
        incident_id,
        userId
      );

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message:
          "You are not assigned to this incident."
      });
    }


    /*
    -----------------------------------------------------
    GET CURRENT STATUS
    -----------------------------------------------------
    */
    const incidentResult = await pool.query(
      `
      SELECT
        id,
        incident_id,
        status
      FROM incidents
      WHERE incident_id = $1
      LIMIT 1
      `,
      [incident_id]
    );

    if (incidentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Incident not found."
      });
    }

    const incident = incidentResult.rows[0];


    const newStatusResult = await pool.query(
      `
      SELECT status_name
      FROM incident_statuses
      WHERE status_id = $1
      `,
      [status_id]
    );

    const previousStatus = incident.status || "Unknown";

    const newStatus =
      newStatusResult.rows[0]?.status_name ||
      "Unknown";


    /*
    -----------------------------------------------------
    UPDATE INCIDENT
    -----------------------------------------------------
    */
    await AssignmentModel.updateIncidentStatus(
      incident.id,
      status_id
    );


    /*
    -----------------------------------------------------
    WRITE STATUS HISTORY
    -----------------------------------------------------
    */
    await pool.query(
      `
      INSERT INTO incident_status_history
      (
        incident_id,
        previous_status,
        new_status,
        changed_by,
        comment
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        incident.id,
        previousStatus,
        newStatus,
        userId,
        remarks || "Status updated"
      ]
    );


    /*
    -----------------------------------------------------
    COMPLETE ASSIGNMENT WHEN CASE IS RESOLVED
    -----------------------------------------------------
    */
    const completionStatuses = [
      "Resolved",
      "Closed",
      "Completed"
    ];

    if (completionStatuses.includes(newStatus)) {
      await pool.query(
        `
        UPDATE incident_assignments
        SET completed_at = NOW()
        WHERE id = $1
        `,
        [assignment.id]
      );
    }


    /*
    -----------------------------------------------------
    AUDIT LOG
    -----------------------------------------------------
    */
    await createAuditLog({
      incidentId: incident.incident_id,
      userId,
      action: "STATUS_UPDATED",
      details:
        `Status changed from ${previousStatus} to ${newStatus}.`
    });


    res.json({
      success: true,
      message: "Status updated successfully."
    });

  } catch (error) {
    console.error(
      "Update Assignment Status Error:",
      error
    );

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