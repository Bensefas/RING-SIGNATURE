import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import { ReporterEvidenceRequests } from "../components/EvidenceRequestPanels";

import {
  FileText,
  Clock,
  RefreshCw,
  Eye,
  ShieldCheck,
  Upload,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const API_URL = (
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`
).replace(/\/+$/, "");

function StudentDashboard({ user, onLogout, onNavigate, dashboardMessage, onMessageShown }) {
  const [incidents, setIncidents] = useState([]);
  const [showAllIncidents, setShowAllIncidents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => { void loadIncidents(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function loadIncidents() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        setError("Your session has expired. Please log in again.");
        return;
      }

      const response = await axios.get(`${API_URL}/incidents/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data?.data;

      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load incidents:", err);

      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to load your reported incidents."
        );
      }

      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }

  const total = incidents.length;

  const resolved = incidents.filter(
    (incident) =>
      String(incident.status_name || incident.status || "").toLowerCase() ===
      "resolved"
  ).length;

  const pending = total - resolved;

  const chartData = [
    {
      name: "Resolved",
      value: resolved,
    },
    {
      name: "Pending",
      value: pending,
    },
  ];

  const recentActivities = incidents.slice(0, 5).map((incident) => ({
    title: incident.title || "Untitled Incident",
    status:
      incident.status_name ||
      incident.status ||
      "Submitted",
    date: incident.incident_date
      ? new Date(incident.incident_date).toLocaleDateString()
      : incident.created_at
      ? new Date(incident.created_at).toLocaleDateString()
      : "Today",
  }));

  const getStatusStyle = (status) => {
    const normalizedStatus = String(status || "")
      .trim()
      .toLowerCase();

    switch (normalizedStatus) {
      case "resolved":
        return styles.success;

      case "assigned":
        return styles.assigned;

      case "under investigation":
        return styles.investigation;

      case "pending":
        return styles.pending;

      default:
        return styles.pending;
    }
  };

  const getStatusLabel = (incident) => {
    return (
      incident.status_name ||
      incident.status ||
      "Submitted"
    );
  };

  const handleViewIncident = (incident) => {
    if (onNavigate) {
      onNavigate("details", incident);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout} onNavigate={onNavigate}>
      <div style={styles.container}>
        {dashboardMessage && (
          <div role="status" style={styles.successMessage}>
            {dashboardMessage}
            <button type="button" onClick={onMessageShown}>Dismiss</button>
          </div>
        )}
        {/* HERO SECTION */}
        <section style={styles.hero}>
          <div style={styles.heroContent}>

            <p style={styles.heroText}>
              Submit incidents securely, upload evidence to IPFS,
              and monitor blockchain-tracked investigations.
            </p>
          </div>

          <div style={styles.buttonGroup}>
            <button
              type="button"
              style={styles.reportBtn}
              onClick={() => onNavigate && onNavigate("report")}
            >
              <FileText size={18} />
              <span>Report Incident</span>
            </button>

            <button
              type="button"
              style={styles.myIncidentsBtn}
              onClick={() =>
                onNavigate && onNavigate("my-incidents")
              }
            >
              <Clock size={18} />
              <span>My Incidents</span>
            </button>
          </div>
        </section>

        {/* DASHBOARD CARDS */}
        <section style={styles.grid}>
          <DashboardCard
            title="My Reports"
            value={total}
            color="#2563EB"
          />

          <DashboardCard
            title="Pending"
            value={pending}
            color="#F59E0B"
          />

          <DashboardCard
            title="Resolved"
            value={resolved}
            color="#10B981"
          />
        </section>

        <ReporterEvidenceRequests />

        {/* ERROR MESSAGE */}
        {error && (
          <div style={styles.errorBox}>
            <div>
              <strong>Unable to load incidents</strong>
              <p style={styles.errorText}>{error}</p>
            </div>

            <button
              type="button"
              style={styles.retryBtn}
              onClick={loadIncidents}
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        )}

        {/* MAIN CONTENT */}
        <section style={styles.twoColumn}>
          {/* INCIDENT TABLE */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>
                  My Reported Incidents
                </h3>

                <p style={styles.cardSubtitle}>
                  View and monitor your submitted reports.
                </p>
              </div>

              <button
                type="button"
                style={styles.outlineBtn}
                onClick={loadIncidents}
                disabled={loading}
              >
                <RefreshCw
                  size={16}
                  style={
                    loading
                      ? styles.spinningIcon
                      : undefined
                  }
                />
                Refresh
              </button>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Incident</th>
                    <th style={styles.th}>Priority</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={styles.empty}
                      >
                        <div style={styles.loadingContainer}>
                          <RefreshCw
                            size={20}
                            style={styles.spinningIcon}
                          />
                          <span>
                            Loading your incidents...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : incidents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={styles.empty}
                      >
                        <div style={styles.emptyContainer}>
                          <FileText
                            size={40}
                            color="#94A3B8"
                          />

                          <strong>
                            No incidents submitted yet
                          </strong>

                          <span>
                            Your reported incidents will
                            appear here.
                          </span>

                          <button
                            type="button"
                            style={styles.emptyButton}
                            onClick={() =>
                              onNavigate &&
                              onNavigate("report")
                            }
                          >
                            <FileText size={16} />
                            Report an Incident
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    incidents.slice(0, showAllIncidents ? incidents.length : 5).map((incident, index) => {
                      const status =
                        getStatusLabel(incident);

                      return (
                        <tr
                          key={
                            incident.incident_id ||
                            incident.id ||
                            index
                          }
                        >
                          <td style={styles.td}>
                            <div>
                              <strong
                                style={styles.incidentTitle}
                              >
                                {incident.title ||
                                  "Untitled Incident"}
                              </strong>

                              <div style={styles.small}>
                                {incident.incident_location ||
                                  "Location not provided"}
                              </div>
                            </div>
                          </td>

                          <td style={styles.td}>
                            <span
                              style={
                                getPriorityStyle(
                                  incident.priority
                                )
                              }
                            >
                              {incident.priority ||
                                "Normal"}
                            </span>
                          </td>

                          <td style={styles.td}>
                            <span
                              style={getStatusStyle(status)}
                            >
                              {status}
                            </span>
                          </td>

                          <td style={styles.td}>
                            <button
                              type="button"
                              style={styles.viewBtn}
                              onClick={() =>
                                handleViewIncident(
                                  incident
                                )
                              }
                            >
                              <Eye size={15} />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {incidents.length > 5 && (
              <button
                type="button"
                style={styles.showMoreBtn}
                onClick={() => setShowAllIncidents((visible) => !visible)}
              >
                {showAllIncidents ? "Show fewer incidents" : `Show ${incidents.length - 5} more incidents`}
              </button>
            )}

            <RecentActivity
              activities={recentActivities}
            />
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={styles.sideColumn}>
            {/* INCIDENT OVERVIEW */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>
                Incident Overview
              </h3>

              <p style={styles.cardSubtitle}>
                Current status of your reported incidents.
              </p>

              <div style={styles.chartContainer}>
                {total === 0 ? (
                  <div style={styles.noChartData}>
                    <FileText
                      size={40}
                      color="#94A3B8"
                    />

                    <span>
                      No incident data available
                    </span>
                  </div>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#F59E0B" />
                      </Pie>

                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div style={styles.legend}>
                <div style={styles.legendItem}>
                  <span
                    style={{
                      ...styles.legendDot,
                      backgroundColor: "#10B981",
                    }}
                  />

                  <span>
                    Resolved{" "}
                    <strong>{resolved}</strong>
                  </span>
                </div>

                <div style={styles.legendItem}>
                  <span
                    style={{
                      ...styles.legendDot,
                      backgroundColor: "#F59E0B",
                    }}
                  />

                  <span>
                    Pending{" "}
                    <strong>{pending}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* BLOCKCHAIN AND EVIDENCE */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>
                Blockchain & Evidence
              </h3>

              <p style={styles.cardSubtitle}>
                Security and integrity information.
              </p>

              <div style={styles.infoBox}>
                <div style={styles.iconContainerBlue}>
                  <ShieldCheck
                    size={22}
                    color="#2563EB"
                  />
                </div>

                <div>
                  <strong>
                    Hyperledger Fabric
                  </strong>

                  <p style={styles.infoText}>
                    Submitted incidents can be
                    blockchain-tracked for integrity
                    verification.
                  </p>
                </div>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.iconContainerGreen}>
                  <Upload
                    size={22}
                    color="#10B981"
                  />
                </div>

                <div>
                  <strong>IPFS Evidence</strong>

                  <p style={styles.infoText}>
                    Uploaded images and documents are
                    securely stored using IPFS.
                  </p>
                </div>
              </div>

              <button
                type="button"
                style={styles.fullBtn}
                onClick={() =>
                  onNavigate &&
                  onNavigate("my-incidents")
                }
              >
                <Eye size={17} />
                Verify My Cases
              </button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

/* =========================================================
   RECENT ACTIVITY COMPONENT
========================================================= */

function RecentActivity({ activities = [] }) {
  return (
    <div style={activity.card}>
      <div style={activity.header}>
        <div>
          <h3 style={activity.title}>
            Recent Activity
          </h3>

          <p style={activity.subtitle}>
            Your latest incident activities.
          </p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div style={activity.empty}>
          <Clock size={25} color="#94A3B8" />

          <span>
            No recent activity available.
          </span>
        </div>
      ) : (
        activities.map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            style={activity.item}
          >
            <div style={activity.itemContent}>
              <strong>{item.title}</strong>

              <div style={activity.time}>
                {item.date}
              </div>
            </div>

            <span style={activity.badge}>
              {item.status}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

/* =========================================================
   PRIORITY STYLE
========================================================= */

function getPriorityStyle(priority) {
  const normalizedPriority = String(
    priority || "Normal"
  )
    .trim()
    .toLowerCase();

  if (normalizedPriority === "high") {
    return {
      ...styles.priority,
      background: "#FEE2E2",
      color: "#B91C1C",
    };
  }

  if (normalizedPriority === "critical") {
    return {
      ...styles.priority,
      background: "#FECACA",
      color: "#991B1B",
    };
  }

  if (normalizedPriority === "low") {
    return {
      ...styles.priority,
      background: "#DCFCE7",
      color: "#166534",
    };
  }

  return {
    ...styles.priority,
    background: "#FEF3C7",
    color: "#92400E",
  };
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  container: {
    width: "100%",
    maxWidth: 1500,
    margin: "0 auto",
  },

  successMessage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 20,
    padding: "12px 16px",
    border: "1px solid #86EFAC",
    borderRadius: 10,
    background: "#F0FDF4",
    color: "#166534",
    fontWeight: 600,
  },

  hero: {
    background:
      "linear-gradient(135deg, #123C69, #2563EB)",
    color: "white",
    padding: 30,
    borderRadius: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 25,
  },

  heroContent: {
    flex: 1,
    minWidth: 250,
  },

  heroTitle: {
    margin: 0,
    marginBottom: 8,
    fontSize: 30,
    fontWeight: 700,
  },

  heroText: {
    margin: 0,
    opacity: 0.9,
    lineHeight: 1.6,
    maxWidth: 700,
  },

  buttonGroup: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },

  reportBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "none",
    borderRadius: 10,
    padding: "12px 18px",
    background: "white",
    color: "#123C69",
    fontWeight: 700,
    cursor: "pointer",
  },

  myIncidentsBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid rgba(255,255,255,0.4)",
    borderRadius: 10,
    padding: "12px 18px",
    background: "rgba(255,255,255,0.12)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
    marginBottom: 25,
  },

  twoColumn: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
    gap: 20,
    alignItems: "start",
  },

  sideColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  card: {
    background: "white",
    borderRadius: 18,
    padding: 24,
    boxShadow:
      "0 8px 25px rgba(0, 0, 0, 0.08)",
    minWidth: 0,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    marginBottom: 20,
    flexWrap: "wrap",
  },

  cardTitle: {
    margin: 0,
    color: "#123C69",
    fontSize: 18,
    fontWeight: 700,
  },

  cardSubtitle: {
    margin: "5px 0 0",
    color: "#64748B",
    fontSize: 13,
  },

  outlineBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    border: "1px solid #CBD5E1",
    background: "white",
    color: "#334155",
    padding: "9px 13px",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  showMoreBtn: {
    display: "block",
    margin: "18px auto 4px",
    border: "1px solid #b8d8df",
    background: "#effafa",
    color: "#0f766e",
    padding: "10px 18px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 650,
  },

  th: {
    textAlign: "left",
    padding: "13px 12px",
    background: "#F8FAFC",
    color: "#475569",
    fontSize: 12,
    fontWeight: 700,
    borderBottom: "1px solid #E2E8F0",
  },

  td: {
    padding: "15px 12px",
    borderBottom: "1px solid #E5E7EB",
    color: "#334155",
    fontSize: 14,
  },

  incidentTitle: {
    color: "#123C69",
    display: "block",
    marginBottom: 4,
  },

  small: {
    fontSize: 12,
    color: "#64748B",
  },

  empty: {
    textAlign: "center",
    padding: 35,
    color: "#64748B",
  },

  emptyContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },

  emptyButton: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    border: "none",
    background: "#2563EB",
    color: "white",
    padding: "10px 15px",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
  },

  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  viewBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid #CBD5E1",
    background: "white",
    color: "#2563EB",
    padding: "7px 11px",
    borderRadius: 7,
    fontWeight: 600,
    cursor: "pointer",
  },

  priority: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },

  pending: {
    display: "inline-block",
    background: "#FEF3C7",
    color: "#92400E",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },

  assigned: {
    display: "inline-block",
    background: "#DBEAFE",
    color: "#1D4ED8",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },

  investigation: {
    display: "inline-block",
    background: "#FDE68A",
    color: "#92400E",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },

  success: {
    display: "inline-block",
    background: "#D1FAE5",
    color: "#065F46",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },

  chartContainer: {
    width: "100%",
    height: 220,
    marginTop: 10,
  },

  noChartData: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    color: "#64748B",
    fontSize: 13,
  },

  legend: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#475569",
    fontSize: 13,
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    display: "inline-block",
  },

  infoBox: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    background: "#F8FAFC",
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
  },

  iconContainerBlue: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#DBEAFE",
    flexShrink: 0,
  },

  iconContainerGreen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#D1FAE5",
    flexShrink: 0,
  },

  infoText: {
    margin: "6px 0 0",
    fontSize: 13,
    lineHeight: 1.5,
    color: "#64748B",
  },

  fullBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    border: "none",
    background: "#2563EB",
    color: "white",
    padding: "12px 15px",
    borderRadius: 9,
    fontWeight: 700,
    cursor: "pointer",
  },

  errorBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#991B1B",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    flexWrap: "wrap",
  },

  errorText: {
    margin: "4px 0 0",
    fontSize: 13,
  },

  retryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    border: "1px solid #FCA5A5",
    background: "white",
    color: "#B91C1C",
    padding: "8px 12px",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
  },

  spinningIcon: {
    animation: "spin 1s linear infinite",
  },
};

const activity = {
  card: {
    marginTop: 25,
    borderTop: "1px solid #E5E7EB",
    paddingTop: 20,
  },

  header: {
    marginBottom: 10,
  },

  title: {
    margin: 0,
    color: "#123C69",
    fontSize: 17,
  },

  subtitle: {
    margin: "4px 0 0",
    color: "#64748B",
    fontSize: 12,
  },

  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    padding: "12px 0",
    borderBottom: "1px solid #E5E7EB",
  },

  itemContent: {
    minWidth: 0,
  },

  time: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },

  badge: {
    background: "#DBEAFE",
    color: "#1D4ED8",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  empty: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#64748B",
    padding: "20px 0",
    fontSize: 13,
  },
};

export default StudentDashboard;