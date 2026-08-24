import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000";

function Incidents() {
    const [incidents, setIncidents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        category_id: "",
        title: "",
        description: "",
        incident_location: "",
        incident_date: "",
        priority: "Medium",
        anonymous: false
    });

    const token = localStorage.getItem("token");
    const config = {
        headers: { Authorization: `Bearer ${token}` }
    };

    const loadData = async () => {
        try {
            setLoading(true);

            const [incidentResponse, categoryResponse] =
                await Promise.all([
                    axios.get(`${API_URL}/api/incidents/my`, config),
                    axios.get(`${API_URL}/api/incidents/categories`, config)
                ]);

            setIncidents(incidentResponse.data?.incidents || []);
            setCategories(categoryResponse.data?.categories || []);
        } catch (error) {
            console.error("Load incidents error:", error);
            setMessage(
                error.response?.data?.message ||
                "Unable to load incident information."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage("");

        try {
            await axios.post(
                `${API_URL}/api/incidents`,
                { ...form, category_id: Number(form.category_id) },
                config
            );

            setMessage("Incident reported successfully.");

            setForm({
                category_id: "",
                title: "",
                description: "",
                incident_location: "",
                incident_date: "",
                priority: "Medium",
                anonymous: false
            });

            await loadData();
        } catch (error) {
            console.error("Submit incident error:", error);
            setMessage(
                error.response?.data?.message ||
                "Unable to submit incident."
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div style={styles.container}>Loading incidents...</div>;
    }

    return (
        <div style={styles.container}>
            <h1>Incident Reporting</h1>

            {message && <p style={styles.message}>{message}</p>}

            <div style={styles.card}>
                <h2>Report an Incident</h2>

                <form onSubmit={handleSubmit}>
                    <label>Category</label>
                    <select
                        name="category_id"
                        value={form.category_id}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                            <option
                                key={category.category_id}
                                value={category.category_id}
                            >
                                {category.category_name}
                            </option>
                        ))}
                    </select>

                    <label>Title</label>
                    <input
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="Incident title"
                        required
                        style={styles.input}
                    />

                    <label>Description</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Describe what happened"
                        required
                        rows="5"
                        style={styles.input}
                    />

                    <label>Location</label>
                    <input
                        name="incident_location"
                        value={form.incident_location}
                        onChange={handleChange}
                        placeholder="Where did it happen?"
                        style={styles.input}
                    />

                    <label>Date</label>
                    <input
                        type="datetime-local"
                        name="incident_date"
                        value={form.incident_date}
                        onChange={handleChange}
                        style={styles.input}
                    />

                    <label>Priority</label>
                    <select
                        name="priority"
                        value={form.priority}
                        onChange={handleChange}
                        style={styles.input}
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                    </select>

                    <label style={styles.checkbox}>
                        <input
                            type="checkbox"
                            name="anonymous"
                            checked={form.anonymous}
                            onChange={handleChange}
                        />
                        {" "}Submit anonymously
                    </label>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={styles.button}
                    >
                        {submitting
                            ? "Submitting..."
                            : "Submit Incident"}
                    </button>
                </form>
            </div>

            <div style={styles.card}>
                <h2>My Incidents</h2>

                {incidents.length === 0 ? (
                    <p>No incidents reported yet.</p>
                ) : (
                    incidents.map((incident) => (
                        <div
                            key={incident.incident_id}
                            style={styles.incident}
                        >
                            <h3>{incident.title}</h3>
                            <p>
                                <strong>Number:</strong>{" "}
                                {incident.incident_number}
                            </p>
                            <p>
                                <strong>Category:</strong>{" "}
                                {incident.category_name || "N/A"}
                            </p>
                            <p>
                                <strong>Status:</strong>{" "}
                                {incident.status_name || "Pending"}
                            </p>
                            <p>
                                <strong>Priority:</strong>{" "}
                                {incident.priority || "Medium"}
                            </p>
                            <p>{incident.description}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: "900px",
        margin: "0 auto",
        padding: "30px",
        fontFamily: "Arial, sans-serif"
    },
    card: {
        backgroundColor: "#ffffff",
        padding: "25px",
        marginBottom: "25px",
        borderRadius: "10px",
        boxShadow: "0 3px 15px rgba(0,0,0,0.08)"
    },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "11px",
        marginTop: "6px",
        marginBottom: "15px",
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        fontSize: "15px"
    },
    checkbox: {
        display: "block",
        margin: "15px 0"
    },
    button: {
        width: "100%",
        padding: "13px",
        backgroundColor: "#123c69",
        color: "white",
        border: "none",
        borderRadius: "6px",
        fontWeight: "bold",
        cursor: "pointer"
    },
    message: {
        padding: "12px",
        backgroundColor: "#eef6ff",
        borderRadius: "6px"
    },
    incident: {
        border: "1px solid #e2e8f0",
        padding: "15px",
        marginBottom: "12px",
        borderRadius: "8px"
    }
};

export default Incidents;
