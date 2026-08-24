const express = require("express");
const router = express.Router();

const incidentController = require("../controllers/incidentController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/categories", authMiddleware, incidentController.getCategories);
router.get("/all", authMiddleware, incidentController.getAllIncidents);
/* Student submits incident */
router.post("/", authMiddleware, incidentController.createIncident);
router.get("/assignable-users", authMiddleware, incidentController.getAssignableUsers);

router.post("/:incidentId/assign", authMiddleware, incidentController.assignIncident);
router.patch("/:incidentId/status", authMiddleware, incidentController.updateIncidentStatus);
router.post("/:incidentId/feedback", authMiddleware, incidentController.addFeedback);
router.post("/:incidentId/complete", authMiddleware, incidentController.completeIncident);
router.post("/:incidentId/close", authMiddleware, incidentController.closeIncident);
router.post("/:incidentId/advisory", authMiddleware, incidentController.addAdvisory);

/* Student views own incidents */
router.get("/my", authMiddleware, incidentController.getMyIncidents);

/* Admin receives all incidents */
router.get("/", authMiddleware, incidentController.getAllIncidents);

/* Single incident */
router.get("/:id", authMiddleware, incidentController.getMyIncident);

module.exports = router;