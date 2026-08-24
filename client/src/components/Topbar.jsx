import { Bell, LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

function Topbar({
  user,
  onLogout,
  pageTitle,
  collapsed,
  setCollapsed,
}) {
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get("http://localhost:5000/api/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => setNotifications(response.data.data || []))
      .catch(() => setNotifications([]));
  }, [user?.id]);

  const unread = notifications.filter((notification) => !notification.is_read).length;

  const markAllRead = async () => {
    const token = localStorage.getItem("token");
    await Promise.all(
      notifications
        .filter((notification) => !notification.is_read)
        .map((notification) => axios.patch(
          `http://localhost:5000/api/notifications/${notification.id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => null))
    );
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
  };

  return (
    <div className="app-topbar" style={styles.topbar}>
      <div style={styles.left}>
        <button
          type="button"
          aria-label={collapsed ? "Open navigation menu" : "Close navigation menu"}
          style={styles.menu}
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu size={20} />
        </button>

        <h2 style={styles.title}>{pageTitle}</h2>
      </div>

      <div className="app-topbar-right" style={styles.right}>
        <div style={styles.notifications}>
          <button
            type="button"
            aria-label="Notifications"
            style={styles.bell}
            onClick={() => {
              setNotificationsOpen((open) => !open);
              if (unread > 0) markAllRead();
            }}
          >
            <Bell size={20} color="#64748B" />
            {unread > 0 && <span style={styles.badge}>{unread}</span>}
          </button>
          {notificationsOpen && (
            <div style={styles.notificationMenu}>
              {notifications.length > 0 ? notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} style={styles.notificationItem}>
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                  </div>
                )) : <div style={styles.notificationItem}>No notifications</div>}
            </div>
          )}
        </div>

        <div className="app-topbar-user" style={styles.user}>
          <strong>
            {user.first_name} {user.last_name}
          </strong>

          <div style={styles.role}>{user.role_name}</div>
        </div>

        <button className="app-topbar-logout" style={styles.logout} onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}

const styles = {
  topbar: {
    height: 74,
    background: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 28px",
    borderBottom: "1px solid #E5E7EB",
    boxShadow: "0 4px 12px rgba(0,0,0,.05)",
  },

  left: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  menu: {
    border: "none",
    background: "#EEF5FF",
    padding: 10,
    borderRadius: 10,
    cursor: "pointer",
  },

  title: {
    margin: 0,
    color: "#123C69",
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: 18,
  },

  notifications: { position: "relative" },

  bell: {
    position: "relative",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 4,
  },

  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 10,
    background: "#DC2626",
    color: "white",
    fontSize: 10,
    lineHeight: "16px",
    textAlign: "center",
  },

  notificationMenu: {
    position: "absolute",
    top: 34,
    right: 0,
    width: 280,
    padding: 8,
    background: "white",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(0,0,0,.12)",
    zIndex: 20,
  },

  notificationItem: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: 10,
    borderBottom: "1px solid #F1F5F9",
    fontSize: 12,
  },

  user: {
    textAlign: "right",
  },

  role: {
    color: "#64748B",
    fontSize: 12,
  },

  logout: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "none",
    background: "#DC2626",
    color: "white",
    padding: "10px 16px",
    borderRadius: 10,
    cursor: "pointer",
  },
};

export default Topbar;