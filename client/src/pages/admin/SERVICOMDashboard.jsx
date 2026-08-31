// src/pages/admin/SERVICOMDashboard.jsx

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Layout from "../../components/Layout";
import {
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Filter,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  "Under Investigation": "bg-blue-50 text-blue-700 border-blue-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Closed: "bg-slate-100 text-slate-600 border-slate-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
};

const PRIORITY_STYLES = {
  High: "text-red-600 bg-red-50",
  Medium: "text-orange-600 bg-orange-50",
  Low: "text-emerald-600 bg-emerald-50",
};

const FALLBACK_INCIDENTS = [];

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeStatus(status) {
  if (!status) return "Submitted";

  const value = String(status).toLowerCase().replace(/_/g, " ");

  if (value.includes("under review")) return "Under Review";
  if (value.includes("action taken")) return "Action Taken";
  if (value.includes("investig")) return "Investigating";
  if (value.includes("assign")) return "Assigned";
  if (value.includes("submit")) return "Submitted";
  if (value.includes("pending")) return "Pending";
  if (value.includes("resolv")) return "Resolved";
  if (value.includes("clos")) return "Closed";
  if (value.includes("reject")) return "Rejected";

  return "Submitted";
}

function normalizeIncident(item) {
  return {
    id: item.id,
    incidentId:
      item.incident_id ||
      item.incidentId ||
      item.reference ||
      `INC-${item.id || "—"}`,
    title: item.title || item.subject || "Untitled Incident",
    category: item.category || item.incident_category || "General",
    description: item.description || "",
    location: item.incident_location || item.location || "Not specified",
    date: item.incident_date || item.date || item.created_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    priority: item.priority || "Medium",
    status: normalizeStatus(item.status),
    anonymity:
      item.anonymity === true ||
      item.anonymity === "true" ||
      item.is_anonymous === true,
    reporter:
      item.anonymous === true || item.is_anonymous === true
        ? "Anonymous Reporter"
        : [item.first_name, item.last_name].filter(Boolean).join(" ") ||
          item.reporter_name ||
          "Reporter",
    raw: item,
  };
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] || STATUS_STYLES.Pending
      }`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span
      className={`rounded-md px-2 py-1 text-[11px] font-bold ${
        PRIORITY_STYLES[priority] || PRIORITY_STYLES.Medium
      }`}
    >
      {priority}
    </span>
  );
}

export default function SERVICOMDashboard() {
  const user = getStoredUser();

  const [incidents, setIncidents] = useState(FALLBACK_INCIDENTS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [advisoryText, setAdvisoryText] = useState("");
  const [submittingAdvisory, setSubmittingAdvisory] = useState(false);
  const [message, setMessage] = useState("");

  const fetchIncidents = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const token = getToken();

      const response = await api.get("/incidents", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const payload = response.data;

      const data = Array.isArray(payload)
        ? payload
        : payload?.incidents ||
          payload?.data ||
          payload?.results ||
          [];

      setIncidents(data.map(normalizeIncident));
    } catch (err) {
      console.error("SERVICOM incident fetch error:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load incidents from the server."
      );

      setIncidents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => { void fetchIncidents(); });
  }, []);

  const statistics = useMemo(() => {
    const total = incidents.length;

    const pending = incidents.filter(
      (incident) => ["Submitted", "Pending"].includes(incident.status)
    ).length;

    const investigating = incidents.filter(
      (incident) => ["Assigned", "Under Review", "Investigating", "Action Taken"].includes(incident.status)
    ).length;

    const resolved = incidents.filter(
      (incident) =>
        incident.status === "Resolved" || incident.status === "Closed"
    ).length;

    const highPriority = incidents.filter(
      (incident) => incident.priority === "High"
    ).length;

    return {
      total,
      pending,
      investigating,
      resolved,
      highPriority,
    };
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const matchesSearch =
        !query ||
        incident.incidentId.toLowerCase().includes(query) ||
        incident.title.toLowerCase().includes(query) ||
        incident.category.toLowerCase().includes(query) ||
        incident.location.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || incident.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || incident.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [incidents, search, statusFilter, priorityFilter]);

  const categoryData = useMemo(() => {
    const map = {};

    incidents.forEach((incident) => {
      map[incident.category] = (map[incident.category] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [incidents]);

  const statusData = useMemo(() => {
    const statuses = [
      "Pending",
      "Under Investigation",
      "Resolved",
      "Closed",
      "Rejected",
    ];

    return statuses.map((status) => ({
      name: status,
      value: incidents.filter((item) => item.status === status).length,
    }));
  }, [incidents]);

  const handleAdvisorySubmit = async () => {
    if (!selectedIncident || !advisoryText.trim()) return;

    setSubmittingAdvisory(true);
    setMessage("");

    try {
      const token = getToken();

      await api.post(
        "/advisories",
        {
          incident_id: selectedIncident.id,
          incidentId: selectedIncident.incidentId,
          advisory: advisoryText.trim(),
          comment: advisoryText.trim(),
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      setAdvisoryText("");
      setMessage("Advisory submitted successfully.");
    } catch (err) {
      console.error("Advisory submission error:", err);

      setMessage(
        err?.response?.data?.message ||
          "Unable to submit advisory. Please try again."
      );
    } finally {
      setSubmittingAdvisory(false);
    }
  };

  const userName =
    user?.first_name ||
    user?.firstName ||
    user?.name?.split(" ")?.[0] ||
    "SERVICOM";

  return (
    <Layout>
      <div className="min-h-screen bg-[#F5F7FB] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          {/* Header */}
          <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#123C69] via-[#174D85] to-[#2563EB] shadow-lg">
            <div className="relative px-6 py-7 sm:px-8 lg:px-10">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

              <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                    <ShieldCheck size={14} />
                    SERVICOM • Advisory & Oversight
                  </div>

                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Welcome back, {userName}
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                    Monitor reported incidents, review institutional service
                    concerns, and provide advisory input without altering
                    investigation assignments.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fetchIncidents(true)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      size={17}
                      className={refreshing ? "animate-spin" : ""}
                    />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 shrink-0" size={19} />
              <div>
                <p className="font-semibold">Connection notice</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Statistics */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Total Incidents"
              value={statistics.total}
              description="All visible reports"
              icon={FileText}
              iconClass="bg-blue-50 text-blue-600"
              onClick={() => {
                setStatusFilter("All");
                setPriorityFilter("All");
              }}
            />

            <StatCard
              title="Pending"
              value={statistics.pending}
              description="Awaiting action"
              icon={Clock3}
              iconClass="bg-amber-50 text-amber-600"
              onClick={() => setStatusFilter("Pending")}
            />

            <StatCard
              title="Investigating"
              value={statistics.investigating}
              description="Currently being handled"
              icon={Search}
              iconClass="bg-indigo-50 text-indigo-600"
              onClick={() => setStatusFilter("Under Investigation")}
            />

            <StatCard
              title="Resolved"
              value={statistics.resolved}
              description="Resolved or closed"
              icon={CheckCircle2}
              iconClass="bg-emerald-50 text-emerald-600"
              onClick={() => setStatusFilter("Resolved")}
            />

            <StatCard
              title="High Priority"
              value={statistics.highPriority}
              description="Requires attention"
              icon={AlertCircle}
              iconClass="bg-red-50 text-red-600"
              onClick={() => setPriorityFilter("High")}
            />
          </section>

          {/* Analytics */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Incident Categories
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Distribution across reported incidents
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  <BarChart3 size={19} />
                </div>
              </div>

              <div className="h-[270px]">
                {categoryData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        name="Incidents"
                        radius={[6, 6, 0, 0]}
                        fill="#2563EB"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No incident data available
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Resolution Overview
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Current incident status distribution
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                  <CheckCircle2 size={19} />
                </div>
              </div>

              <div className="flex h-[270px] items-center">
                {incidents.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData.filter((item) => item.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={92}
                        paddingAngle={3}
                      >
                        {statusData
                          .filter((item) => item.value > 0)
                          .map((entry, index) => (
                            <Cell
                              key={`${entry.name}-${index}`}
                              fill={
                                [
                                  "#F59E0B",
                                  "#2563EB",
                                  "#10B981",
                                  "#64748B",
                                  "#EF4444",
                                ][index % 5]
                              }
                            />
                          ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                    No status data available
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Incidents */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText size={19} className="text-blue-600" />
                    <h2 className="font-bold text-slate-900">
                      Incident Reports
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Review all reports and provide advisory input where
                    appropriate.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search incidents..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:w-64"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFilters((value) => !value)}
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                      showFilters
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Filter size={16} />
                    Filters
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="All">All statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Under Investigation">
                      Under Investigation
                    </option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="All">All priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("All");
                      setPriorityFilter("All");
                    }}
                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Incident</th>
                    <th className="px-4 py-4">Category</th>
                    <th className="px-4 py-4">Reporter</th>
                    <th className="px-4 py-4">Priority</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td colSpan={7} className="px-6 py-5">
                          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  ) : filteredIncidents.length ? (
                    filteredIncidents.slice(0, 15).map((incident) => (
                      <tr
                        key={incident.id || incident.incidentId}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {incident.title}
                            </p>
                            <p className="mt-1 text-xs font-medium text-blue-600">
                              {incident.incidentId}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {incident.category}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                              <Users size={14} />
                            </div>
                            <span className="max-w-[160px] truncate text-sm text-slate-600">
                              {incident.reporter}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <PriorityBadge priority={incident.priority} />
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={incident.status} />
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-500">
                          {formatDate(incident.date)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIncident(incident);
                              setMessage("");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye size={15} />
                            Review
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <FileText size={22} />
                        </div>
                        <p className="mt-3 font-semibold text-slate-700">
                          No incidents found
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          Try changing your search or filter criteria.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(filteredIncidents.length, 15)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {filteredIncidents.length}
                </span>{" "}
                matching incidents
              </p>
            </div>
          </section>

          {/* Advisory information */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 lg:col-span-2">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <MessageSquareText size={20} />
                </div>

                <div>
                  <h3 className="font-bold text-blue-950">
                    SERVICOM Advisory Role
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-blue-800">
                    SERVICOM can review incidents and submit advisory
                    observations. Advisory input does not assign, reassign,
                    resolve, or close an incident.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Access Level
                  </p>
                  <p className="font-bold text-slate-900">
                    Advisory Observer
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Review Modal */}
        {selectedIncident && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedIncident(null);
              }
            }}
          >
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      {selectedIncident.incidentId}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      {selectedIncident.title}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedIncident(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="space-y-6 px-6 py-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Category
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {selectedIncident.category}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Priority
                    </p>
                    <div className="mt-1">
                      <PriorityBadge
                        priority={selectedIncident.priority}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Status
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={selectedIncident.status} />
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Date
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatDate(selectedIncident.date)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {selectedIncident.location}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Reporter
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {selectedIncident.reporter}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Incident Description
                  </p>
                  <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedIncident.description || "No description provided."}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageSquareText size={18} className="text-blue-600" />
                    <h3 className="font-bold text-slate-900">
                      Submit Advisory
                    </h3>
                  </div>

                  <textarea
                    value={advisoryText}
                    onChange={(e) => setAdvisoryText(e.target.value)}
                    rows={5}
                    placeholder="Enter your advisory observation or recommendation..."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />

                  {message && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {message}
                    </div>
                  )}

                  <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedIncident(null)}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      onClick={handleAdvisorySubmit}
                      disabled={
                        submittingAdvisory || !advisoryText.trim()
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#123C69] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0d3157] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingAdvisory ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Bell size={16} />
                          Submit Advisory
                        </>
                      )}
                    </button>
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