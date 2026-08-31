import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

const API_URL = "http://localhost:5000/api";

function ReportIncident({ user, onLogout, onBack, onNavigate, onSubmitted }) {
  const [form, setForm] = useState({
    title: "",
    category_id: "",
    description: "",
    incident_location: "",
    incident_date: "",
    priority: "Medium",
    anonymity: false,
  });

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
   * ============================================================
   * LOAD INCIDENT CATEGORIES
   * ============================================================
   */
  async function loadCategories() {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Your login session has expired. Please login again.");
      return;
    }

    try {
      setLoadingCategories(true);

      const response = await axios.get(
        `${API_URL}/incidents/categories`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Categories response:", response.data);

      let data = [];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (Array.isArray(response.data.categories)) {
        data = response.data.categories;
      }

      setCategories(data);

      if (data.length === 0) {
        setError("No incident categories were found.");
      }
    } catch (err) {
      console.error("Category loading error:", err);

      if (err.response?.status === 401) {
        setError(
          "Your authentication session is invalid. Please logout and login again."
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to load incident categories."
        );
      }
    } finally {
      setLoadingCategories(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { void loadCategories(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  /*
   * ============================================================
   * FORM CHANGE
   * ============================================================
   */
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setMessage("");
  };

  /*
   * ============================================================
   * SUBMIT INCIDENT
   * ============================================================
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setError("You are not logged in.");
      return;
    }

    setError("");
    setMessage("");

    if (!form.title.trim()) {
      setError("Please enter the incident title.");
      return;
    }

    if (!form.category_id) {
      setError("Please select an incident category.");
      return;
    }

    if (!form.description.trim()) {
      setError("Please describe the incident.");
      return;
    }

    if (!form.incident_location.trim()) {
      setError("Please enter the incident location.");
      return;
    }

    if (!form.incident_date) {
      setError("Please select the incident date.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: form.title.trim(),
        category_id: Number(form.category_id),
        description: form.description.trim(),
        incident_location: form.incident_location.trim(),
        incident_date: new Date(
          form.incident_date
        ).toISOString(),
        priority: form.priority,
        anonymity: form.anonymity,
      };

      console.log("Submitting incident:", payload);

      const response = await axios.post(
        `${API_URL}/incidents`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Submit response:", response.data);

      if (response.data?.success === false) {
        throw new Error(
          response.data.message ||
            "Incident submission failed."
        );
      }

      setMessage(
        response.data?.message ||
          "Incident submitted successfully."
      );

      setForm({
        title: "",
        category_id: "",
        description: "",
        incident_location: "",
        incident_date: "",
        priority: "Medium",
        anonymity: false,
      });
      if (typeof onSubmitted === "function") {
        onSubmitted(response.data?.message || "Incident submitted successfully.");
      }
    } catch (err) {
      console.error("Incident submission error:", err);

      if (err.response?.status === 401) {
        setError(
          "Authentication failed. Please logout and login again."
        );
        return;
      }

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to submit the incident."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ============================================================
   * BACK TO DASHBOARD
   * ============================================================
   */
  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
    }
  };

  return (
    <Layout user={user} onLogout={onLogout} onNavigate={onNavigate}>
      <div style={styles.page}>

      <main style={styles.main}>

        <div style={styles.header}>

          <div>
            <h1 style={styles.heading}>
              Report an Incident
            </h1>

            <p style={styles.subtitle}>
              Submit a secure incident report to the university.
            </p>
          </div>

          <button
            type="button"
            style={styles.backButton}
            onClick={handleBack}
          >
            ← Dashboard
          </button>

        </div>

        {/* USER INFORMATION */}

        {user && (
          <div style={styles.userBox}>
            <strong>
              Reporting as:
            </strong>{" "}
            {user.first_name || ""}{" "}
            {user.last_name || ""}

            {user.email && (
              <span style={styles.userEmail}>
                {user.email}
              </span>
            )}
          </div>
        )}

        {/* SUCCESS MESSAGE */}

        {message && (
          <div style={styles.successBox}>

            <div style={styles.messageIcon}>
              ✅
            </div>

            <div>
              <strong>
                Report submitted
              </strong>

              <p style={styles.messageParagraph}>
                {message}
              </p>
            </div>

          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div style={styles.errorBox}>

            <div style={styles.messageIcon}>
              ⚠️
            </div>

            <div>
              <strong>
                Notice
              </strong>

              <p style={styles.messageParagraph}>
                {error}
              </p>
            </div>

          </div>
        )}

        {/* ====================================================
            INCIDENT FORM
        ==================================================== */}

        <form onSubmit={handleSubmit}>

          {/* INCIDENT INFORMATION */}

          <section style={styles.card}>

            <div style={styles.cardHeader}>

              <div style={styles.cardIcon}>
                📋
              </div>

              <div>

                <h2 style={styles.cardTitle}>
                  Incident Information
                </h2>

                <p style={styles.cardSubtitle}>
                  Provide the basic details of what happened.
                </p>

              </div>

            </div>

            {/* TITLE */}

            <div style={styles.formGroup}>

              <label style={styles.label}>
                Incident Title{" "}
                <span style={styles.required}>
                  *
                </span>
              </label>

              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Example: Student Harassment"
                style={styles.input}
              />

            </div>

            {/* CATEGORY + PRIORITY */}

            <div style={styles.twoColumns}>

              <div style={styles.formGroup}>

                <label style={styles.label}>
                  Category{" "}
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  style={styles.input}
                  disabled={loadingCategories}
                >

                  <option value="">
                    {loadingCategories
                      ? "Loading categories..."
                      : "Select a category"}
                  </option>

                  {categories.map((category) => {

                    const categoryId =
                      category.category_id ??
                      category.id;

                    const categoryName =
                      category.category_name ??
                      category.name ??
                      category.category;

                    return (
                      <option
                        key={categoryId}
                        value={categoryId}
                      >
                        {categoryName}
                      </option>
                    );
                  })}

                </select>

              </div>

              <div style={styles.formGroup}>

                <label style={styles.label}>
                  Priority
                </label>

                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  style={styles.input}
                >

                  <option value="Low">
                    Low
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="High">
                    High
                  </option>

                  <option value="Critical">
                    Critical
                  </option>

                </select>

              </div>

            </div>

            {/* LOCATION + DATE */}

            <div style={styles.twoColumns}>

              <div style={styles.formGroup}>

                <label style={styles.label}>
                  Incident Location{" "}
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <input
                  type="text"
                  name="incident_location"
                  value={form.incident_location}
                  onChange={handleChange}
                  placeholder="Example: University Library"
                  style={styles.input}
                />

              </div>

              <div style={styles.formGroup}>

                <label style={styles.label}>
                  Incident Date{" "}
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <input
                  type="datetime-local"
                  name="incident_date"
                  value={form.incident_date}
                  onChange={handleChange}
                  style={styles.input}
                />

              </div>

            </div>

            {/* DESCRIPTION */}

            <div style={styles.formGroup}>

              <label style={styles.label}>
                Description{" "}
                <span style={styles.required}>
                  *
                </span>
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe what happened, including any relevant details..."
                rows={7}
                style={{
                  ...styles.input,
                  resize: "vertical",
                  minHeight: "150px",
                }}
              />

              <p style={styles.helper}>
                Provide enough information to help the university
                understand and investigate the incident.
              </p>

            </div>

          </section>

          {/* ==================================================
              PRIVACY OPTIONS
          ================================================== */}

          <section style={styles.card}>

            <div style={styles.cardHeader}>

              <div
                style={{
                  ...styles.cardIcon,
                  backgroundColor: "#fef3c7",
                }}
              >
                🔐
              </div>

              <div>

                <h2 style={styles.cardTitle}>
                  Privacy Options
                </h2>

                <p style={styles.cardSubtitle}>
                  Choose whether your identity should be hidden
                  from ordinary report viewers.
                </p>

              </div>

            </div>

            <label style={styles.checkboxContainer}>

              <input
                type="checkbox"
                name="anonymity"
                checked={form.anonymity}
                onChange={handleChange}
                style={styles.checkbox}
              />

              <div>

                <strong style={styles.checkboxTitle}>
                  Submit anonymously
                </strong>

                <p style={styles.checkboxText}>
                  Your report can be submitted without displaying
                  your identity to ordinary report viewers.
                </p>

              </div>

            </label>

            <div style={styles.securityInfo}>
              🔒 Your report is transmitted using authenticated
              communication with the university incident system.
            </div>

          </section>

          {/* ==================================================
              ACTION BUTTONS
          ================================================== */}

          <div style={styles.actions}>

            <button
              type="button"
              style={styles.cancelButton}
              onClick={handleBack}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                opacity: submitting ? 0.7 : 1,
              }}
              disabled={submitting}
            >
              {submitting
                ? "Submitting..."
                : "Submit Incident"}
            </button>

          </div>

        </form>

      </main>

      </div>
    </Layout>
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = {
  page: {
    minHeight: "auto",
    display: "block",
    background: "transparent",
    color: "#102a43",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  sidebar: {
    width: "250px",
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0b3550 0%, #123c69 55%, #155e75 100%)",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
  },

  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "24px 20px",
    borderBottom: "1px solid #1e293b",
  },

  logo: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #2dd4bf, #2563eb)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "16px",
  },

  logoTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "700",
  },

  logoSubtitle: {
    margin: "2px 0 0",
    fontSize: "12px",
    color: "#94a3b8",
  },

  nav: {
    padding: "20px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  navItem: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#cbd5e1",
    padding: "12px 14px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "14px",
    cursor: "pointer",
    textAlign: "left",
  },

  activeNav: {
    backgroundColor: "rgba(45, 212, 191, 0.22)",
    border: "1px solid rgba(153, 246, 228, 0.3)",
    color: "#ffffff",
  },

  sidebarBottom: {
    marginTop: "auto",
    padding: "12px",
    borderTop: "1px solid #1e293b",
  },

  main: {
    marginLeft: 0,
    width: "100%",
    padding: "8px 0 28px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "25px",
  },

  heading: {
    margin: 0,
    fontSize: "clamp(28px, 4vw, 38px)",
    fontWeight: "700",
    letterSpacing: "-0.7px",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#547083",
    fontSize: "14px",
  },

  backButton: {
    border: "1px solid #b7d5d8",
    backgroundColor: "rgba(255,255,255,.82)",
    color: "#155e75",
    padding: "10px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  userBox: {
    background: "linear-gradient(100deg, #e0f7f4, #eef5ff)",
    border: "1px solid #b9e0dc",
    color: "#155e75",
    padding: "12px 15px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "13px",
  },

  userEmail: {
    marginLeft: "10px",
    color: "#475569",
  },

  card: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    border: "1px solid rgba(185, 211, 220, 0.72)",
    borderRadius: "14px",
    padding: "28px",
    marginBottom: "20px",
    boxShadow: "0 12px 30px rgba(22, 50, 79, 0.07)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "25px",
  },

  cardIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #d9f8f2, #e0eaff)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "700",
  },

  cardSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  formGroup: {
    marginBottom: "20px",
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "18px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
  },

  required: {
    color: "#dc2626",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #c4d9de",
    borderRadius: "10px",
    padding: "13px 14px",
    fontSize: "13px",
    color: "#0f172a",
    backgroundColor: "#fbfefe",
    outline: "none",
  },

  helper: {
    margin: "6px 0 0",
    color: "#94a3b8",
    fontSize: "11px",
  },

  checkboxContainer: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    padding: "15px",
    border: "1px solid #c9e0df",
    borderRadius: "10px",
    cursor: "pointer",
  },

  checkbox: {
    width: "18px",
    height: "18px",
    marginTop: "2px",
    cursor: "pointer",
  },

  checkboxTitle: {
    display: "block",
    fontSize: "13px",
  },

  checkboxText: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: "1.5",
  },

  securityInfo: {
    marginTop: "15px",
    padding: "12px",
    backgroundColor: "#e7f7f5",
    color: "#0f766e",
    borderRadius: "8px",
    fontSize: "11px",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginBottom: "30px",
  },

  cancelButton: {
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  submitButton: {
    border: "none",
    background: "linear-gradient(100deg, #0f766e, #2563eb)",
    color: "#ffffff",
    padding: "13px 24px",
    borderRadius: "10px",
    boxShadow: "0 10px 18px rgba(37, 99, 235, 0.2)",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  successBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "20px",
  },

  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "20px",
  },

  messageIcon: {
    fontSize: "18px",
  },

  messageParagraph: {
    margin: "5px 0 0",
  },
};

export default ReportIncident;