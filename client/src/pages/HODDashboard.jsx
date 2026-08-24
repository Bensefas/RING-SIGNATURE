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

export default function HODDashboard({ user, onLogout }) {
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

  const statusCount = (text) =>
    incidents.filter((i) =>
      String(i.status || "").toLowerCase().includes(text)
    ).length;

  return (
    <Layout user={user} onLogout={onLogout}>
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
              {statusCount("pending")}
            </h2>
          </div>

          <div className="hod-stat hod-stat-red">
            <div className="hod-stat-icon"><AlertTriangle size={20} /></div>
            <p>Investigation</p>
            <h2>
              {statusCount("investig")}
            </h2>
          </div>

          <div className="hod-stat hod-stat-green">
            <div className="hod-stat-icon"><CheckCircle size={20} /></div>
            <p>Resolved</p>
            <h2>
              {statusCount("resolved")}
            </h2>
          </div>
        </section>

      </div>
    </Layout>
  );
}