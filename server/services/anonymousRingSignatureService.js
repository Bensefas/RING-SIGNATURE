const { hashIncidentReport } = require("./incidentSignaturePayload");

const ALGORITHM = "LSAG-secp256k1-v1";
const DOMAIN = "university-incident-anonymous-lsag-v1";
const MAX_RING_SIZE = 1000;

const createLinkabilityScope = (categoryId, reportingYear) =>
  `university-incident-reporting-v1:${Number(categoryId)}:${Number(reportingYear)}`;

const normalizeRing = (keys) => [...new Set(keys.map((key) => String(key).toLowerCase()))].sort();

const validateAnonymousPublicKey = async (publicKey) => {
  if (typeof publicKey !== "string" || !/^[a-f0-9]{64}$/i.test(publicKey)) {
    throw createSignatureError("An x-only secp256k1 public key is required.");
  }
  const { secp256k1 } = await import("@noble/curves/secp256k1.js");
  try {
    secp256k1.Point.fromBytes(Buffer.concat([
      Buffer.from([2]),
      Buffer.from(publicKey, "hex"),
    ])).assertValidity();
  } catch (error) {
    throw createSignatureError(`The anonymous signing public key is invalid: ${error.message}`);
  }
  return publicKey.toLowerCase();
};

const createSignatureError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const verifyAnonymousRingSignature = async ({ report, signature, expectedRing, reportingYear }) => {
  if (!report || !signature || typeof signature !== "object" || Array.isArray(signature)) {
    throw createSignatureError("Anonymous report signature is missing or malformed.");
  }

  const reportHash = hashIncidentReport({ ...report, anonymity: true });
  const expectedScope = createLinkabilityScope(report.category_id, reportingYear);
  const ring = normalizeRing(expectedRing);
  const signedRing = Array.isArray(signature.ring) ? normalizeRing(signature.ring) : [];

  if (ring.length < 2) {
    throw createSignatureError("Anonymous reporting needs at least two enrolled reporter keys.");
  }
  if (ring.length > MAX_RING_SIZE) {
    throw createSignatureError("The active reporter ring exceeds the supported size.");
  }
  if (signedRing.length !== ring.length || signedRing.some((key, index) => key !== ring[index])) {
    throw createSignatureError("The signature was created for a different reporter ring. Please retry.");
  }
  if (
    signature.message !== reportHash
    || signature.electionId !== expectedScope
    || signature.domain !== DOMAIN
  ) {
    throw createSignatureError("The anonymous signature does not match this report or reporting scope.");
  }

  const { lsagVerify } = await import("@forgesworn/ring-sig");
  if (!lsagVerify(signature)) {
    throw createSignatureError("Anonymous ring signature verification failed.");
  }

  return {
    algorithm: ALGORITHM,
    reportHash,
    scope: expectedScope,
    linkabilityTag: signature.keyImage,
    ring,
    signature,
  };
};

module.exports = {
  ALGORITHM,
  DOMAIN,
  createLinkabilityScope,
  hashIncidentReport,
  validateAnonymousPublicKey,
  verifyAnonymousRingSignature,
};
