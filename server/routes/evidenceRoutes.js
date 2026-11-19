const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  uploadEvidence,
  getIncidentFiles,
} = require("../controllers/evidenceController");
const evidenceRequestController = require("../controllers/evidenceRequestController");

router.get("/requests/my", auth, evidenceRequestController.getMyRequests);
router.get("/requests", auth, evidenceRequestController.getRequests);
router.post("/requests", auth, evidenceRequestController.createRequest);
router.post(
  "/requests/:requestId/respond",
  auth,
  evidenceRequestController.respondToRequest
);

router.post(
  "/upload",
  auth,
  upload.single("evidence"),
  uploadEvidence
);

router.get(
  "/:incidentId",
  auth,
  getIncidentFiles
);

module.exports = router;