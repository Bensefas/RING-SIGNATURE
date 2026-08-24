import { useEffect,useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import DashboardCard from "../components/DashboardCard";
import IncidentDetailsModal from "../components/IncidentDetailsModal";
import { Heart,Eye } from "lucide-react";

const API="http://localhost:5000";

function CounsellingDashboard({user,onLogout}){

 const [cases,setCases]=useState([]);
 const [selected,setSelected]=useState(null);

 useEffect(()=>{loadCases();},[]);

 const loadCases=async()=>{
  const token=localStorage.getItem("token");
  const res=await axios.get(`${API}/api/assignments/my`,{
   headers:{Authorization:`Bearer ${token}`}
  });
  setCases(res.data.data||[]);
 };

 const updateStatus=async(statusId)=>{
  const token=localStorage.getItem("token");
  await axios.put(`${API}/api/assignments/status`,{
   incident_id:selected.incident_id,
   status_id:statusId
  },{
   headers:{Authorization:`Bearer ${token}`}
  });
  setSelected(null);
  loadCases();
 };

 return(
  <Layout user={user} onLogout={onLogout}>
   <div style={styles.hero}>
    <div>
     <h1>Counselling Portal</h1>
     <p>Student welfare cases assigned by the DVC.</p>
    </div>
    <Heart size={50}/>
   </div>

   <div style={styles.grid}>
    <DashboardCard title="Counselling Cases" value={cases.length} color="#8B5CF6"/>
    <DashboardCard title="Ongoing" value={cases.filter(c=>c.status_name==="Under Investigation").length} color="#F59E0B"/>
    <DashboardCard title="Completed" value={cases.filter(c=>c.status_name==="Resolved").length} color="#10B981"/>
   </div>

   <table style={styles.table}>
    <tbody>
     {cases.map(c=>(
      <tr key={c.incident_id}>
       <td>{c.title}</td>
       <td>{c.priority}</td>
       <td>{c.status_name}</td>
       <td>
        <button style={styles.btn} onClick={()=>setSelected(c)}>
         <Eye size={16}/>
        </button>
       </td>
      </tr>
     ))}
    </tbody>
   </table>

   <IncidentDetailsModal incident={selected} onClose={()=>setSelected(null)} onUpdateStatus={updateStatus}/>
  </Layout>
 );
}

const styles={
 hero:{background:"linear-gradient(135deg,#7C3AED,#8B5CF6)",color:"white",padding:30,borderRadius:20,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:25},
 grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:20,marginBottom:25},
 table:{width:"100%",background:"white",borderRadius:18,padding:20},
 btn:{background:"#EDE9FE",border:"none",padding:8,borderRadius:8}
};

export default CounsellingDashboard;