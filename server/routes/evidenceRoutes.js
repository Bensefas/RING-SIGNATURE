const express=require("express");
const router=express.Router();

const auth=require("../middleware/authMiddleware");
const upload=require("../middleware/uploadMiddleware");

const{
  uploadEvidence,
  getIncidentFiles
}=require("../controllers/evidenceController");

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

module.exports=router;