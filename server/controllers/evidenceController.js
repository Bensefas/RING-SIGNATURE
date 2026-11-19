const crypto = require("crypto");
const fs = require("fs/promises");
const pool = require("../config/db");
const EvidenceModel = require("../models/evidenceModel");
const { uploadEvidence: uploadToIPFS } = require("../services/ipfsService");
const ipfsGateway = process.env.IPFS_GATEWAY_URL || "http://127.0.0.1:8080/ipfs";

const getIncident = async (incidentId) => {
  const result = await pool.query(
    "SELECT incident_id AS id, reporter_id FROM incidents WHERE incident_id = $1 LIMIT 1",
    [incidentId]
  );
  return result.rows[0];
};

const canAccessIncident = async (incident, user) => {
  if (Number(user.role_id) >= 3 && Number(user.role_id) <= 14) return true;
  if (incident.reporter_id === user.id) return true;
  const assignment = await pool.query(
    `SELECT 1
     FROM incident_assignments
     WHERE incident_id = $1 AND assigned_to = $2 AND completed_at IS NULL
     LIMIT 1`,
    [incident.id, user.id]
  );
  return assignment.rows.length > 0;
};

const uploadEvidence = async (req, res) => {
  try {
    const incident = await getIncident(req.body.incident_id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found." });
    if (!(await canAccessIncident(incident, req.user))) {
      return res.status(403).json({ success: false, message: "You cannot add evidence to this incident." });
    }
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });

    const fileBuffer = await fs.readFile(req.file.path);
    const ipfs = await uploadToIPFS(fileBuffer, req.file.originalname);
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const savedFile = await EvidenceModel.saveEvidence({
      incident_id: incident.id,
      uploaded_by: req.user.user_id,
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      ipfs_cid: ipfs.cid,
      file_hash: fileHash,
    });
    await fs.unlink(req.file.path).catch(() => {});
    const file = {
      ...savedFile,
      file_url: savedFile.ipfs_cid ? `${ipfsGateway}/${savedFile.ipfs_cid}` : null,
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
    if (!(await canAccessIncident(incident, req.user))) {
      return res.status(403).json({ success: false, message: "You cannot view evidence for this incident." });
    }
    const result = await pool.query(
                  `SELECT file_id, original_filename AS file_name, mime_type AS file_type,
                    file_size, ipfs_cid, file_hash, uploaded_at AS created_at
                   FROM incident_files WHERE incident_id = $1 ORDER BY uploaded_at DESC`,
             [incident.id]
    );
    return res.json({
      success: true,
      data: result.rows.map((file) => ({
        ...file,
        file_url: file.ipfs_cid ? `${ipfsGateway}/${file.ipfs_cid}` : null
      }))
    });
  } catch (error) {
    console.error("Evidence list error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { uploadEvidence, getIncidentFiles };
