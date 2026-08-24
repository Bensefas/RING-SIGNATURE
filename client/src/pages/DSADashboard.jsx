import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import {
  FileText,
  Clock,
  RefreshCw,
  Eye,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Users,
  ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const API = "http://localhost:5000";

function DSADashboard({ user, onLogout, onNavigate }) {
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
      console.error("Failed to load DSA incidents:", error);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }

  const total = incidents.length;

  const pending = incidents.filter(
    (incident) =>
      incident.status_name === "Submitted" ||
      incident.status_name === "Pending"
  ).length;

  const assigned = incidents.filter(
    (incident) => incident.status_name === "Assigned"
  ).length;

  const investigation = incidents.filter(
    (incident) => incident.status_name === "Under Investigation"
  ).length;

  const resolved = incidents.filter(
    (incident) => incident.status_name === "Resolved"
  ).length;

  const highPriority = incidents.filter(
    (incident) =>
      incident.priority === "High" ||
      incident.priority === "Critical"
  ).length;

  const chartData = [
    { name: "Pending", value: pending },
    { name: "Assigned", value: assigned },
    { name: "Investigation", value: investigation },
    { name: "Resolved", value: resolved },
  ];

  const priorityData = [
    {
      name: "Critical",
      value: incidents.filter((i) => i.priority === "Critical").length,
    },
    {
      name: "High",
      value: incidents.filter((i) => i.priority === "High").length,
    },
    {
      name: "Medium",
      value: incidents.filter((i) => i.priority === "Medium").length,
    },
    {
      name: "Low",
      value: incidents.filter((i) => i.priority === "Low").length,
    },
  ];

  const recentIncidents = incidents.slice(0, 6);

  const getStatusStyle = (status) => {
    switch (status) {
      case "Resolved":
        return styles.resolvedBadge;

      case "Assigned":
        return styles.assignedBadge;

      case "Under Investigation":
        return styles.investigationBadge;

      case "Pending":
        return styles.pendingBadge;

      default:
        return styles.submittedBadge;
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "Critical":
        return styles.criticalBadge;

      case "High":
        return styles.highBadge;

      case "Medium":
        return styles.mediumBadge;

      default:
        return styles.lowBadge;
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div style={styles.hero}>
        <div style={{ flex: 1 }}>
          <div style={styles.roleLabel}>
            <ShieldCheck size={16} />
            ADMINISTRATION • STUDENT AFFAIRS
          </div>

          <h1 style={styles.heroTitle}>
            Dean of Student Affairs Dashboard
          </h1>

          <p style={styles.heroText}>
            Monitor university incidents, coordinate administrative
            assignments, review investigations and oversee case resolution
            across the institution.
          </p>
        </div>

        <div style={styles.heroButtons}>
          <button
            style={styles.primaryButton}
            onClick={() => onNavigate("incidents")}
          >
            <FileText size={18} />
            Incident Register
          </button>

          <button
            style={styles.secondaryButton}
            onClick={() => onNavigate("assignments")}
          >
            <UserCheck size={18} />
            Assign Cases
          </button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <DashboardCard
          title="Total Incidents"
          value={total}
          color="#7C3AED"
        />

        <DashboardCard
          title="Pending Review"
          value={pending}
          color="#F59E0B"
        />

        <DashboardCard
          title="Under Investigation"
          value={investigation}
          color="#2563EB"
        />

        <DashboardCard
          title="Resolved Cases"
          value={resolved}
          color="#10B981"
        />
      </div>

      <div style={styles.quickGrid}>
        <button
          style={styles.quickCard}
          onClick={() => onNavigate("incidents")}
        >
          <div style={styles.quickIconPurple}>
            <ClipboardList size={24} />
          </div>

          <div>
            <strong>Incident Register</strong>
            <p>Review all reported university incidents.</p>
          </div>
        </button>

        <button
          style={styles.quickCard}
          onClick={() => onNavigate("assignments")}
        >
          <div style={styles.quickIconBlue}>
            <UserCheck size={24} />
          </div>

          <div>
            <strong>Case Assignment</strong>
            <p>Assign incidents to responsible units.</p>
          </div>
        </button>

        <button
          style={styles.quickCard}
          onClick={() => onNavigate("advisories")}
        >
          <div style={styles.quickIconOrange}>
            <AlertTriangle size={24} />
          </div>

          <div>
            <strong>Advisory Reports</strong>
            <p>Review advisory recommendations.</p>
          </div>
        </button>
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={{ margin: 0 }}>
                University Incident Register
              </h3>

              <p style={styles.subtitle}>
                Central administrative view of reported incidents
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
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={styles.empty}>
                      Loading incident register...
                    </td>
                  </tr>
                ) : recentIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={styles.empty}>
                      No incidents available.
                    </td>
                  </tr>
                ) : (
                  recentIncidents.map((incident) => (
                    <tr key={incident.incident_id}>
                      <td>
                        <strong>{incident.title}</strong>

                        <div style={styles.smallText}>
                          {incident.incident_id}
                        </div>
                      </td>

                      <td>
                        <span
                          style={getPriorityStyle(
                            incident.priority
                          )}
                        >
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
                          View
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
            <div style={styles.cardHeader}>
              <h3 style={{ margin: 0 }}>
                Case Distribution
              </h3>
            </div>

            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={78}
                  >
                    <Cell fill="#F59E0B" />
                    <Cell fill="#6366F1" />
                    <Cell fill="#2563EB" />
                    <Cell fill="#10B981" />
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.legend}>
              <span>Pending: {pending}</span>
              <span>Resolved: {resolved}</span>
            </div>
          </div>

          <div style={styles.card}>
            <h3>Priority Analysis</h3>

            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="name" />

                  <YAxis allowDecimals={false} />

                  <Tooltip />

                  <Bar
                    dataKey="value"
                    fill="#7C3AED"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.card}>
            <h3>Administrative Overview</h3>

            <div style={styles.infoBox}>
              <Users color="#7C3AED" />

              <div>
                <strong>Multi-Stakeholder Coordination</strong>

                <p style={styles.infoText}>
                  Coordinate DSA, Faculty, Security and
                  Disciplinary stakeholders from one
                  administrative dashboard.
                </p>
              </div>
            </div>

            <div style={styles.infoBox}>
              <CheckCircle color="#10B981" />

              <div>
                <strong>Case Resolution</strong>

                <p style={styles.infoText}>
                  Monitor investigations through to
                  final resolution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.footerStats}>
        <div>
          <AlertTriangle size={20} color="#DC2626" />
          <div>
            <strong>{highPriority}</strong>
            <span>High/Critical Cases</span>
          </div>
        </div>

        <div>
          <Clock size={20} color="#7C3AED" />
          <div>
            <strong>{assigned}</strong>
            <span>Assigned Cases</span>
          </div>
        </div>

        <div>
          <CheckCircle size={20} color="#059669" />
          <div>
            <strong>{resolved}</strong>
            <span>Completed Cases</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  hero: {
    background:
      "linear-gradient(135deg,#4C1D95,#7C3AED,#8B5CF6)",
    color: "white",
    borderRadius: 20,
    padding: 30,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 25,
    boxShadow: "0 12px 30px rgba(76,29,149,.22)",
  },

  roleLabel: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 10,
    opacity: 0.9,
  },

  heroTitle: {
    margin: 0,
    fontSize: 28,
  },

  heroText: {
    marginTop: 10,
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
    color: "#4C1D95",
    cursor: "pointer",
    fontWeight: "bold",
  },

  secondaryButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 18px",
    border: "1px solid rgba(255,255,255,.45)",
    borderRadius: 10,
    background: "rgba(255,255,255,.14)",
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

  quickIconPurple: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#EDE9FE",
    color: "#7C3AED",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  quickIconBlue: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#DBEAFE",
    color: "#2563EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  quickIconOrange: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#FEF3C7",
    color: "#D97706",
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
    margin: "5px 0 0",
    color: "#64748B",
    fontSize: 13,
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

  submittedBadge: {
    background: "#DBEAFE",
    color: "#1D4ED8",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
  },

  pendingBadge: {
    background: "#FEF3C7",
    color: "#92400E",
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
    background: "#DBEAFE",
    color: "#1D4ED8",
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

  criticalBadge: {
    background: "#FEE2E2",
    color: "#991B1B",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
  },

  highBadge: {
    background: "#FFEDD5",
    color: "#9A3412",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
  },

  mediumBadge: {
    background: "#FEF3C7",
    color: "#92400E",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
  },

  lowBadge: {
    background: "#DCFCE7",
    color: "#166534",
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
    gap: 10,
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },

  infoBox: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    background: "#F8FAFC",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },

  infoText: {
    margin: "6px 0 0",
    fontSize: 13,
    color: "#64748B",
    lineHeight: 1.5,
  },

  footerStats: {
    marginTop: 20,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 15,
  },

  footerStatsItem: {
    background: "white",
    borderRadius: 14,
    padding: 16,
  },

};

export default DSADashboard;