import { useState } from "react";
import axios from "axios";
import { Upload, FileImage } from "lucide-react";

const API = "http://localhost:5000";

function EvidenceUpload({ incidentId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async () => {
    if (!file || !incidentId) return;

    setUploading(true);

    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("incident_id", incidentId);
      formData.append("evidence", file);

      const res = await axios.post(
        `${API}/api/evidence/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      alert("Evidence uploaded successfully.");

      setFile(null);

      if (onUploaded) {
        onUploaded(res.data.file);
      }

    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <FileImage size={20} color="#2563EB" />
        <strong>Upload Evidence</strong>
      </div>

      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        onChange={(e) => setFile(e.target.files[0])}
      />

      {file && (
        <div style={styles.fileName}>
          {file.name}
        </div>
      )}

      <button
        style={styles.button}
        onClick={uploadFile}
        disabled={!file || uploading}
      >
        <Upload size={18} />
        {uploading ? "Uploading..." : "Upload to IPFS"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    marginTop: 20,
    background: "#F8FAFC",
    padding: 18,
    borderRadius: 12,
    border: "1px solid #E2E8F0"
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12
  },

  fileName: {
    marginTop: 10,
    color: "#475569",
    fontSize: 14
  },

  button: {
    marginTop: 15,
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: 12,
    border: "none",
    borderRadius: 10,
    background: "#2563EB",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer"
  }
};

export default EvidenceUpload;