const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { verifyIncident } = require("../controllers/blockchainController");

// Verify blockchain record for a specific incident
router.get("/verify/:incidentId", auth, verifyIncident);

module.exports = router;