const crypto = require("crypto");

const canonicalizeReport = (report) => {
  const categoryId = Number(report.category_id);
  let incidentDate = "";
  if (report.incident_date) {
    const parsedDate = new Date(report.incident_date);
    if (Number.isNaN(parsedDate.getTime())) {
      const error = new Error("A valid incident date is required.");
      error.statusCode = 400;
      throw error;
    }
    incidentDate = parsedDate.toISOString();
  }

  if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
    const error = new Error("A valid incident category is required.");
    error.statusCode = 400;
    throw error;
  }
  if (!/^[a-f0-9]{32}$/.test(String(report.nonce || ""))) {
    const error = new Error("A valid report-signing nonce is required.");
    error.statusCode = 400;
    throw error;
  }
  return {
    version: 1,
    title: String(report.title || "").trim(),
    category_id: categoryId,
    description: String(report.description || "").trim(),
    incident_location: String(report.incident_location || "").trim(),
    incident_date: incidentDate,
    priority: report.priority || "Medium",
    anonymity: Boolean(report.anonymity),
    nonce: String(report.nonce),
  };
};

const hashIncidentReport = (report) => crypto
  .createHash("sha256")
  .update(JSON.stringify(canonicalizeReport(report)), "utf8")
  .digest("hex");

module.exports = { canonicalizeReport, hashIncidentReport };
