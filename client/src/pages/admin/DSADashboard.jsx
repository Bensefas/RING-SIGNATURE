import { useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Filter,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";

const incidentsData = [
  {
    id: "INC-2026-001",
    title: "Missing Laptop",
    category: "Theft",
    location: "Faculty of Science",
    priority: "High",
    status: "Under Investigation",
    date: "20 Aug 2026",
    assignedTo: "Security Unit",
  },
  {
    id: "INC-2026-002",
    title: "Student Harassment Report",
    category: "Harassment",
    location: "Student Hostel",
    priority: "Critical",
    status: "Pending Review",
    date: "19 Aug 2026",
    assignedTo: "DSA Office",
  },
  {
    id: "INC-2026-003",
    title: "Unauthorized Access",
    category: "Security",
    location: "ICT Centre",
    priority: "Medium",
    status: "Assigned",
    date: "18 Aug 2026",
    assignedTo: "ICT Security",
  },
  {
    id: "INC-2026-004",
    title: "Examination Misconduct",
    category: "Academic",
    location: "Faculty of Engineering",
    priority: "High",
    status: "Resolved",
    date: "17 Aug 2026",
    assignedTo: "Disciplinary Committee",
  },
];

const statCards = [
  {
    label: "Total Incidents",
    value: "128",
    icon: FileText,
    detail: "All reported incidents",
  },
  {
    label: "Pending Review",
    value: "24",
    icon: Clock3,
    detail: "Awaiting DSA attention",
  },
  {
    label: "Under Investigation",
    value: "41",
    icon: ShieldAlert,
    detail: "Active investigations",
  },
  {
    label: "Resolved",
    value: "63",
    icon: CheckCircle2,
    detail: "Successfully concluded",
  },
];

function getPriorityClass(priority) {
  switch (priority) {
    case "Critical":
      return "bg-red-50 text-red-700 border-red-200";
    case "High":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "Medium":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getStatusClass(status) {
  switch (status) {
    case "Resolved":
      return "bg-emerald-50 text-emerald-700";
    case "Under Investigation":
      return "bg-blue-50 text-blue-700";
    case "Assigned":
      return "bg-purple-50 text-purple-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export default function DSADashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedIncident, setSelectedIncident] = useState(null);

  const filteredIncidents = useMemo(() => {
    return incidentsData.filter((incident) => {
      const matchesSearch =
        incident.id.toLowerCase().includes(search.toLowerCase()) ||
        incident.title.toLowerCase().includes(search.toLowerCase()) ||
        incident.category.toLowerCase().includes(search.toLowerCase()) ||
        incident.location.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || incident.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-slate-950 text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
              University
            </p>
            <h1 className="text-lg font-bold">Incident Reporting</h1>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-6">
          <div className="mb-7 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Current Role</p>
            <p className="mt-1 font-semibold">Dean of Student Affairs</p>
            <p className="mt-1 text-xs text-blue-300">Administrator</p>
          </div>

          <nav className="space-y-2">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold"
            >
              <LayoutDashboard size={19} />
              Dashboard
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-white/10"
            >
              <FileText size={19} />
              All Incidents
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-white/10"
            >
              <Users size={19} />
              Investigations
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-white/10"
            >
              <ShieldAlert size={19} />
              Advisory Cases
            </button>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-white/10"
          >
            <LogOut size={19} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-slate-200 p-2 lg:hidden"
              >
                <Menu size={21} />
              </button>

              <div>
                <p className="text-sm text-slate-500">Administrator Portal</p>
                <h2 className="text-xl font-bold text-slate-900">
                  DSA Dashboard
                </h2>
              </div>
            </div>

            <button
              type="button"
              className="relative rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50"
            >
              <Bell size={20} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        <div className="space-y-7 p-4 sm:p-6 lg:p-8">
          <section className="rounded-3xl bg-gradient-to-r from-slate-900 to-blue-900 p-6 text-white shadow-sm sm:p-8">
            <p className="text-sm font-medium text-blue-200">
              Student Affairs Management
            </p>

            <h3 className="mt-2 text-2xl font-bold sm:text-3xl">
              Incident Oversight & Investigation
            </h3>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Review reported incidents, monitor investigations, coordinate
              responsible units, and support transparent resolution.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {card.label}
                      </p>
                      <p className="mt-2 text-3xl font-bold">{card.value}</p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                      <Icon size={21} />
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    {card.detail}
                  </p>
                </div>
              );
            })}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 className="text-lg font-bold">Incident Management</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Monitor all incidents available to the DSA office.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search incidents..."
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-64"
                    />
                  </div>

                  <div className="relative">
                    <Filter
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending Review">Pending Review</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Under Investigation">
                        Under Investigation
                      </option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4 font-semibold">Incident</th>
                    <th className="px-6 py-4 font-semibold">Category</th>
                    <th className="px-6 py-4 font-semibold">Location</th>
                    <th className="px-6 py-4 font-semibold">Priority</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Assigned Unit</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredIncidents.map((incident) => (
                    <tr
                      key={incident.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <p className="font-semibold text-slate-900">
                          {incident.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {incident.id} • {incident.date}
                        </p>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {incident.category}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {incident.location}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityClass(
                            incident.priority
                          )}`}
                        >
                          {incident.priority}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClass(
                            incident.status
                          )}`}
                        >
                          {incident.status}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {incident.assignedTo}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedIncident(incident)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredIncidents.length === 0 && (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-6 py-12 text-center text-sm text-slate-500"
                      >
                        No incidents match the current search or filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {selectedIncident && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Incident Details
                </p>
                <h3 className="mt-1 text-xl font-bold">
                  {selectedIncident.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Incident ID</p>
                <p className="mt-1 font-semibold">{selectedIncident.id}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Category</p>
                <p className="mt-1 font-semibold">
                  {selectedIncident.category}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Location</p>
                <p className="mt-1 font-semibold">
                  {selectedIncident.location}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Priority</p>
                <p className="mt-1 font-semibold">
                  {selectedIncident.priority}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className="mt-1 font-semibold">
                  {selectedIncident.status}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Assigned Unit</p>
                <p className="mt-1 font-semibold">
                  {selectedIncident.assignedTo}
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-200 p-6">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
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