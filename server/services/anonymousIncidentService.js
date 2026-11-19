const pool = require("../config/db");
const IncidentModel = require("../models/incidentModel");
const AnonymousModel = require("../models/anonymousModel");
const BlockchainService = require("./blockchainService");
const {
  ALGORITHM,
  createLinkabilityScope,
  validateAnonymousPublicKey,
  verifyAnonymousRingSignature,
} = require("./anonymousRingSignatureService");

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const registerPublicKey = async ({ userId, publicKey }) => {
  if (!userId) throw createValidationError("User ID is required.");
  const validatedPublicKey = await validateAnonymousPublicKey(publicKey);
  return AnonymousModel.registerPublicKey({ userId, publicKey: validatedPublicKey });
};

const getEligiblePublicKeys = async () => {
  const rows = await AnonymousModel.getEligiblePublicKeys();
  return rows.map((row) => row.public_key);
};

const revokePublicKey = async ({ userId, reason }) => {
  if (!userId) throw createValidationError("User ID is required to revoke a public key.");
  return AnonymousModel.revokePublicKey({ userId, reason });
};

const validateReport = (report) => {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw createValidationError("Anonymous report details are required.");
  }
  if (!String(report.title || "").trim() || !String(report.description || "").trim()) {
    throw createValidationError("Incident title and description are required.");
  }
  if (!report.category_id || !report.incident_date || !String(report.nonce || "")) {
    throw createValidationError("Category, incident date and report nonce are required.");
  }
  if (!["Low", "Medium", "High", "Critical"].includes(report.priority || "Medium")) {
    throw createValidationError("Incident priority is invalid.");
  }
};

const submitAnonymousIncident = async ({ payload, userId }) => {
  if (!userId) throw createValidationError("Authentication is required.");
  const report = payload?.report;
  validateReport(report);

  const ownKey = await AnonymousModel.getPublicKeyForUser({ userId });
  if (!ownKey) {
    throw createValidationError("Register an anonymous signing key before submitting this report.");
  }

  const eligibleKeys = await getEligiblePublicKeys();
  const ring = [...new Set(eligibleKeys.map((key) => key.toLowerCase()))].sort();
  if (!ring.includes(ownKey.public_key.toLowerCase())) {
    throw createValidationError("Your anonymous signing key is not active. Re-enroll and retry.");
  }

  const reportingYear = new Date().getUTCFullYear();
  const verification = await verifyAnonymousRingSignature({
    report,
    signature: payload.ringSignature,
    expectedRing: ring,
    reportingYear,
  });
  const signatureText = JSON.stringify(verification.signature);
  let incident;
  let duplicateSignerDetected = false;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
      [verification.scope, verification.linkabilityTag]
    );
    const previousReports = await AnonymousModel.checkLinkabilityHistory({
      linkabilityTag: verification.linkabilityTag,
      linkabilityScope: verification.scope,
    }, client);
    duplicateSignerDetected = previousReports.length > 0;

    incident = await IncidentModel.createIncident({
      reporter_id: userId,
      category_id: report.category_id,
      title: report.title.trim(),
      description: report.description.trim(),
      incident_location: report.incident_location || null,
      incident_date: report.incident_date,
      priority: report.priority || "Medium",
      anonymity: true,
      report_hash: verification.reportHash,
      signature: signatureText,
      signature_algorithm: ALGORITHM,
      signature_verified: true,
      signature_nonce: report.nonce,
    }, client);

    await AnonymousModel.insertAnonymousReport({
      incidentId: incident.incident_id,
      userId,
      reportHash: verification.reportHash,
      ring,
      signature: signatureText,
      linkabilityTag: verification.linkabilityTag,
      linkabilityScope: verification.scope,
      verificationResult: true,
    }, client);

    await client.query(
      `INSERT INTO incident_status_history
        (incident_id, previous_status, new_status, changed_by, comment)
       VALUES ($1, NULL, 'SUBMITTED', $2, 'Anonymous incident submitted')`,
      [incident.incident_id, userId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  let blockchainWarning = null;
  try {
    const anchor = await BlockchainService.anchorIncidentCreation({
      ...incident,
      reporter_id: "anonymous",
      anonymity: true,
      report_hash: verification.reportHash,
      signature: signatureText,
      signature_verified: true,
      linkability_tag: verification.linkabilityTag,
      ring_members: ring,
    });
    await pool.query(
      "UPDATE incidents SET blockchain_tx_id = $1 WHERE incident_id = $2",
      [anchor.txId, incident.incident_id]
    );
    incident.blockchain_tx_id = anchor.txId;
  } catch (error) {
    console.error("Anonymous incident blockchain anchor failed:", error);
    blockchainWarning = "The report was saved, but blockchain anchoring failed.";
  }

  return {
    incident: { ...incident, reporter_id: null },
    reportHash: verification.reportHash,
    algorithm: verification.algorithm,
    duplicateSignerDetected,
    linkabilityScope: verification.scope,
    ringSize: ring.length,
    blockchainWarning,
  };
};

module.exports = {
  registerPublicKey,
  getEligiblePublicKeys,
  revokePublicKey,
  submitAnonymousIncident,
  createLinkabilityScope,
};
