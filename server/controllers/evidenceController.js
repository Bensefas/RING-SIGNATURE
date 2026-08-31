const crypto = require("crypto");
const fs = require("fs/promises");
const pool = require("../config/db");
const { uploadEvidence: uploadToIPFS } = require("../services/ipfsService");
const ipfsGateway = process.env.IPFS_GATEWAY_URL || "http://127.0.0.1:8080/ipfs";

const getIncident = async (incidentId) => {
  const result = await pool.query(
    "SELECT id, incident_id FROM incidents WHERE incident_id = $1 LIMIT 1",
    [incidentId]
  );
  return result.rows[0];
};

const uploadEvidence = async (req, res) => {
  try {
    const incident = await getIncident(req.body.incident_id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found." });
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });

    const fileBuffer = await fs.readFile(req.file.path);
    const ipfs = await uploadToIPFS(fileBuffer, req.file.originalname);
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const result = await pool.query(
      `INSERT INTO incident_evidence
        (incident_id, uploaded_by, original_name, mime_type, file_size, ipfs_cid, file_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [incident.id, req.user.user_id, req.file.originalname,
        req.file.mimetype, req.file.size, ipfs.cid, fileHash]
    );
    await fs.unlink(req.file.path).catch(() => {});
    const file = {
      ...result.rows[0],
      file_url: `${ipfsGateway}/${result.rows[0].ipfs_cid}`
    };
    return res.status(201).json({ success: true, message: "Evidence uploaded successfully.", file });
  } catch (error) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    console.error("Evidence upload error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getIncidentFiles = async (req, res) => {
  try {
    const incident = await getIncident(req.params.incidentId);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found." });
    const result = await pool.query(
             `SELECT id AS file_id, original_name AS file_name, mime_type AS file_type,
              file_size, ipfs_cid, file_hash, created_at
             FROM incident_evidence WHERE incident_id = $1 ORDER BY created_at DESC`,
             [incident.id]
    );
    return res.json({
      success: true,
      data: result.rows.map((file) => ({
        ...file,
        file_url: `${ipfsGateway}/${file.ipfs_cid}`
      }))
    });
  } catch (error) {
    console.error("Evidence list error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { uploadEvidence, getIncidentFiles };
