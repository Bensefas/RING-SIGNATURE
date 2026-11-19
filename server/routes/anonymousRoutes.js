const express = require("express");
const router = express.Router();
const anonymousController = require("../controllers/anonymousController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/public-keys", authMiddleware, anonymousController.registerPublicKey);
router.post("/public-keys/revoke", authMiddleware, anonymousController.revokePublicKey);
router.get("/eligible-keys", authMiddleware, anonymousController.getEligiblePublicKeys);

module.exports = router;
