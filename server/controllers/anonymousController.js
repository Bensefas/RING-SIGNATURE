const AnonymousIncidentService = require("../services/anonymousIncidentService");
const getIncidentErrorResponse = require("../utils/incidentErrorResponse");

const getUserId = (req) => req.user?.user_id || req.user?.userId || req.user?.id;

const registerPublicKey = async (req, res) => {
  try {
    if (Number(req.user?.role_id) !== 1) {
      return res.status(403).json({
        success: false,
        message: "Only active reporters can enroll anonymous signing keys.",
      });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const result = await AnonymousIncidentService.registerPublicKey({
      userId,
      publicKey: req.body.publicKey,
    });

    res.status(201).json({
      success: true,
      message: "Public key registered successfully.",
      data: result,
    });
  } catch (error) {
    const response = getIncidentErrorResponse(error);
    if (response.statusCode >= 500) console.error("Anonymous key registration failed:", error);
    res.status(response.statusCode).json({ success: false, message: response.message });
  }
};

const getEligiblePublicKeys = async (req, res) => {
  try {
    const rows = await AnonymousIncidentService.getEligiblePublicKeys();
    res.status(200).json({
      success: true,
      count: rows.length,
      keys: rows,
      data: rows,
    });
  } catch (error) {
    const response = getIncidentErrorResponse(error);
    console.error("Eligible anonymous keys could not be loaded:", error);
    res.status(response.statusCode).json({ success: false, message: response.message });
  }
};

const revokePublicKey = async (req, res) => {
  try {
    if (Number(req.user?.role_id) !== 1) {
      return res.status(403).json({
        success: false,
        message: "Only reporters can revoke their anonymous signing keys.",
      });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const result = await AnonymousIncidentService.revokePublicKey({
      userId,
      reason: req.body.reason || "revoked",
    });

    res.status(200).json({
      success: true,
      message: "Public key revoked successfully.",
      data: result,
    });
  } catch (error) {
    const response = getIncidentErrorResponse(error);
    if (response.statusCode >= 500) console.error("Anonymous key revocation failed:", error);
    res.status(response.statusCode).json({ success: false, message: response.message });
  }
};

const submitAnonymousIncident = async (req, res) => {
  try {
    if (Number(req.user?.role_id) !== 1) {
      return res.status(403).json({
        success: false,
        message: "Only reporters can submit anonymous incidents.",
      });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const result = await AnonymousIncidentService.submitAnonymousIncident({
      payload: req.body,
      userId,
    });

    res.status(201).json({
      success: true,
      message: "Anonymous incident submitted successfully.",
      data: result,
    });
  } catch (error) {
    const response = getIncidentErrorResponse(error);
    if (response.statusCode >= 500) console.error("Anonymous incident submission failed:", error);
    res.status(response.statusCode).json({
      success: false,
      message: response.message,
    });
  }
};

module.exports = {
  registerPublicKey,
  getEligiblePublicKeys,
  revokePublicKey,
  submitAnonymousIncident,
};
