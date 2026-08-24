import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import {
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

export default function SERVICOMDashboard({ user, onLogout }) {
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
          : response.data.incidents ||
              response.data.data ||
              []
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { void fetchIncidents(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="dashboard-shell">
        <section className="servicom-hero">
          <div>
            <p className="servicom-kicker">SERVICE QUALITY OVERSIGHT</p>
            <h1 className="servicom-title">
              SERVICOM Dashboard
            </h1>
            <p className="servicom-subtitle">
              Service quality monitoring and incident advisory portal.
            </p>
          </div>

          <button
            onClick={fetchIncidents}
            className="servicom-refresh"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </section>

        <section className="servicom-metrics">
          <div className="servicom-stat servicom-stat-blue">
            <div className="servicom-stat-icon"><FileText size={20} /></div>
            <p>Total Incidents</p>
            <h2>{incidents.length}</h2>
          </div>

          <div className="servicom-stat servicom-stat-orange">
            <div className="servicom-stat-icon"><Clock size={20} /></div>
            <p>Pending Cases</p>
            <h2>
              {
                incidents.filter((i) =>
                  String(i.status)
                    .toLowerCase()
                    .includes("pending")
                ).length
              }
            </h2>
          </div>

          <div className="servicom-stat servicom-stat-green">
            <div className="servicom-stat-icon"><CheckCircle size={20} /></div>
            <p>Resolved Cases</p>
            <h2>
              {
                incidents.filter((i) =>
                  ["resolved", "closed"].includes(
                    String(i.status).toLowerCase()
                  )
                ).length
              }
            </h2>
          </div>
        </section>

        <section className="servicom-advisory">
          <div className="servicom-advisory-icon"><MessageSquare size={22} /></div>
          <div>
            <h3>
              SERVICOM Advisory Function
            </h3>
            <p>
              SERVICOM acts as an observer and can provide advisory input
              concerning service delivery and institutional response.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}