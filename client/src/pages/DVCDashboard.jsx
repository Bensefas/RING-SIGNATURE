import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

const ASSIGNABLE_ROLES = [
  {
    value: "HOD",
    label: "Head of Department (HOD)"
  },
  {
    value: "DSA",
    label: "Dean of Student Affairs"
  },
  {
    value: "DEAN",
    label: "Faculty Dean"
  },
  {
    value: "DISCIPLINARY",
    label: "Disciplinary Committee"
  },
  {
    value: "GUIDANCE",
    label: "Guidance & Counselling Unit"
  },
  {
    value: "SECURITY",
    label: "Security Unit"
  },
  {
    value: "CLINIC",
    label: "School Clinic"
  }
];

const STATUS_OPTIONS = [
  "Submitted",
  "Under Review",
  "Assigned",
  "Investigating",
  "Action Taken",
  "Resolved",
  "Closed",
  "Rejected"
];

const CATEGORY_OPTIONS = [
  "Bullying and Harassment",
  "Safety and Security",
  "Academic Misconduct"
];

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("accessToken")
  );
}

function normalizeIncident(item) {
  return {
    id: item.id,
    incident_id: item.incident_id || item.incidentId || item.id,
    title: item.title || "Untitled Incident",
    category: item.category_name || item.category || "Uncategorized",
    description: item.description || "",
    location: item.incident_location || item.location || "Not provided",
    incident_date: item.incident_date || item.incidentDate || "",
    priority: item.priority || "Medium",
    status: formatStatus(item.status || "SUBMITTED"),
    reporter_id: item.reporter_id || item.reporterId,
    first_name: item.first_name || item.reporter_first_name || "",
    last_name: item.last_name || item.reporter_last_name || "",
    email: item.email || item.reporter_email || "",
    assigned_to: item.assigned_to_name || item.assignedTo || item.assigned_to || "",
    assigned_role: item.assigned_role || item.assigned_role_name || item.assignedRole || "",
    feedback: item.feedback || "",
    created_at: item.created_at || item.createdAt,
    updated_at: item.updated_at || item.updatedAt,
    blockchain_hash: item.blockchain_hash || item.blockchainHash || "",
    blockchain_tx_id: item.blockchain_tx_id || item.blockchainTxId || "",
    evidence_cid: item.evidence_cid || item.evidenceCid || ""
  };
}

function formatStatus(status) {
  const value = String(status || "SUBMITTED").trim().toLowerCase().replace(/_/g, " ");
  const aliases = {
    submitted: "Submitted",
    pending: "Pending",
    assigned: "Assigned",
    "under review": "Under Review",
    "under investigation": "Investigating",
    investigating: "Investigating",
    "action taken": "Action Taken",
    resolved: "Resolved",
    closed: "Closed",
    rejected: "Rejected",
  };

  return aliases[value] || value
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClass(status) {
  switch (status) {
    case "Resolved":
    case "Closed":
      return "status-success";

    case "Rejected":
      return "status-danger";

    case "Investigating":
    case "Action Taken":
      return "status-warning";

    case "Assigned":
    case "Under Review":
      return "status-info";

    default:
      return "status-neutral";
  }
}

function getPriorityClass(priority) {
  switch (String(priority).toLowerCase()) {
    case "high":
    case "critical":
      return "priority-high";

    case "medium":
      return "priority-medium";

    default:
      return "priority-low";
  }
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export default function DVCDashboard({ user, onLogout, onNavigate }) {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [mobileMenu, setMobileMenu] = useState(false);

  const [assignment, setAssignment] = useState({
    assignedTo: "",
    assignedRole: ""
  });

  const displayName =
    user?.first_name ||
    user?.firstName ||
    user?.name ||
    "DVC";

  const fetchIncidents = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const token = getToken();

      const response = await axios.get(`${API_URL}/incidents`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`
            }
          : {}
      });

      const payload = response.data;

      let data = [];

      if (Array.isArray(payload)) {
        data = payload;
      } else if (Array.isArray(payload?.incidents)) {
        data = payload.incidents;
      } else if (Array.isArray(payload?.data)) {
        data = payload.data;
      } else if (Array.isArray(payload?.data?.incidents)) {
        data = payload.data.incidents;
      }

      setIncidents(data.map(normalizeIncident));
    } catch (err) {
      console.error("Failed to load incidents:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load incidents. Make sure the backend server is running."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { void fetchIncidents(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const statistics = useMemo(() => {
    const total = incidents.length;

    const submitted = incidents.filter(
      (item) => item.status === "Submitted"
    ).length;

    const assigned = incidents.filter(
      (item) => item.status === "Assigned"
    ).length;

    const investigating = incidents.filter(
      (item) =>
        item.status === "Investigating" ||
        item.status === "Under Review" ||
        item.status === "Action Taken"
    ).length;

    const resolved = incidents.filter(
      (item) =>
        item.status === "Resolved" ||
        item.status === "Closed"
    ).length;

    const highPriority = incidents.filter(
      (item) =>
        String(item.priority).toLowerCase() === "high" ||
        String(item.priority).toLowerCase() === "critical"
    ).length;

    return {
      total,
      submitted,
      assigned,
      investigating,
      resolved,
      highPriority
    };
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const matchesSearch =
        !keyword ||
        incident.incident_id?.toLowerCase().includes(keyword) ||
        incident.title?.toLowerCase().includes(keyword) ||
        incident.category?.toLowerCase().includes(keyword) ||
        incident.location?.toLowerCase().includes(keyword) ||
        incident.first_name?.toLowerCase().includes(keyword) ||
        incident.last_name?.toLowerCase().includes(keyword);

      const matchesCategory =
        categoryFilter === "All" ||
        incident.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All" ||
        formatStatus(incident.status) === formatStatus(statusFilter);

      const matchesPriority =
        priorityFilter === "All" ||
        String(incident.priority).toLowerCase() ===
          priorityFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    incidents,
    search,
    categoryFilter,
    statusFilter,
    priorityFilter
  ]);

  const openIncident = (incident) => {
    setSelectedIncident(incident);

    setAssignment({
      assignedTo: incident.assigned_to || "",
      assignedRole: incident.assigned_role || ""
    });

    setSuccess("");
    setError("");
  };

  const closeIncident = () => {
    if (submitting) return;

    setSelectedIncident(null);

    setAssignment({
      assignedTo: "",
      assignedRole: ""
    });
  };

  const dismissIncidentModal = () => {
    setSelectedIncident(null);
    setAssignment({
      assignedTo: "",
      assignedRole: ""
    });
  };

  const assignIncident = async () => {
    if (!selectedIncident) return;

    if (!assignment.assignedRole) {
      setError("Select an administrative role.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const token = getToken();

      await axios.post(
        `${API_URL}/incidents/${selectedIncident.incident_id || selectedIncident.id}/assign`,
        {
          assigned_role: assignment.assignedRole,
          assignment_note: `Assigned to ${assignment.assignedRole}`
        },
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`
              }
            : {}
        }
      );

      dismissIncidentModal();
      setSuccess("Incident assigned successfully.");
      window.setTimeout(() => setSuccess(""), 4000);

      await fetchIncidents(true);
    } catch (err) {
      console.error("Assignment failed:", err);

      setError(
        err?.response?.data?.message ||
          "Assignment failed. Check the backend assignment endpoint."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (status) => {
    if (!selectedIncident) return;

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const token = getToken();

      await axios.patch(
        `${API_URL}/incidents/${
          selectedIncident.incident_id || selectedIncident.id
        }/status`,
        {
          new_status: status,
          comment: "Status updated by DVC"
        },
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`
              }
            : {}
        }
      );

      setSuccess("Incident status updated successfully.");

      await fetchIncidents(true);

      setSelectedIncident((previous) =>
        previous
          ? {
              ...previous,
              status
            }
          : previous
      );
    } catch (err) {
      console.error("Status update failed:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to update incident status."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("jwt");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");

    window.location.href = "/login";
  };

  return (
    <Layout user={user} onLogout={onLogout} onNavigate={onNavigate}>
      <div className="dvc-dashboard">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .dvc-dashboard {
          min-height: 100vh;
          background: #f5f7fb;
          color: #172033;
          font-family: Inter, Arial, Helvetica, sans-serif;
        }

        .dvc-header {
          height: 72px;
          background: #ffffff;
          border-bottom: 1px solid #e5e9f2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-icon {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #172554;
          color: white;
        }

        .brand-title {
          font-weight: 800;
          font-size: 17px;
        }

        .brand-subtitle {
          color: #697386;
          font-size: 12px;
          margin-top: 2px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .role-badge {
          background: #eef2ff;
          color: #3730a3;
          border: 1px solid #dfe3ff;
          padding: 7px 11px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }

        .user-name {
          font-size: 14px;
          font-weight: 700;
        }

        .logout-btn,
        .mobile-menu-btn {
          border: 1px solid #e2e7f0;
          background: white;
          cursor: pointer;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logout-btn {
          width: 38px;
          height: 38px;
        }

        .mobile-menu-btn {
          display: none;
          width: 40px;
          height: 40px;
        }

        .layout {
          display: flex;
          min-height: calc(100vh - 72px);
        }

        .sidebar {
          width: 245px;
          background: #111827;
          color: white;
          padding: 25px 15px;
        }

        .sidebar-title {
          font-size: 11px;
          color: #9ca3af;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
          padding: 0 12px 12px;
        }

        .sidebar-item {
          width: 100%;
          border: none;
          background: transparent;
          color: #d1d5db;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 12px;
          border-radius: 9px;
          margin-bottom: 4px;
          cursor: pointer;
          text-align: left;
          font-size: 13px;
        }

        .sidebar-item.active,
        .sidebar-item:hover {
          background: #1f2937;
          color: white;
        }

        .main {
          flex: 1;
          padding: 28px;
          min-width: 0;
        }

        .page-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 25px;
        }

        .page-heading h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 800;
        }

        .page-heading p {
          margin: 7px 0 0;
          color: #697386;
          font-size: 14px;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #172554;
          color: white;
          border: none;
          border-radius: 9px;
          padding: 11px 15px;
          cursor: pointer;
          font-weight: 700;
        }

        .refresh-btn:disabled {
          opacity: .65;
          cursor: not-allowed;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e7ebf2;
          border-radius: 13px;
          padding: 18px;
          box-shadow: 0 2px 7px rgba(15, 23, 42, .03);
        }

        .stat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #697386;
          font-size: 12px;
          font-weight: 700;
        }

        .stat-number {
          margin-top: 12px;
          font-size: 27px;
          font-weight: 800;
        }

        .stat-icon {
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f1f5f9;
        }

        .toolbar {
          background: white;
          border: 1px solid #e7ebf2;
          border-radius: 13px;
          padding: 15px;
          margin-bottom: 18px;
          display: grid;
          grid-template-columns: minmax(200px, 1fr) repeat(3, 170px);
          gap: 10px;
        }

        .search-box {
          position: relative;
        }

        .search-box svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9aa3b2;
        }

        .search-box input,
        .toolbar select {
          width: 100%;
          height: 42px;
          border: 1px solid #dfe4ec;
          border-radius: 8px;
          padding: 0 12px;
          background: white;
          outline: none;
          font-size: 13px;
        }

        .search-box input {
          padding-left: 38px;
        }

        .search-box input:focus,
        .toolbar select:focus {
          border-color: #4f46e5;
        }

        .table-card {
          background: white;
          border: 1px solid #e7ebf2;
          border-radius: 13px;
          overflow: hidden;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 17px 19px;
          border-bottom: 1px solid #e7ebf2;
        }

        .table-title {
          font-weight: 800;
          font-size: 15px;
        }

        .table-count {
          font-size: 12px;
          color: #697386;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        th {
          text-align: left;
          background: #fafbfc;
          color: #697386;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .05em;
          padding: 13px 15px;
          white-space: nowrap;
        }

        td {
          padding: 15px;
          border-top: 1px solid #edf0f5;
          font-size: 13px;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #fafcff;
        }

        .incident-id {
          font-weight: 800;
          color: #1e3a8a;
        }

        .incident-title {
          font-weight: 700;
          max-width: 220px;
        }

        .muted {
          color: #7a8494;
          font-size: 12px;
        }

        .status,
        .priority {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-success {
          color: #166534;
          background: #dcfce7;
        }

        .status-danger {
          color: #991b1b;
          background: #fee2e2;
        }

        .status-warning {
          color: #92400e;
          background: #fef3c7;
        }

        .status-info {
          color: #1e40af;
          background: #dbeafe;
        }

        .status-neutral {
          color: #475569;
          background: #e2e8f0;
        }

        .priority-high {
          color: #991b1b;
          background: #fee2e2;
        }

        .priority-medium {
          color: #92400e;
          background: #fef3c7;
        }

        .priority-low {
          color: #166534;
          background: #dcfce7;
        }

        .view-btn {
          border: 1px solid #dbe1eb;
          background: white;
          color: #1e3a8a;
          border-radius: 7px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .view-btn:hover {
          background: #f1f5ff;
        }

        .empty-state,
        .loading-state {
          min-height: 220px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 9px;
          color: #697386;
        }

        .empty-state svg,
        .loading-state svg {
          color: #94a3b8;
        }

        .alert {
          padding: 12px 15px;
          border-radius: 9px;
          margin-bottom: 18px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .alert-success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, .58);
          z-index: 100;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .modal {
          width: min(850px, 100%);
          max-height: 92vh;
          overflow-y: auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 80px rgba(0,0,0,.25);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 21px;
          border-bottom: 1px solid #e7ebf2;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 19px;
        }

        .modal-header p {
          margin: 5px 0 0;
          color: #697386;
          font-size: 12px;
        }

        .close-btn {
          width: 35px;
          height: 35px;
          border: none;
          background: #f1f5f9;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-body {
          padding: 21px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .detail-item {
          border: 1px solid #e8ebf1;
          border-radius: 9px;
          padding: 13px;
        }

        .detail-label {
          color: #7a8494;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .detail-value {
          font-size: 13px;
          font-weight: 600;
          line-height: 1.5;
          word-break: break-word;
        }

        .description-box {
          border: 1px solid #e8ebf1;
          border-radius: 9px;
          padding: 15px;
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .assignment-panel {
          background: #f8fafc;
          border: 1px solid #e5eaf1;
          border-radius: 11px;
          padding: 16px;
          margin-bottom: 18px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-group label {
          display: block;
          font-size: 11px;
          font-weight: 800;
          color: #596579;
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          height: 42px;
          border: 1px solid #d9dfe9;
          border-radius: 8px;
          padding: 0 11px;
          background: white;
          outline: none;
        }

        .primary-btn {
          margin-top: 12px;
          border: none;
          background: #172554;
          color: white;
          border-radius: 8px;
          padding: 10px 14px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .primary-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .status-panel {
          border-top: 1px solid #e7ebf2;
          padding-top: 18px;
        }

        .status-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .status-btn {
          border: 1px solid #dbe1eb;
          background: white;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
        }

        .status-btn:hover {
          border-color: #6366f1;
          color: #4338ca;
        }

        .status-btn.current {
          background: #172554;
          color: white;
          border-color: #172554;
        }

        .mobile-sidebar {
          display: none;
        }

        @media (max-width: 1250px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .toolbar {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 900px) {
          .sidebar {
            display: none;
          }

          .mobile-menu-btn {
            display: flex;
          }

          .header-right .user-name,
          .header-right .role-badge {
            display: none;
          }

          .main {
            padding: 18px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .toolbar {
            grid-template-columns: 1fr;
          }

          .mobile-sidebar {
            display: block;
            position: fixed;
            top: 72px;
            left: 0;
            width: 250px;
            bottom: 0;
            z-index: 60;
            background: #111827;
            padding: 20px 15px;
            box-shadow: 10px 0 30px rgba(0,0,0,.15);
          }
        }

        @media (max-width: 600px) {
          .dvc-header {
            padding: 0 15px;
          }

          .brand-title {
            font-size: 14px;
          }

          .brand-subtitle {
            font-size: 10px;
          }

          .page-heading {
            flex-direction: column;
          }

          .page-heading h1 {
            font-size: 22px;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .stat-card {
            padding: 13px;
          }

          .stat-number {
            font-size: 22px;
          }

          .detail-grid,
          .form-grid {
            grid-template-columns: 1fr;
          }

          .modal-backdrop {
            padding: 8px;
          }

          .modal {
            max-height: 96vh;
            border-radius: 12px;
          }

          .modal-body,
          .modal-header {
            padding: 15px;
          }
        }

        /* The shared Layout supplies the primary navigation. Keep this page focused on case work. */
        .dvc-dashboard {
          min-height: auto;
          margin: -28px;
          padding: 28px;
          background: linear-gradient(135deg, #f8fafc 0%, #eef6ff 52%, #effcf8 100%);
        }

        .dvc-dashboard > .dvc-header,
        .dvc-dashboard > .mobile-sidebar,
        .dvc-dashboard .layout > .sidebar {
          display: none;
        }

        .dvc-dashboard .layout,
        .dvc-dashboard .main {
          width: 100%;
          margin: 0;
          padding: 0;
        }

        .dvc-dashboard .page-heading {
          padding: 30px 34px;
          border: 1px solid #c7d2fe;
          border-radius: 18px;
          background: linear-gradient(115deg, #172554 0%, #155e75 56%, #0f766e 100%);
          box-shadow: 0 18px 38px rgba(15, 23, 42, .16);
        }

        .dvc-dashboard .page-heading h1,
        .dvc-dashboard .page-heading p {
          color: #ffffff;
        }

        .dvc-dashboard .page-heading p { opacity: .82; }

        .dvc-dashboard .refresh-btn {
          border: 1px solid rgba(255,255,255,.35);
          background: #ffffff;
          color: #155e75;
          box-shadow: 0 8px 18px rgba(15,23,42,.12);
        }

        .dvc-dashboard .stats-grid { gap: 18px; }

        .dvc-dashboard .stat-card {
          border: 1px solid #dbe5ee;
          border-radius: 14px;
          background: rgba(255,255,255,.92);
          box-shadow: 0 10px 24px rgba(23, 32, 51, .08);
        }

        .dvc-dashboard .stat-card:nth-child(1) { border-top: 4px solid #2563eb; }
        .dvc-dashboard .stat-card:nth-child(2) { border-top: 4px solid #f59e0b; }
        .dvc-dashboard .stat-card:nth-child(3) { border-top: 4px solid #8b5cf6; }
        .dvc-dashboard .stat-card:nth-child(4) { border-top: 4px solid #0e7490; }
        .dvc-dashboard .stat-card:nth-child(5) { border-top: 4px solid #059669; }
        .dvc-dashboard .stat-card:nth-child(6) { border-top: 4px solid #dc2626; }

        .dvc-dashboard .toolbar,
        .dvc-dashboard .table-card {
          border: 1px solid #dbe5ee;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 10px 24px rgba(23, 32, 51, .07);
        }

        .dvc-dashboard .toolbar { padding: 16px; }
        .dvc-dashboard .table-header { background: #ecfeff; }
        .dvc-dashboard .table-header,
        .dvc-dashboard table th { color: #155e75; }
        .dvc-dashboard table th { background: #f0fdfa; }
        .dvc-dashboard table tbody tr:hover { background: #f8fffe; }

        @media (max-width: 600px) {
          .dvc-dashboard { margin: -20px; padding: 20px; }
          .dvc-dashboard .page-heading { padding: 22px; }
        }
      `}</style>

      <header className="dvc-header">
        <div className="brand">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <Menu size={19} />
          </button>

          <div className="brand-icon">
            <ShieldCheck size={22} />
          </div>

          <div>
            <div className="brand-title">
              University Incident System
            </div>

            <div className="brand-subtitle">
              Transparent Incident Reporting & Resolution
            </div>
          </div>
        </div>

        <div className="header-right">
          <span className="role-badge">DVC</span>

          <span className="user-name">
            {displayName}
          </span>

          <button
            className="logout-btn"
            title="Logout"
            onClick={logout}
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {mobileMenu && (
        <div className="mobile-sidebar">
          <div className="sidebar-title">
            DVC Administration
          </div>

          <button className="sidebar-item active">
            <FileText size={17} />
            Incident Management
          </button>

          <button className="sidebar-item">
            <UserCheck size={17} />
            Case Assignment
          </button>

          <button className="sidebar-item">
            <ShieldCheck size={17} />
            Audit Trail
          </button>
        </div>
      )}

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-title">
            DVC Administration
          </div>

          <button className="sidebar-item active">
            <FileText size={17} />
            Incident Management
          </button>

          <button className="sidebar-item">
            <UserCheck size={17} />
            Case Assignment
          </button>

          <button className="sidebar-item">
            <ShieldCheck size={17} />
            Audit Trail
          </button>

          <button className="sidebar-item">
            <Users size={17} />
            Stakeholder Oversight
          </button>
        </aside>

        <main className="main">
          <div className="page-heading">
            <div>
              <h1>DVC Dashboard</h1>

              <p>
                Monitor all reported incidents and assign cases
                to the appropriate university administrative unit.
              </p>
            </div>

            <button
              className="refresh-btn"
              onClick={() => fetchIncidents(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={15}
                className={refreshing ? "spin" : ""}
              />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={17} />
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <CheckCircle2 size={17} />
              {success}
            </div>
          )}

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-top">
                Total Incidents
                <div className="stat-icon">
                  <FileText size={17} />
                </div>
              </div>

              <div className="stat-number">
                {statistics.total}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                Submitted
                <div className="stat-icon">
                  <Clock3 size={17} />
                </div>
              </div>

              <div className="stat-number">
                {statistics.submitted}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                Assigned
                <div className="stat-icon">
                  <UserCheck size={17} />
                </div>
              </div>

              <div className="stat-number">
                {statistics.assigned}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                In Progress
                <div className="stat-icon">
                  <RefreshCw size={17} />
                </div>
              </div>

              <div className="stat-number">
                {statistics.investigating}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                Resolved
                <div className="stat-icon">
                  <CheckCircle2 size={17} />
                </div>
              </div>

              <div className="stat-number">
                {statistics.resolved}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                High Priority
                <div className="stat-icon">
                  <AlertCircle size={17} />
                </div>
              </div>

              <div className="stat-number">
                {statistics.highPriority}
              </div>
            </div>
          </section>

          <section className="toolbar">
            <div className="search-box">
              <Search size={17} />

              <input
                type="text"
                placeholder="Search incident ID, title, category..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value)
              }
            >
              <option value="All">All Categories</option>

              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="All">All Statuses</option>

              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(event.target.value)
              }
            >
              <option value="All">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </section>

          <section className="table-card">
            <div className="table-header">
              <div className="table-title">
                Reported Incidents
              </div>

              <div className="table-count">
                {filteredIncidents.length} case(s)
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <Loader2 size={28} />
                <span>Loading incidents...</span>
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="empty-state">
                <Filter size={30} />
                <strong>No incidents found</strong>
                <span>
                  Try changing your search or filters.
                </span>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Incident</th>
                      <th>Category</th>
                      <th>Reporter</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredIncidents.map((incident) => (
                      <tr key={incident.id || incident.incident_id}>
                        <td>
                          <div className="incident-id">
                            {incident.incident_id}
                          </div>

                          <div className="incident-title">
                            {incident.title}
                          </div>
                        </td>

                        <td>
                            {incident.category_name || incident.category || "Uncategorized"}
                        </td>

                        <td>
                          <div>
                            {incident.first_name ||
                            incident.last_name
                              ? `${incident.first_name} ${incident.last_name}`
                              : "Anonymous"}
                          </div>

                          <div className="muted">
                            {incident.email || "—"}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`priority ${getPriorityClass(
                              incident.priority
                            )}`}
                          >
                            {incident.priority}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`status ${getStatusClass(
                              incident.status
                            )}`}
                          >
                            {incident.status}
                          </span>
                        </td>

                        <td>
                          {incident.assigned_to ? (
                            <>
                              <div>
                                {incident.assigned_to}
                              </div>

                              <div className="muted">
                                {incident.assigned_role || "—"}
                              </div>
                            </>
                          ) : (
                            <span className="muted">
                              Not assigned
                            </span>
                          )}
                        </td>

                        <td>
                          {formatDate(incident.created_at)}
                        </td>

                        <td>
                          <button
                            className="view-btn"
                            onClick={() =>
                              openIncident(incident)
                            }
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {selectedIncident && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeIncident();
            }
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>
                  {selectedIncident.title}
                </h2>

                <p>
                  {selectedIncident.incident_id}
                </p>
              </div>

              <button
                className="close-btn"
                onClick={closeIncident}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">
                    Category
                  </div>

                  <div className="detail-value">
                    {selectedIncident.category}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Priority
                  </div>

                  <div className="detail-value">
                    <span
                      className={`priority ${getPriorityClass(
                        selectedIncident.priority
                      )}`}
                    >
                      {selectedIncident.priority}
                    </span>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Status
                  </div>

                  <div className="detail-value">
                    <span
                      className={`status ${getStatusClass(
                        selectedIncident.status
                      )}`}
                    >
                      {selectedIncident.status}
                    </span>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Incident Date
                  </div>

                  <div className="detail-value">
                    {formatDate(
                      selectedIncident.incident_date
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Location
                  </div>

                  <div className="detail-value">
                    {selectedIncident.location}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">
                    Reporter
                  </div>

                  <div className="detail-value">
                    {selectedIncident.first_name ||
                    selectedIncident.last_name
                      ? `${selectedIncident.first_name} ${selectedIncident.last_name}`
                      : "Anonymous"}
                  </div>
                </div>
              </div>

              <div className="description-box">
                <div className="detail-label">
                  Incident Description
                </div>

                <div className="detail-value">
                  {selectedIncident.description ||
                    "No description provided."}
                </div>
              </div>

              {selectedIncident.evidence_cid && (
                <div className="description-box">
                  <div className="detail-label">
                    IPFS Evidence CID
                  </div>

                  <div className="detail-value">
                    {selectedIncident.evidence_cid}
                  </div>
                </div>
              )}

              <div className="assignment-panel">
                <div className="section-title">
                  Assign Case
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      Administrative Role
                    </label>

                    <select
                      value={assignment.assignedRole}
                      onChange={(event) =>
                        setAssignment({
                          ...assignment,
                          assignedRole: event.target.value
                        })
                      }
                    >
                      <option value="">
                        Select administrative role
                      </option>

                      {ASSIGNABLE_ROLES.map((role) => (
                        <option
                          key={role.value}
                          value={role.value}
                        >
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  className="primary-btn"
                  onClick={assignIncident}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 size={15} />
                  ) : (
                    <UserCheck size={15} />
                  )}

                  Assign Incident
                </button>
              </div>

              <div className="status-panel">
                <div className="section-title">
                  Update Case Status
                </div>

                <div className="status-buttons">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      className={`status-btn ${
                        selectedIncident.status === status
                          ? "current"
                          : ""
                      }`}
                      disabled={submitting}
                      onClick={() =>
                        updateStatus(status)
                      }
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}