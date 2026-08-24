const express = require("express");
const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/notificationController");

const router = express.Router();

router.get("/", auth, controller.getMyNotifications);
router.patch("/:id/read", auth, controller.markNotificationRead);

module.exports = router;
