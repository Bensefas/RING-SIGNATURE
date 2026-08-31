import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

import StudentDashboard from "./pages/StudentDashboard";
import HODDashboard from "./pages/HODDashboard";
import DeanDashboard from "./pages/DeanDashboard";
import DSADashboard from "./pages/DSADashboard";
import SecurityDashboard from "./pages/SecurityDashboard";
import ClinicDashboard from "./pages/ClinicDashboard";
import CounsellingDashboard from "./pages/CounsellingDashboard";
import DisciplinaryDashboard from "./pages/DisciplinaryDashboard";
import ICTAdminDashboard from "./pages/ICTAdminDashboard";
import DVCDashboard from "./pages/DVCDashboard";
import VCDashboard from "./pages/VCDashboard";
import SUGDashboard from "./pages/SUGDashboard";
import SERVICOMDashboard from "./pages/ServicomDashboard";
import AdminDashboard from "./pages/AdminDashboard";

import ReportIncident from "./pages/ReportIncident";
import MyIncidents from "./pages/MyIncidents";
import IncidentDetails from "./pages/IncidentDetails";
import MyAssignments from "./pages/MyAssignments";

const API_URL = "http://localhost:5000";

function App() {
  const [page, setPage] = useState("login");
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [message, setMessage] = useState("");
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [studentPage, setStudentPage] = useState("dashboard");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showMyAssignments, setShowMyAssignments] = useState(false);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    staff_student_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    role_id: "1",
    unit_id: "1",
  });

  /*
   * ============================================================
   * RESTORE LOGGED-IN USER
   * ============================================================
   */
  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);

        if (user && user.role_id !== undefined) {
          setTimeout(() => {
            setLoggedInUser(user);
            setPage("dashboard");
          }, 0);
        } else {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
      } catch (error) {
        console.error("Invalid saved user:", error);

        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
  }, []);

  /*
   * ============================================================
   * LOGIN
   * ============================================================
   */
  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const { data } = await axios.post(
        `${API_URL}/api/auth/login`,
        {
          email: loginData.email.trim(),
          password: loginData.password,
        }
      );

      if (!data || !data.user) {
        throw new Error(
          "Login response did not contain user information."
        );
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setLoggedInUser(data.user);

      setStudentPage("dashboard");
      setSelectedIncident(null);
      setPage("dashboard");
    } catch (err) {
      console.error("Login error:", err);

      setMessage(
        err.response?.data?.message ||
          err.message ||
          "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * REGISTER
   * ============================================================
   */
  const handleRegister = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const { data } = await axios.post(
        `${API_URL}/api/auth/register`,
        registerData
      );

      setMessage(
        data.message || "Account created successfully."
      );

      setLoginData({
        email: registerData.email,
        password: "",
      });

      setPage("login");
    } catch (err) {
      console.error("Registration error:", err);

      setMessage(
        err.response?.data?.message ||
          "Unable to create account."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setLoggedInUser(null);
    setPage("login");
    setStudentPage("dashboard");
    setSelectedIncident(null);
    setShowMyAssignments(false);
    setMessage("");
  };

  /*
   * ============================================================
   * ROLE ID
   *
   * DATABASE ROLE MAPPING
   *
   * 1  STUDENT
   * 2  STAFF / ICT
   * 3  DVC
   * 4  VC
   * 5  HOD
   * 6  DEAN
   * 7  DSA
   * 8  SECURITY
   * 9  DISCIPLINARY
   * 10 GUIDANCE
   * 11 CLINIC
   * 12 SUG
   * 13 SERVICOM
   * 14 ADMIN
   * ============================================================
   */
  const roleId = loggedInUser
    ? Number(loggedInUser.role_id)
    : null;

  /*
   * ============================================================
   * DASHBOARD ROUTING
   * ============================================================
   */
  if (page === "dashboard" && loggedInUser) {

    if (showMyAssignments) {
      return (
        <MyAssignments
          user={loggedInUser}
          onLogout={handleLogout}
          onBack={() => setShowMyAssignments(false)}
        />
      );
    }

    const handleAssignedCasesNavigate = () => {
      setShowMyAssignments(true);
    };

    /*
     * ----------------------------------------------------------
     * ROLE 1 — STUDENT
     * ----------------------------------------------------------
     */
    if (roleId === 1) {
      if (studentPage === "report") {
        return (
          <ReportIncident
            user={loggedInUser}
            onLogout={handleLogout}
            onNavigate={(nextPage) => setStudentPage(nextPage)}
            onSubmitted={(text) => {
              setDashboardMessage(text);
              setStudentPage("dashboard");
            }}
          />
        );
      }

      if (studentPage === "my-incidents") {
        return (
          <MyIncidents
            user={loggedInUser}
            onLogout={handleLogout}
            onBack={() => setStudentPage("dashboard")}
            onNavigate={(nextPage) => setStudentPage(nextPage)}
            onViewIncident={(incident) => {
              setSelectedIncident(incident);
              setStudentPage("details");
            }}
          />
        );
      }

      if (studentPage === "details") {
        return (
          <IncidentDetails
            incident={selectedIncident}
            user={loggedInUser}
            onLogout={handleLogout}
            onBack={() => setStudentPage("my-incidents")}
          />
        );
      }

      return (
        <StudentDashboard
          user={loggedInUser}
          onLogout={handleLogout}
          onNavigate={(nextPage, incident) => {
            if (incident) {
              setSelectedIncident(incident);
            }
            setStudentPage(nextPage);
          }}
          dashboardMessage={dashboardMessage}
          onMessageShown={() => setDashboardMessage("")}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 2 — STAFF / ICT
     * ----------------------------------------------------------
     */
    if (roleId === 2) {
      return (
        <ICTAdminDashboard
          user={loggedInUser}
          onLogout={handleLogout}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 3 — DVC
     * ----------------------------------------------------------
     */
    if (roleId === 3) {
      return (
        <DVCDashboard
          user={loggedInUser}
          onLogout={handleLogout}
          onNavigate={handleAssignedCasesNavigate}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 4 — VC
     * ----------------------------------------------------------
     */
    if (roleId === 4) {
      return (
        <VCDashboard
          user={loggedInUser}
          onLogout={handleLogout}
          onNavigate={handleAssignedCasesNavigate}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 5 — HOD
     * ----------------------------------------------------------
     */
    if (roleId === 5) {
      return (
        <HODDashboard
          user={loggedInUser}
          onLogout={handleLogout}
          onNavigate={handleAssignedCasesNavigate}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 6 — FACULTY DEAN
     * ----------------------------------------------------------
     */
    if (roleId === 6) {
      return (
        <DeanDashboard
          user={loggedInUser}
          onLogout={handleLogout}
          onNavigate={handleAssignedCasesNavigate}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 7 — DSA
     * ----------------------------------------------------------
     *
    * DSA uses the dedicated student-affairs dashboard.
     * ----------------------------------------------------------
     */
    if (roleId === 7) {
      return (
        <DSADashboard
          user={loggedInUser}
          onLogout={handleLogout}
          onNavigate={handleAssignedCasesNavigate}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 8 — SECURITY OFFICER
     * ----------------------------------------------------------
     */
    if (roleId === 8) {
      return (
        <SecurityDashboard
          user={loggedInUser}
          onLogout={handleLogout}
          onNavigate={handleAssignedCasesNavigate}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 9 — DISCIPLINARY CHAIR
     * ----------------------------------------------------------
     */
    if (roleId === 9) {
      return (
        <DisciplinaryDashboard
          user={loggedInUser}
          onLogout={handleLogout}
          onNavigate={handleAssignedCasesNavigate}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 10 — GUIDANCE / COUNSELLING
     * ----------------------------------------------------------
     */
    if (roleId === 10) {
      return (
        <CounsellingDashboard
          user={loggedInUser}
          onLogout={handleLogout}
          onNavigate={handleAssignedCasesNavigate}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 11 — CLINIC
     * ----------------------------------------------------------
     */
    if (roleId === 11) {
      return (
        <ClinicDashboard
          user={loggedInUser}
          onLogout={handleLogout}
          onNavigate={handleAssignedCasesNavigate}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 12 — SUG OBSERVER
     * ----------------------------------------------------------
     */
    if (roleId === 12) {
      return (
        <SUGDashboard
          user={loggedInUser}
          onLogout={handleLogout}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 13 — SERVICOM OBSERVER
     * ----------------------------------------------------------
     */
    if (roleId === 13) {
      return (
        <SERVICOMDashboard
          user={loggedInUser}
          onLogout={handleLogout}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * ROLE 14 — ADMIN
     * ----------------------------------------------------------
     */
    if (roleId === 14) {
      return (
        <AdminDashboard
          user={loggedInUser}
          onLogout={handleLogout}
        />
      );
    }

    /*
     * ----------------------------------------------------------
     * UNKNOWN ROLE
     * ----------------------------------------------------------
     */
    return (
      <RoleNotice
        user={loggedInUser}
        roleName={`ROLE ${roleId}`}
        message="This role ID does not have a dashboard connected."
        onLogout={handleLogout}
      />
    );
  }

  /*
   * ============================================================
   * LOGIN / REGISTER SCREEN
   * ============================================================
   */
  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <h3 style={styles.title}>
          UNIVERSITY INCIDENT REPORTING SYSTEM
        </h3>

        <p style={styles.subtitle}>
          Blockchain-Based Transparent Incident Reporting
        </p>

        {page === "login" ? (
          <>
            <form onSubmit={handleLogin}>

              <input
                style={styles.input}
                type="email"
                placeholder="Email"
                value={loginData.email}
                onChange={(e) =>
                  setLoginData({
                    ...loginData,
                    email: e.target.value,
                  })
                }
                required
              />

              <input
                style={styles.input}
                type={showLoginPassword ? "text" : "password"}
                placeholder="Password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({
                    ...loginData,
                    password: e.target.value,
                  })
                }
                required
              />

              <button
                type="button"
                style={styles.passwordToggle}
                aria-label={showLoginPassword ? "Hide password" : "Show password"}
                onClick={() => setShowLoginPassword((visible) => !visible)}
              >
                {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                {showLoginPassword ? "Hide password" : "Show password"}
              </button>

              <button
                style={styles.button}
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Login"}
              </button>

            </form>

            <div style={styles.divider}></div>

            <p style={styles.switchText}>
              Don't have an account?
            </p>

            <button
              style={styles.registerButton}
              onClick={() => {
                setMessage("");
                setPage("register");
              }}
            >
              Create Account
            </button>
          </>
        ) : (
          <>
            <form onSubmit={handleRegister}>

              <input
                style={styles.input}
                placeholder="Staff/Student ID"
                value={registerData.staff_student_id}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    staff_student_id: e.target.value,
                  })
                }
              />

              <input
                style={styles.input}
                placeholder="First Name"
                value={registerData.first_name}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    first_name: e.target.value,
                  })
                }
              />

              <input
                style={styles.input}
                placeholder="Last Name"
                value={registerData.last_name}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    last_name: e.target.value,
                  })
                }
              />

              <input
                style={styles.input}
                type="email"
                placeholder="Email"
                value={registerData.email}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    email: e.target.value,
                  })
                }
              />

              <input
                style={styles.input}
                placeholder="Phone"
                value={registerData.phone}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    phone: e.target.value,
                  })
                }
              />

              <input
                style={styles.input}
                type={showRegisterPassword ? "text" : "password"}
                placeholder="Password"
                value={registerData.password}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    password: e.target.value,
                  })
                }
              />

              <button
                type="button"
                style={styles.passwordToggle}
                aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                onClick={() => setShowRegisterPassword((visible) => !visible)}
              >
                {showRegisterPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                {showRegisterPassword ? "Hide password" : "Show password"}
              </button>

              <button
                style={styles.button}
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating..." : "Register"}
              </button>

            </form>

            <button
              style={styles.linkButton}
              onClick={() => {
                setMessage("");
                setPage("login");
              }}
            >
              Back to Login
            </button>
          </>
        )}

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        <div style={styles.info}>
          <strong>Current Architecture</strong>

          <p>
            Hyperledger Fabric • IPFS • PostgreSQL • React • Node.js
          </p>
        </div>

      </div>
    </div>
  );
}

/*
 * ============================================================
 * ROLE NOTICE
 * ============================================================
 */
function RoleNotice({
  user,
  roleName,
  message,
  onLogout,
}) {
  return (
    <div style={noticeStyles.container}>
      <div style={noticeStyles.card}>

        <h1 style={noticeStyles.title}>
          University Incident Reporting System
        </h1>

        <div style={noticeStyles.roleBox}>

          <div style={noticeStyles.roleLabel}>
            LOGGED-IN ROLE
          </div>

          <div style={noticeStyles.roleName}>
            {roleName}
          </div>

          <div style={noticeStyles.userName}>
            {user?.first_name} {user?.last_name}
          </div>

          <div style={noticeStyles.email}>
            {user?.email}
          </div>

        </div>

        <p style={noticeStyles.message}>
          {message}
        </p>

        <button
          style={noticeStyles.button}
          onClick={onLogout}
        >
          Logout
        </button>

      </div>
    </div>
  );
}

/*
 * ============================================================
 * LOGIN STYLES
 * ============================================================
 */
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #071c2c 0%, #0b3b4a 48%, #0d766e 100%)",
    padding: "32px 20px",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
  },

  card: {
    width: "100%",
    maxWidth: 470,
    background: "rgba(255, 255, 255, 0.97)",
    border: "1px solid rgba(255, 255, 255, 0.55)",
    borderRadius: 22,
    padding: "42px 40px 34px",
    boxShadow: "0 28px 70px rgba(1, 17, 28, 0.34), 0 8px 20px rgba(1, 17, 28, 0.16)",
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1,
  },

  title: {
    textAlign: "center",
    color: "#123047",
    fontSize: 24,
    lineHeight: 1.25,
    letterSpacing: "0.02em",
    margin: "0 0 10px",
  },

  subtitle: {
    textAlign: "center",
    color: "#60808a",
    fontSize: 14,
    lineHeight: 1.5,
    margin: "0 0 30px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px",
    border: "1px solid #c9dadd",
    borderRadius: "10px",
    background: "#f7fbfb",
    color: "#163646",
    fontSize: "15px",
    marginBottom: 16,
    outline: "none",
  },

  button: {
    width: "100%",
    padding: "14px 16px",
    background: "linear-gradient(100deg, #0f766e, #155e75)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "15px",
    letterSpacing: "0.02em",
    cursor: "pointer",
    boxShadow: "0 10px 18px rgba(15, 118, 110, 0.22)",
  },

  passwordToggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    width: "100%",
    marginTop: -7,
    marginBottom: 17,
    padding: "9px 10px",
    border: "1px solid #c9dadd",
    borderRadius: "9px",
    background: "#eef8f7",
    color: "#0f766e",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
  },

  registerButton: {
    width: "100%",
    padding: "13px 16px",
    background: "#e3f3f1",
    color: "#0f5f5a",
    border: "1px solid #b8ded9",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },

  linkButton: {
    width: "100%",
    marginTop: 16,
    padding: "10px 12px",
    background: "transparent",
    border: "none",
    color: "#0f766e",
    fontWeight: 700,
    cursor: "pointer",
  },

  divider: {
    borderTop: "1px solid #dce9e9",
    margin: "28px 0 19px",
  },

  switchText: {
    textAlign: "center",
    color: "#6a8188",
    marginBottom: 8,
  },

  message: {
    marginTop: 20,
    padding: "11px 13px",
    borderRadius: 9,
    background: "#fff4e5",
    textAlign: "center",
    fontWeight: 700,
    fontSize: 14,
    color: "#9a5b09",
  },

  info: {
    background: "#f0f8f7",
    border: "1px solid #d9ece9",
    padding: "14px 16px",
    borderRadius: 10,
    marginTop: 28,
    color: "#31515b",
    fontSize: 13,
  },
};

/*
 * ============================================================
 * ROLE NOTICE STYLES
 * ============================================================
 */
const noticeStyles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f1f5f9",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 600,
    background: "#ffffff",
    borderRadius: 12,
    padding: 40,
    boxShadow: "0 12px 30px rgba(0,0,0,.12)",
    textAlign: "center",
  },

  title: {
    color: "#123c69",
    marginBottom: 30,
  },

  roleBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 25,
    marginBottom: 25,
  },

  roleLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748b",
    letterSpacing: 1,
    marginBottom: 8,
  },

  roleName: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#123c69",
    marginBottom: 8,
  },

  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#172033",
  },

  email: {
    marginTop: 5,
    color: "#64748b",
  },

  message: {
    color: "#475569",
    lineHeight: 1.6,
    marginBottom: 25,
  },

  button: {
    width: "100%",
    padding: "14px",
    background: "#123c69",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default App;
