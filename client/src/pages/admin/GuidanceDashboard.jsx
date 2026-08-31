// src/pages/admin/GuidanceDashboard.jsx

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Layout from "../../components/Layout";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Filter,
  HeartHandshake,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

const statusStyles = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  "Under Investigation": "bg-blue-50 text-blue-700 border-blue-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Closed: "bg-slate-100 text-slate-600 border-slate-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
};

function getUser() {
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

function normalizeStatus(value) {
  const v = String(value || "").toLowerCase();

  if (v.includes("under review")) return "Under Review";
  if (v.includes("action taken")) return "Action Taken";
  if (v.includes("assign")) return "Assigned";
  if (v.includes("investig")) return "Investigating";
  if (v.includes("submit")) return "Submitted";
  if (v.includes("resolv")) return "Resolved";
  if (v.includes("clos")) return "Closed";
  if (v.includes("reject")) return "Rejected";

  return "Submitted";
}

function normalize(item) {
  return {
    id: item.id,
    incidentId: item.incident_id || item.incidentId || `INC-${item.id}`,
    title: item.title || "Untitled Incident",
    category: item.category || item.incident_category || "General",
    description: item.description || "",
    location: item.incident_location || item.location || "Not specified",
    date: item.incident_date || item.created_at,
    status: normalizeStatus(item.status),
    priority: item.priority || "Medium",
    reporter:
      item.anonymous === true || item.is_anonymous === true
        ? "Anonymous Reporter"
        : [item.first_name, item.last_name].filter(Boolean).join(" ") ||
          item.reporter_name ||
          "Reporter",
  };
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

function StatCard({ title, value, description, icon: Icon, className }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div className={`rounded-xl p-3 ${className}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ value }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
        statusStyles[value] || statusStyles.Pending
      }`}
    >
      {value}
    </span>
  );
}

export default function GuidanceDashboard() {
  const user = getUser();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchIncidents = async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const response = await api.get("/incidents", {
        headers: getToken()
          ? { Authorization: `Bearer ${getToken()}` }
          : {},
      });

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.incidents ||
          response.data?.data ||
          response.data?.results ||
          [];

      setIncidents(data.map(normalize));
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Unable to retrieve incident information."
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

  const stats = useMemo(() => {
    const active = incidents.filter(
      (x) =>
        ["Submitted", "Pending", "Assigned", "Under Review", "Investigating", "Action Taken"].includes(x.status)
    ).length;

    const resolved = incidents.filter(
      (x) => x.status === "Resolved" || x.status === "Closed"
    ).length;

    const sensitive = incidents.filter((x) =>
      ["Harassment", "Bullying", "Assault", "Mental Health"].some(
        (keyword) => x.category.toLowerCase().includes(keyword.toLowerCase())
      )
    ).length;

    return {
      total: incidents.length,
      active,
      resolved,
      sensitive,
    };
  }, [incidents]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return incidents.filter((incident) => {
      const matchesSearch =
        !q ||
        incident.incidentId.toLowerCase().includes(q) ||
        incident.title.toLowerCase().includes(q) ||
        incident.category.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || incident.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [incidents, search, statusFilter]);

  const categoryData = useMemo(() => {
    const result = {};

    incidents.forEach((incident) => {
      result[incident.category] = (result[incident.category] || 0) + 1;
    });

    return Object.entries(result)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [incidents]);

  const saveGuidanceNote = async () => {
    if (!selected?.id || !note.trim()) return;

    setSaving(true);
    setMessage("");

    try {
      await api.post(
        "/advisories",
        {
          incident_id: selected.id,
          incidentId: selected.incidentId,
          advisory: note.trim(),
          comment: note.trim(),
          type: "guidance",
        },
        {
          headers: getToken()
            ? { Authorization: `Bearer ${getToken()}` }
            : {},
        }
      );

      setNote("");
      setMessage("Guidance note recorded successfully.");
    } catch (err) {
      console.error(err);
      setMessage(
        err?.response?.data?.message ||
          "Unable to save the guidance note."
      );
    } finally {
      setSaving(false);
    }
  };

  const firstName =
    user?.first_name ||
    user?.firstName ||
    user?.name?.split(" ")?.[0] ||
    "Guidance Officer";

  return (
    <Layout>
      <main className="min-h-screen bg-[#F5F7FB] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#123C69] via-[#174D85] to-[#2563EB] shadow-lg">
            <div className="relative px-6 py-8 sm:px-8 lg:px-10">
              <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                    <HeartHandshake size={14} />
                    GUIDANCE & COUNSELLING
                  </div>

                  <h1 className="text-2xl font-bold text-white sm:text-3xl">
                    Student Welfare & Incident Dashboard
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                    Welcome, {firstName}. Review relevant incidents and provide
                    welfare-focused guidance while preserving the integrity of
                    the institutional investigation process.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fetchIncidents(true)}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-60"
                >
                  <RefreshCw
                    size={17}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>
            </div>
          </section>

          {error && (
            <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={19} className="shrink-0" />
              <div>
                <p className="font-bold">Connection notice</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Visible Incidents"
              value={stats.total}
              description="All authorized reports"
              icon={FileText}
              className="bg-blue-50 text-blue-600"
            />

            <StatCard
              title="Active Cases"
              value={stats.active}
              description="Pending or investigating"
              icon={Clock3}
              className="bg-amber-50 text-amber-600"
            />

            <StatCard
              title="Resolved"
              value={stats.resolved}
              description="Resolved or closed"
              icon={CheckCircle2}
              className="bg-emerald-50 text-emerald-600"
            />

            <StatCard
              title="Welfare-Sensitive"
              value={stats.sensitive}
              description="Cases needing care"
              icon={HeartHandshake}
              className="bg-purple-50 text-purple-600"
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-5">
                <div className="flex items-center gap-2">
                  <BarChart3 size={19} className="text-blue-600" />
                  <h2 className="font-bold text-slate-900">
                    Incident Categories
                  </h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Categories represented in the current incident register
                </p>
              </div>

              <div className="h-[280px]">
                {categoryData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="category"
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
                        dataKey="total"
                        name="Incidents"
                        fill="#2563EB"
                        radius={[6, 6, 0, 0]}
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

            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white">
                <HeartHandshake size={21} />
              </div>

              <h3 className="mt-5 text-lg font-bold text-purple-950">
                Welfare Support
              </h3>

              <p className="mt-2 text-sm leading-6 text-purple-900">
                Guidance officers can review relevant reports and provide
                counselling recommendations, welfare observations and support
                notes.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-white/70 p-3">
                  <ShieldCheck size={17} className="text-purple-600" />
                  <span className="text-sm font-semibold text-purple-950">
                    Confidential welfare handling
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-white/70 p-3">
                  <MessageCircle size={17} className="text-purple-600" />
                  <span className="text-sm font-semibold text-purple-950">
                    Guidance recommendations
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Incident Welfare Review
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Review reports and provide appropriate guidance input.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:bg-white sm:w-60"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setFilterOpen((x) => !x)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Filter size={16} />
                    Filters
                  </button>
                </div>
              </div>

              {filterOpen && (
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
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

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("All");
                    }}
                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Clear
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
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Review</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-6 py-5">
                          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length ? (
                    filtered.map((incident) => (
                      <tr
                        key={incident.id || incident.incidentId}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">
                            {incident.title}
                          </p>
                          <p className="mt-1 text-xs font-bold text-blue-600">
                            {incident.incidentId}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {incident.category}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                              <Users size={14} />
                            </div>
                            <span className="text-sm text-slate-600">
                              {incident.reporter}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge value={incident.status} />
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-500">
                          {formatDate(incident.date)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(incident);
                              setMessage("");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
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
                      <td colSpan={6} className="px-6 py-14 text-center">
                        <FileText
                          size={24}
                          className="mx-auto text-slate-300"
                        />
                        <p className="mt-3 font-bold text-slate-700">
                          No incidents found
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          No reports match your current search.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
              <HeartHandshake className="text-purple-600" size={21} />
              <h3 className="mt-3 font-bold text-purple-950">
                Counselling Support
              </h3>
              <p className="mt-1 text-sm leading-6 text-purple-800">
                Identify cases where student welfare and counselling support
                may be required.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <CalendarDays className="text-blue-600" size={21} />
              <h3 className="mt-3 font-bold text-blue-950">
                Follow-up Planning
              </h3>
              <p className="mt-1 text-sm leading-6 text-blue-800">
                Maintain appropriate follow-up recommendations for affected
                students.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <ShieldCheck className="text-emerald-600" size={21} />
              <h3 className="mt-3 font-bold text-emerald-950">
                Confidentiality
              </h3>
              <p className="mt-1 text-sm leading-6 text-emerald-800">
                Handle sensitive welfare information responsibly within
                authorized access boundaries.
              </p>
            </div>
          </section>
        </div>

        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelected(null);
              }
            }}
          >
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                    {selected.incidentId}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {selected.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Category
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {selected.category}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Status
                    </p>
                    <div className="mt-1">
                      <StatusBadge value={selected.status} />
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Priority
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {selected.priority}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Date
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatDate(selected.date)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Location
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {selected.location}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Reporter
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {selected.reporter}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Incident Description
                  </p>
                  <div className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selected.description || "No description provided."}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageCircle size={18} className="text-purple-600" />
                    <h3 className="font-bold text-slate-900">
                      Guidance / Welfare Note
                    </h3>
                  </div>

                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={5}
                    placeholder="Enter counselling observation, welfare recommendation, follow-up requirement, or support guidance..."
                    className="w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-50"
                  />

                  {message && (
                    <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {message}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      onClick={saveGuidanceNote}
                      disabled={saving || !note.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#123C69] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0d3157] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <MessageCircle size={16} />
                          Save Guidance Note
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}