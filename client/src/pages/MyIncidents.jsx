import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

const API_URL = "http://localhost:5000/api";

function MyIncidents({ user, onLogout, onNavigate, onViewIncident }) {
  const [incidents, setIncidents] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyIncidents();
  }, []);

  async function fetchMyIncidents() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/incidents/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setIncidents(response.data.data || []);
      } else {
        setError(response.data.message || "Failed to load incidents.");
      }
    } catch (err) {
      console.error("Error loading incidents:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load your incidents. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const getStatusClass = (status) => {
    const value = String(status || "").toLowerCase();

    if (value.includes("resolved") || value.includes("closed")) {
      return "status resolved";
    }

    if (
      value.includes("investigation") ||
      value.includes("assigned") ||
      value.includes("pending")
    ) {
      return "status progress";
    }

    if (value.includes("rejected")) {
      return "status rejected";
    }

    return "status submitted";
  };

  const getPriorityClass = (priority) => {
    const value = String(priority || "").toLowerCase();

    if (value === "high") {
      return "priority high";
    }

    if (value === "medium") {
      return "priority medium";
    }

    return "priority low";
  };

  const visibleIncidents = showAll ? incidents : incidents.slice(0, 3);

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout} onNavigate={onNavigate}>
        <div className="page-container">
          <div className="loading-card">
            <div className="spinner"></div>
            <p>Loading your incidents...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout} onNavigate={onNavigate}>
      <div className="page-container">
      <div className="page-header">
        <div>
          <h1>My Incidents</h1>
          <p>View and track incidents you have reported.</p>
        </div>

        <button type="button" className="primary-button" onClick={() => onNavigate?.("report")}>
          + Report Incident
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={fetchMyIncidents}>Retry</button>
        </div>
      )}

      {!error && incidents.length === 0 && (
        <div className="empty-card">
          <div className="empty-icon">📋</div>

          <h2>No incidents reported</h2>

          <p>
            You have not submitted any incident reports yet.
          </p>

          <button type="button" className="primary-button" onClick={() => onNavigate?.("report")}>
            Report an Incident
          </button>
        </div>
      )}

      {incidents.length > 0 && (
        <div className="incident-list">
          {visibleIncidents.map((incident) => (
            <div className="incident-card" key={incident.incident_id}>
              <div className="incident-card-header">
                <div>
                  <h2>{incident.title}</h2>

                  <p className="incident-number">
                    {incident.incident_number ||
                      incident.incident_id ||
                      "Incident"}
                  </p>
                </div>

                <span
                  className={getStatusClass(
                    incident.status_name || incident.status
                  )}
                >
                  {incident.status_name || incident.status || "Submitted"}
                </span>
              </div>

              <div className="incident-details">
                <div>
                  <span>Category</span>
                  <strong>
                    {incident.category_name ||
                      incident.category ||
                      "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>Priority</span>
                  <strong
                    className={getPriorityClass(
                      incident.priority
                    )}
                  >
                    {incident.priority || "Normal"}
                  </strong>
                </div>

                <div>
                  <span>Location</span>
                  <strong>
                    {incident.incident_location ||
                      incident.location ||
                      "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>Date</span>
                  <strong>
                    {incident.incident_date
                      ? new Date(
                          incident.incident_date
                        ).toLocaleDateString()
                      : incident.dateReported ||
                        "Not specified"}
                  </strong>
                </div>
              </div>

              <div className="incident-card-footer">
                <button
                  type="button"
                  onClick={() => onViewIncident?.(incident)}
                  className="view-button"
                >
                  View Details →
                </button>
              </div>

              {incident.feedback && (
                <div className="incident-feedback">
                  <strong>University feedback</strong>
                  <p>{incident.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {incidents.length > 3 && (
        <div className="show-more-wrap">
          <button
            type="button"
            className="show-more-button"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll
              ? "Show fewer incidents"
              : `Show more incidents (${incidents.length - 3})`}
          </button>
        </div>
      )}

      <style>{`
        .page-container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 8px 0 28px;
          color: #16324f;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 26px;
          padding: 22px 24px;
          border: 1px solid #d9e6e5;
          border-radius: 16px;
          background: linear-gradient(120deg, #f5fbfa 0%, #eef5ff 100%);
          box-shadow: 0 12px 30px rgba(22, 50, 79, 0.07);
        }

        .page-header h1 {
          margin: 0 0 8px;
          font-size: 32px;
          letter-spacing: -0.7px;
          color: #102a43;
        }

        .page-header p {
          margin: 0;
          color: #667085;
        }

        .primary-button {
          display: inline-block;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          background: #0f766e;
          color: white;
          text-decoration: none;
          border-radius: 10px;
          font-weight: 600;
          border: none;
          cursor: pointer;
        }

        .primary-button:hover {
          background: #115e59;
        }

        .loading-card,
        .empty-card {
          background: white;
          border-radius: 16px;
          padding: 58px 30px;
          text-align: center;
          box-shadow: 0 12px 30px rgba(22, 50, 79, 0.07);
          border: 1px solid #e1e9ef;
        }

        .spinner {
          width: 35px;
          height: 35px;
          border: 4px solid #e5e7eb;
          border-top-color: #0f766e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 15px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-icon {
          font-size: 50px;
          margin-bottom: 15px;
        }

        .empty-card h2 {
          margin-bottom: 10px;
          color: #172033;
        }

        .empty-card p {
          color: #667085;
          margin-bottom: 25px;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .error-message button {
          background: #b91c1c;
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
        }

        .incident-list {
          display: grid;
          gap: 20px;
        }

        .show-more-wrap {
          display: flex;
          justify-content: center;
          padding: 24px 0 4px;
        }

        .show-more-button {
          padding: 11px 18px;
          border: 1px solid #b8d8d4;
          border-radius: 10px;
          background: #ffffff;
          color: #0f766e;
          font-weight: 700;
          cursor: pointer;
          transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
        }

        .show-more-button:hover {
          border-color: #0f766e;
          background: #effaf8;
          transform: translateY(-1px);
        }

        .incident-card {
          background: rgba(255, 255, 255, 0.92);
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 12px 30px rgba(22, 50, 79, 0.07);
          border: 1px solid #e1e9ef;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .incident-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px rgba(22, 50, 79, 0.11);
        }

        .incident-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 22px;
        }

        .incident-card-header h2 {
          margin: 0 0 7px;
          font-size: 20px;
          color: #172033;
        }

        .incident-number {
          margin: 0;
          font-size: 13px;
          color: #667085;
        }

        .status {
          padding: 7px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }

        .status.submitted {
          background: #e6f7f4;
          color: #0f766e;
        }

        .status.progress {
          background: #fff7ed;
          color: #c2410c;
        }

        .status.resolved {
          background: #ecfdf3;
          color: #15803d;
        }

        .status.rejected {
          background: #fef2f2;
          color: #b91c1c;
        }

        .incident-details {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          padding: 18px 0;
          border-top: 1px solid #eaecf0;
          border-bottom: 1px solid #eaecf0;
        }

        .incident-details div {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .incident-details span {
          color: #667085;
          font-size: 13px;
        }

        .incident-details strong {
          color: #344054;
          font-size: 14px;
        }

        .priority.high {
          color: #dc2626;
        }

        .priority.medium {
          color: #d97706;
        }

        .priority.low {
          color: #15803d;
        }

        .incident-card-footer {
          display: flex;
          justify-content: flex-end;
          padding-top: 18px;
        }

        .view-button {
          color: #0f766e;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
        }

        .view-button:hover {
          text-decoration: underline;
        }

        .incident-feedback {
          margin-top: 18px;
          padding: 15px 16px;
          border-left: 4px solid #2563eb;
          border-radius: 8px;
          background: #e8f5f3;
          color: #115e59;
        }

        .incident-feedback strong {
          display: block;
          margin-bottom: 5px;
          font-size: 13px;
        }

        .incident-feedback p {
          margin: 0;
          color: #334155;
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-line;
        }

        @media (max-width: 800px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .incident-details {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 500px) {
          .page-container {
            padding: 8px 0 20px;
          }

          .incident-card-header {
            flex-direction: column;
          }

          .incident-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      </div>
    </Layout>
  );
}

export default MyIncidents;