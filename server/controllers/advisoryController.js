const pool = require("../config/db");

const addAdvisoryNote = async (req, res) => {
  try {

    const { incident_id, note } = req.body;
    const userId = req.user.userId;

    const roleResult = await pool.query(
      `SELECT role_id FROM users WHERE user_id=$1`,
      [userId]
    );

    const roleId = roleResult.rows[0]?.role_id;

    if (![12,13].includes(roleId)) {
      return res.status(403).json({
        success:false,
        message:"Only SUG and SERVICOM can submit advisory notes."
      });
    }

    await pool.query(
      `INSERT INTO incident_advisory_notes
      (incident_id,user_id,note)
      VALUES($1,$2,$3)`,
      [incident_id,userId,note]
    );

    res.json({
      success:true,
      message:"Advisory note submitted successfully."
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success:false,
      message:err.message
    });

  }
};

const getIncidentNotes = async(req,res)=>{

  try{

    const { incidentId } = req.params;

    const result = await pool.query(
      `
      SELECT
        n.note,
        n.created_at,
        u.first_name,
        u.last_name,
        r.role_name
      FROM incident_advisory_notes n
      JOIN users u ON n.user_id=u.user_id
      JOIN roles r ON u.role_id=r.role_id
      WHERE incident_id=$1
      ORDER BY created_at DESC
      `,
      [incidentId]
    );

    res.json({
      success:true,
      data:result.rows
    });

  }catch(err){

    console.error(err);

    res.status(500).json({
      success:false,
      message:err.message
    });

  }

};

module.exports={
  addAdvisoryNote,
  getIncidentNotes
};