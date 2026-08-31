import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import {
  Gavel,
  FileText,
  Clock,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertTriangle,
  Scale,
  CalendarDays,
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

function DisciplinaryDashboard({ user, onLogout, onNavigate }) {
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

  const underReview = incidents.filter(
    (i) =>
      statusIs(i, "under investigation") ||
      statusIs(i, "investigating") ||
      statusIs(i, "under review") ||
      statusIs(i, "assigned")
  ).length;

  const resolved = incidents.filter(
    (i) => statusIs(i, "resolved") || statusIs(i, "closed")
  ).length;

  const pending = incidents.filter(
    (i) =>
      statusIs(i, "submitted") ||
      statusIs(i, "pending")
  ).length;

  const critical = incidents.filter(
    (i) =>
      i.priority === "Critical" ||
      i.priority === "High"
  ).length;

  const chartData = [
    {
      name: "Pending",
      value: pending,
    },
    {
      name: "Under Review",
      value: underReview,
    },
    {
      name: "Resolved",
      value: resolved,
    },
  ];

  const getStatusStyle = (status) => {
    if (status === "Resolved")
      return styles.resolvedBadge;

    if (
      status === "Under Investigation" ||
      status === "Assigned"
    )
      return styles.reviewBadge;

    return styles.pendingBadge;
  };

  return (
    <Layout user={user} onLogout={onLogout} onNavigate={onNavigate}>
      <div style={styles.hero}>
        <div>
          <div style={styles.roleLabel}>
            <Gavel size={16} />
            DISCIPLINARY COMMITTEE
          </div>

          <h1 style={styles.heroTitle}>
            Disciplinary Committee Dashboard
          </h1>

          <p style={styles.heroText}>
            Review investigation findings, manage disciplinary
            cases, document committee decisions and monitor formal
            case resolution.
          </p>
        </div>

        <div style={styles.heroButtons}>
          <button
            style={styles.primaryButton}
            onClick={() => onNavigate("disciplinary-cases")}
          >
            <Scale size={18} />
            Committee Cases
          </button>

          <button
            style={styles.secondaryButton}
            onClick={() => onNavigate("hearings")}
          >
            <CalendarDays size={18} />
            Hearings
          </button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <DashboardCard
          title="Total Cases"
          value={total}
          color="#059669"
        />

        <DashboardCard
          title="Pending Review"
          value={pending}
          color="#F59E0B"
        />

        <DashboardCard
          title="Under Review"
          value={underReview}
          color="#0F766E"
        />

        <DashboardCard
          title="Resolved"
          value={resolved}
          color="#10B981"
        />
      </div>

      <div style={styles.notice}>
        <AlertTriangle size={21} />

        <div>
          <strong>Committee Attention</strong>

          <p>
            {critical} high-priority case(s) require disciplinary
            review.
          </p>
        </div>

        <button
          style={styles.noticeButton}
          onClick={() => onNavigate("priority-cases")}
        >
          Review Cases
        </button>
      </div>

      <div style={styles.quickGrid}>
        <button
          style={styles.quickCard}
          onClick={() => onNavigate("disciplinary-cases")}
        >
          <div style={styles.greenIcon}>
            <ClipboardCheck size={24} />
          </div>

          <div>
            <strong>Committee Cases</strong>
            <p>Review cases submitted for disciplinary action.</p>
          </div>
        </button>

        <button
          style={styles.quickCard}
          onClick={() => onNavigate("hearings")}
        >
          <div style={styles.blueIcon}>
            <CalendarDays size={24} />
          </div>

          <div>
            <strong>Hearings</strong>
            <p>Manage scheduled disciplinary hearings.</p>
          </div>
        </button>

        <button
          style={styles.quickCard}
          onClick={() => onNavigate("decisions")}
        >
          <div style={styles.goldIcon}>
            <Gavel size={24} />
          </div>

          <div>
            <strong>Committee Decisions</strong>
            <p>Record and review disciplinary decisions.</p>
          </div>
        </button>
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={{ margin: 0 }}>
                Disciplinary Case Register
              </h3>

              <p style={styles.subtitle}>
                Cases requiring committee review or decision
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
                  <th>Case</th>
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
                      Loading disciplinary cases...
                    </td>
                  </tr>
                ) : incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={styles.empty}>
                      No disciplinary cases available.
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
            <h3>Committee Case Status</h3>

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
                    <Cell fill="#0F766E" />
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
            <h3>Committee Operations</h3>

            <div style={styles.operationRow}>
              <CalendarDays size={18} color="#2563EB" />

              <span>Scheduled Hearings</span>

              <strong>—</strong>
            </div>

            <div style={styles.operationRow}>
              <Scale size={18} color="#059669" />

              <span>Cases Under Review</span>

              <strong>{underReview}</strong>
            </div>

            <div style={styles.operationRow}>
              <Gavel size={18} color="#D97706" />

              <span>High Priority Cases</span>

              <strong>{critical}</strong>
            </div>
          </div>

          <div style={styles.card}>
            <h3>Resolution & Governance</h3>

            <div style={styles.infoBox}>
              <CheckCircle color="#059669" />

              <div>
                <strong>Formal Decisions</strong>

                <p style={styles.infoText}>
                  Committee decisions should be documented and
                  associated with the corresponding incident.
                </p>
              </div>
            </div>

            <div style={styles.infoBox}>
              <FileText color="#2563EB" />

              <div>
                <strong>Audit Trail</strong>

                <p style={styles.infoText}>
                  Case records remain traceable through the
                  university's incident management workflow.
                </p>
              </div>
            </div>

            <button
              style={styles.primaryFullButton}
              onClick={() => onNavigate("decisions")}
            >
              <Gavel size={18} />
              Manage Decisions
            </button>
          </div>
        </div>
      </div>

      <div style={styles.footerGrid}>
        <div>
          <Clock size={20} color="#D97706" />

          <div>
            <strong>{pending}</strong>
            <span>Pending Cases</span>
          </div>
        </div>

        <div>
          <Scale size={20} color="#0F766E" />

          <div>
            <strong>{underReview}</strong>
            <span>Cases Under Review</span>
          </div>
        </div>

        <div>
          <CheckCircle size={20} color="#059669" />

          <div>
            <strong>{resolved}</strong>
            <span>Resolved Cases</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  hero: {
    background:
      "linear-gradient(135deg,#064E3B,#047857,#10B981)",
    color: "white",
    borderRadius: 20,
    padding: 30,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 25,
    boxShadow: "0 12px 30px rgba(6,78,59,.22)",
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
    color: "#065F46",
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

  notice: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "#FFFBEB",
    border: "1px solid #FDE68A",
    color: "#92400E",
    padding: 16,
    borderRadius: 14,
    marginBottom: 25,
  },

  noticeButton: {
    marginLeft: "auto",
    background: "#D97706",
    color: "white",
    border: "none",
    padding: "9px 14px",
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

  blueIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#DBEAFE",
    color: "#2563EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  goldIcon: {
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

  pendingBadge: {
    background: "#FEF3C7",
    color: "#92400E",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
  },

  reviewBadge: {
    background: "#CCFBF1",
    color: "#115E59",
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

  operationRow: {
    display: "grid",
    gridTemplateColumns: "25px 1fr auto",
    alignItems: "center",
    gap: 8,
    padding: "12px 0",
    borderBottom: "1px solid #E5E7EB",
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
    background: "#059669",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },

  footerGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 15,
    marginTop: 20,
  },

};

export default DisciplinaryDashboard;