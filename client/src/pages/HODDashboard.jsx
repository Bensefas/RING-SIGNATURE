import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

export default function HODDashboard({ user, onLogout, onNavigate }) {
  const [incidents, setIncidents] = useState([]);

  const fetchIncidents = async () => {
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken");

      const response = await axios.get(`${API_URL}/incidents`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setIncidents(
        Array.isArray(response.data)
          ? response.data
          : response.data.incidents || response.data.data || []
      );

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { void fetchIncidents(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const statusIs = (incident, values) =>
    values.includes(String(incident.status_name || incident.status || "").toLowerCase());

  const pendingCount = incidents.filter((incident) =>
    statusIs(incident, ["submitted", "pending"])
  ).length;

  const investigationCount = incidents.filter((incident) =>
    statusIs(incident, ["assigned", "under review", "under investigation", "investigating", "action taken"])
  ).length;

  const resolvedCount = incidents.filter((incident) =>
    statusIs(incident, ["resolved", "closed"])
  ).length;

  return (
    <Layout user={user} onLogout={onLogout} onNavigate={onNavigate}>
      <div className="dashboard-shell">
        <section className="hod-hero">
          <div>
            <p className="hod-kicker">DEPARTMENTAL CASE MANAGEMENT</p>
            <h1 className="hod-title">
              HOD Dashboard
            </h1>
            <p className="hod-subtitle">
              Departmental incident monitoring and coordination.
            </p>
          </div>

          <button
            onClick={fetchIncidents}
            className="hod-refresh"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </section>

        <section className="hod-metrics">
          <div className="hod-stat hod-stat-blue">
            <div className="hod-stat-icon"><Users size={20} /></div>
            <p>Department Cases</p>
            <h2>{incidents.length}</h2>
          </div>

          <div className="hod-stat hod-stat-orange">
            <div className="hod-stat-icon"><Clock size={20} /></div>
            <p>Pending</p>
            <h2>
              {pendingCount}
            </h2>
          </div>

          <div className="hod-stat hod-stat-red">
            <div className="hod-stat-icon"><AlertTriangle size={20} /></div>
            <p>Investigation</p>
            <h2>
              {investigationCount}
            </h2>
          </div>

          <div className="hod-stat hod-stat-green">
            <div className="hod-stat-icon"><CheckCircle size={20} /></div>
            <p>Resolved</p>
            <h2>
              {resolvedCount}
            </h2>
          </div>
        </section>

      </div>
    </Layout>
  );
}