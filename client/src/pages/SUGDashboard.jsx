import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import {
  FileText,
  MessageSquare,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

export default function SUGDashboard({ user, onLogout }) {
  const [incidents, setIncidents] = useState([]);
  const getToken = () =>
    localStorage.getItem("token") || localStorage.getItem("authToken");

  const fetchIncidents = useCallback(async () => {
    try {
      const token = getToken();

      const response = await axios.get(`${API_URL}/incidents`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = response.data;

      setIncidents(
        Array.isArray(data)
          ? data
          : data.incidents || data.data || []
      );
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchIncidents(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchIncidents]);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="dashboard-shell">
        <section className="sug-hero">
          <div>
            <p className="sug-kicker">STUDENT VOICE & OVERSIGHT</p>
            <h1 className="sug-title">
              SUG Dashboard
            </h1>
            <p className="sug-subtitle">
              Student Union Government incident oversight and advisory portal.
            </p>
          </div>

          <button
            onClick={fetchIncidents}
            className="sug-refresh"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </section>

        <section className="sug-metrics">
          <div className="sug-stat sug-stat-blue">
            <div className="sug-stat-top">
              <div className="sug-stat-icon"><FileText size={20} /></div>
              <div>
                <p>Total Incidents</p>
                <h2>
                  {incidents.length}
                </h2>
              </div>
            </div>
          </div>

          <div className="sug-stat sug-stat-orange">
            <div className="sug-stat-top">
              <div className="sug-stat-icon"><Clock size={20} /></div>
              <div>
                <p>Under Investigation</p>
                <h2>
                  {
                    incidents.filter((i) =>
                      String(i.status)
                        .toLowerCase()
                        .includes("investig")
                    ).length
                  }
                </h2>
              </div>
            </div>
          </div>

          <div className="sug-stat sug-stat-red">
            <div className="sug-stat-top">
              <div className="sug-stat-icon"><AlertTriangle size={20} /></div>
              <div>
                <p>High Priority</p>
                <h2>
                  {
                    incidents.filter((i) =>
                      String(i.priority)
                        .toLowerCase()
                        .includes("high")
                    ).length
                  }
                </h2>
              </div>
            </div>
          </div>
        </section>

        <section className="sug-advisory">
          <div className="sug-advisory-icon"><MessageSquare size={22} /></div>
          <div>
            <h3>
              Advisory Role
            </h3>
            <p>
              SUG can review reported incidents and provide advisory input.
              Incident assignment and investigation remain with authorized
              administrative units.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}