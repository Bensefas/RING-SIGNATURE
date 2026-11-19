import { schnorr } from "@noble/curves/secp256k1.js";
import { lsagSign } from "@forgesworn/ring-sig";
import { getOrCreateSigningKey } from "./signatureKeyStore.js";

const bytesToHex = (bytes) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export const createAnonymousKeyPair = () => {
  const privateBytes = schnorr.utils.randomSecretKey();
  return {
    privateKey: bytesToHex(privateBytes),
    publicKey: bytesToHex(schnorr.getPublicKey(privateBytes)),
  };
};

export const getAnonymousSigningKey = (userId) =>
  getOrCreateSigningKey(`anonymous-lsag:${userId}`, createAnonymousKeyPair);

export const buildAnonymousRing = (eligibleKeys) => {
  const members = eligibleKeys
    .map((entry) => typeof entry === "string" ? entry : entry.public_key)
    .filter((key) => typeof key === "string")
    .map((key) => key.toLowerCase());
  return [...new Set(members)].sort();
};

export const getAnonymousLinkabilityScope = (categoryId, date = new Date()) =>
  `university-incident-reporting-v1:${Number(categoryId)}:${date.getUTCFullYear()}`;

export const signAnonymousIncident = ({ reportHash, ring, keyPair, scope }) => {
  const signerIndex = ring.indexOf(keyPair.publicKey);
  if (signerIndex < 0) {
    throw new Error("Your anonymous signing key is not enrolled in the reporting ring.");
  }
  if (ring.length < 2) {
    throw new Error("Anonymous reporting needs at least two enrolled reporter keys.");
  }

  const signature = lsagSign(
    reportHash,
    ring,
    signerIndex,
    keyPair.privateKey,
    scope,
    "university-incident-anonymous-lsag-v1"
  );
  return { signature, linkabilityTag: signature.keyImage };
};
