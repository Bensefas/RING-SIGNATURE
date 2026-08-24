const pool=require("../config/db");

const getHistory=async(req,res)=>{

  try{

    const {incident_id}=req.params;

    const result=await pool.query(
      `
      SELECT
        h.*,
        s.status_name
      FROM incident_status_history h
      JOIN incident_statuses s
        ON h.status_id=s.status_id
      WHERE incident_id=$1
      ORDER BY changed_at ASC
      `,
      [incident_id]
    );

    res.json({
      success:true,
      data:result.rows
    });

  }catch(error){

    console.error(error);

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

};

module.exports={
  getHistory
};