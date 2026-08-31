import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import {
  Shield,
  FileSearch,
  Clock,
  RefreshCw,
  Eye,
  Upload,
  AlertTriangle,
  CheckCircle,
  Lock,
  Fingerprint,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const API = "http://localhost:5000";

function SecurityDashboard({ user, onLogout, onNavigate }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { void loadIncidents(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function loadIncidents() {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(`${API}/api/incidents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setIncidents(res.data.data || []);
    } catch (error) {
      console.error(error);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }

  const total = incidents.length;

  const statusIs = (incident, value) =>
    String(incident.status_name || incident.status || "").toLowerCase() === value;

  const investigating = incidents.filter(
    (i) => statusIs(i, "under investigation") || statusIs(i, "investigating")
  ).length;

  const resolved = incidents.filter(
    (i) => statusIs(i, "resolved") || statusIs(i, "closed")
  ).length;

  const assigned = incidents.filter(
    (i) => statusIs(i, "assigned")
  ).length;

  const critical = incidents.filter(
    (i) => i.priority === "Critical"
  ).length;

  const chartData = [
    {
      name: "Assigned",
      value: assigned,
    },
    {
      name: "Investigation",
      value: investigating,
    },
    {
      name: "Resolved",
      value: resolved,
    },
  ];

  const getStatusStyle = (status) => {
    if (status === "Resolved")
      return styles.resolvedBadge;

    if (status === "Under Investigation")
      return styles.investigationBadge;

    if (status === "Assigned")
      return styles.assignedBadge;

    return styles.submittedBadge;
  };

  return (
    <Layout user={user} onLogout={onLogout} onNavigate={onNavigate}>
      <div style={styles.hero}>
        <div>
          <div style={styles.roleLabel}>
            <Shield size={16} />
            UNIVERSITY SECURITY UNIT
          </div>

          <h1 style={styles.heroTitle}>
            Security Investigation Dashboard
          </h1>

          <p style={styles.heroText}>
            Investigate reported incidents, preserve digital
            evidence, document findings and maintain an auditable
            chain of investigation.
          </p>
        </div>

        <div style={styles.heroButtons}>
          <button
            style={styles.primaryButton}
            onClick={() => onNavigate("investigations")}
          >
            <FileSearch size={18} />
            Investigations
          </button>

          <button
            style={styles.secondaryButton}
            onClick={() => onNavigate("evidence")}
          >
            <Upload size={18} />
            Evidence
          </button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <DashboardCard
          title="Security Cases"
          value={total}
          color="#DC2626"
        />

        <DashboardCard
          title="Assigned"
          value={assigned}
          color="#EA580C"
        />

        <DashboardCard
          title="Investigating"
          value={investigating}
          color="#F59E0B"
        />

        <DashboardCard
          title="Resolved"
          value={resolved}
          color="#059669"
        />
      </div>

      <div style={styles.alertBanner}>
        <AlertTriangle size={21} />

        <div>
          <strong>Security Priority Alert</strong>

          <p>
            {critical} critical incident(s) require immediate
            security attention.
          </p>
        </div>

        <button
          onClick={() => onNavigate("priority-cases")}
          style={styles.alertButton}
        >
          Review
        </button>
      </div>

      <div style={styles.quickGrid}>
        <button
          style={styles.quickCard}
          onClick={() => onNavigate("investigations")}
        >
          <div style={styles.redIcon}>
            <FileSearch size={24} />
          </div>

          <div>
            <strong>Active Investigations</strong>
            <p>Manage ongoing security investigations.</p>
          </div>
        </button>

        <button
          style={styles.quickCard}
          onClick={() => onNavigate("evidence")}
        >
          <div style={styles.orangeIcon}>
            <Upload size={24} />
          </div>

          <div>
            <strong>Evidence Management</strong>
            <p>Review and preserve submitted evidence.</p>
          </div>
        </button>

        <button
          style={styles.quickCard}
          onClick={() => onNavigate("security-reports")}
        >
          <div style={styles.greenIcon}>
            <CheckCircle size={24} />
          </div>

          <div>
            <strong>Investigation Reports</strong>
            <p>Submit security findings and recommendations.</p>
          </div>
        </button>
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={{ margin: 0 }}>
                Security Investigation Queue
              </h3>

              <p style={styles.subtitle}>
                Incidents requiring security review
              </p>
            </div>

            <button
              style={styles.refreshBtn}
              onClick={loadIncidents}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Incident Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={styles.empty}>
                      Loading security queue...
                    </td>
                  </tr>
                ) : incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={styles.empty}>
                      No security cases available.
                    </td>
                  </tr>
                ) : (
                  incidents.slice(0, 8).map((incident) => (
                    <tr key={incident.incident_id}>
                      <td>
                        <strong>{incident.title}</strong>

                        <div style={styles.smallText}>
                          {incident.incident_id}
                        </div>
                      </td>

                      <td>
                        <span style={styles.priorityBadge}>
                          {incident.priority || "Low"}
                        </span>
                      </td>

                      <td>
                        <span
                          style={getStatusStyle(
                            incident.status_name
                          )}
                        >
                          {incident.status_name || "Submitted"}
                        </span>
                      </td>

                      <td>
                        {incident.incident_date
                          ? new Date(
                              incident.incident_date
                            ).toLocaleDateString()
                          : "N/A"}
                      </td>

                      <td>
                        <button
                          style={styles.iconBtn}
                          onClick={() =>
                            onNavigate("incident-details")
                          }
                        >
                          <Eye size={16} />
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.sidebar}>
          <div style={styles.card}>
            <h3>Investigation Status</h3>

            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={78}
                  >
                    <Cell fill="#EA580C" />
                    <Cell fill="#F59E0B" />
                    <Cell fill="#10B981" />
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.legend}>
              <span>Investigating: {investigating}</span>
              <span>Resolved: {resolved}</span>
            </div>
          </div>

          <div style={styles.card}>
            <h3>Security & Evidence</h3>

            <div style={styles.infoBox}>
              <Lock color="#DC2626" />

              <div>
                <strong>Secure Evidence</strong>

                <p style={styles.infoText}>
                  Evidence should be preserved and associated
                  with its corresponding incident.
                </p>
              </div>
            </div>

            <div style={styles.infoBox}>
              <Fingerprint color="#2563EB" />

              <div>
                <strong>Blockchain Integrity</strong>

                <p style={styles.infoText}>
                  Blockchain transaction records provide an
                  auditable integrity layer for incident records.
                </p>
              </div>
            </div>

            <button
              style={styles.primaryFullButton}
              onClick={() => onNavigate("evidence")}
            >
              <Upload size={18} />
              Evidence Repository
            </button>
          </div>

          <div style={styles.card}>
            <h3>Security Operations</h3>

            <div style={styles.operationRow}>
              <Clock size={18} />
              <span>Active investigations</span>
              <strong>{investigating}</strong>
            </div>

            <div style={styles.operationRow}>
              <AlertTriangle size={18} />
              <span>Critical cases</span>
              <strong>{critical}</strong>
            </div>

            <div style={styles.operationRow}>
              <CheckCircle size={18} />
              <span>Resolved</span>
              <strong>{resolved}</strong>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  hero: {
    background:
      "linear-gradient(135deg,#7F1D1D,#DC2626,#EF4444)",
    color: "white",
    borderRadius: 20,
    padding: 30,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 25,
    boxShadow: "0 12px 30px rgba(127,29,29,.22)",
  },

  roleLabel: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  heroTitle: {
    margin: "8px 0 0",
    fontSize: 28,
  },

  heroText: {
    maxWidth: 700,
    lineHeight: 1.6,
    opacity: 0.92,
  },

  heroButtons: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },

  primaryButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 18px",
    border: "none",
    borderRadius: 10,
    background: "white",
    color: "#991B1B",
    cursor: "pointer",
    fontWeight: "bold",
  },

  secondaryButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 18px",
    border: "1px solid rgba(255,255,255,.4)",
    borderRadius: 10,
    background: "rgba(255,255,255,.15)",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: 20,
    marginBottom: 25,
  },

  alertBanner: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#991B1B",
    padding: 16,
    borderRadius: 14,
    marginBottom: 25,
  },

  "alertBanner p": {
    margin: "4px 0 0",
  },

  alertButton: {
    marginLeft: "auto",
    border: "none",
    background: "#DC2626",
    color: "white",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",
    gap: 16,
    marginBottom: 25,
  },

  quickCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    textAlign: "left",
    padding: 18,
    background: "white",
    border: "1px solid #E5E7EB",
    borderRadius: 16,
    cursor: "pointer",
    boxShadow: "0 5px 18px rgba(0,0,0,.05)",
  },

  redIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#FEE2E2",
    color: "#DC2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  orangeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#FFEDD5",
    color: "#EA580C",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  greenIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#D1FAE5",
    color: "#059669",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 20,
  },

  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  card: {
    background: "white",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 8px 25px rgba(0,0,0,.07)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    marginBottom: 18,
  },

  subtitle: {
    color: "#64748B",
    fontSize: 13,
    margin: "5px 0 0",
  },

  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    border: "1px solid #CBD5E1",
    background: "white",
    borderRadius: 8,
    cursor: "pointer",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  smallText: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },

  iconBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "8px 12px",
    border: "1px solid #CBD5E1",
    background: "white",
    borderRadius: 8,
    cursor: "pointer",
  },

  priorityBadge: {
    background: "#FEE2E2",
    color: "#991B1B",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
  },

  submittedBadge: {
    background: "#DBEAFE",
    color: "#1D4ED8",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
  },

  assignedBadge: {
    background: "#FFEDD5",
    color: "#C2410C",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
  },

  investigationBadge: {
    background: "#FEF3C7",
    color: "#92400E",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
  },

  resolvedBadge: {
    background: "#D1FAE5",
    color: "#065F46",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
  },

  empty: {
    textAlign: "center",
    padding: 25,
    color: "#64748B",
  },

  legend: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "#475569",
  },

  infoBox: {
    display: "flex",
    gap: 12,
    background: "#F8FAFC",
    padding: 15,
    borderRadius: 12,
    marginBottom: 14,
  },

  infoText: {
    margin: "6px 0 0",
    fontSize: 13,
    color: "#64748B",
    lineHeight: 1.5,
  },

  primaryFullButton: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: "11px 16px",
    border: "none",
    borderRadius: 9,
    background: "#DC2626",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },

  operationRow: {
    display: "grid",
    gridTemplateColumns: "25px 1fr auto",
    alignItems: "center",
    gap: 8,
    padding: "12px 0",
    borderBottom: "1px solid #E5E7EB",
    color: "#475569",
  },
};

export default SecurityDashboard;