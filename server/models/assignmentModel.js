const pool = require("../config/db");

/*
=========================================================
ASSIGN INCIDENT
=========================================================

DVC assigns an incident to an operational administrator.

Actual database columns:
incident_assignments:
- id
- incident_id
- assigned_by
- assigned_to
- assignment_note
- assigned_at
- completed_at
*/
const assignIncident = async (
  incidentId,
  assignedTo,
  assignedBy,
  assignmentNote = null
) => {
  const result = await pool.query(
    `
    INSERT INTO incident_assignments
    (
      incident_id,
      assigned_to,
      assigned_by,
      assignment_note,
      assigned_at
    )
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING *
    `,
    [
      incidentId,
      assignedTo,
      assignedBy,
      assignmentNote
    ]
  );

  return result.rows[0];
};


/*
=========================================================
GET ASSIGNED INCIDENTS FOR CURRENT ADMIN
=========================================================
*/
const getAssignmentsForUser = async (userId) => {
  const result = await pool.query(
    `
    SELECT
      i.incident_id,
      i.incident_id AS incident_number,
      CASE WHEN i.anonymity THEN NULL ELSE i.reporter_id END AS reporter_id,
      i.category_id,
      i.status AS current_status,
      i.status AS status_name,
      i.title,
      i.description,
      i.incident_location,
      i.incident_date,
      i.priority,
      i.anonymity,
      i.created_at,
      i.updated_at,

      c.name AS category_name,

      ia.id AS assignment_id,
      ia.assigned_to,
      ia.assigned_by,
      ia.assignment_note,
      ia.assigned_at,
      ia.completed_at,
      CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name,
      r.role_name AS assigned_role,

      CASE WHEN i.anonymity THEN NULL ELSE u.first_name END AS reporter_first_name,
      CASE WHEN i.anonymity THEN NULL ELSE u.last_name END AS reporter_last_name,
      CASE WHEN i.anonymity THEN NULL ELSE u.email END AS reporter_email

    FROM incident_assignments ia

    INNER JOIN incidents i
      ON ia.incident_id = i.id

    LEFT JOIN incident_categories c
      ON i.category_id = c.id

    LEFT JOIN users u
      ON i.reporter_id = u.user_id

    LEFT JOIN users assignee
      ON assignee.user_id = ia.assigned_to

    LEFT JOIN roles r
      ON r.role_id = assignee.role_id

    WHERE ia.assigned_to = $1

    ORDER BY ia.assigned_at DESC
    `,
    [userId]
  );

  return result.rows;
};


/*
=========================================================
GET ASSIGNABLE ADMINISTRATORS
=========================================================

Allowed DVC assignment roles:

HOD        = 5
DEAN       = 6
DSA        = 7
SECURITY   = 8
DISCIPLINARY = 9
GUIDANCE   = 10
CLINIC     = 11

Excluded:
STUDENT
STAFF / ICT
DVC
VC
SUG
SERVICOM
*/
const getAssignableUsers = async () => {
  const result = await pool.query(
    `
    SELECT
      u.id AS user_id,
      u.first_name,
      u.last_name,
      u.email,
      r.id AS role_id,
      r.name AS role_name

    FROM users u

    INNER JOIN roles r
      ON u.role_id = r.id

    WHERE r.id IN (5, 6, 7, 8, 9, 10, 11)
      AND u.is_active = TRUE

    ORDER BY r.role_id, u.first_name, u.last_name
    `
  );

  return result.rows;
};


/*
=========================================================
UPDATE INCIDENT STATUS
=========================================================
*/
const updateIncidentStatus = async (incidentId, statusId) => {
  await pool.query(
    `
    UPDATE incidents
    SET
      status = (SELECT status_name FROM incident_statuses WHERE status_id = $1 LIMIT 1),
      updated_at = NOW()
    WHERE id = $2
    `,
    [statusId, incidentId]
  );
};


/*
=========================================================
CHECK ASSIGNMENT
=========================================================
*/
const getAssignment = async (incidentId, userId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM incident_assignments
    INNER JOIN incidents i ON i.id = incident_assignments.incident_id
    WHERE (i.incident_id = $1 OR CAST(i.id AS TEXT) = $1)
      AND assigned_to = $2
    ORDER BY assigned_at DESC
    LIMIT 1
    `,
    [incidentId, userId]
  );

  return result.rows[0];
};


/*
=========================================================
EXPORTS
=========================================================
*/
module.exports = {
  assignIncident,
  getAssignmentsForUser,
  getAssignableUsers,
  updateIncidentStatus,
  getAssignment
};