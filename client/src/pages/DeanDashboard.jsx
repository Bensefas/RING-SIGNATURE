import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import { Search, RefreshCw } from "lucide-react";

const API = "http://localhost:5000";

function DeanDashboard({ user, onLogout, onNavigate }) {
  const [incidents, setIncidents] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => { void loadIncidents(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function loadIncidents() {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(`${API}/api/incidents`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIncidents(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = useMemo(() => {
    return incidents.filter(i =>
      i.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [incidents, search]);

  return (
    <Layout user={user} onLogout={onLogout} onNavigate={onNavigate}>
      <div style={styles.hero}>
        <div>
          <h1>Faculty Dean Dashboard</h1>
          <p>Monitor faculty incidents and oversee investigations.</p>
        </div>

        <button style={styles.refresh} onClick={loadIncidents}>
          <RefreshCw size={18}/>
          Refresh
        </button>
      </div>

      <div style={styles.grid}>
        <DashboardCard title="Faculty Cases" value={incidents.length} color="#2563EB"/>
        <DashboardCard title="Open Cases" value={incidents.filter(i => i.status_name !== "Resolved").length} color="#F59E0B"/>
        <DashboardCard title="Resolved" value={incidents.filter(i => ["resolved", "closed"].includes(String(i.status_name || i.status || "").toLowerCase())).length} color="#10B981"/>
      </div>

      <div style={styles.card}>
        <div style={styles.header}>
          <h3>Faculty Incident Register</h3>

          <div style={styles.search}>
            <Search size={18}/>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              style={styles.input}
            />
          </div>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th>Incident</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map(i => (
              <tr key={i.incident_id}>
                <td>{i.title}</td>
                <td>{i.unit_name}</td>
                <td>{i.status_name}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={styles.empty}>
            No faculty incidents found.
          </div>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  hero: {
    background: "linear-gradient(135deg,#123C69,#2563EB)",
    color: "white",
    borderRadius: 18,
    padding: 28,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 22
  },

  refresh: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "10px 16px",
    border: "none",
    borderRadius: 10,
    background: "white",
    color: "#123C69",
    cursor: "pointer"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 20,
    marginBottom: 22
  },

  card: {
    background: "white",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 8px 25px rgba(0,0,0,.08)"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18
  },

  search: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #CBD5E1",
    borderRadius: 10,
    padding: "8px 12px"
  },

  input: {
    border: "none",
    outline: "none"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
  },

  empty: {
    textAlign: "center",
    padding: 20,
    color: "#64748B"
  }
};

export default DeanDashboard;