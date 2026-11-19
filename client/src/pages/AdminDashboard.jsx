import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ClipboardList,
  FileSearch,
  Filter,
  MapPin,
  Paperclip,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Layout from "../components/Layout";
import {
  AdminAuditTrail,
  AdminEvidenceRequests,
  AdminSettings,
} from "../components/EvidenceRequestPanels";
import "./AdminDashboard.css";

const API_URL = (
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`
).replace(/\/+$/, "");

const DEFAULT_PREFERENCES = { autoRefreshMinutes: 0, responseSlaDays: 7 };

const reportViews = [
  { id: "all", label: "All Reports", shortLabel: "All reports" },
  { id: "new", label: "New Reports", shortLabel: "New reports" },
  { id: "review", label: "Under Review", shortLabel: "Under review" },
  { id: "awaiting", label: "Awaiting Reporter Response", shortLabel: "Awaiting response" },
  { id: "overdue", label: "Overdue Cases", shortLabel: "Overdue" },
  { id: "referred", label: "Referred Cases", shortLabel: "Referred" },
  { id: "resolved", label: "Resolved Cases", shortLabel: "Resolved" },
  { id: "rejected", label: "Rejected Cases", shortLabel: "Rejected" },
  { id: "reopened", label: "Reopened Cases", shortLabel: "Reopened" },
];

const statusViews = reportViews.filter((item) => item.id !== "overdue");

const STATUS_LABELS = {
  new: "New",
  review: "Under review",
  awaiting: "Awaiting reporter response",
  referred: "Referred",
  resolved: "Resolved",
  rejected: "Rejected",
  reopened: "Reopened",
};

const getStatus = (incident) =>
  incident.status_name || incident.status || incident.current_status || "New";

const getStatusGroup = (incident) => {
  const status = String(getStatus(incident)).toLowerCase().replaceAll(/[_-]+/g, " ");
  if (status.includes("reopen")) return "reopened";
  if (status.includes("reject")) return "rejected";
  if (status.includes("await") || status.includes("reporter response") || status.includes("information requested")) return "awaiting";
  if (status.includes("refer")) return "referred";
  if (status.includes("resolv") || status.includes("clos") || status.includes("complet")) return "resolved";
  if (status.includes("pending") || status.includes("submitted") || status === "new") return "new";
  return "review";
};

const getReportId = (incident) =>
  incident.incident_number || incident.incident_id || incident.id || "Unassigned";

const getReporterName = (incident) => {
  if (incident.anonymity === true || incident.anonymous === true) return "Anonymous";
  return incident.reporter_name
    || [incident.reporter_first_name || incident.first_name, incident.reporter_last_name || incident.last_name]
      .filter(Boolean)
      .join(" ")
    || "Reporter name unavailable";
};

const getReportedDate = (incident) =>
  incident.created_at || incident.incident_date || incident.dateReported;

const getDeadline = (incident, responseSlaDays = 7) =>
  incident.response_deadline || incident.deadline || incident.due_date
  || (incident.created_at
    ? new Date(new Date(incident.created_at).getTime() + responseSlaDays * 86400000)
    : null);

const isOverdue = (incident, responseSlaDays = 7) => {
  const deadline = getDeadline(incident, responseSlaDays);
  if (!deadline || ["resolved", "rejected"].includes(getStatusGroup(incident))) return false;
  const dueAt = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(dueAt.getTime()) && dueAt < today;
};

const formatDate = (date, options = { dateStyle: "medium" }) => {
  if (!date) return "Not recorded";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return options.timeStyle
    ? parsed.toLocaleString(undefined, options)
    : parsed.toLocaleDateString(undefined, options);
};

const getToken = () => localStorage.getItem("token");
const getHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

function AdminDashboard({ user, onLogout }) {
  const preferenceKey = `adminDashboardPreferences:${user?.user_id || user?.id || "current"}`;
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem(preferenceKey);
    if (!saved) return DEFAULT_PREFERENCES;
    try {
      const parsed = JSON.parse(saved);
      return {
        autoRefreshMinutes: [0, 1, 5, 15].includes(Number(parsed.autoRefreshMinutes))
          ? Number(parsed.autoRefreshMinutes)
          : DEFAULT_PREFERENCES.autoRefreshMinutes,
        responseSlaDays: [3, 7, 14].includes(Number(parsed.responseSlaDays))
          ? Number(parsed.responseSlaDays)
          : DEFAULT_PREFERENCES.responseSlaDays,
      };
    } catch (parseError) {
      console.error("Invalid dashboard preferences:", parseError);
      return DEFAULT_PREFERENCES;
    }
  });
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("all");
  const [workspace, setWorkspace] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [urgency, setUrgency] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [caseHistory, setCaseHistory] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [caseRequests, setCaseRequests] = useState([]);
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseError, setCaseError] = useState("");
  const caseRequestId = useRef(0);

  const fetchIncidents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API_URL}/incidents`, { headers: getHeaders() });
      const data = response.data?.incidents || response.data?.data || [];
      setIncidents(Array.isArray(data) ? data : []);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setError("Your administrator session has expired. Sign out and sign in again to continue.");
      } else {
        setError(requestError.response?.data?.message || "Unable to load reports.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchIncidents(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchIncidents]);

  useEffect(() => {
    localStorage.setItem(preferenceKey, JSON.stringify(preferences));
  }, [preferenceKey, preferences]);

  useEffect(() => {
    if (!preferences.autoRefreshMinutes) return undefined;
    const timer = window.setInterval(
      () => { void fetchIncidents(true); },
      preferences.autoRefreshMinutes * 60 * 1000
    );
    return () => window.clearInterval(timer);
  }, [fetchIncidents, preferences.autoRefreshMinutes]);

  const openCase = async (incident) => {
    const requestId = ++caseRequestId.current;
    setSelectedIncident(incident);
    setCaseLoading(true);
    setCaseError("");
    setCaseHistory([]);
    setEvidence([]);
    setCaseRequests([]);

    const [historyResult, evidenceResult, requestsResult] = await Promise.allSettled([
      axios.get(`${API_URL}/history/${incident.incident_id}`, { headers: getHeaders() }),
      axios.get(`${API_URL}/evidence/${incident.incident_id}`, { headers: getHeaders() }),
      axios.get(`${API_URL}/evidence/requests?incident_id=${encodeURIComponent(incident.incident_id)}`, { headers: getHeaders() }),
    ]);
    if (requestId !== caseRequestId.current) return;
    if (historyResult.status === "fulfilled") {
      setCaseHistory(historyResult.value.data?.data || []);
    } else {
      setCaseError(historyResult.reason.response?.data?.message || "Status history could not be loaded.");
    }
    if (evidenceResult.status === "fulfilled") {
      setEvidence(evidenceResult.value.data?.data || []);
    } else {
      setCaseError((current) => current || evidenceResult.reason.response?.data?.message || "Evidence could not be loaded.");
    }
    if (requestsResult.status === "fulfilled") {
      setCaseRequests(requestsResult.value.data?.data || []);
    } else {
      setCaseError((current) => current || requestsResult.reason.response?.data?.message || "Evidence requests could not be loaded.");
    }
    setCaseLoading(false);
  };

  const categories = useMemo(() => [...new Set(
    incidents.map((incident) => incident.category_name || incident.category).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b)), [incidents]);

  const summary = useMemo(() => {
    const counts = Object.fromEntries(reportViews.map((item) => [item.id, 0]));
    incidents.forEach((incident) => {
      counts[getStatusGroup(incident)] += 1;
      if (isOverdue(incident, preferences.responseSlaDays)) counts.overdue += 1;
    });
    counts.all = incidents.length;
    return counts;
  }, [incidents, preferences.responseSlaDays]);

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return incidents.filter((incident) => {
      const statusGroup = getStatusGroup(incident);
      const incidentDate = getReportedDate(incident);
      const dateValue = incidentDate ? new Date(incidentDate) : null;
      const dateKey = dateValue && !Number.isNaN(dateValue.getTime())
        ? dateValue.toISOString().slice(0, 10)
        : "";
      const matchesView = view === "all" || (view === "overdue" ? isOverdue(incident, preferences.responseSlaDays) : statusGroup === view);
      const haystack = [
        getReportId(incident),
        incident.title,
        incident.reporter_name,
        incident.reporter_email,
        incident.category_name,
        incident.priority,
        getStatus(incident),
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesView
        && (!query || haystack.includes(query))
        && (category === "all" || (incident.category_name || incident.category) === category)
        && (urgency === "all" || String(incident.priority || "").toLowerCase() === urgency)
        && (!fromDate || dateKey >= fromDate)
        && (!toDate || dateKey <= toDate);
    }).sort((a, b) => new Date(getReportedDate(b) || 0) - new Date(getReportedDate(a) || 0));
  }, [incidents, view, search, category, urgency, fromDate, toDate, preferences.responseSlaDays]);

  const attentionCases = useMemo(() => incidents
    .filter((incident) => isOverdue(incident, preferences.responseSlaDays) || ["new", "awaiting", "referred"].includes(getStatusGroup(incident)))
    .sort((a, b) => Number(isOverdue(b, preferences.responseSlaDays)) - Number(isOverdue(a, preferences.responseSlaDays)) || new Date(getReportedDate(a) || 0) - new Date(getReportedDate(b) || 0))
    .slice(0, 5), [incidents, preferences.responseSlaDays]);

  const recentUpdates = useMemo(() => [...incidents]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 5), [incidents]);

  const reportTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const total = incidents.filter((incident) => {
        const reported = getReportedDate(incident);
        if (!reported) return false;
        const parsed = new Date(reported);
        if (Number.isNaN(parsed.getTime())) return false;
        return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}` === dateKey;
      }).length;
      return { label: date.toLocaleDateString(undefined, { weekday: "short" }), total };
    });
    return days;
  }, [incidents]);

  const trendMax = Math.max(1, ...reportTrend.map((day) => day.total));
  const trendPoints = reportTrend.map((day, index) => {
    const x = reportTrend.length > 1 ? (index / (reportTrend.length - 1)) * 100 : 50;
    const y = 88 - (day.total / trendMax) * 70;
    return `${x},${y}`;
  }).join(" ");
  const trendTotal = reportTrend.reduce((total, day) => total + day.total, 0);

  const closeCase = () => {
    caseRequestId.current += 1;
    setSelectedIncident(null);
    setCaseLoading(false);
  };

  const handleRequestEvidence = async ({ requestText, dueAt }) => {
    if (!selectedIncident?.incident_id) throw new Error("Open a case before requesting evidence.");
    const response = await axios.post(
      `${API_URL}/evidence/requests`,
      {
        incident_id: selectedIncident.incident_id,
        request_text: requestText,
        due_at: dueAt || null,
      },
      { headers: getHeaders() }
    );
    const updatedIncident = {
      ...selectedIncident,
      status_name: response.data?.data?.incident_status || "Awaiting Reporter Response",
      status: response.data?.data?.incident_status || "Awaiting Reporter Response",
    };
    setSelectedIncident(updatedIncident);
    await Promise.all([openCase(updatedIncident), fetchIncidents(true)]);
  };

  const handleUpdateStatus = async ({ status, comment }) => {
    if (!selectedIncident?.incident_id) throw new Error("Open a case before updating its status.");
    const response = await axios.patch(
      `${API_URL}/incidents/${selectedIncident.incident_id}/status`,
      { new_status: status, comment },
      { headers: getHeaders() }
    );
    const updatedIncident = {
      ...selectedIncident,
      status_name: response.data?.status || status,
      status: response.data?.status || status,
    };
    setSelectedIncident(updatedIncident);
    await Promise.all([openCase(updatedIncident), fetchIncidents(true)]);
  };

  const openEvidenceRequestCase = (request) => {
    const incident = incidents.find((item) => item.incident_id === request.incident_id);
    void openCase(incident || request);
  };

  const updatePreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setUrgency("all");
    setFromDate("");
    setToDate("");
  };

  const metricCards = [
    { id: "all", label: "Total reports", icon: FileSearch, tone: "green" },
    { id: "new", label: "New reports", icon: AlertTriangle, tone: "amber" },
    { id: "review", label: "Under review", icon: Activity, tone: "blue" },
    { id: "awaiting", label: "Awaiting response", icon: Clock3, tone: "amber" },
    { id: "overdue", label: "Overdue cases", icon: AlertTriangle, tone: "red" },
    { id: "referred", label: "Referred", icon: ArrowUpRight, tone: "blue" },
    { id: "resolved", label: "Resolved", icon: CheckCircle2, tone: "green" },
    { id: "rejected", label: "Rejected", icon: X, tone: "slate" },
    { id: "reopened", label: "Reopened", icon: RefreshCw, tone: "orange" },
  ];

  return (
    <Layout user={user} onLogout={onLogout} showIncidentList={false}>
      <main className="admin-dashboard" aria-label="Administrator dashboard">
        <header className="admin-page-header">
          <div>
            <p className="admin-eyebrow"><span className="admin-live-dot" /> UNIVERSITY INCIDENT REPORTING</p>
            <h1>Good morning, ADMIN</h1>
            <p className="admin-intro">A clear view of campus reports, case progress, and what needs attention.</p>
          </div>
          <button className="admin-refresh" type="button" onClick={() => void fetchIncidents(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? "admin-spin" : ""} />
            <span>{refreshing ? "Refreshing" : "Refresh data"}</span>
          </button>
        </header>

        <nav className="admin-primary-nav" aria-label="Administrator dashboard sections">
          <button type="button" className={workspace === "dashboard" ? "is-active" : ""} onClick={() => { setWorkspace("dashboard"); setView("all"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <BarChart3 size={16} /><span>Dashboard</span>
          </button>
          {reportViews.filter((item) => item.id !== "overdue").map((item) => (
            <button type="button" key={item.id} className={workspace === "reports" && view === item.id ? "is-current" : ""} onClick={() => { setWorkspace("reports"); setView(item.id); document.querySelector(".admin-case-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <span>{item.label}</span>
            </button>
          ))}
          <button type="button" className={workspace === "evidence" ? "is-current" : ""} onClick={() => { setWorkspace("evidence"); document.querySelector(".admin-case-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
            <Paperclip size={15} /><span>Evidence Requests</span>
          </button>
          <button type="button" className={workspace === "audit" ? "is-current" : ""} onClick={() => { setWorkspace("audit"); document.querySelector(".admin-case-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
            <ClipboardList size={15} /><span>Audit Trail</span>
          </button>
          <button type="button" className={workspace === "settings" ? "is-current" : ""} onClick={() => { setWorkspace("settings"); document.querySelector(".admin-case-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
            <Settings size={15} /><span>Settings</span>
          </button>
        </nav>

        <section className="admin-metrics" aria-label="Report summary">
          {metricCards.map(({ id, label, icon: Icon, tone }) => (
            <button
              className={`admin-metric admin-metric-${tone}`}
              key={id}
              type="button"
              onClick={() => { setWorkspace("reports"); setView(id); }}
              aria-label={`${label}: ${summary[id] || 0}. Open this report queue.`}
            >
              <span className="admin-metric-icon"><Icon size={17} /></span>
              <span className="admin-metric-copy">
                <span className="admin-metric-label">{label}</span>
                <strong>{loading ? "—" : summary[id] || 0}</strong>
              </span>
              <ChevronRight className="admin-metric-arrow" size={16} />
            </button>
          ))}
        </section>

        <section className="admin-analytics-grid" aria-label="Report analytics">
          <div className="admin-section admin-trend">
            <div className="admin-section-heading">
              <div><p className="admin-eyebrow">LAST 7 DAYS</p><h2>Reports received</h2></div>
              <div className="admin-trend-total"><strong>{loading ? "—" : trendTotal}</strong><span>this week</span></div>
            </div>
            <div className="admin-chart-wrap">
              <svg className="admin-trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Reports received each day over the last seven days: ${reportTrend.map((day) => `${day.label} ${day.total}`).join(", ")}`}>
                <line x1="0" y1="88" x2="100" y2="88" className="admin-chart-gridline" />
                <line x1="0" y1="53" x2="100" y2="53" className="admin-chart-gridline" />
                <line x1="0" y1="18" x2="100" y2="18" className="admin-chart-gridline" />
                <polyline points={trendPoints} className="admin-chart-line" />
                {reportTrend.map((day, index) => {
                  const x = reportTrend.length > 1 ? (index / (reportTrend.length - 1)) * 100 : 50;
                  const y = 88 - (day.total / trendMax) * 70;
                  return <circle key={day.label} cx={x} cy={y} r="1.7" className="admin-chart-point"><title>{day.label}: {day.total} reports</title></circle>;
                })}
              </svg>
              <div className="admin-chart-labels">{reportTrend.map((day) => <span key={day.label}>{day.label}</span>)}</div>
            </div>
          </div>
          <div className="admin-section admin-status-overview">
            <div className="admin-section-heading">
              <div><p className="admin-eyebrow">CASE DISTRIBUTION</p><h2>Current workload</h2></div>
              <Sparkles size={17} className="admin-heading-icon" />
            </div>
            <div className="admin-status-bars">
              {[
                { id: "new", color: "amber", label: "New reports" },
                { id: "review", color: "blue", label: "Under review" },
                { id: "awaiting", color: "amber", label: "Awaiting response" },
                { id: "resolved", color: "green", label: "Resolved" },
              ].map((item) => (
                <div className="admin-status-bar-row" key={item.id}>
                  <div className="admin-status-bar-label"><span>{item.label}</span><strong>{loading ? "—" : summary[item.id] || 0}</strong></div>
                  <div className="admin-status-bar-track"><span className={`admin-status-bar-fill is-${item.color}`} style={{ width: `${incidents.length ? Math.max(summary[item.id] ? 4 : 0, Math.round((summary[item.id] / incidents.length) * 100)) : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <div className="admin-alert" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button type="button" onClick={() => void fetchIncidents(true)}>Retry</button>
          </div>
        )}

        <section className="admin-overview-grid">
          <div className="admin-section admin-attention">
            <div className="admin-section-heading">
              <div>
                <p className="admin-eyebrow">PRIORITY QUEUE</p>
                <h2>Needs attention</h2>
              </div>
              <button className="admin-text-action" type="button" onClick={() => { setWorkspace("reports"); setView("overdue"); }}>
                View overdue <ArrowUpRight size={15} />
              </button>
            </div>
            {attentionCases.length ? (
              <div className="admin-attention-list">
                {attentionCases.map((incident) => (
                  <button className="admin-attention-row" key={incident.incident_id || incident.id} type="button" onClick={() => openCase(incident)}>
                    <span className={`admin-attention-mark ${isOverdue(incident) ? "is-overdue" : ""}`} />
                    <span className="admin-attention-copy">
                      <strong>{getReporterName(incident)}</strong>
                      <small>{incident.title || "Untitled report"} · {STATUS_LABELS[getStatusGroup(incident)]}</small>
                    </span>
                    {isOverdue(incident) && <span className="admin-overdue-label">Overdue</span>}
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="admin-empty-inline">No reports currently need attention.</p>
            )}
          </div>

          <div className="admin-section admin-recent">
            <div className="admin-section-heading">
              <div>
                <p className="admin-eyebrow">LATEST CASE CHANGES</p>
                <h2>Recently updated</h2>
              </div>
              <Activity size={18} className="admin-heading-icon" />
            </div>
            {recentUpdates.length ? (
              <div className="admin-recent-list">
                {recentUpdates.map((incident) => (
                  <button className="admin-recent-row" key={incident.incident_id || incident.id} type="button" onClick={() => openCase(incident)}>
                    <span className="admin-recent-dot" />
                    <span className="admin-recent-copy">
                      <strong>{getReporterName(incident)}</strong>
                      <small>{incident.title || "Untitled report"}</small>
                    </span>
                    <span className="admin-recent-status">{STATUS_LABELS[getStatusGroup(incident)]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="admin-empty-inline">Recent case changes will appear here.</p>
            )}
          </div>
        </section>

        <section className="admin-case-workspace">
          <nav className="admin-workspace-tabs" aria-label="Administrator workspaces">
            <button className={workspace === "reports" || workspace === "dashboard" ? "is-active" : ""} type="button" onClick={() => setWorkspace("reports")}>Reports</button>
            <button className={workspace === "evidence" ? "is-active" : ""} type="button" onClick={() => setWorkspace("evidence")}>Evidence requests</button>
            <button className={workspace === "audit" ? "is-active" : ""} type="button" onClick={() => setWorkspace("audit")}>Audit trail</button>
            <button className={workspace === "settings" ? "is-active" : ""} type="button" onClick={() => setWorkspace("settings")}>Settings</button>
          </nav>

          {workspace === "reports" || workspace === "dashboard" ? (
            <div className="admin-reports-panel">
              <div className="admin-report-heading">
                <div>
                  <p className="admin-eyebrow">REPORT REGISTER</p>
                  <h2>{reportViews.find((item) => item.id === view)?.label || "All reports"}</h2>
                </div>
                <span className="admin-result-count">{filteredIncidents.length} reports</span>
              </div>

              <div className="admin-status-tabs" role="tablist" aria-label="Filter reports by current status">
                {statusViews.map((item) => (
                  <button
                    className={view === item.id ? "is-active" : ""}
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={view === item.id}
                    onClick={() => setView(item.id)}
                  >
                    {item.label}<span>{summary[item.id] || 0}</span>
                  </button>
                ))}
              </div>

              <div className="admin-filters">
                <label className="admin-search">
                  <Search size={16} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID, title or reporter" aria-label="Search reports" />
                </label>
                <label className="admin-select-filter">
                  <span>Category</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    <option value="all">All categories</option>
                    {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="admin-select-filter">
                  <span>Urgency</span>
                  <select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
                    <option value="all">All urgency</option>
                    {["critical", "high", "medium", "low"].map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
                  </select>
                </label>
                <label className="admin-date-filter">
                  <CalendarDays size={15} />
                  <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="From date" />
                </label>
                <label className="admin-date-filter">
                  <CalendarDays size={15} />
                  <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="To date" />
                </label>
                <button className="admin-clear-filters" type="button" onClick={clearFilters} title="Clear filters" aria-label="Clear filters"><Filter size={16} /></button>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-report-table">
                  <thead>
                    <tr><th>Reporter</th><th>Category</th><th>Urgency</th><th>Reported</th><th>Current status</th><th><span className="admin-visually-hidden">Open</span></th></tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="admin-table-message" colSpan="6">Loading reports…</td></tr>
                    ) : filteredIncidents.length ? filteredIncidents.map((incident) => (
                      <tr key={incident.incident_id || incident.id}>
                        <td data-label="Reporter">
                          <button className="admin-case-link" type="button" onClick={() => openCase(incident)}>
                            <strong>{getReporterName(incident)}</strong>
                            <span>{incident.title || "Untitled report"}</span>
                          </button>
                        </td>
                        <td data-label="Category">{incident.category_name || incident.category || "Uncategorized"}</td>
                        <td data-label="Urgency"><span className={`admin-priority priority-${String(incident.priority || "normal").toLowerCase()}`}>{incident.priority || "Normal"}</span></td>
                        <td data-label="Reported">{formatDate(getReportedDate(incident))}</td>
                        <td data-label="Current status"><span className={`admin-status status-${getStatusGroup(incident)}`}>{STATUS_LABELS[getStatusGroup(incident)]}</span></td>
                        <td data-label="Open"><button className="admin-open-case" type="button" aria-label={`Open report from ${getReporterName(incident)}`} onClick={() => openCase(incident)}><ChevronRight size={17} /></button></td>
                      </tr>
                    )) : (
                      <tr><td className="admin-table-message" colSpan="6">No reports match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="admin-status-note"><ShieldCheck size={14} /> {view === "overdue" ? "Overdue is a deadline flag; each report remains in its one current-status queue." : "Each report appears in one current-status queue. Open a report to review its case history and available evidence."}</p>
            </div>
          ) : workspace === "evidence" ? (
            <AdminEvidenceRequests onOpenCase={openEvidenceRequestCase} />
          ) : workspace === "audit" ? (
            <AdminAuditTrail />
          ) : (
            <AdminSettings preferences={preferences} onChange={updatePreference} />
          )}
        </section>
      </main>

      {selectedIncident && (
        <CaseFileModal
          key={selectedIncident.incident_id}
          incident={selectedIncident}
          history={caseHistory}
          evidence={evidence}
          requests={caseRequests}
          loading={caseLoading}
          error={caseError}
          onRequestEvidence={handleRequestEvidence}
          onUpdateStatus={handleUpdateStatus}
          onClose={closeCase}
        />
      )}
    </Layout>
  );
}

function CaseFileModal({ incident, history, evidence, requests, loading, error, onRequestEvidence, onUpdateStatus, onClose }) {
  const statusGroup = getStatusGroup(incident);
  const [nextStatus, setNextStatus] = useState(getStatus(incident));
  const [statusComment, setStatusComment] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [requestText, setRequestText] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState("");

  const submitStatusUpdate = async (event) => {
    event.preventDefault();
    setStatusError("");
    setStatusSuccess("");
    setSavingStatus(true);
    try {
      await onUpdateStatus({ status: nextStatus, comment: statusComment.trim() });
      setStatusComment("");
      setStatusSuccess(`Case status updated successfully to ${nextStatus}.`);
    } catch (submitError) {
      console.error("Failed to update incident status:", submitError);
      setStatusError(submitError.response?.data?.message || submitError.message || "Unable to update case status.");
    } finally {
      setSavingStatus(false);
    }
  };

  const submitEvidenceRequest = async (event) => {
    event.preventDefault();
    setRequestError("");
    setSubmittingRequest(true);
    try {
      await onRequestEvidence({ requestText: requestText.trim(), dueAt });
      setRequestText("");
      setDueAt("");
    } catch (submitError) {
      console.error("Failed to create evidence request:", submitError);
      setRequestError(submitError.response?.data?.message || submitError.message || "Unable to create the request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="admin-case-modal" role="dialog" aria-modal="true" aria-labelledby="admin-case-title">
        <header className="admin-modal-header">
          <div>
            <p className="admin-eyebrow">CASE FILE · {getReportId(incident)}</p>
            <h2 id="admin-case-title">{incident.title || "Untitled report"}</h2>
          </div>
          <button className="admin-modal-close" type="button" aria-label="Close case file" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="admin-modal-scroll">
          <div className="admin-case-summary">
            <span className={`admin-status status-${statusGroup}`}>{STATUS_LABELS[statusGroup]}</span>
            <span className={`admin-priority priority-${String(incident.priority || "normal").toLowerCase()}`}>{incident.priority || "Normal"} urgency</span>
          </div>
          <div className="admin-case-facts">
            <div><span>Category</span><strong>{incident.category_name || incident.category || "Uncategorized"}</strong></div>
            <div><span>Reported</span><strong>{formatDate(getReportedDate(incident))}</strong></div>
            <div><span>Reporter</span><strong>{getReporterName(incident)}</strong></div>
            <div><span>Assigned unit</span><strong>{incident.assigned_role || incident.assigned_to_name || "Not assigned"}</strong></div>
          </div>
          <form className="admin-status-update-form" onSubmit={(event) => void submitStatusUpdate(event)}>
            <label>
              <span>Update case status</span>
              <select value={nextStatus} onChange={(event) => { setNextStatus(event.target.value); setStatusSuccess(""); }}>
                {["Pending", "Under Review", "Awaiting Reporter Response", "Referred", "Resolved", "Rejected", "Reopened", "Action Taken"].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Update note (optional)</span>
              <input value={statusComment} onChange={(event) => setStatusComment(event.target.value)} maxLength={1000} placeholder="Add a note to the case history." />
            </label>
            {statusError && <p className="admin-inline-error" role="alert">{statusError}</p>}
            {statusSuccess && <p className="admin-inline-success" role="status">{statusSuccess}</p>}
            <button className="admin-status-submit" type="submit" disabled={savingStatus}>
              {savingStatus ? "Saving status…" : "Update status"}
            </button>
          </form>
          {incident.incident_location && <p className="admin-case-location"><MapPin size={15} />{incident.incident_location}</p>}
          <section className="admin-case-section">
            <h3>Report details</h3>
            <p className="admin-case-description">{incident.description || "No description was provided."}</p>
          </section>
          <section className="admin-case-section">
            <h3><Paperclip size={16} /> Evidence on file <span>{evidence.length}</span></h3>
            {evidence.length ? (
              <ul className="admin-evidence-list">
                {evidence.map((file) => (
                  <li key={file.file_id || file.id}>
                    <Paperclip size={15} />
                    <span>{file.file_name || file.original_name || "Evidence file"}</span>
                    {file.file_url && <a href={file.file_url} target="_blank" rel="noreferrer">Open file<ArrowUpRight size={13} /></a>}
                  </li>
                ))}
              </ul>
            ) : <p className="admin-empty-inline">No evidence files attached.</p>}
          </section>
          <section className="admin-case-section">
            <h3><Clock3 size={16} /> Evidence requests <span>{requests.length}</span></h3>
            {requests.length ? (
              <ul className="admin-evidence-list">
                {requests.map((request) => (
                  <li key={request.request_id}>
                    <Clock3 size={15} />
                    <span>{request.status === "pending" ? "Awaiting reporter response" : "Reporter responded"} · {request.request_text}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="admin-empty-inline">No evidence has been requested.</p>}
            <form className="admin-evidence-request-form" onSubmit={(event) => void submitEvidenceRequest(event)}>
              <label>
                <span>Request details</span>
                <textarea
                  value={requestText}
                  onChange={(event) => setRequestText(event.target.value)}
                  rows={3}
                  maxLength={4000}
                  required
                  placeholder="Explain what information or supporting evidence the reporter should provide."
                />
              </label>
              <label>
                <span>Response due date (optional)</span>
                <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
              </label>
              {requestError && <p className="admin-inline-error" role="alert">{requestError}</p>}
              <button className="admin-request-submit" type="submit" disabled={submittingRequest}>
                <Paperclip size={15} /> {submittingRequest ? "Sending request…" : "Request more evidence"}
              </button>
            </form>
          </section>
          <section className="admin-case-section">
            <h3><Activity size={16} /> Status history</h3>
            {error && <p className="admin-inline-error">{error}</p>}
            {loading ? <p className="admin-empty-inline">Loading case history…</p> : history.length ? (
              <ol className="admin-history-list">
                {history.map((entry) => (
                  <li key={entry.history_id || entry.id}>
                    <span className="admin-history-dot" />
                    <div><strong>{entry.new_status || "Case update"}</strong><p>{entry.comment || "Status updated"}</p><small>{formatDate(entry.created_at || entry.changed_at, { dateStyle: "medium", timeStyle: "short" })}</small></div>
                  </li>
                ))}
              </ol>
            ) : <p className="admin-empty-inline">No status history recorded.</p>}
          </section>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
