import {
    FileText,
    CheckCircle,
    Clock,
    AlertTriangle
  } from "lucide-react";
  
  const activities = [
    {
      icon: FileText,
      title: "Laptop Theft Reported",
      time: "Today • 9:30 AM",
      color: "#2563EB"
    },
    {
      icon: Clock,
      title: "Harassment case assigned",
      time: "Yesterday",
      color: "#F59E0B"
    },
    {
      icon: CheckCircle,
      title: "Bullying case resolved",
      time: "2 days ago",
      color: "#10B981"
    },
    {
      icon: AlertTriangle,
      title: "Critical security alert",
      time: "This week",
      color: "#DC2626"
    }
  ];
  
  function RecentActivity() {
    return (
      <div style={styles.card}>
        <h3>Recent Activity</h3>
  
        {activities.map((item, index) => {
          const Icon = item.icon;
  
          return (
            <div key={index} style={styles.row}>
              <div
                style={{
                  ...styles.icon,
                  background: item.color
                }}
              >
                <Icon size={18} color="white" />
              </div>
  
              <div>
                <div style={styles.title}>{item.title}</div>
                <div style={styles.time}>{item.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  
  const styles = {
    card: {
      background: "white",
      borderRadius: 18,
      padding: 25,
      boxShadow: "0 8px 25px rgba(0,0,0,.08)"
    },
  
    row: {
      display: "flex",
      alignItems: "center",
      gap: 15,
      padding: "15px 0",
      borderBottom: "1px solid #EDF2F7"
    },
  
    icon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    },
  
    title: {
      fontWeight: 600
    },
  
    time: {
      color: "#64748b",
      fontSize: 13
    }
  };
  
  export default RecentActivity;    