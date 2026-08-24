import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000";

function App() {
  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );

  const [email, setEmail] = useState("benjamin@example.com");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [showIncidents, setShowIncidents] = useState(false);

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(data.message || "Login failed.");
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      setLoggedIn(true);
      setMessage("Login successful!");
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidents = async () => {
    setLoadingIncidents(true);
    setMessage("");

    try {
      const token = getToken();

      if (!token) {
        setMessage("You are not logged in.");
        setLoggedIn(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/incidents`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      console.log("Incidents API response:", data);

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setLoggedIn(false);
        setMessage("Your session has expired. Please login again.");
        return;
      }

      if (!response.ok || !data.success) {
        setMessage(data.message || "Unable to load incidents.");
        return;
      }

      /*
       * Your API may return:
       *
       * {
       *   success: true,
       *   data: [...]
       * }
       *
       * or:
       *
       * {
       *   success: true,
       *   incidents: [...]
       * }
       *
       * We support both.
       */

      const incidentData = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.incidents)
        ? data.incidents
        : [];

      setIncidents(incidentData);
      setShowIncidents(true);
    } catch (error) {
      console.error("Fetch incidents error:", error);
      setMessage("Unable to connect to the server.");
    } finally {
      setLoadingIncidents(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setLoggedIn(false);
    setIncidents([]);
    setShowIncidents(false);
    setMessage("");
  };

  const getStatusName = (incident) => {
    return (
      incident.status_name ||
      incident.status ||
      incident.current_status ||
      "Unknown"
    );
  };

  const getCategoryName = (incident) => {
    return (
      incident.category_name ||
      incident.category ||
      "Unknown"
    );
  };

  const getIncidentNumber = (incident) => {
    return (
      incident.incident_number ||
      incident.incident_id ||
      incident.incidentID ||
      "N/A"
    );
  };

  const getIncidentTitle = (incident) => {
    return incident.title || "Untitled Incident";
  };

  const getPriority = (incident) => {
    return incident.priority || "Normal";
  };

  const getDate = (incident) => {
    const date =
      incident.incident_date ||
      incident.dateReported ||
      incident.created_at ||
      incident.createdAt;

    if (!date) {
      return "N/A";
    }

    return new Date(date).toLocaleDateString();
  };

  const getStatusStyle = (status) => {
    const value = String(status).toLowerCase();

    if (value.includes("resolved") || value.includes("closed")) {
      return {
        backgroundColor: "#dcfce7",
        color: "#166534",
      };
    }

    if (value.includes("assigned")) {
      return {
        backgroundColor: "#dbeafe",
        color: "#1d4ed8",
      };
    }

    if (
      value.includes("investigation") ||
      value.includes("pending")
    ) {
      return {
        backgroundColor: "#fef3c7",
        color: "#92400e",
      };
    }

    return {
      backgroundColor: "#e2e8f0",
      color: "#334155",
    };
  };

  const getPriorityStyle = (priority) => {
    const value = String(priority).toLowerCase();

    if (value === "high" || value === "critical") {
      return {
        backgroundColor: "#fee2e2",
        color: "#b91c1c",
      };
    }

    if (value === "medium") {
      return {
        backgroundColor: "#fef3c7",
        color: "#92400e",
      };
    }

    return {
      backgroundColor: "#dcfce7",
      color: "#166534",
    };
  };

  /*
   * Calculate dashboard statistics from the actual
   * incidents returned by the API.
   */
  const totalIncidents = incidents.length;

  const pendingIncidents = incidents.filter((incident) => {
    const status = getStatusName(incident).toLowerCase();

    return (
      status.includes("pending") ||
      status.includes("submitted") ||
      status.includes("new")
    );
  }).length;

  const assignedIncidents = incidents.filter((incident) => {
    const status = getStatusName(incident).toLowerCase();

    return status.includes("assigned");
  }).length;

  const resolvedIncidents = incidents.filter((incident) => {
    const status = getStatusName(incident).toLowerCase();

    return (
      status.includes("resolved") ||
      status.includes("closed")
    );
  }).length;

  if (!loggedIn) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h1 style={styles.loginTitle}>
            University Incident
          </h1>

          <h1 style={styles.loginTitle}>
            Reporting System
          </h1>

          <p style={styles.loginSubtitle}>
            Secure and transparent incident reporting
          </p>

          <form onSubmit={handleLogin}>
            <label style={styles.label}>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="Enter your email"
              required
            />

            <label style={styles.label}>
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
              required
            />

            <button
              type="submit"
              style={styles.loginButton}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {message && (
            <p
              style={{
                ...styles.message,
                color: message.includes("successful")
                  ? "#15803d"
                  : "#dc2626",
              }}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>
            University Incident Reporting System
          </h1>

          <p style={styles.headerSubtitle}>
            Secure and transparent incident management
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={styles.logoutButton}
        >
          Logout
        </button>
      </header>

      <main style={styles.dashboard}>
        <h2 style={styles.welcome}>
          Dashboard
        </h2>

        <p style={styles.description}>
          Welcome back. Manage and monitor university incidents
          from this dashboard.
        </p>

        {message && (
          <div style={styles.infoMessage}>
            {message}
          </div>
        )}

        {/* STATISTICS */}

        <div style={styles.cards}>
          <div style={styles.card}>
            <div style={styles.cardNumber}>
              {totalIncidents}
            </div>

            <div style={styles.cardTitle}>
              Total Incidents
            </div>

            <div style={styles.cardText}>
              Incident reports in the system
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardNumber}>
              {pendingIncidents}
            </div>

            <div style={styles.cardTitle}>
              Pending
            </div>

            <div style={styles.cardText}>
              Awaiting investigation
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardNumber}>
              {assignedIncidents}
            </div>

            <div style={styles.cardTitle}>
              Assigned
            </div>

            <div style={styles.cardText}>
              Currently assigned incidents
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardNumber}>
              {resolvedIncidents}
            </div>

            <div style={styles.cardTitle}>
              Resolved
            </div>

            <div style={styles.cardText}>
              Successfully resolved cases
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            Quick Actions
          </h2>

          <div style={styles.actions}>
            <button
              style={styles.primaryButton}
              onClick={() => {
                alert("Report Incident will be added next.");
              }}
            >
              Report an Incident
            </button>

            <button
              style={styles.secondaryButton}
              onClick={fetchIncidents}
              disabled={loadingIncidents}
            >
              {loadingIncidents
                ? "Loading..."
                : "View My Incidents"}
            </button>

            <button
              style={styles.secondaryButton}
              onClick={fetchIncidents}
              disabled={loadingIncidents}
            >
              Refresh Incidents
            </button>
          </div>
        </div>

        {/* INCIDENT LIST */}

        {showIncidents && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>
                My Incidents
              </h2>

              <span style={styles.incidentCount}>
                {incidents.length} incident
                {incidents.length !== 1 ? "s" : ""}
              </span>
            </div>

            {incidents.length === 0 ? (
              <div style={styles.emptyState}>
                <h3>
                  No incidents found
                </h3>

                <p>
                  You currently have no incident reports
                  available.
                </p>
              </div>
            ) : (
              <div style={styles.incidentList}>
                {incidents.map((incident, index) => {
                  const status = getStatusName(incident);
                  const priority = getPriority(incident);

                  return (
                    <div
                      key={
                        incident.incident_id ||
                        incident.incidentID ||
                        index
                      }
                      style={styles.incident}
                    >
                      <div style={styles.incidentMain}>
                        <div style={styles.incidentNumber}>
                          {getIncidentNumber(incident)}
                        </div>

                        <h3 style={styles.incidentTitle}>
                          {getIncidentTitle(incident)}
                        </h3>

                        <p style={styles.incidentDetails}>
                          <strong>Category:</strong>{" "}
                          {getCategoryName(incident)}
                        </p>

                        <p style={styles.incidentDetails}>
                          <strong>Date:</strong>{" "}
                          {getDate(incident)}
                        </p>
                      </div>

                      <div style={styles.incidentRight}>
                        <span
                          style={{
                            ...styles.badge,
                            ...getPriorityStyle(priority),
                          }}
                        >
                          {priority}
                        </span>

                        <span
                          style={{
                            ...styles.badge,
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
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f7fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    backgroundColor: "#123c69",
    color: "white",
    padding: "22px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    margin: 0,
    fontSize: "24px",
  },

  headerSubtitle: {
    margin: "6px 0 0",
    opacity: 0.85,
  },

  logoutButton: {
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    padding: "11px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  dashboard: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 25px",
  },

  welcome: {
    fontSize: "30px",
    marginBottom: "8px",
  },

  description: {
    color: "#64748b",
    marginBottom: "30px",
  },

  infoMessage: {
    backgroundColor: "#e0f2fe",
    color: "#075985",
    padding: "12px 16px",
    borderRadius: "6px",
    marginBottom: "20px",
  },

  cards: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
  },

  card: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "25px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.08)",
  },

  cardNumber: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#123c69",
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginTop: "8px",
  },

  cardText: {
    color: "#64748b",
    marginTop: "5px",
    fontSize: "14px",
  },

  section: {
    marginTop: "35px",
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "10px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.06)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: "20px",
  },

  incidentCount: {
    color: "#64748b",
    fontSize: "14px",
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
  },

  primaryButton: {
    backgroundColor: "#123c69",
    color: "white",
    border: "none",
    padding: "13px 20px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  secondaryButton: {
    backgroundColor: "#e8eef5",
    color: "#123c69",
    border: "none",
    padding: "13px 20px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  incidentList: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },

  incident: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },

  incidentMain: {
    flex: 1,
  },

  incidentNumber: {
    color: "#123c69",
    fontWeight: "bold",
    fontSize: "13px",
  },

  incidentTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    margin: "8px 0",
  },

  incidentDetails: {
    color: "#64748b",
    margin: "4px 0",
  },

  incidentRight: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "flex-end",
  },

  badge: {
    padding: "7px 13px",
    borderRadius: "20px",
    fontWeight: "bold",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  emptyState: {
    textAlign: "center",
    padding: "40px",
    color: "#64748b",
  },

  loginPage: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eef3f8",
    fontFamily: "Arial, sans-serif",
  },

  loginCard: {
    width: "400px",
    maxWidth: "90%",
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "12px",
    boxShadow:
      "0 5px 25px rgba(0,0,0,0.1)",
  },

  loginTitle: {
    margin: "0",
    color: "#123c69",
    fontSize: "27px",
  },

  loginSubtitle: {
    color: "#64748b",
    marginBottom: "30px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    marginTop: "18px",
    fontWeight: "bold",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "15px",
  },

  loginButton: {
    width: "100%",
    marginTop: "25px",
    padding: "14px",
    backgroundColor: "#123c69",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
  },

  message: {
    textAlign: "center",
    marginTop: "18px",
    fontWeight: "bold",
  },
};

export default App;