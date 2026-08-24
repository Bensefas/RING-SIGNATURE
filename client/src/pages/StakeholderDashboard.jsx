import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";

import {
  RefreshCw,
  Eye,
  ShieldCheck,
  Activity,
  Search,
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

function StakeholderDashboard({
  user,
  onLogout,
  onNavigate,
  roleConfig,
}) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const config = roleConfig;

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
    } catch (err) {
      console.error("Failed to load incidents:", err);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }

  const normalizedIncidents = incidents.map((incident) => ({
    ...incident,
    status:
      incident.status_name ||
      incident.status ||
      "Submitted",
  }));

  const total = normalizedIncidents.length;

  const resolved = normalizedIncidents.filter(
    (incident) =>
      incident.status.toLowerCase() === "resolved" ||
      incident.status.toLowerCase() === "closed"
  ).length;

  const pending = normalizedIncidents.filter(
    (incident) =>
      incident.status.toLowerCase() === "submitted" ||
      incident.status.toLowerCase() === "pending"
  ).length;

  const investigating = normalizedIncidents.filter(
    (incident) =>
      incident.status.toLowerCase().includes("investigation")
  ).length;

  const assigned = normalizedIncidents.filter(
    (incident) =>
      incident.status.toLowerCase() === "assigned"
  ).length;

  const filteredIncidents = useMemo(() => {
    if (!search.trim()) {
      return normalizedIncidents;
    }

    const value = search.toLowerCase();

    return normalizedIncidents.filter((incident) =>
      [
        incident.title,
        incident.incident_id,
        incident.category,
        incident.incident_location,
        incident.status,
        incident.priority,
      ]
        .filter(Boolean)
        .some((field) =>
          String(field).toLowerCase().includes(value)
        )
    );
  }, [normalizedIncidents, search]);

  const chartData = [
    {
      name: "Resolved",
      value: resolved,
    },
    {
      name: "Investigating",
      value: investigating,
    },
    {
      name: "Assigned",
      value: assigned,
    },
    {
      name: "Pending",
      value: pending,
    },
  ];

  const priorityData = [
    {
      name: "High",
      value: normalizedIncidents.filter(
        (i) => String(i.priority).toLowerCase() === "high"
      ).length,
    },
    {
      name: "Medium",
      value: normalizedIncidents.filter(
        (i) => String(i.priority).toLowerCase() === "medium"
      ).length,
    },
    {
      name: "Low",
      value: normalizedIncidents.filter(
        (i) => String(i.priority).toLowerCase() === "low"
      ).length,
    },
  ];

  const getStatusStyle = (status) => {
    const normalized = String(status).toLowerCase();

    if (normalized === "resolved" || normalized === "closed") {
      return styles.resolvedBadge;
    }

    if (normalized === "assigned") {
      return styles.assignedBadge;
    }

    if (normalized.includes("investigation")) {
      return styles.investigationBadge;
    }

    return styles.submittedBadge;
  };

  const handleViewIncident = (incident) => {
    localStorage.setItem(
      "selectedIncident",
      JSON.stringify(incident)
    );

    if (onNavigate) {
      onNavigate("incident-details");
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div
        style={{
          ...styles.hero,
          background: config.heroGradient,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={styles.roleTag}>
            {config.icon}
            {config.role}
          </div>

          <h1 style={{ margin: "12px 0 0" }}>
            {config.title}
          </h1>

          <p style={{ marginTop: 10, opacity: 0.9 }}>
            {config.description}
          </p>
        </div>

        <div style={styles.heroButtons}>
          {config.primaryAction && (
            <button
              style={styles.primaryButton}
              onClick={() =>
                onNavigate(config.primaryAction.route)
              }
            >
              {config.primaryAction.icon}
              {config.primaryAction.label}
            </button>
          )}

          {config.secondaryAction && (
            <button
              style={styles.secondaryButton}
              onClick={() =>
                onNavigate(config.secondaryAction.route)
              }
            >
              {config.secondaryAction.icon}
              {config.secondaryAction.label}
            </button>
          )}
        </div>
      </div>

      <div style={styles.statsGrid}>
        <DashboardCard
          title="Total Incidents"
          value={total}
          color={config.primaryColor}
        />

        <DashboardCard
          title="Pending"
          value={pending}
          color="#F59E0B"
        />

        <DashboardCard
          title="Under Investigation"
          value={investigating}
          color="#8B5CF6"
        />

        <DashboardCard
          title="Resolved"
          value={resolved}
          color="#10B981"
        />
      </div>

      <div style={styles.actionGrid}>
        {config.actions.map((action) => (
          <button
            key={action.key}
            style={{
              ...styles.actionCard,
              borderTop: `4px solid ${action.color}`,
            }}
            onClick={() => onNavigate(action.route)}
          >
            <div
              style={{
                ...styles.actionIcon,
                background: `${action.color}18`,
                color: action.color,
              }}
            >
              {action.icon}
            </div>

            <div>
              <strong>{action.label}</strong>

              <p style={styles.actionDescription}>
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={{ margin: 0 }}>
                Incident Management
              </h3>

              <p style={styles.smallText}>
                Monitor and manage reported university incidents.
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

          <div style={styles.searchBox}>
            <Search size={18} color="#64748B" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search incidents..."
              style={styles.searchInput}
            />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={styles.empty}
                    >
                      Loading incidents...
                    </td>
                  </tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={styles.empty}
                    >
                      No incidents found.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents
                    .slice(0, 10)
                    .map((incident) => (
                      <tr key={incident.incident_id}>
                        <td>
                          <strong>
                            {incident.title ||
                              "Untitled Incident"}
                          </strong>

                          <div style={styles.smallText}>
                            {incident.incident_id}
                          </div>
                        </td>

                        <td>
                          {incident.category ||
                            "General"}
                        </td>

                        <td>
                          {incident.priority ||
                            "Normal"}
                        </td>

                        <td>
                          <span
                            style={getStatusStyle(
                              incident.status
                            )}
                          >
                            {incident.status}
                          </span>
                        </td>

                        <td>
                          <button
                            style={styles.iconBtn}
                            onClick={() =>
                              handleViewIncident(
                                incident
                              )
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
            <h3>Incident Status</h3>

            <div
              style={{
                width: "100%",
                height: 230,
              }}
            >
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={80}
                    label
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#8B5CF6" />
                    <Cell fill="#6366F1" />
                    <Cell fill="#F59E0B" />
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.card}>
            <h3>Priority Analysis</h3>

            <div
              style={{
                width: "100%",
                height: 220,
              }}
            >
              <ResponsiveContainer>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="name" />

                  <YAxis allowDecimals={false} />

                  <Tooltip />

                  <Bar
                    dataKey="value"
                    fill={config.primaryColor}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.card}>
            <h3>Security & Blockchain</h3>

            <div style={styles.infoBox}>
              <ShieldCheck
                color={config.primaryColor}
                size={25}
              />

              <div>
                <strong>Hyperledger Fabric</strong>

                <p style={styles.infoText}>
                  Incident records are protected by
                  blockchain-backed audit trails.
                </p>
              </div>
            </div>

            <div style={styles.infoBox}>
              <Activity
                color="#10B981"
                size={25}
              />

              <div>
                <strong>System Activity</strong>

                <p style={styles.infoText}>
                  Monitor incident processing and
                  investigation activities.
                </p>
              </div>
            </div>

            <button
              style={{
                ...styles.fullButton,
                background: config.primaryColor,
              }}
              onClick={() =>
                onNavigate("blockchain")
              }
            >
              <ShieldCheck size={18} />
              Blockchain Verification
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  hero: {
    color: "white",
    borderRadius: 20,
    padding: 30,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 25,
  },

  roleTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "7px 12px",
    background: "rgba(255,255,255,.15)",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
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
    color: "#111827",
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
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: 18,
    marginBottom: 25,
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(230px,1fr))",
    gap: 15,
    marginBottom: 25,
  },

  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    textAlign: "left",
    background: "white",
    borderLeft: "none",
    borderRight: "none",
    borderBottom: "none",
    borderRadius: 14,
    padding: 18,
    boxShadow: "0 6px 20px rgba(0,0,0,.06)",
    cursor: "pointer",
  },

  actionIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  actionDescription: {
    margin: "5px 0 0",
    fontSize: 12,
    color: "#64748B",
    lineHeight: 1.4,
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
    boxShadow: "0 8px 25px rgba(0,0,0,.08)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    marginBottom: 18,
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

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    padding: "10px 13px",
    marginBottom: 18,
  },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14,
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

  fullButton: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    color: "white",
    border: "none",
    padding: "12px 15px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default StakeholderDashboard;