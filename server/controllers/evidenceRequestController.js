const pool = require("../config/db");
const { createAuditLog } = require("../services/auditLogService");

const isAdministrator = (user) => Number(user?.role_id) === 14;
const isUuid = (value) =>
  typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const requestProjection = `
  SELECT
    r.request_id,
    r.incident_id,
    r.request_text,
    r.status,
    r.due_at,
    r.reporter_response,
    r.responded_at,
    r.created_at,
    r.updated_at,
    i.incident_number,
    i.title AS incident_title,
    i.anonymous,
    s.status_name AS incident_status,
    COALESCE(files.file_ids, ARRAY[]::uuid[]) AS evidence_file_ids
  FROM incident_evidence_requests r
  JOIN incidents i ON i.incident_id = r.incident_id
  LEFT JOIN incident_statuses s ON s.status_id = i.current_status_id
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(link.file_id ORDER BY file.uploaded_at) AS file_ids
    FROM incident_evidence_request_files link
    JOIN incident_files file ON file.file_id = link.file_id
    WHERE link.request_id = r.request_id
  ) files ON TRUE`;

const getRequests = async (req, res) => {
  if (!isAdministrator(req.user)) {
    return res.status(403).json({ success: false, message: "Administrator access is required." });
  }

  try {
    const values = [];
    let filter = "";
    if (req.query.incident_id) {
      values.push(req.query.incident_id);
      filter = "WHERE r.incident_id = $1";
    }

    const result = await pool.query(
      `${requestProjection}
       ${filter}
       ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC
       LIMIT 250`,
      values
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get evidence requests error:", error);
    return res.status(500).json({ success: false, message: "Unable to load evidence requests." });
  }
};

const getMyRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `${requestProjection}
       WHERE i.reporter_id = $1
       ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get reporter evidence requests error:", error);
    return res.status(500).json({ success: false, message: "Unable to load your evidence requests." });
  }
};

const createRequest = async (req, res) => {
  if (!isAdministrator(req.user)) {
    return res.status(403).json({ success: false, message: "Administrator access is required." });
  }

  const incidentId = req.body.incident_id;
  const requestText = String(req.body.request_text || "").trim();
  const dueAt = req.body.due_at || null;

  if (!isUuid(incidentId) || !requestText || requestText.length > 4000) {
    return res.status(400).json({
      success: false,
      message: "A valid incident and a request message of 1-4000 characters are required.",
    });
  }
  if (dueAt && Number.isNaN(Date.parse(dueAt))) {
    return res.status(400).json({ success: false, message: "The due date is invalid." });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const incidentResult = await client.query(
      `SELECT i.incident_id, i.reporter_id, i.current_status_id, s.status_name
       FROM incidents i
       LEFT JOIN incident_statuses s ON s.status_id = i.current_status_id
       WHERE i.incident_id = $1
       FOR UPDATE OF i`,
      [incidentId]
    );
    const incident = incidentResult.rows[0];
    if (!incident) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Incident not found." });
    }
    if (["resolved", "rejected"].includes(String(incident.status_name || "").toLowerCase())) {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "Reopen this incident before requesting more evidence." });
    }

    const awaitingResult = await client.query(
      `SELECT status_id, status_name
       FROM incident_statuses
       WHERE LOWER(status_name) = LOWER('Awaiting Reporter Response')
       LIMIT 1`
    );
    if (!awaitingResult.rows[0]) {
      throw new Error("The evidence-request workflow migration has not been applied.");
    }

    const requestResult = await client.query(
      `INSERT INTO incident_evidence_requests
         (incident_id, requested_by, request_text, due_at)
       VALUES ($1, $2, $3, $4)
       RETURNING request_id`,
      [incident.incident_id, req.user.id, requestText, dueAt]
    );
    const requestId = requestResult.rows[0].request_id;
    const previousStatus = incident.status_name || "Submitted";
    if (Number(incident.current_status_id) !== Number(awaitingResult.rows[0].status_id)) {
      await client.query(
        `UPDATE incidents
         SET current_status_id = $1, updated_at = NOW()
         WHERE incident_id = $2`,
        [awaitingResult.rows[0].status_id, incident.incident_id]
      );
      await client.query(
        `INSERT INTO incident_status_history
           (incident_id, status_id, previous_status, new_status, changed_by, comment)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          incident.incident_id,
          awaitingResult.rows[0].status_id,
          previousStatus,
          awaitingResult.rows[0].status_name,
          req.user.id,
          "Additional information or evidence requested from the reporter.",
        ]
      );
    }
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, $2, $3)`,
      [
        incident.reporter_id,
        "Additional evidence requested",
        `More information or evidence was requested for incident ${incident.incident_id}.`,
      ]
    );
    await createAuditLog({
      incidentId: incident.incident_id,
      userId: req.user.id,
      action: "Evidence requested",
      details: `Evidence request ${requestId} created.`,
    }, client);

    await client.query("COMMIT");
    const result = await pool.query(
      `${requestProjection} WHERE r.request_id = $1`,
      [requestId]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Evidence request rollback error:", rollbackError);
      }
    }
    console.error("Create evidence request error:", error);
    return res.status(500).json({ success: false, message: "Unable to create the evidence request." });
  } finally {
    if (client) client.release();
  }
};

const respondToRequest = async (req, res) => {
  const responseText = String(req.body.response_text || "").trim();
  const fileIds = Array.isArray(req.body.file_ids)
    ? [...new Set(req.body.file_ids.map(String))]
    : [];
  if (
    !isUuid(req.params.requestId)
    || responseText.length > 4000
    || fileIds.length > 5
    || fileIds.some((fileId) => !isUuid(fileId))
    || (!responseText && fileIds.length === 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide a response (up to 4000 characters) or attach up to five evidence files.",
    });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const requestResult = await client.query(
      `SELECT r.request_id, r.incident_id, r.requested_by, r.status,
              i.reporter_id, i.current_status_id, s.status_name
       FROM incident_evidence_requests r
       JOIN incidents i ON i.incident_id = r.incident_id
       LEFT JOIN incident_statuses s ON s.status_id = i.current_status_id
       WHERE r.request_id = $1
       FOR UPDATE OF r, i`,
      [req.params.requestId]
    );
    const request = requestResult.rows[0];
    if (!request || request.reporter_id !== req.user.id) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Evidence request not found." });
    }
    if (request.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "This evidence request has already been answered." });
    }

    if (fileIds.length) {
      const evidenceResult = await client.query(
        `SELECT file_id
         FROM incident_files
         WHERE incident_id = $1
           AND uploaded_by = $2
           AND file_id = ANY($3::uuid[])`,
        [request.incident_id, req.user.id, fileIds]
      );
      if (evidenceResult.rows.length !== fileIds.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "One or more attached files are not evidence uploaded for this report.",
        });
      }
      for (const fileId of fileIds) {
        await client.query(
          `INSERT INTO incident_evidence_request_files (request_id, file_id)
           VALUES ($1, $2)`,
          [request.request_id, fileId]
        );
      }
    }

    await client.query(
      `UPDATE incident_evidence_requests
       SET status = 'responded', reporter_response = $1,
           responded_at = NOW(), updated_at = NOW()
       WHERE request_id = $2`,
      [responseText || null, request.request_id]
    );

    const remainingRequests = await client.query(
      `SELECT 1
       FROM incident_evidence_requests
       WHERE incident_id = $1 AND status = 'pending' AND request_id <> $2
       LIMIT 1`,
      [request.incident_id, request.request_id]
    );
    if (
      remainingRequests.rows.length === 0
      && String(request.status_name || "").toLowerCase() === "awaiting reporter response"
    ) {
      const reviewResult = await client.query(
        `SELECT status_id, status_name
         FROM incident_statuses
         WHERE LOWER(status_name) = LOWER('Under Review')
         LIMIT 1`
      );
      if (!reviewResult.rows[0]) {
        throw new Error("The Under Review incident status is missing.");
      }
      await client.query(
        `UPDATE incidents
         SET current_status_id = $1, updated_at = NOW()
         WHERE incident_id = $2`,
        [reviewResult.rows[0].status_id, request.incident_id]
      );
      await client.query(
        `INSERT INTO incident_status_history
           (incident_id, status_id, previous_status, new_status, changed_by, comment)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          request.incident_id,
          reviewResult.rows[0].status_id,
          request.status_name,
          reviewResult.rows[0].status_name,
          req.user.id,
          "Reporter responded to all pending evidence requests.",
        ]
      );
    }
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, $2, $3)`,
      [
        request.requested_by,
        "Evidence request answered",
        `The reporter responded to an evidence request for incident ${request.incident_id}.`,
      ]
    );
    await createAuditLog({
      incidentId: request.incident_id,
      userId: req.user.id,
      action: "Evidence request answered",
      details: `Evidence request ${request.request_id} answered.`,
    }, client);

    await client.query("COMMIT");
    const result = await pool.query(
      `${requestProjection} WHERE r.request_id = $1`,
      [request.request_id]
    );
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Evidence response rollback error:", rollbackError);
      }
    }
    console.error("Respond to evidence request error:", error);
    return res.status(500).json({ success: false, message: "Unable to submit your evidence response." });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  getRequests,
  getMyRequests,
  createRequest,
  respondToRequest,
};
