const express = require("express");
const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/auditController");

const router = express.Router();

router.get("/", auth, controller.getAuditLogs);

module.exports = router;
