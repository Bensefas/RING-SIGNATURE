const reportFields = (report) => ({
  version: 1,
  title: String(report.title || "").trim(),
  category_id: Number(report.category_id),
  description: String(report.description || "").trim(),
  incident_location: String(report.incident_location || "").trim(),
  incident_date: report.incident_date ? new Date(report.incident_date).toISOString() : "",
  priority: report.priority || "Medium",
  anonymity: Boolean(report.anonymity),
  nonce: String(report.nonce || ""),
});

export const serializeIncidentSignaturePayload = (report) =>
  JSON.stringify(reportFields(report));

export const hashIncidentReport = async (report) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error("The Web Crypto API is not available in this browser.");
  }
  const data = new TextEncoder().encode(serializeIncidentSignaturePayload(report));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const createIncidentNonce = () => {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random number generation is not available in this browser.");
  }
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};
