import { getOrCreateSigningKey } from "./signatureKeyStore.js";

const SIGNATURE_ALGORITHM = { name: "ECDSA", namedCurve: "P-256" };

const createDigitalKeyPair = async () => {
  if (!globalThis.crypto?.subtle) {
    throw new Error("The Web Crypto API is not available in this browser.");
  }
  const keyPair = await crypto.subtle.generateKey(SIGNATURE_ALGORITHM, true, ["sign", "verify"]);
  return {
    privateKey: await crypto.subtle.exportKey("jwk", keyPair.privateKey),
    publicKey: await crypto.subtle.exportKey("jwk", keyPair.publicKey),
  };
};

export const getDigitalSigningKey = (userId) =>
  getOrCreateSigningKey(`identified-ecdsa-p256:${userId}`, createDigitalKeyPair);

export const publicJwkFromKeyPair = ({ publicKey }) => ({
  kty: publicKey.kty,
  crv: publicKey.crv,
  x: publicKey.x,
  y: publicKey.y,
});

const toBase64Url = (bytes) => {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const signIncidentHash = async ({ reportHash, keyPair }) => {
  if (!/^[a-f0-9]{64}$/.test(reportHash)) {
    throw new Error("A valid SHA-256 report hash is required.");
  }
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    keyPair.privateKey,
    SIGNATURE_ALGORITHM,
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(reportHash)
  );
  return toBase64Url(new Uint8Array(signature));
};
