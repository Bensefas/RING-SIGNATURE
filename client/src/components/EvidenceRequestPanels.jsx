import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowUpRight,
  ClipboardList,
  Clock3,
  FileText,
  Paperclip,
  RefreshCw,
  Settings,
  Send,
  ShieldCheck,
} from "lucide-react";
import "./EvidenceRequestPanels.css";

const API_URL = (
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`
).replace(/\/+$/, "");

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const formatDate = (date, includeTime = false) => {
  if (!date) return "No due date";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "Not recorded"
    : parsed.toLocaleString(undefined, includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" });
};

const statusLabel = (status) => {
  if (status === "pending") return "Awaiting response";
  if (status === "responded") return "Responded";
  return "Closed";
};

export function AdminEvidenceRequests({ onOpenCase }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API_URL}/evidence/requests`, {
        headers: getHeaders(),
      });
      setRequests(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (requestError) {
      console.error("Failed to load evidence requests:", requestError);
      setError(requestError.response?.data?.message || "Unable to load evidence requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRequests(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  return (
    <section className="evidence-panel evidence-panel-admin" aria-label="Evidence requests">
      <header className="evidence-panel-header">
        <div>
          <p className="evidence-panel-eyebrow">REPORTER FOLLOW-UP</p>
          <h2>Evidence requests</h2>
          <p>Track requests sent to reporters and review their responses.</p>
        </div>
        <button type="button" className="evidence-icon-button" onClick={() => void loadRequests()} disabled={loading} aria-label="Refresh evidence requests">
          <RefreshCw size={16} className={loading ? "evidence-spin" : ""} />
        </button>
      </header>
      {error && <p className="evidence-error" role="alert">{error}</p>}
      {loading ? (
        <p className="evidence-empty">Loading evidence requests…</p>
      ) : requests.length ? (
        <div className="evidence-request-list">
          {requests.map((request) => (
            <article className="evidence-request-card" key={request.request_id}>
              <div className="evidence-request-card-heading">
                <div>
                  <span className={`evidence-status evidence-status-${request.status}`}>{statusLabel(request.status)}</span>
                  <h3>{request.incident_number || request.incident_id} · {request.incident_title || "Untitled report"}</h3>
                </div>
                <button
                  type="button"
                  className="evidence-case-link"
                  onClick={() => onOpenCase({
                    incident_id: request.incident_id,
                    incident_number: request.incident_number,
                    title: request.incident_title,
                    status_name: request.incident_status,
                    anonymity: request.anonymous,
                  })}
                >
                  Open case <ArrowUpRight size={14} />
                </button>
              </div>
              <p className="evidence-request-text">{request.request_text}</p>
              <div className="evidence-request-meta">
                <span><Clock3 size={14} /> Requested {formatDate(request.created_at)}</span>
                <span><Clock3 size={14} /> Due {formatDate(request.due_at)}</span>
                {request.evidence_file_ids?.length > 0 && (
                  <span><Paperclip size={14} /> {request.evidence_file_ids.length} attached file{request.evidence_file_ids.length === 1 ? "" : "s"}</span>
                )}
              </div>
              {request.reporter_response && (
                <div className="evidence-reporter-response">
                  <strong>Reporter response</strong>
                  <p>{request.reporter_response}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="evidence-empty">
          <FileText size={22} />
          <span>No evidence requests have been created.</span>
          <small>Open a case file to request information or supporting evidence.</small>
        </div>
      )}
    </section>
  );
}

export function ReporterEvidenceRequests() {
  const [requests, setRequests] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [files, setFiles] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API_URL}/evidence/requests/my`, {
        headers: getHeaders(),
      });
      setRequests(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (requestError) {
      console.error("Failed to load reporter evidence requests:", requestError);
      setError(requestError.response?.data?.message || "Unable to load evidence requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRequests(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  const submitResponse = async (event, request) => {
    event.preventDefault();
    const requestFiles = files[request.request_id] || [];
    const responseText = drafts[request.request_id] || "";
    if (!responseText.trim() && requestFiles.length === 0) {
      setError("Add a response or attach evidence before submitting.");
      return;
    }
    if (requestFiles.length > 5) {
      setError("Attach no more than five files to one response.");
      return;
    }

    setSubmitting((current) => ({ ...current, [request.request_id]: true }));
    setError("");
    setNotice("");
    try {
      const fileIds = [];
      for (const file of requestFiles) {
        const formData = new FormData();
        formData.append("incident_id", request.incident_id);
        formData.append("evidence", file);
        const uploadResponse = await axios.post(`${API_URL}/evidence/upload`, formData, {
          headers: getHeaders(),
        });
        const fileId = uploadResponse.data?.file?.file_id;
        if (!fileId) throw new Error(`Evidence upload did not return an ID for ${file.name}.`);
        fileIds.push(fileId);
      }

      await axios.post(
        `${API_URL}/evidence/requests/${request.request_id}/respond`,
        { response_text: responseText.trim(), file_ids: fileIds },
        { headers: getHeaders() }
      );
      setDrafts((current) => ({ ...current, [request.request_id]: "" }));
      setFiles((current) => ({ ...current, [request.request_id]: [] }));
      setNotice("Your response was sent to the administrator.");
      await loadRequests();
    } catch (requestError) {
      console.error("Failed to submit evidence response:", requestError);
      setError(requestError.response?.data?.message || requestError.message || "Unable to submit your response.");
    } finally {
      setSubmitting((current) => ({ ...current, [request.request_id]: false }));
    }
  };

  return (
    <section className="evidence-panel evidence-panel-reporter" aria-label="Evidence requested for your reports">
      <header className="evidence-panel-header">
        <div>
          <p className="evidence-panel-eyebrow">CASE FOLLOW-UP</p>
          <h2>Evidence requests</h2>
          <p>Respond to administrator questions and securely attach supporting files.</p>
        </div>
        <button type="button" className="evidence-icon-button" onClick={() => void loadRequests()} disabled={loading} aria-label="Refresh evidence requests">
          <RefreshCw size={16} className={loading ? "evidence-spin" : ""} />
        </button>
      </header>
      {error && <p className="evidence-error" role="alert">{error}</p>}
      {notice && <p className="evidence-notice" role="status">{notice}</p>}
      {loading ? (
        <p className="evidence-empty">Loading evidence requests…</p>
      ) : requests.length ? (
        <div className="evidence-request-list">
          {requests.map((request) => (
            <article className="evidence-request-card" key={request.request_id}>
              <div className="evidence-request-card-heading">
                <div>
                  <span className={`evidence-status evidence-status-${request.status}`}>{statusLabel(request.status)}</span>
                  <h3>{request.incident_number || request.incident_id} · {request.incident_title || "Untitled report"}</h3>
                </div>
                {request.due_at && <span className="evidence-due-date">Due {formatDate(request.due_at)}</span>}
              </div>
              <p className="evidence-request-text">{request.request_text}</p>
              {request.status === "pending" ? (
                <form className="evidence-response-form" onSubmit={(event) => void submitResponse(event, request)}>
                  <label>
                    <span>Your response</span>
                    <textarea
                      value={drafts[request.request_id] || ""}
                      onChange={(event) => setDrafts((current) => ({ ...current, [request.request_id]: event.target.value }))}
                      maxLength={4000}
                      placeholder="Answer the request or describe the evidence you are attaching."
                      rows={3}
                    />
                  </label>
                  <label className="evidence-file-picker">
                    <Paperclip size={15} />
                    <span>{files[request.request_id]?.length ? `${files[request.request_id].length} file(s) selected` : "Attach evidence (up to 5 files)"}</span>
                    <input
                      type="file"
                      multiple
                      onChange={(event) => setFiles((current) => ({
                        ...current,
                        [request.request_id]: Array.from(event.target.files || []),
                      }))}
                    />
                  </label>
                  <button className="evidence-submit" type="submit" disabled={Boolean(submitting[request.request_id])}>
                    <Send size={15} />
                    {submitting[request.request_id] ? "Sending…" : "Send response"}
                  </button>
                </form>
              ) : (
                <div className="evidence-reporter-response">
                  <strong>Your response</strong>
                  <p>{request.reporter_response || "Evidence was submitted."}</p>
                  {request.evidence_file_ids?.length > 0 && (
                    <small>{request.evidence_file_ids.length} evidence file{request.evidence_file_ids.length === 1 ? "" : "s"} attached</small>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="evidence-empty">
          <ShieldCheck size={22} />
          <span>No additional information is currently requested.</span>
          <small>New requests will appear here and in your notifications.</small>
        </div>
      )}
    </section>
  );
}

export function AdminAuditTrail() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API_URL}/audit`, { headers: getHeaders() });
      setEntries(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (requestError) {
      console.error("Failed to load audit trail:", requestError);
      setError(requestError.response?.data?.message || "Unable to load the audit trail.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadEntries(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadEntries]);

  return (
    <section className="evidence-panel evidence-panel-admin" aria-label="System audit trail">
      <header className="evidence-panel-header">
        <div>
          <p className="evidence-panel-eyebrow">SYSTEM ACTIVITY</p>
          <h2>Audit trail</h2>
          <p>Recent administrative and case actions recorded by the system.</p>
        </div>
        <button type="button" className="evidence-icon-button" onClick={() => void loadEntries()} disabled={loading} aria-label="Refresh audit trail">
          <RefreshCw size={16} className={loading ? "evidence-spin" : ""} />
        </button>
      </header>
      {error && <p className="evidence-error" role="alert">{error}</p>}
      {loading ? (
        <p className="evidence-empty">Loading audit entries…</p>
      ) : entries.length ? (
        <ol className="evidence-audit-list">
          {entries.map((entry) => (
            <li key={entry.audit_id}>
              <span className="evidence-audit-mark"><ClipboardList size={15} /></span>
              <div>
                <strong>{entry.action}</strong>
                <p>{entry.details || `${entry.entity_name || "System"} record updated.`}</p>
                <small>{entry.actor_name} · {formatDate(entry.created_at, true)}</small>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="evidence-empty">
          <ClipboardList size={22} />
          <span>No audit entries have been recorded yet.</span>
        </div>
      )}
    </section>
  );
}

export function AdminSettings({ preferences, onChange }) {
  return (
    <section className="evidence-panel evidence-panel-admin" aria-label="Administrator dashboard settings">
      <header className="evidence-panel-header">
        <div>
          <p className="evidence-panel-eyebrow">PERSONAL PREFERENCES</p>
          <h2>Dashboard settings</h2>
          <p>Adjust local dashboard refresh and overdue-case indicators.</p>
        </div>
        <Settings className="evidence-settings-icon" size={18} />
      </header>
      <div className="admin-preference-grid">
        <label>
          <span>Automatic report refresh</span>
          <select
            value={preferences.autoRefreshMinutes}
            onChange={(event) => onChange("autoRefreshMinutes", Number(event.target.value))}
          >
            <option value={0}>Off</option>
            <option value={1}>Every minute</option>
            <option value={5}>Every 5 minutes</option>
            <option value={15}>Every 15 minutes</option>
          </select>
        </label>
        <label>
          <span>Default response window</span>
          <select
            value={preferences.responseSlaDays}
            onChange={(event) => onChange("responseSlaDays", Number(event.target.value))}
          >
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
          </select>
        </label>
      </div>
      <p className="admin-preference-note">
        <ShieldCheck size={14} />
        These preferences are saved in this browser for this administrator account. Overdue flags use the response window when no case-specific deadline exists.
      </p>
    </section>
  );
}
