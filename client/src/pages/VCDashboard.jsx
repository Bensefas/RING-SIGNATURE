import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";

import {
  Crown,
  TrendingUp,
  BarChart3,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Building2
} from "lucide-react";

const API = "http://localhost:5000";

function VCDashboard({ user, onLogout, onNavigate }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadIncidents() {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(`${API}/api/incidents`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setIncidents(res.data.data || []);
    } catch (err) {
      console.error("Failed to load incidents:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { void loadIncidents(); }, 0);

    const interval = setInterval(() => { void loadIncidents(); }, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const total = incidents.length;

  const pending = incidents.filter(
    i =>
      i.status_name === "Submitted" ||
      i.status_name === "Pending"
  ).length;

  const underInvestigation = incidents.filter(
    i => i.status_name === "Under Investigation"
  ).length;

  const resolved = incidents.filter(
    i => i.status_name === "Resolved"
  ).length;

  const critical = incidents.filter(
    i => i.priority === "Critical"
  ).length;

  const resolutionRate =
    total === 0 ? 0 : Math.round((resolved / total) * 100);

  return (
    <Layout user={user} onLogout={onLogout} onNavigate={onNavigate}>
      <div style={styles.hero}>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
              VICE CHANCELLOR PORTAL
            </h1>
          <p>
            Real-time university-wide oversight of incident reporting,
            institutional performance and strategic decision-making.
          </p>
        </div>

        <div style={styles.heroIcon}>
          <Crown size={58}/>
        </div>
      </div>

      <div style={styles.grid}>
        <DashboardCard
          title="Total Incidents"
          value={total}
          color="#2563EB"
        />

        <DashboardCard
          title="Pending"
          value={pending}
          color="#F59E0B"
        />

        <DashboardCard
          title="Active Investigations"
          value={underInvestigation}
          color="#EA580C"
        />

        <DashboardCard
          title="Resolved"
          value={resolved}
          color="#10B981"
        />
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3>Recent University Incidents</h3>
            <Eye color="#2563EB"/>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th>Incident</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {incidents.slice(0, 8).map(item => (
                <tr key={item.incident_id}>
                  <td>
                    <strong>{item.title}</strong>

                    <div style={styles.small}>
                      {item.incident_number}
                    </div>
                  </td>

                  <td>
                    <span
                      style={{
                        ...styles.badge,
                        background:
                          item.priority === "Critical"
                            ? "#FEE2E2"
                            : item.priority === "High"
                            ? "#FEF3C7"
                            : "#DBEAFE",

                        color:
                          item.priority === "Critical"
                            ? "#991B1B"
                            : item.priority === "High"
                            ? "#92400E"
                            : "#1D4ED8"
                      }}
                    >
                      {item.priority}
                    </span>
                  </td>

                  <td>
                    <span
                      style={{
                        ...styles.badge,
                        background:
                          item.status_name === "Resolved"
                            ? "#D1FAE5"
                            : item.status_name === "Under Investigation"
                            ? "#FED7AA"
                            : "#DBEAFE",

                        color:
                          item.status_name === "Resolved"
                            ? "#065F46"
                            : item.status_name === "Under Investigation"
                            ? "#9A3412"
                            : "#1D4ED8"
                      }}
                    >
                      {item.status_name || "Submitted"}
                    </span>
                  </td>

                  <td>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}

              {incidents.length === 0 && (
                <tr>
                  <td colSpan="4" style={styles.empty}>
                    {loading
                      ? "Loading incidents..."
                      : "No incidents available."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.sidePanel}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3>Executive Analytics</h3>
              <BarChart3 color="#2563EB"/>
            </div>

            <div style={styles.metricBox}>
              <h1>{resolutionRate}%</h1>
              <p>Overall Resolution Rate</p>
            </div>

            <div style={styles.summaryRow}>
              <CheckCircle color="#10B981"/>
              <span>{resolved} cases resolved</span>
            </div>

            <div style={styles.summaryRow}>
              <AlertTriangle color="#DC2626"/>
              <span>{critical} critical incidents</span>
            </div>

            <div style={styles.summaryRow}>
              <Clock color="#F59E0B"/>
              <span>{underInvestigation} active investigations</span>
            </div>

            <div style={styles.summaryRow}>
              <TrendingUp color="#2563EB"/>
              <span>Live university performance monitoring</span>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3>Executive Oversight</h3>
              <Crown color="#2563EB"/>
            </div>

            <div style={styles.executiveBox}>
              <div style={styles.roleRow}>
                <Shield color="#2563EB"/>
                <span>Institution-wide oversight</span>
              </div>

              <div style={styles.roleRow}>
                <Building2 color="#2563EB"/>
                <span>Monitor all faculties and units</span>
              </div>

              <div style={styles.roleRow}>
                <TrendingUp color="#2563EB"/>
                <span>Review executive performance reports</span>
              </div>

              <div style={styles.roleRow}>
                <CheckCircle color="#2563EB"/>
                <span>Support strategic decision-making</span>
              </div>

              <p style={styles.note}>
                Operational assignments remain under the Deputy Vice Chancellor
                (DVC), while the Vice Chancellor maintains executive oversight.
              </p>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3>Critical Incident Watch</h3>
              <AlertTriangle color="#DC2626"/>
            </div>

            {critical === 0 ? (
              <div style={styles.safeBox}>
                <CheckCircle color="#10B981"/>
                <span>No critical incidents require executive attention.</span>
              </div>
            ) : (
              incidents
                .filter(i => i.priority === "Critical")
                .slice(0, 3)
                .map(item => (
                  <div key={item.incident_id} style={styles.criticalRow}>
                    <div>
                      <strong>{item.title}</strong>

                      <div style={styles.small}>
                        {item.incident_number}
                      </div>
                    </div>

                    <AlertTriangle color="#DC2626"/>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  hero: {
    background: "linear-gradient(135deg,#123C69,#2563EB)",
    color: "white",
    padding: 32,
    borderRadius: 22,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28
  },

  heroIcon: {
    background: "rgba(255,255,255,.15)",
    width: 80,
    height: 80,
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 20,
    marginBottom: 25
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 20
  },

  card: {
    background: "white",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 8px 25px rgba(0,0,0,.08)"
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
  },

  badge: {
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold"
  },

  sidePanel: {
    display: "flex",
    flexDirection: "column",
    gap: 20
  },

  summaryRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "12px 0"
  },

  metricBox: {
    background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)",
    padding: 20,
    borderRadius: 16,
    textAlign: "center",
    marginBottom: 15
  },

  executiveBox: {
    background: "#F8FAFC",
    padding: 18,
    borderRadius: 14,
    lineHeight: 1.7
  },

  roleRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 12
  },

  criticalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 0",
    borderBottom: "1px solid #E5E7EB"
  },

  safeBox: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    background: "#ECFDF5",
    color: "#065F46",
    padding: 15,
    borderRadius: 12
  },

  small: {
    color: "#64748B",
    fontSize: 12
  },

  note: {
    color: "#64748B",
    marginTop: 14,
    fontSize: 13,
    fontStyle: "italic"
  },

  empty: {
    textAlign: "center",
    padding: 30,
    color: "#64748B"
  }
};

export default VCDashboard;