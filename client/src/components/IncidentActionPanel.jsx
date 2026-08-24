import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";
const ACTION_ROLES = [5, 6, 7, 8, 9, 10, 11];

function IncidentActionPanel({ role, userId, incident, onChanged }) {
  const [users, setUsers] = useState([]);
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState(incident.status || "SUBMITTED");
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState("");
  const [advisory, setAdvisory] = useState("");
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  useEffect(() => {
    if (Number(role) !== 3) return;
    axios.get(`${API_URL}/incidents/assignable-users`, { headers: headers() })
      .then((response) => setUsers(response.data.data || []))
      .catch(() => setUsers([]));
  }, [role]);

  useEffect(() => {
    if (![4, 14].includes(Number(role))) return;
    axios.get(`${API_URL}/history/${incident.incident_id}`, { headers: headers() })
      .then((response) => setHistory(response.data.data || []))
      .catch(() => setHistory([]));
  }, [role, incident.incident_id]);

  const request = async (method, path, data) => {
    setMessage("");
    try {
      await axios({ method, url: `${API_URL}/incidents/${incident.incident_id}${path}`, data, headers: headers() });
      setMessage("Saved");
      onChanged?.();
    } catch (error) {
      setMessage(error.response?.data?.message || "Action failed");
    }
  };

  if (Number(role) === 3) {
    return (
      <div className="incident-actions">
        <select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
          <option value="">Assign to...</option>
          {users.filter((item) => ![12, 13].includes(Number(item.role_id))).map((item) => (
            <option key={item.user_id} value={item.user_id}>
              {item.first_name} {item.last_name} ({item.role_name})
            </option>
          ))}
        </select>
        <button className="action-primary" type="button" disabled={!assignee} onClick={() => request("post", "/assign", { assigned_to_user_id: Number(assignee) })}>Assign</button>
        {message && <small>{message}</small>}
      </div>
    );
  }

  if (ACTION_ROLES.includes(Number(role)) && String(incident.assigned_to) === String(userId)) {
    return (
      <div className="incident-actions">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {['UNDER_REVIEW', 'INVESTIGATING', 'ACTION_TAKEN', 'RESOLVED'].map((value) => <option key={value}>{value}</option>)}
        </select>
        <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Status comment" />
        <button className="action-primary" type="button" onClick={() => request("patch", "/status", { new_status: status, comment })}>Update status</button>
        <input value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Feedback" />
        <button className="action-secondary" type="button" disabled={!feedback.trim()} onClick={() => request("post", "/feedback", { feedback, visible_to_reporter: true })}>Send feedback</button>
        <button className="action-success" type="button" onClick={() => request("post", "/complete", {})}>Mark complete</button>
        {message && <small>{message}</small>}
      </div>
    );
  }

  if ([12, 13].includes(Number(role))) {
    return (
      <div className="incident-actions">
        <input value={advisory} onChange={(event) => setAdvisory(event.target.value)} placeholder="Advisory" />
        <button className="action-secondary" type="button" disabled={!advisory.trim()} onClick={() => request("post", "/advisory", { advisory })}>Add advisory</button>
        {message && <small>{message}</small>}
      </div>
    );
  }

  if ([4, 14].includes(Number(role))) {
    return (
      <div className="incident-actions">
        {Number(role) === 4 && String(incident.status).toUpperCase() === "RESOLVED" && (
          <button className="action-success" type="button" onClick={() => request("post", "/close", {})}>Close incident</button>
        )}
        <details className="incident-history">
          <summary>View history</summary>
          {history.length ? history.map((entry) => (
            <div key={entry.id}>
              <strong>{entry.new_status}</strong>
              <span>{entry.comment || "Status change"}</span>
            </div>
          )) : <small>No history available</small>}
        </details>
      </div>
    );
  }

  return null;
}

export default IncidentActionPanel;
