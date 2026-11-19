const test = require("node:test");
const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const {
  verifyAnonymousRingSignature,
  createLinkabilityScope,
} = require("../services/anonymousRingSignatureService");
const {
  verifyDigitalReportSignature,
  validatePublicJwk,
} = require("../services/digitalReportSignatureService");
const AnonymousModel = require("../models/anonymousModel");
const anonymousController = require("../controllers/anonymousController");
const pool = require("../config/db");

const anonymousClient = import("../../client/src/lib/anonymousRingSignature.js");
const payloadClient = import("../../client/src/lib/incidentSignaturePayload.js");
const digitalClient = import("../../client/src/lib/digitalReportSignature.js");

const createReport = (anonymity, nonce = "0123456789abcdef0123456789abcdef") => ({
  title: "Test incident",
  category_id: 7,
  description: "A test report for signature verification.",
  incident_location: "Campus library",
  incident_date: "2026-02-01T10:00:00.000Z",
  priority: "Medium",
  anonymity,
  nonce,
});

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

test("anonymous keys are restricted to active reporter accounts", async () => {
  const originalQuery = pool.query;
  let query = "";
  pool.query = async (sql) => {
    query = sql;
    return { rows: [] };
  };

  try {
    assert.deepEqual(await AnonymousModel.getEligiblePublicKeys(), []);
    assert.match(query, /reporter\.role_id = 1/);
    assert.match(query, /reporter\.is_active = TRUE/);
    assert.match(query, /anonymous_key\.status = 'active'/);
  } finally {
    pool.query = originalQuery;
  }
});

test("anonymous key enrollment and submissions reject non-reporter roles", async () => {
  const keyResponse = createResponse();
  await anonymousController.registerPublicKey({
    user: { id: "admin-id", role_id: 14 },
    body: { publicKey: "not-a-reporter-key" },
  }, keyResponse);
  assert.equal(keyResponse.statusCode, 403);

  const reportResponse = createResponse();
  await anonymousController.submitAnonymousIncident({
    user: { id: "admin-id", role_id: 14 },
    body: {},
  }, reportResponse);
  assert.equal(reportResponse.statusCode, 403);
});

test("anonymous LSAG signature verifies and linkability is scoped to category and year", async () => {
  const [anonymous, payload] = await Promise.all([anonymousClient, payloadClient]);
  const signer = anonymous.createAnonymousKeyPair();
  const otherMember = anonymous.createAnonymousKeyPair();
  const ring = anonymous.buildAnonymousRing([signer.publicKey, otherMember.publicKey]);
  const report = createReport(true);
  const reportHash = await payload.hashIncidentReport(report);
  const scope = anonymous.getAnonymousLinkabilityScope(
    report.category_id,
    new Date(Date.UTC(2026, 0, 1))
  );
  const signed = anonymous.signAnonymousIncident({ reportHash, ring, keyPair: signer, scope });
  const verified = await verifyAnonymousRingSignature({
    report,
    signature: signed.signature,
    expectedRing: ring,
    reportingYear: 2026,
  });

  assert.equal(verified.reportHash, reportHash);
  assert.equal(verified.linkabilityTag, signed.signature.keyImage);
  assert.notEqual(createLinkabilityScope(7, 2026), createLinkabilityScope(8, 2026));
  assert.notEqual(createLinkabilityScope(7, 2026), createLinkabilityScope(7, 2027));

  const changedReport = { ...report, description: "Altered after signing." };
  await assert.rejects(
    verifyAnonymousRingSignature({
      report: changedReport,
      signature: signed.signature,
      expectedRing: ring,
      reportingYear: 2026,
    }),
    /does not match this report/
  );

  const otherReportHash = await payload.hashIncidentReport(createReport(true, "fedcba9876543210fedcba9876543210"));
  const sameSignerNextReport = anonymous.signAnonymousIncident({
    reportHash: otherReportHash,
    ring,
    keyPair: signer,
    scope,
  });
  assert.equal(sameSignerNextReport.linkabilityTag, signed.linkabilityTag);
  const otherScopeSignature = anonymous.signAnonymousIncident({
    reportHash: otherReportHash,
    ring,
    keyPair: signer,
    scope: anonymous.getAnonymousLinkabilityScope(8, new Date(Date.UTC(2026, 0, 1))),
  });
  assert.notEqual(otherScopeSignature.linkabilityTag, signed.linkabilityTag);
  assert.throws(
    () => anonymous.signAnonymousIncident({
      reportHash,
      ring: [signer.publicKey],
      keyPair: signer,
      scope,
    }),
    /at least two/
  );
});

test("digital P-256 signature verifies against the client format and rejects tampering", async () => {
  const [payload, digital] = await Promise.all([payloadClient, digitalClient]);
  const report = createReport(false);
  const pair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const keyPair = {
    privateKey: await webcrypto.subtle.exportKey("jwk", pair.privateKey),
    publicKey: await webcrypto.subtle.exportKey("jwk", pair.publicKey),
  };
  const reportHash = await payload.hashIncidentReport(report);
  const signature = await digital.signIncidentHash({ reportHash, keyPair });
  const publicKey = digital.publicJwkFromKeyPair(keyPair);
  const verified = await verifyDigitalReportSignature({ report, signature, publicKey });

  assert.equal(verified.valid, true);
  assert.equal(verified.reportHash, reportHash);
  assert.deepEqual(await validatePublicJwk(publicKey), publicKey);
  await assert.rejects(
    verifyDigitalReportSignature({
      report: { ...report, description: "Altered after signing." },
      signature,
      publicKey,
    }),
    /verification failed/
  );
  await assert.rejects(validatePublicJwk({ ...publicKey, d: "must-not-be-accepted" }), /public P-256/);
});
