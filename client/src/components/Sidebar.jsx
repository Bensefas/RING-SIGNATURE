import {
  Home,
  FileText,
  Users,
  ClipboardCheck,
  Shield,
  BarChart3,
  Settings,
  Activity,
  Menu,
  X,
  Eye,
  Search,
} from "lucide-react";

import UniversityLogo from "./UniversityLogo";

const iconMap = {
  Dashboard: Home,
  "Report Incident": FileText,
  "My Incidents": ClipboardCheck,
  "All Incidents": Search,
  "Assigned Cases": ClipboardCheck,
  "Assignment Center": Users,
  "Update Status": ClipboardCheck,
  Reports: BarChart3,
  Analytics: BarChart3,
  Users: Users,
  Blockchain: Shield,
  "Audit Logs": FileText,
  "System Health": Activity,
  "Observation Notes": Eye,
  "Manage System": Settings,
};

function Sidebar({ user, collapsed, setCollapsed, mobile, onNavigate }) {
  const menu = getMenu(user?.role_id);

  return (
    <div
      style={{
        ...styles.sidebar,
        width: mobile ? (collapsed ? 0 : 260) : collapsed ? 90 : 260,
      }}
    >
      <div style={styles.logoSection}>
        <UniversityLogo />

        {!collapsed && (
          <div>
            <div style={styles.uni}> REPORT</div>

          </div>
        )}

        <button
          style={styles.toggle}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      <div style={styles.menu}>
        {menu.map((item) => {
          const Icon = iconMap[item] || Home;

          return (
            <button
              key={item}
              type="button"
              style={styles.item}
              onClick={() => {
                if (item === "Dashboard") {
                  onNavigate?.("dashboard");
                  if (mobile) setCollapsed(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  return;
                }
                if (item === "Report Incident") {
                  onNavigate?.("report");
                  if (mobile) setCollapsed(true);
                  return;
                }
                if (item === "My Incidents") {
                  onNavigate?.("my-incidents");
                  if (mobile) setCollapsed(true);
                  return;
                }
                if (item === "Assigned Cases") {
                  onNavigate?.("assigned-cases");
                  if (mobile) setCollapsed(true);
                  return;
                }
                document.querySelector(".incident-list")?.scrollIntoView({ behavior: "smooth" });
                if (mobile) setCollapsed(true);
              }}
            >
              <Icon size={20} />

              {!collapsed && <span>{item}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getMenu(role) {
  switch (Number(role)) {
    case 1:
      return ["Dashboard", "Report Incident", "My Incidents"];

    case 9:
      return [
        "Dashboard",
        "Users",
        "Blockchain",
        "Audit Logs",
        "System Health",
      ];

    case 10:
      return [
        "Dashboard",
        "All Incidents",
        "Assignment Center",
        "Reports",
      ];

    case 11:
      return [
        "Dashboard",
        "University Analytics",
        "Executive Reports",
      ];

    case 3:
      return [
        "Dashboard",
        "Assigned Cases",
        "Update Status",
      ];

    case 4:
      return [
        "Dashboard",
        "All Incidents",
        "Assigned Cases",
      ];

    case 5:
      return [
        "Dashboard",
        "Assigned Cases",
        "Update Status",
      ];

    case 6:
      return ["Dashboard", "Assigned Cases"];

    case 7:
      return ["Dashboard", "Assigned Cases"];

    case 8:
      return ["Dashboard", "Assigned Cases"];

    case 12:
      return ["Dashboard", "All Incidents", "Observation Notes"];

    case 13:
      return ["Dashboard", "All Incidents", "Observation Notes"];

    case 14:
      return ["Dashboard", "All Incidents", "Audit Logs"];

    default:
      return ["Dashboard"];
  }
}

const styles = {
  sidebar: {
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    background: "linear-gradient(180deg,#123C69,#0B2745)",
    color: "white",
    overflow: "hidden",
    transition: ".3s",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
  },

  logoSection: {
    padding: 22,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  uni: {
    fontWeight: "bold",
    fontSize: 15,
  },

  sub: {
    fontSize: 11,
    opacity: 0.8,
  },

  toggle: {
    marginLeft: "auto",
    border: "none",
    background: "rgba(255,255,255,.15)",
    color: "white",
    padding: 8,
    borderRadius: 8,
    cursor: "pointer",
  },

  menu: {
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  item: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    textAlign: "left",
  },
};

export default Sidebar;