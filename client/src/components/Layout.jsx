import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import IncidentList from "./IncidentList";

function Layout({ user, onLogout, onNavigate, children }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 992);
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 992);

  useEffect(() => {
    const handleResize = () => {
    const mobile = window.innerWidth < 992;
    setIsMobile(mobile);
    setCollapsed(mobile);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  /*
   * ============================================================
   * AUTHORITATIVE DATABASE ROLE MAPPING
   * ============================================================
   *
   * These IDs MUST match the PostgreSQL roles table.
   *
   * 1  = STUDENT
   * 2  = STAFF / ICT
   * 3  = DVC
   * 4  = VC
   * 5  = HOD
   * 6  = DEAN
   * 7  = DSA
   * 8  = SECURITY
   * 9  = DISCIPLINARY
   * 10 = GUIDANCE
   * 11 = CLINIC
   * 12 = SUG
   * 13 = SERVICOM
   * 14 = ADMIN
   *
   * DO NOT change these IDs to make the dashboard names fit.
   * The database role_id is the source of truth.
   * ============================================================
   */

  const roleNames = {
    1: "STUDENT",
    2: "STAFF / ICT",
    3: "DVC",
    4: "VC",
    5: "HOD",
    6: "DEAN",
    7: "DSA",
    8: "SECURITY",
    9: "DISCIPLINARY",
    10: "GUIDANCE",
    11: "CLINIC",
    12: "SUG",
    13: "SERVICOM",
    14: "ADMIN",
  };

  /*
   * ============================================================
   * CORRECT DASHBOARD TITLES
   * ============================================================
   */
  const dashboardTitles = {
    1: "Student Portal",
    2: "ICT Administration",
    3: "Deputy Vice Chancellor",
    4: "Vice Chancellor",
    5: "Head of Department",
    6: "Faculty Dean",
    7: "Dean of Student Affairs",
    8: "Security Officer",
    9: "Disciplinary Chair",
    10: "Guidance & Counselling",
    11: "Clinic Dashboard",
    12: "SUG Observer",
    13: "SERVICOM Observer",
    14: "System Administrator",
  };

  const roleId = Number(user?.role_id);

  /*
   * ============================================================
   * NEVER USE role_name FROM THE FRONTEND TO DETERMINE THE TITLE
   * ============================================================
   *
   * role_id is converted to Number so that both:
   *
   *     role_id: 5
   *
   * and
   *
   *     role_id: "5"
   *
   * work correctly.
   */
  const pageTitle =
    dashboardTitles[roleId] ||
    `Role ${roleId}`;

  const roleName =
    roleNames[roleId] ||
    `ROLE ${roleId}`;

  /*
   * Create a normalized user object.
   *
   * This prevents Sidebar and Topbar from accidentally using
   * an incorrect role_name returned by an old login response.
   */
  const normalizedUser = {
    ...user,
    role_id: roleId,
    role_name: roleName,
    dashboard_title: pageTitle,
  };

  return (
    <div style={styles.wrapper}>

      <Sidebar
        user={normalizedUser}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobile={isMobile}
        onNavigate={onNavigate}
      />

      {isMobile && !collapsed && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="sidebar-backdrop"
          onClick={() => setCollapsed(true)}
        />
      )}

      <div
        style={{
          ...styles.content,
          marginLeft: isMobile
            ? 0
            : collapsed
            ? 90
            : 260,
        }}
      >

        <Topbar
          user={normalizedUser}
          onLogout={onLogout}
          pageTitle={pageTitle}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        <div style={styles.body}>
          {children}
          {roleId >= 3 && roleId <= 14 && (
            <IncidentList role={roleId} user={normalizedUser} />
          )}
        </div>

      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    width: "100%",
    background: "#F4F7FB",
  },

  content: {
    minHeight: "100vh",
    transition: "margin-left .3s ease",
  },

  body: {
    padding: 28,
    minHeight: "calc(100vh - 70px)",
    boxSizing: "border-box",
  },
};

export default Layout;
