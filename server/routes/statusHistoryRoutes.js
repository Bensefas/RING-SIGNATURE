const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  getHistory
} = require("../controllers/statusHistoryController");

router.get(
  "/:incident_id",
  auth,
  getHistory
);

module.exports = router;