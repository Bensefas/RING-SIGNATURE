import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

function IncidentDetails({ incident: selectedIncident, onBack }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(selectedIncident || null);
  const [loading, setLoading] = useState(!selectedIncident);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (selectedIncident) {
      return;
    }

    const fetchIncident = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/incidents/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setIncident(response.data.data);
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message ||
            "Unable to load incident details."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id && token) fetchIncident();
  }, [id, token, selectedIncident]);

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    navigate(-1);
  };

  const accessError = !selectedIncident && (!id || !token)
    ? "You must be logged in to view this incident."
    : "";

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "assigned":
        return "status assigned";

      case "under investigation":
        return "status investigation";

      case "resolved":
        return "status resolved";

      case "closed":
        return "status closed";

      default:
        return "status";
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-card">
          <h2>Loading Incident...</h2>
          <p>Please wait while the incident information is retrieved.</p>
        </div>
      </div>
    );
  }

  if (error || accessError) {
    return (
      <div className="page-container">
        <div className="error-card">
          <h2>Unable to Load Incident</h2>
          <p>{error || accessError}</p>

          <button onClick={handleBack}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="page-container">
        <div className="error-card">
          <h2>Incident Not Found</h2>

          <button onClick={handleBack}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button
            className="back-button"
            onClick={handleBack}
          >
            ← Back
          </button>

          <h1>Incident Details</h1>

          <p>
            View the complete information and current status of
            this incident.
          </p>
        </div>
      </div>

      <div className="incident-card">
        <div className="incident-card-header">
          <div>
            <span className="incident-label">
              Incident Number
            </span>

            <h2>
              {incident.incident_number ||
                incident.incident_id}
            </h2>
          </div>

          <span className={getStatusClass(incident.status_name)}>
            {incident.status_name || "Unknown"}
          </span>
        </div>

        <div className="incident-section">
          <h3>Basic Information</h3>

          <div className="details-grid">
            <div className="detail-item">
              <span>Title</span>
              <strong>{incident.title}</strong>
            </div>

            <div className="detail-item">
              <span>Category</span>
              <strong>
                {incident.category_name || "Not specified"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Priority</span>
              <strong>{incident.priority}</strong>
            </div>

            <div className="detail-item">
              <span>Location</span>
              <strong>
                {incident.incident_location ||
                  "Not specified"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Incident Date</span>
              <strong>
                {incident.incident_date
                  ? new Date(
                      incident.incident_date
                    ).toLocaleString()
                  : "Not specified"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Reported</span>
              <strong>
                {incident.created_at
                  ? new Date(
                      incident.created_at
                    ).toLocaleString()
                  : "Not specified"}
              </strong>
            </div>
          </div>
        </div>

        <div className="incident-section">
          <h3>Description</h3>

          <div className="description-box">
            {incident.description || "No description provided."}
          </div>
        </div>

        <div className="incident-section">
          <h3>Reporter Information</h3>

          <div className="details-grid">
            <div className="detail-item">
              <span>Reporter</span>

              <strong>
                {incident.anonymous
                  ? "Anonymous Reporter"
                  : `${incident.first_name || ""} ${
                      incident.last_name || ""
                    }`}
              </strong>
            </div>

            <div className="detail-item">
              <span>Anonymous</span>

              <strong>
                {incident.anonymous ? "Yes" : "No"}
              </strong>
            </div>
          </div>
        </div>

        <div className="incident-section">
          <h3>Blockchain Verification</h3>

          <div className="blockchain-box">
            {incident.blockchain_hash ? (
              <>
                <p>
                  <strong>Blockchain Hash:</strong>
                </p>

                <code>{incident.blockchain_hash}</code>

                {incident.blockchain_tx_id && (
                  <>
                    <p>
                      <strong>Transaction ID:</strong>
                    </p>

                    <code>{incident.blockchain_tx_id}</code>
                  </>
                )}
              </>
            ) : (
              <p>
                This incident has not yet been recorded on the
                blockchain.
              </p>
            )}
          </div>
        </div>

        <div className="incident-section">
          <h3>Last Updated</h3>

          <p>
            {incident.updated_at
              ? new Date(
                  incident.updated_at
                ).toLocaleString()
              : "Not available"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default IncidentDetails;