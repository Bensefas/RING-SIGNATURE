import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import {
  Building2,
  FileText,
  RefreshCw,
  Eye,
  Search,
  CheckCircle,
  AlertTriangle,
  Users,
  ClipboardCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const API = "http://localhost:5000";

function FacultyDeanDashboard({ user, onLogout, onNavigate }) {
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

  const assigned = incidents.filter(
    (i) => i.status_name === "Assigned"
  ).length;

  const investigating = incidents.filter(
    (i) => i.status_name === "Under Investigation"
  ).length;

  const resolved = incidents.filter(
    (i) => i.status_name === "Resolved"
  ).length;

  const highPriority = incidents.filter(
    (i) =>
      i.priority === "High" ||
      i.priority === "Critical"
  ).length;

  const chartData = [
    { name: "Assigned", value: assigned },
    { name: "Investigation", value: investigating },
    { name: "Resolved", value: resolved },
  ];

  const getStatusStyle = (status) => {
    if (status === "Resolved") return styles.resolvedBadge;

    if (status === "Under Investigation")
      return styles.investigationBadge;

    if (status === "Assigned")
      return styles.assignedBadge;

    return styles.submittedBadge;
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div style={styles.hero}>
        <div>
          <div style={styles.roleLabel}>
            <Building2 size={16} />
            FACULTY ADMINISTRATION
          </div>

          <h1 style={styles.heroTitle}>
            Faculty Dean / HOD Dashboard
          </h1>

          <p style={styles.heroText}>
            Manage faculty-related incidents, review assigned
            cases, coordinate departmental investigations and
            submit findings to the appropriate university authority.
          </p>
        </div>

        <div style={styles.heroButtons}>
          <button
            style={styles.primaryButton}
            onClick={() => onNavigate("faculty-incidents")}
          >
            <FileText size={18} />
            Faculty Cases
          </button>

          <button
            style={styles.secondaryButton}
            onClick={() => onNavigate("investigations")}
          >
            <Search size={18} />
            Investigations
          </button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <DashboardCard
          title="Faculty Cases"
          value={total}
          color="#4338CA"
        />

        <DashboardCard
          title="Assigned"
          value={assigned}
          color="#6366F1"
        />

        <DashboardCard
          title="Investigating"
          value={investigating}
          color="#F59E0B"
        />

        <DashboardCard
          title="Resolved"
          value={resolved}
          color="#10B981"
        />
      </div>

      <div style={styles.quickGrid}>
        <button
          style={styles.quickCard}
          onClick={() => onNavigate("faculty-incidents")}
        >
          <div style={styles.iconBox}>
            <ClipboardCheck size={24} />
          </div>

          <div>
            <strong>Review Assigned Cases</strong>
            <p>Review incidents assigned to your faculty.</p>
          </div>
        </button>

        <button
          style={styles.quickCard}
          onClick={() => onNavigate("investigations")}
        >
          <div style={styles.iconBoxBlue}>
            <Search size={24} />
          </div>

          <div>
            <strong>Investigation Records</strong>
            <p>View investigation progress and findings.</p>
          </div>
        </button>

        <button
          style={styles.quickCard}
          onClick={() => onNavigate("faculty-reports")}
        >
          <div style={styles.iconBoxGreen}>
            <FileText size={24} />
          </div>

          <div>
            <strong>Faculty Reports</strong>
            <p>Prepare and submit administrative reports.</p>
          </div>
        </button>
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={{ margin: 0 }}>
                Faculty Incident Cases
              </h3>

              <p style={styles.subtitle}>
                Assigned incidents requiring faculty action
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
                  <th>Location</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={styles.empty}>
                      Loading faculty cases...
                    </td>
                  </tr>
                ) : incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={styles.empty}>
                      No faculty cases available.
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
                        {incident.incident_location ||
                          "Not specified"}
                      </td>

                      <td>
                        <button
                          style={styles.iconBtn}
                          onClick={() =>
                            onNavigate("incident-details")
                          }
                        >
                          <Eye size={16} />
                          Review
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
            <h3>Faculty Case Status</h3>

            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={78}
                  >
                    <Cell fill="#6366F1" />
                    <Cell fill="#F59E0B" />
                    <Cell fill="#10B981" />
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.legend}>
              <span>Assigned: {assigned}</span>
              <span>Resolved: {resolved}</span>
            </div>
          </div>

          <div style={styles.card}>
            <h3>Faculty Responsibilities</h3>

            <div style={styles.infoBox}>
              <Users color="#4338CA" />

              <div>
                <strong>Case Coordination</strong>

                <p style={styles.infoText}>
                  Coordinate faculty-level responses and
                  departmental stakeholders.
                </p>
              </div>
            </div>

            <div style={styles.infoBox}>
              <AlertTriangle color="#F59E0B" />

              <div>
                <strong>Priority Monitoring</strong>

                <p style={styles.infoText}>
                  {highPriority} high or critical cases
                  currently require attention.
                </p>
              </div>
            </div>

            <div style={styles.infoBox}>
              <CheckCircle color="#10B981" />

              <div>
                <strong>Resolution</strong>

                <p style={styles.infoText}>
                  Track faculty actions until the case is
                  formally resolved.
                </p>
              </div>
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
      "linear-gradient(135deg,#312E81,#4338CA,#6366F1)",
    color: "white",
    borderRadius: 20,
    padding: 30,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 25,
    boxShadow: "0 12px 30px rgba(49,46,129,.22)",
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
    color: "#312E81",
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

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#E0E7FF",
    color: "#4338CA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  iconBoxBlue: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#DBEAFE",
    color: "#2563EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  iconBoxGreen: {
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
    background: "#FEF3C7",
    color: "#92400E",
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
    background: "#E0E7FF",
    color: "#4338CA",
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
    marginBottom: 12,
  },

  infoText: {
    margin: "6px 0 0",
    fontSize: 13,
    color: "#64748B",
    lineHeight: 1.5,
  },
};

export default FacultyDeanDashboard;