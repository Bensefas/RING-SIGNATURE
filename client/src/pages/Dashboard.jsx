import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "../components/Layout";

const API_URL = "http://localhost:5000/api";

function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchIncidents = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/incidents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Dashboard incidents response:", response.data);

      let data = [];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (Array.isArray(response.data.incidents)) {
        data = response.data.incidents;
      }

      setIncidents(data);
    } catch (err) {
      console.error("Dashboard incident error:", err);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      setError(
        err.response?.data?.message ||
          "Unable to load your incident reports."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchIncidents(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchIncidents]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const getStatus = (incident) => {
    return (
      incident.status_name ||
      incident.status ||
      incident.current_status ||
      "Pending"
    );
  };

  const getIncidentTitle = (incident) => {
    return incident.title || "Untitled Incident";
  };

  const getIncidentNumber = (incident) => {
    return (
      incident.incident_number ||
      incident.incident_id ||
      incident.incidentID ||
      "N/A"
    );
  };

  const getIncidentDate = (incident) => {
    const date =
      incident.created_at ||
      incident.createdAt ||
      incident.incident_date ||
      incident.dateReported;

    if (!date) {
      return "N/A";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString();
  };

  const normalizedStatus = (status) => {
    return String(status).toLowerCase().trim();
  };

  const totalReports = incidents.length;

  const underInvestigation = incidents.filter((incident) => {
    const status = normalizedStatus(getStatus(incident));

    return (
      status.includes("investigation") ||
      status.includes("investigating") ||
      status.includes("assigned")
    );
  }).length;

  const pending = incidents.filter((incident) => {
    const status = normalizedStatus(getStatus(incident));

    return (
      status.includes("pending") ||
      status.includes("submitted") ||
      status.includes("new")
    );
  }).length;

  const resolved = incidents.filter((incident) => {
    const status = normalizedStatus(getStatus(incident));

    return (
      status.includes("resolved") ||
      status.includes("closed") ||
      status.includes("completed")
    );
  }).length;

  const recentIncidents = [...incidents]
    .sort((a, b) => {
      const dateA = new Date(
        a.created_at ||
          a.createdAt ||
          a.incident_date ||
          a.dateReported ||
          0
      );

      const dateB = new Date(
        b.created_at ||
          b.createdAt ||
          b.incident_date ||
          b.dateReported ||
          0
      );

      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logoSection}>
          <div style={styles.logo}>UI</div>

          <div>
            <h2 style={styles.logoTitle}>University</h2>
            <p style={styles.logoSubtitle}>Incident System</p>
          </div>
        </div>

        <nav style={styles.nav}>
          <button
            style={{ ...styles.navItem, ...styles.activeNav }}
            onClick={() => navigate("/dashboard")}
          >
            <span>📊</span>
            Dashboard
          </button>

          <button
            style={styles.navItem}
            onClick={() => navigate("/report-incident")}
          >
            <span>📝</span>
            Report Incident
          </button>

          <button
            style={styles.navItem}
            onClick={() => navigate("/my-incidents")}
          >
            <span>📋</span>
            My Incidents
          </button>

          <button
            style={styles.navItem}
            onClick={() => navigate("/profile")}
          >
            <span>👤</span>
            My Profile
          </button>
        </nav>

        <div style={styles.sidebarBottom}>
          <button style={styles.navItem} onClick={handleLogout}>
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.heading}>Dashboard</h1>

            <p style={styles.welcome}>
              Welcome back,{" "}
              <strong>
                {user.first_name} {user.last_name}
              </strong>
            </p>
          </div>

          <div style={styles.userBox}>
            <div style={styles.avatar}>
              {user.first_name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div>
              <strong style={styles.userName}>
                {user.first_name} {user.last_name}
              </strong>

              <p style={styles.userEmail}>{user.email}</p>
            </div>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <strong>Unable to load incidents</strong>
            <p>{error}</p>

            <button
              style={styles.retryButton}
              onClick={fetchIncidents}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Statistics */}
        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📋</div>

            <div>
              <p style={styles.statLabel}>Total Reports</p>

              <h2 style={styles.statNumber}>
                {loading ? "..." : totalReports}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                backgroundColor: "#fff7ed",
              }}
            >
              🔄
            </div>

            <div>
              <p style={styles.statLabel}>Under Investigation</p>

              <h2 style={styles.statNumber}>
                {loading ? "..." : underInvestigation}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                backgroundColor: "#eff6ff",
              }}
            >
              ⏳
            </div>

            <div>
              <p style={styles.statLabel}>Pending</p>

              <h2 style={styles.statNumber}>
                {loading ? "..." : pending}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div
              style={{
                ...styles.statIcon,
                backgroundColor: "#f0fdf4",
              }}
            >
              ✅
            </div>

            <div>
              <p style={styles.statLabel}>Resolved</p>

              <h2 style={styles.statNumber}>
                {loading ? "..." : resolved}
              </h2>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Quick Actions</h2>

              <p style={styles.sectionSubtitle}>
                Manage your incident reports
              </p>
            </div>
          </div>

          <div style={styles.actionsGrid}>
            <button
              style={styles.actionCard}
              onClick={() => navigate("/report-incident")}
            >
              <div style={styles.actionIcon}>📝</div>

              <div>
                <h3 style={styles.actionTitle}>
                  Report an Incident
                </h3>

                <p style={styles.actionText}>
                  Submit a new incident report securely.
                </p>
              </div>

              <span style={styles.arrow}>→</span>
            </button>

            <button
              style={styles.actionCard}
              onClick={() => navigate("/my-incidents")}
            >
              <div
                style={{
                  ...styles.actionIcon,
                  backgroundColor: "#eff6ff",
                }}
              >
                📋
              </div>

              <div>
                <h3 style={styles.actionTitle}>
                  View My Reports
                </h3>

                <p style={styles.actionText}>
                  Check the status of your submitted reports.
                </p>
              </div>

              <span style={styles.arrow}>→</span>
            </button>
          </div>
        </section>

        {/* Recent Incidents */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Recent Incidents
              </h2>

              <p style={styles.sectionSubtitle}>
                Your latest incident reports
              </p>
            </div>

            <button
              style={styles.viewAllButton}
              onClick={() => navigate("/my-incidents")}
            >
              View All
            </button>
          </div>

          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.loadingIcon}>⏳</div>

              <h3 style={styles.emptyTitle}>
                Loading incidents...
              </h3>

              <p style={styles.emptyText}>
                Please wait while we retrieve your reports.
              </p>
            </div>
          ) : recentIncidents.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📂</div>

              <h3 style={styles.emptyTitle}>
                No incidents yet
              </h3>

              <p style={styles.emptyText}>
                You have not submitted any incident reports.
              </p>

              <button
                style={styles.primaryButton}
                onClick={() => navigate("/report-incident")}
              >
                + Report an Incident
              </button>
            </div>
          ) : (
            <div style={styles.incidentList}>
              {recentIncidents.map((incident, index) => {
                const status = getStatus(incident);

                return (
                  <div
                    key={
                      incident.incident_id ||
                      incident.incidentID ||
                      index
                    }
                    style={styles.incidentCard}
                  >
                    <div style={styles.incidentIcon}>
                      📋
                    </div>

                    <div style={styles.incidentInfo}>
                      <h3 style={styles.incidentTitle}>
                        {getIncidentTitle(incident)}
                      </h3>

                      <p style={styles.incidentNumber}>
                        {getIncidentNumber(incident)}
                      </p>

                      <p style={styles.incidentDate}>
                        Reported: {getIncidentDate(incident)}
                      </p>
                    </div>

                    <div style={styles.incidentStatusBox}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...getStatusStyle(status),
                        }}
                      >
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Security Notice */}
        <section style={styles.securityNotice}>
          <div style={styles.securityIcon}>🔐</div>

          <div>
            <h3 style={styles.securityTitle}>
              Your reports are secure
            </h3>

            <p style={styles.securityText}>
              Incident records are protected using secure
              authentication and blockchain-backed transparency
              mechanisms.
            </p>
          </div>
        </section>
      </main>
      </div>
    </Layout>
  );
}

function getStatusStyle(status) {
  const normalized = String(status).toLowerCase();

  if (
    normalized.includes("resolved") ||
    normalized.includes("closed") ||
    normalized.includes("completed")
  ) {
    return {
      backgroundColor: "#dcfce7",
      color: "#166534",
    };
  }

  if (
    normalized.includes("investigation") ||
    normalized.includes("investigating") ||
    normalized.includes("assigned")
  ) {
    return {
      backgroundColor: "#ffedd5",
      color: "#9a3412",
    };
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("submitted") ||
    normalized.includes("new")
  ) {
    return {
      backgroundColor: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  return {
    backgroundColor: "#f1f5f9",
    color: "#475569",
  };
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  sidebar: {
    width: "250px",
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
  },

  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "24px 20px",
    borderBottom: "1px solid #1e293b",
  },

  logo: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    backgroundColor: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "16px",
  },

  logoTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "700",
  },

  logoSubtitle: {
    margin: "2px 0 0",
    fontSize: "12px",
    color: "#94a3b8",
  },

  nav: {
    padding: "20px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  navItem: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#cbd5e1",
    padding: "12px 14px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "14px",
    cursor: "pointer",
    textAlign: "left",
  },

  activeNav: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
  },

  sidebarBottom: {
    marginTop: "auto",
    padding: "12px",
    borderTop: "1px solid #1e293b",
  },

  main: {
    marginLeft: "250px",
    width: "calc(100% - 250px)",
    padding: "32px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },

  heading: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
    color: "#0f172a",
  },

  welcome: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  userBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#ffffff",
    padding: "8px 14px 8px 8px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },

  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
  },

  userName: {
    fontSize: "13px",
    display: "block",
  },

  userEmail: {
    margin: "2px 0 0",
    color: "#64748b",
    fontSize: "11px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "18px",
    marginBottom: "30px",
  },

  statCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  statIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    backgroundColor: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
  },

  statNumber: {
    margin: "4px 0 0",
    fontSize: "24px",
    fontWeight: "700",
  },

  section: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
    marginBottom: "24px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
  },

  actionCard: {
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    textAlign: "left",
    cursor: "pointer",
  },

  actionIcon: {
    width: "44px",
    height: "44px",
    flexShrink: 0,
    borderRadius: "10px",
    backgroundColor: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  actionTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "700",
  },

  actionText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: "1.5",
  },

  arrow: {
    marginLeft: "auto",
    fontSize: "20px",
    color: "#64748b",
  },

  viewAllButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },

  loadingState: {
    border: "1px dashed #cbd5e1",
    borderRadius: "12px",
    padding: "45px 20px",
    textAlign: "center",
    backgroundColor: "#f8fafc",
  },

  loadingIcon: {
    fontSize: "35px",
    marginBottom: "8px",
  },

  emptyState: {
    border: "1px dashed #cbd5e1",
    borderRadius: "12px",
    padding: "45px 20px",
    textAlign: "center",
    backgroundColor: "#f8fafc",
  },

  emptyIcon: {
    fontSize: "35px",
    marginBottom: "8px",
  },

  emptyTitle: {
    margin: 0,
    fontSize: "16px",
  },

  emptyText: {
    margin: "7px 0 18px",
    color: "#64748b",
    fontSize: "13px",
  },

  primaryButton: {
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    padding: "11px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },

  incidentList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  incidentCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "15px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    backgroundColor: "#ffffff",
  },

  incidentIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "9px",
    backgroundColor: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    flexShrink: 0,
  },

  incidentInfo: {
    flex: 1,
    minWidth: 0,
  },

  incidentTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "700",
  },

  incidentNumber: {
    margin: "4px 0 0",
    color: "#475569",
    fontSize: "12px",
  },

  incidentDate: {
    margin: "4px 0 0",
    color: "#94a3b8",
    fontSize: "11px",
  },

  incidentStatusBox: {
    flexShrink: 0,
  },

  statusBadge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "600",
  },

  errorBox: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: "10px",
    padding: "14px 16px",
    marginBottom: "20px",
  },

  retryButton: {
    marginTop: "8px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    padding: "8px 14px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },

  securityNotice: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "18px",
    borderRadius: "12px",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
  },

  securityIcon: {
    fontSize: "25px",
  },

  securityTitle: {
    margin: 0,
    fontSize: "14px",
    color: "#1e3a8a",
  },

  securityText: {
    margin: "4px 0 0",
    color: "#475569",
    fontSize: "12px",
    lineHeight: "1.5",
  },
};

export default Dashboard;