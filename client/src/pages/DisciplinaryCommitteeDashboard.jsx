import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import {
  Gavel,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

export default function DisciplinaryCommitteeDashboard({ user, onLogout }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchIncidents = async () => {
    try {
      setLoading(true);

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken");

      const response = await axios.get(`${API_URL}/incidents`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setIncidents(
        Array.isArray(response.data)
          ? response.data
          : response.data.incidents || response.data.data || []
      );

      setError("");
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Unable to load disciplinary records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { void fetchIncidents(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const count = (keyword) =>
    incidents.filter((i) =>
      String(i.status || "").toLowerCase().includes(keyword)
    ).length;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Disciplinary Committee
            </h1>
            <p className="text-gray-500">
              Review and resolution of disciplinary incidents.
            </p>
          </div>

          <button
            onClick={fetchIncidents}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-white border rounded-xl shadow-sm p-5">
            <Gavel className="text-blue-600 mb-3" />
            <p className="text-sm text-gray-500">Cases</p>
            <h2 className="text-3xl font-bold">{incidents.length}</h2>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-5">
            <Clock className="text-orange-500 mb-3" />
            <p className="text-sm text-gray-500">Pending</p>
            <h2 className="text-3xl font-bold">{count("pending")}</h2>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-5">
            <AlertTriangle className="text-red-500 mb-3" />
            <p className="text-sm text-gray-500">Under Review</p>
            <h2 className="text-3xl font-bold">{count("review")}</h2>
          </div>

          <div className="bg-white border rounded-xl shadow-sm p-5">
            <CheckCircle className="text-green-600 mb-3" />
            <p className="text-sm text-gray-500">Resolved</p>
            <h2 className="text-3xl font-bold">{count("resolved")}</h2>
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-gray-800">
              Disciplinary Case Register
            </h2>
            <p className="text-sm text-gray-500">
              Review incident records submitted for disciplinary consideration.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Loading cases...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left">Incident ID</th>
                    <th className="p-4 text-left">Title</th>
                    <th className="p-4 text-left">Category</th>
                    <th className="p-4 text-left">Priority</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {incidents.map((incident) => (
                    <tr
                      key={incident.id || incident.incident_id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="p-4 font-medium">
                        {incident.incident_id || "-"}
                      </td>
                      <td className="p-4">{incident.title || "-"}</td>
                      <td className="p-4">{incident.category || "-"}</td>
                      <td className="p-4">{incident.priority || "Normal"}</td>
                      <td className="p-4">{incident.status || "Pending"}</td>
                      <td className="p-4">
                        <button className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                          <Eye size={16} />
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!incidents.length && (
                    <tr>
                      <td colSpan="6" className="p-10 text-center text-gray-500">
                        No disciplinary cases found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}