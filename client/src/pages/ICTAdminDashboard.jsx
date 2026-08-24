import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import {
  Users,
  Shield,
  Database,
  Server,
  Search,
  Activity,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

const users = [
  { name: "Benjamin Umeh", role: "Student", status: "Active" },
  { name: "Dr. Okafor", role: "HOD", status: "Active" },
  { name: "SUG Office", role: "SUG", status: "Active" },
  { name: "DVC Admin", role: "DVC", status: "Active" }
];

const systems = [
  { name: "PostgreSQL", status: "Online", color: "#10B981" },
  { name: "Hyperledger Fabric", status: "Online", color: "#10B981" },
  { name: "IPFS", status: "Online", color: "#10B981" },
  { name: "REST API", status: "Online", color: "#10B981" }
];

const blockchainLogs = [
  {
    tx: "TX-8A1C",
    incident: "Laptop Theft",
    time: "09:42"
  },
  {
    tx: "TX-7FD2",
    incident: "Bullying Report",
    time: "09:18"
  },
  {
    tx: "TX-6BB9",
    incident: "Harassment Case",
    time: "08:55"
  }
];

function ICTAdminDashboard({ user, onLogout }) {
  return (
    <Layout user={user} onLogout={onLogout}>
      <div style={styles.hero}>
        <div>
          <h1>ICT Administration Center</h1>
          <p>
            Monitor users, blockchain transactions, IPFS storage and university systems.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        <DashboardCard title="Registered Users" value="1,248" color="#2563EB"/>
        <DashboardCard title="Active Incidents" value="37" color="#F59E0B"/>
        <DashboardCard title="Blockchain Records" value="526" color="#10B981"/>
        <DashboardCard title="System Health" value="100%" color="#0EA5E9"/>
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h3>User Management</h3>
            <Users color="#2563EB"/>
          </div>

          <div style={styles.searchBox}>
            <Search size={18} color="#64748B"/>
            <input
              placeholder="Search users..."
              style={styles.input}
            />
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u, i) => (
                <tr key={i}>
                  <td>{u.name}</td>
                  <td>{u.role}</td>
                  <td>
                    <span style={styles.active}>
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.side}>
          <div style={styles.card}>
            <div style={styles.header}>
              <h3>System Health</h3>
              <Server color="#2563EB"/>
            </div>

            {systems.map((s, i) => (
              <div key={i} style={styles.healthRow}>
                <div style={styles.healthLeft}>
                  <Activity color={s.color}/>
                  <span>{s.name}</span>
                </div>

                <span
                  style={{
                    ...styles.healthBadge,
                    background:s.color
                  }}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <div style={styles.header}>
              <h3>Blockchain Activity</h3>
              <Database color="#2563EB"/>
            </div>

            {blockchainLogs.map((log,i)=>(
              <div key={i} style={styles.logRow}>
                <div>
                  <strong>{log.tx}</strong>
                  <div style={styles.small}>
                    {log.incident}
                  </div>
                </div>

                <div style={styles.small}>
                  {log.time}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <div style={styles.header}>
              <h3>Security Overview</h3>
              <Shield color="#2563EB"/>
            </div>

            <div style={styles.summary}>
              <CheckCircle color="#10B981"/>
              <span>All services operational</span>
            </div>

            <div style={styles.summary}>
              <Shield color="#2563EB"/>
              <span>Blockchain integrity verified</span>
            </div>

            <div style={styles.summary}>
              <AlertTriangle color="#F59E0B"/>
              <span>No critical security alerts</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  hero:{
    background:"linear-gradient(135deg,#123C69,#2563EB)",
    color:"white",
    padding:30,
    borderRadius:20,
    marginBottom:25
  },

  grid:{
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
    gap:20,
    marginBottom:25
  },

  mainGrid:{
    display:"grid",
    gridTemplateColumns:"2fr 1fr",
    gap:20
  },

  card:{
    background:"white",
    borderRadius:18,
    padding:24,
    boxShadow:"0 8px 25px rgba(0,0,0,.08)"
  },

  header:{
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    marginBottom:18
  },

  searchBox:{
    display:"flex",
    alignItems:"center",
    gap:10,
    background:"#F8FAFC",
    padding:"10px 12px",
    borderRadius:10,
    marginBottom:18
  },

  input:{
    border:"none",
    outline:"none",
    background:"transparent",
    width:"100%"
  },

  table:{
    width:"100%",
    borderCollapse:"collapse"
  },

  active:{
    background:"#D1FAE5",
    color:"#065F46",
    padding:"5px 10px",
    borderRadius:20,
    fontSize:12,
    fontWeight:"bold"
  },

  side:{
    display:"flex",
    flexDirection:"column",
    gap:20
  },

  healthRow:{
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    padding:"12px 0"
  },

  healthLeft:{
    display:"flex",
    alignItems:"center",
    gap:10
  },

  healthBadge:{
    color:"white",
    padding:"4px 10px",
    borderRadius:20,
    fontSize:12,
    fontWeight:"bold"
  },

  logRow:{
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    padding:"12px 0",
    borderBottom:"1px solid #E5E7EB"
  },

  small:{
    color:"#64748B",
    fontSize:13
  },

  summary:{
    display:"flex",
    gap:12,
    alignItems:"center",
    padding:"12px 0"
  }
};

export default ICTAdminDashboard;