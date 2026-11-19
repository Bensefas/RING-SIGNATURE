const { webcrypto } = require("crypto");
const { hashIncidentReport } = require("./incidentSignaturePayload");

const ALGORITHM = "ECDSA-P256-SHA256";

const createSignatureError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const validatePublicJwk = async (jwk) => {
  if (
    !jwk
    || typeof jwk !== "object"
    || jwk.kty !== "EC"
    || jwk.crv !== "P-256"
    || typeof jwk.x !== "string"
    || typeof jwk.y !== "string"
    || Object.prototype.hasOwnProperty.call(jwk, "d")
  ) {
    throw createSignatureError("A public P-256 signing key is required.");
  }

  try {
    await webcrypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
  } catch (error) {
    throw createSignatureError(`The signing public key is invalid: ${error.message}`);
  }

  return { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };
};

const verifyDigitalReportSignature = async ({ report, signature, publicKey }) => {
  if (typeof signature !== "string" || !/^[A-Za-z0-9_-]+$/.test(signature)) {
    throw createSignatureError("A valid digital signature is required.");
  }

  const reportHash = hashIncidentReport({ ...report, anonymity: false });
  const normalizedPublicKey = await validatePublicJwk(publicKey);
  const key = await webcrypto.subtle.importKey(
    "jwk",
    normalizedPublicKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
  const signatureBytes = Buffer.from(signature, "base64url");
  if (signatureBytes.length !== 64) {
    throw createSignatureError("The digital signature has an invalid encoding.");
  }

  const valid = await webcrypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    signatureBytes,
    Buffer.from(reportHash, "utf8")
  );
  if (!valid) {
    throw createSignatureError("Digital signature verification failed. The report may have changed.");
  }

  return { algorithm: ALGORITHM, reportHash, publicKey: normalizedPublicKey, valid };
};

module.exports = {
  ALGORITHM,
  hashIncidentReport,
  validatePublicJwk,
  verifyDigitalReportSignature,
};
