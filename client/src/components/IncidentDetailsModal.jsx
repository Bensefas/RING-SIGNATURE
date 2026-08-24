import { useEffect, useState } from "react";
import axios from "axios";
import EvidenceUpload from "./EvidenceUpload";
import EvidenceViewer from "./EvidenceViewer";
import {
  X,
  User,
  MapPin,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Link2
} from "lucide-react";

const API = "http://localhost:5000";

function IncidentDetailsModal({ incident, onClose, onUpdateStatus }) {
  const [verification, setVerification] = useState(null);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!incident) return;

    const loadVerification = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          `${API}/api/blockchain/verify/${incident.incident_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setVerification(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };

    loadVerification();

    const loadEvidence = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/api/evidence/${incident.incident_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFiles(res.data.data || []);
      } catch (err) {
        console.error(err);
        setFiles([]);
      }
    };

    loadEvidence();
  }, [incident]);

  if (!incident) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2>{incident.title}</h2>
            <p style={styles.id}>{incident.incident_number}</p>
          </div>

          <button style={styles.closeBtn} onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div style={styles.badges}>
          <span
            style={{
              ...styles.priority,
              background:
                incident.priority === "Critical"
                  ? "#FEE2E2"
                  : incident.priority === "High"
                  ? "#FEF3C7"
                  : "#DBEAFE",
              color:
                incident.priority === "Critical"
                  ? "#991B1B"
                  : incident.priority === "High"
                  ? "#92400E"
                  : "#1D4ED8",
            }}
          >
            {incident.priority}
          </span>

          <span style={styles.status}>
            {incident.status_name || "Submitted"}
          </span>
        </div>

        <div style={styles.section}>
          <div style={styles.info}>
            <User size={18} />
            <span>
              {incident.first_name || "Anonymous"} {incident.last_name || ""}
            </span>
          </div>

          <div style={styles.info}>
            <MapPin size={18} />
            <span>
              {incident.incident_location || "Location not provided"}
            </span>
          </div>

          <div style={styles.info}>
            <Calendar size={18} />
            <span>
              {incident.incident_date
                ? new Date(incident.incident_date).toLocaleDateString()
                : "Date not provided"}
            </span>
          </div>

          <div style={styles.info}>
            <Shield size={18} />
            <span>{incident.unit_name || "Department not specified"}</span>
          </div>
        </div>

        <div style={styles.section}>
          <h3>Description</h3>

          <div style={styles.description}>{incident.description}</div>
        </div>

        <div style={styles.section}>
          <h3>Evidence</h3>

          <EvidenceUpload
            incidentId={incident.incident_id}
            onUploaded={(file) => setFiles((previous) => [file, ...previous])}
          />
          <EvidenceViewer files={files} />
        </div>

        <div style={styles.section}>
          <h3>Blockchain Verification</h3>

          <div style={styles.blockchainBox}>
            <div style={styles.summaryRow}>
              <ShieldCheck color="#10B981" />
              <span>
                {verification?.verification?.verified
                  ? "Verified"
                  : "Loading..."}
              </span>
            </div>

            <div style={styles.summaryRow}>
              <Link2 color="#2563EB" />
              <span>
                {verification?.blockchain_tx_id ||
                  incident.blockchain_tx_id ||
                  "Pending"}
              </span>
            </div>

            <div style={styles.hash}>
              {verification?.blockchain_hash ||
                incident.blockchain_hash ||
                "Hash not available"}
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3>Status Timeline</h3>

          <div style={styles.timeline}>
            <div style={styles.step}>
              <CheckCircle color="#10B981" />
              <span>Submitted</span>
            </div>

            <div style={styles.line} />

            <div style={styles.step}>
              <Shield color="#2563EB" />
              <span>Assigned</span>
            </div>

            <div style={styles.line} />

            <div style={styles.step}>
              <AlertTriangle color="#F59E0B" />
              <span>Investigation</span>
            </div>

            <div style={styles.line} />

            <div style={styles.step}>
              <CheckCircle color="#10B981" />
              <span>Resolved</span>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3>Update Case Status</h3>

          <div style={styles.actions}>
            <button
              style={styles.primary}
              onClick={() => onUpdateStatus?.(2)}
            >
              Under Investigation
            </button>

            <button
              style={styles.secondary}
              onClick={() => onUpdateStatus?.(3)}
            >
              Escalate
            </button>

            <button
              style={styles.success}
              onClick={() => onUpdateStatus?.(4)}
            >
              Mark Resolved
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: 20,
  },

  modal: {
    width: "100%",
    maxWidth: 760,
    background: "white",
    borderRadius: 22,
    padding: 28,
    boxShadow: "0 25px 50px rgba(0,0,0,.25)",
    maxHeight: "90vh",
    overflowY: "auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  closeBtn: {
    border: "none",
    background: "#F1F5F9",
    padding: 10,
    borderRadius: 10,
    cursor: "pointer",
  },

  id: {
    color: "#64748B",
    marginTop: 6,
  },

  badges: {
    display: "flex",
    gap: 10,
    margin: "20px 0",
  },

  priority: {
    padding: "6px 12px",
    borderRadius: 20,
    fontWeight: "bold",
    fontSize: 13,
  },

  status: {
    padding: "6px 12px",
    borderRadius: 20,
    background: "#DBEAFE",
    color: "#1D4ED8",
    fontWeight: "bold",
    fontSize: 13,
  },

  section: {
    marginTop: 26,
  },

  info: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "10px 0",
  },

  description: {
    background: "#F8FAFC",
    padding: 18,
    borderRadius: 12,
    lineHeight: 1.7,
  },

  blockchainBox: {
    background: "#EFF6FF",
    padding: 18,
    borderRadius: 12,
  },

  summaryRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "8px 0",
  },

  hash: {
    wordBreak: "break-all",
    fontSize: 12,
    marginTop: 10,
    color: "#475569",
  },

  timeline: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },

  step: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
  },

  line: {
    flex: 1,
    height: 2,
    background: "#CBD5E1",
    margin: "0 8px",
  },

  actions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 12,
    marginTop: 18,
  },

  primary: {
    background: "#2563EB",
    color: "white",
    border: "none",
    padding: 14,
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: "bold",
  },

  secondary: {
    background: "#F59E0B",
    color: "white",
    border: "none",
    padding: 14,
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: "bold",
  },

  success: {
    background: "#10B981",
    color: "white",
    border: "none",
    padding: 14,
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default IncidentDetailsModal;