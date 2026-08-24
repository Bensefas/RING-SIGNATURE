const express=require("express");

const router=express.Router();

const auth=require("../middleware/authMiddleware");

const{
  assignIncident,
  getMyAssignments,
  getAssignableUsers,
  updateAssignmentStatus
}=require("../controllers/assignmentController");

router.post(
  "/assign",
  auth,
  assignIncident
);

router.get(
  "/my",
  auth,
  getMyAssignments
);

router.get(
  "/admins",
  auth,
  getAssignableUsers
);

router.put(
  "/status",
  auth,
  updateAssignmentStatus
);

module.exports=router;