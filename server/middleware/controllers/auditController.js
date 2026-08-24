const pool=require("../config/db");

const createAuditLog=async({
  incidentId,
  userId,
  action,
  details
})=>{

  try{

    await pool.query(
      `
      INSERT INTO audit_logs
      (incident_id,user_id,action,details)
      VALUES($1,$2,$3,$4)
      `,
      [
        incidentId,
        userId,
        action,
        details
      ]
    );

  }catch(err){

    console.error("Audit Log Error:",err);

  }

};

module.exports={
  createAuditLog
};