import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Filter,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  XCircle,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const STATUS_LABELS = {
  submitted: "Submitted",
  pending: "Pending",
  assigned: "Assigned",
  under_investigation: "Under Investigation",
  investigating: "Under Investigation",
  resolved: "Resolved",
  closed: "Closed",
  rejected: "Rejected",
};

const STATUS_CLASSES = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  assigned: "bg-purple-50 text-purple-700 border-purple-200",
  under_investigation: "bg-indigo-50 text-indigo-700 border-indigo-200",
  investigating: "bg-indigo-50 text-indigo-700 border-indigo-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-700 border-slate-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function normalizeStatus(status) {
  return String(status || "submitted")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function formatStatus(status) {
  const normalized = normalizeStatus(status);

  if (STATUS_LABELS[normalized]) {
    return STATUS_LABELS[normalized];
  }

  return String(status || "Submitted")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPriorityClass(priority) {
  const value = String(priority || "").toLowerCase();

  if (value === "critical") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (value === "high") {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }

  if (value === "medium") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-slate-100 text-slate-600 border-slate-200";
}

function getAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt")
  );
}

function getStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user") ||
        localStorage.getItem("currentUser") ||
        "{}"
    );
  } catch {
    return {};
  }
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <FileText size={22} />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-700">
        No incidents found
      </p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function VCDashboard() {
  const storedUser = useMemo(() => getStoredUser(), []);

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const userName =
    storedUser?.first_name ||
    storedUser?.firstName ||
    storedUser?.name ||
    "Vice Chancellor";

  const userRole =
    storedUser?.role_name ||
    storedUser?.role ||
    "Vice Chancellor";

  const api = useMemo(() => {
    const token = getAuthToken();

    return axios.create({
      baseURL: API_BASE_URL,
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });
  }, []);

  const loadIncidents = async (showRefresh = false) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get("/incidents");

      const payload = response?.data;

      let records = [];

      if (Array.isArray(payload)) {
        records = payload;
      } else if (Array.isArray(payload?.incidents)) {
        records = payload.incidents;
      } else if (Array.isArray(payload?.data)) {
        records = payload.data;
      } else if (Array.isArray(payload?.data?.incidents)) {
        records = payload.data.incidents;
      }

      setIncidents(records);
      setLastUpdated(new Date());
    } catch (requestError) {
      console.error("Failed to load incidents:", requestError);

      const serverMessage =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error;

      setError(
        serverMessage ||
          "Unable to load incident records. Confirm that the backend server is running."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const statistics = useMemo(() => {
    const total = incidents.length;

    const pending = incidents.filter((incident) =>
      ["submitted", "pending"].includes(normalizeStatus(incident.status))
    ).length;

    const investigation = incidents.filter((incident) =>
      ["assigned", "under_investigation", "investigating"].includes(
        normalizeStatus(incident.status)
      )
    ).length;

    const resolved = incidents.filter((incident) =>
      ["resolved", "closed"].includes(normalizeStatus(incident.status))
    ).length;

    const critical = incidents.filter(
      (incident) =>
        String(incident.priority || "").toLowerCase() === "critical"
    ).length;

    return {
      total,
      pending,
      investigation,
      resolved,
      critical,
    };
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...incidents]
      .filter((incident) => {
        if (statusFilter === "all") return true;
        return normalizeStatus(incident.status) === statusFilter;
      })
      .filter((incident) => {
        if (priorityFilter === "all") return true;

        return (
          String(incident.priority || "").toLowerCase() ===
          priorityFilter.toLowerCase()
        );
      })
      .filter((incident) => {
        if (!query) return true;

        const searchable = [
          incident.incident_id,
          incident.title,
          incident.category,
          incident.description,
          incident.incident_location,
          incident.status,
          incident.priority,
          incident.first_name,
          incident.last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => {
        const first = new Date(a.created_at || 0).getTime();
        const second = new Date(b.created_at || 0).getTime();

        return second - first;
      });
  }, [incidents, search, statusFilter, priorityFilter]);

  const statusDistribution = useMemo(() => {
    const distribution = {};

    incidents.forEach((incident) => {
      const status = normalizeStatus(incident.status);
      distribution[status] = (distribution[status] || 0) + 1;
    });

    return Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  }, [incidents]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");

    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenu(!mobileMenu)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              {mobileMenu ? <X size={21} /> : <Menu size={21} />}
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <ShieldCheck size={21} />
            </div>

            <div>
              <h1 className="text-sm font-bold text-slate-900 sm:text-base">
                University Incident System
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Executive Oversight Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {statistics.critical > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {userName}
              </p>
              <p className="text-xs text-slate-500">{userRole}</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            <p className="text-sm font-semibold text-slate-800">{userName}</p>
            <p className="mt-1 text-xs text-slate-500">{userRole}</p>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Activity size={15} />
              Executive oversight
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Vice Chancellor Dashboard
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Monitor institutional incident activity, resolution progress,
              critical cases and system-wide accountability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lastUpdated && (
              <span className="mr-1 text-xs text-slate-500">
                Updated {formatDateTime(lastUpdated)}
              </span>
            )}

            <button
              type="button"
              onClick={() => loadIncidents(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={19} />
            <div>
              <p className="text-sm font-semibold">Unable to load data</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total Incidents"
            value={statistics.total}
            description="All recorded reports"
            icon={FileText}
            iconClassName="bg-blue-50 text-blue-700"
          />

          <StatCard
            title="Pending Review"
            value={statistics.pending}
            description="Awaiting administrative action"
            icon={Clock3}
            iconClassName="bg-amber-50 text-amber-700"
          />

          <StatCard
            title="Under Investigation"
            value={statistics.investigation}
            description="Active investigation cases"
            icon={Activity}
            iconClassName="bg-indigo-50 text-indigo-700"
          />

          <StatCard
            title="Resolved"
            value={statistics.resolved}
            description="Resolved or closed cases"
            icon={CheckCircle2}
            iconClassName="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            title="Critical Cases"
            value={statistics.critical}
            description="Requires executive attention"
            icon={AlertCircle}
            iconClassName="bg-red-50 text-red-700"
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Incident Register
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Institutional-wide incident records available for
                    oversight.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="relative min-w-[220px]">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search incidents..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div className="relative">
                    <Filter
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="all">All Statuses</option>
                      <option value="submitted">Submitted</option>
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="under_investigation">
                        Under Investigation
                      </option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <select
                    value={priorityFilter}
                    onChange={(event) =>
                      setPriorityFilter(event.target.value)
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <RefreshCw size={18} className="animate-spin" />
                  Loading incident records...
                </div>
              </div>
            ) : filteredIncidents.length === 0 ? (
              <EmptyState message="There are no incident records matching the current filters." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Incident
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Category
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Priority
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Date
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredIncidents.map((incident) => {
                      const status = normalizeStatus(incident.status);

                      return (
                        <tr
                          key={
                            incident.id ||
                            incident.incident_id ||
                            `${incident.title}-${incident.created_at}`
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="max-w-[250px]">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {incident.title || "Untitled Incident"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {incident.incident_id ||
                                  `INC-${incident.id || "N/A"}`}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {incident.category || "Uncategorized"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getPriorityClass(
                                incident.priority
                              )}`}
                            >
                              {incident.priority || "Normal"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                STATUS_CLASSES[status] ||
                                "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {formatStatus(incident.status)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                            {formatDate(incident.created_at)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedIncident(incident)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                            >
                              <Eye size={15} />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Case Distribution
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Current incident status overview
                  </p>
                </div>
                <BarChart3 size={19} className="text-slate-400" />
              </div>

              <div className="mt-5 space-y-4">
                {statusDistribution.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No distribution data available.
                  </p>
                ) : (
                  statusDistribution.map(([status, count]) => {
                    const percentage =
                      statistics.total > 0
                        ? Math.round((count / statistics.total) * 100)
                        : 0;

                    return (
                      <div key={status}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-slate-600">
                            {formatStatus(status)}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {count}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-800 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <TrendingUp size={19} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Oversight Summary
                  </h3>
                  <p className="text-xs text-slate-500">
                    Institutional performance
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">
                    Resolution rate
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {statistics.total
                      ? `${Math.round(
                          (statistics.resolved / statistics.total) * 100
                        )}%`
                      : "0%"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">
                    Active investigations
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {statistics.investigation}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3">
                  <span className="text-sm text-red-700">
                    Critical attention
                  </span>
                  <span className="text-sm font-bold text-red-800">
                    {statistics.critical}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <Users size={19} />
                <h3 className="text-sm font-bold">
                  Executive Access
                </h3>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-300">
                This dashboard provides oversight visibility. Operational
                assignments and investigative actions remain with the
                designated administrative units.
              </p>
            </div>
          </div>
        </section>
      </main>

      {selectedIncident && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedIncident(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Incident Record
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedIncident.title || "Untitled Incident"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedIncident.incident_id ||
                    `INC-${selectedIncident.id || "N/A"}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close incident details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Category
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedIncident.category || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Priority
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getPriorityClass(
                    selectedIncident.priority
                  )}`}
                >
                  {selectedIncident.priority || "Normal"}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatStatus(selectedIncident.status)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Incident Date
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(selectedIncident.incident_date)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Location
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedIncident.incident_location || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Reported
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDateTime(selectedIncident.created_at)}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Description
                </p>
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {selectedIncident.description ||
                      "No description was provided."}
                  </p>
                </div>
              </div>

              {(selectedIncident.blockchain_hash ||
                selectedIncident.blockchain_tx_id) && (
                <div className="sm:col-span-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <ShieldCheck size={17} />
                      <p className="text-sm font-bold">
                        Blockchain Verification
                      </p>
                    </div>

                    {selectedIncident.blockchain_hash && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-emerald-700">
                          Transaction Hash
                        </p>
                        <p className="mt-1 break-all font-mono text-xs text-emerald-900">
                          {selectedIncident.blockchain_hash}
                        </p>
                      </div>
                    )}

                    {selectedIncident.blockchain_tx_id && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-emerald-700">
                          Transaction ID
                        </p>
                        <p className="mt-1 break-all font-mono text-xs text-emerald-900">
                          {selectedIncident.blockchain_tx_id}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}