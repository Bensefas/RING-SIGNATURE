const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const {
  getMyAssignments,
  updateAssignmentStatus
} = require("../controllers/assignmentController");

// HOD sees only incidents assigned to them
router.get("/assigned", auth, getMyAssignments);

// HOD updates incident status
router.put("/status", auth, updateAssignmentStatus);

module.exports = router;