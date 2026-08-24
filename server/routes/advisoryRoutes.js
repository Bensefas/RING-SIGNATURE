const express=require("express");
const router=express.Router();

const auth=require("../middleware/authMiddleware");

const{
  addAdvisoryNote,
  getIncidentNotes
}=require("../controllers/advisoryController");

router.post(
  "/",
  auth,
  addAdvisoryNote
);

router.get(
  "/:incidentId",
  auth,
  getIncidentNotes
);

module.exports=router;