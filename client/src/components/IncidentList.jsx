import { useEffect, useState } from "react";
import axios from "axios";
import IncidentActionPanel from "./IncidentActionPanel";

const API_URL = "http://localhost:5000/api";

function IncidentList({ role, user, title = "Incident Register" }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/incidents`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setIncidents(response.data.incidents || response.data.data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load incidents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="incident-list">
      <div className="incident-register-heading">
        <div>
          <span className="incident-register-kicker">LIVE CASE OVERVIEW</span>
          <h2>{title}</h2>
        </div>
        <span className="incident-register-count">{incidents.length} cases</span>
      </div>
      {loading && <p>Loading incidents...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (
        <div className="incident-table-wrapper">
          <table>
            <thead>
              <tr><th>Incident ID</th><th>Category</th><th>Title</th><th>Reporter</th><th>Status</th><th>Assigned To</th><th>Date</th><th>Action</th></tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.incident_id}>
                  <td>{incident.incident_id}</td>
                  <td>{incident.category_name || "-"}</td>
                  <td>{incident.title}</td>
                  <td>{incident.reporter_name || "Anonymous"}</td>
                  <td>{incident.status}</td>
                  <td>{incident.assigned_to_name || "Unassigned"}</td>
                  <td>{incident.created_at ? new Date(incident.created_at).toLocaleDateString() : "-"}</td>
                  <td><IncidentActionPanel role={role} userId={user?.id || user?.user_id} incident={incident} onChanged={load} /></td>
                </tr>
              ))}
              {!incidents.length && <tr><td colSpan="8">No incidents found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default IncidentList;
