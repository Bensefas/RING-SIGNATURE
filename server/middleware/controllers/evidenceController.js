const pool = require("../config/db");
const fs = require("fs");
const { uploadToIPFS } = require("../services/ipfsService");

const uploadEvidence = async (req, res) => {

  try {

    const { incident_id } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded."
      });
    }

    const ipfs = await uploadToIPFS(req.file.path);

    const result = await pool.query(
      `
      INSERT INTO incident_files
      (
        incident_id,
        file_name,
        file_type,
        file_size,
        ipfs_cid,
        file_path
      )
      VALUES($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        incident_id,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        ipfs.cid,
        ipfs.gateway
      ]
    );

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: "Evidence uploaded successfully.",
      file: result.rows[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};

const getIncidentFiles = async (req, res) => {

  try {

    const { incidentId } = req.params;

    const result = await pool.query(
      `
      SELECT
        file_id,
        file_name,
        file_type,
        file_size,
        ipfs_cid,
        file_path AS file_url
      FROM incident_files
      WHERE incident_id=$1
      ORDER BY uploaded_at DESC
      `,
      [incidentId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};

module.exports = {
  uploadEvidence,
  getIncidentFiles
};