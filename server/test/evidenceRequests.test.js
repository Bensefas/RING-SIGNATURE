const test = require("node:test");
const assert = require("node:assert/strict");
const pool = require("../config/db");
const evidenceRequestController = require("../controllers/evidenceRequestController");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("evidence requests are restricted to administrators", async () => {
  const response = createResponse();
  await evidenceRequestController.getRequests({ user: { role_id: 1 } }, response);
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.success, false);
});

test("evidence request creation requires a non-empty bounded message", async () => {
  const emptyResponse = createResponse();
  await evidenceRequestController.createRequest({
    user: { role_id: 14, id: "admin-id" },
    body: { incident_id: "incident-id", request_text: "   " },
  }, emptyResponse);
  assert.equal(emptyResponse.statusCode, 400);

  const oversizedResponse = createResponse();
  await evidenceRequestController.createRequest({
    user: { role_id: 14, id: "admin-id" },
    body: { incident_id: "incident-id", request_text: "x".repeat(4001) },
  }, oversizedResponse);
  assert.equal(oversizedResponse.statusCode, 400);
});

test("reporter responses require text or evidence and accept at most five files", async () => {
  const emptyResponse = createResponse();
  await evidenceRequestController.respondToRequest({
    params: { requestId: "request-id" },
    user: { id: "reporter-id" },
    body: { response_text: " ", file_ids: [] },
  }, emptyResponse);
  assert.equal(emptyResponse.statusCode, 400);

  const tooManyFilesResponse = createResponse();
  await evidenceRequestController.respondToRequest({
    params: { requestId: "request-id" },
    user: { id: "reporter-id" },
    body: { file_ids: ["1", "2", "3", "4", "5", "6"] },
  }, tooManyFilesResponse);
  assert.equal(tooManyFilesResponse.statusCode, 400);
});

test("creating a request updates case status and records notifications and audit activity", async () => {
  const incidentId = "22222222-2222-4222-8222-222222222222";
  const requestId = "11111111-1111-4111-8111-111111111111";
  const adminId = "33333333-3333-4333-8333-333333333333";
  const queryLog = [];
  const client = {
    async query(sql) {
      queryLog.push(sql.replace(/\s+/g, " ").trim());
      if (sql.includes("SELECT i.incident_id, i.reporter_id")) {
        return {
          rows: [{
            incident_id: incidentId,
            reporter_id: "44444444-4444-4444-8444-444444444444",
            current_status_id: 2,
            status_name: "Under Review",
          }],
        };
      }
      if (sql.includes("SELECT status_id, status_name")) {
        return { rows: [{ status_id: 11, status_name: "Awaiting Reporter Response" }] };
      }
      if (sql.includes("INSERT INTO incident_evidence_requests")) {
        return { rows: [{ request_id: requestId }] };
      }
      return { rows: [] };
    },
    release() {},
  };
  const originalConnect = pool.connect;
  const originalQuery = pool.query;
  pool.connect = async () => client;
  pool.query = async () => ({
    rows: [{
      request_id: requestId,
      incident_id: incidentId,
      status: "pending",
      incident_status: "Awaiting Reporter Response",
    }],
  });

  try {
    const response = createResponse();
    await evidenceRequestController.createRequest({
      user: { id: adminId, role_id: 14 },
      body: {
        incident_id: incidentId,
        request_text: "Please attach the signed maintenance record.",
      },
    }, response);
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.data.status, "pending");
    assert.ok(queryLog.some((sql) => sql.includes("UPDATE incidents SET current_status_id")));
    assert.ok(queryLog.some((sql) => sql.includes("INSERT INTO notifications")));
    assert.ok(queryLog.some((sql) => sql.includes("INSERT INTO audit_logs")));
    assert.ok(queryLog.some((sql) => sql === "COMMIT"));
  } finally {
    pool.connect = originalConnect;
    pool.query = originalQuery;
  }
});
