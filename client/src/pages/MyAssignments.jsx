import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

const API="http://localhost:5000";

function MyAssignments({ user,onLogout,onBack }) {

  const [assignments,setAssignments]=useState([]);

  const loadAssignments=useCallback(async()=>{

    try{

      const token=localStorage.getItem("token");

      const res=await axios.get(
        `${API}/api/assignments/my`,
        {
          headers:{
            Authorization:`Bearer ${token}`
          }
        }
      );

      setAssignments(res.data.data||[]);

    }catch(err){

      console.error(err);

    }
  },[]);

  useEffect(()=>{ queueMicrotask(()=>{ void loadAssignments(); }); },[loadAssignments]);

  return(
    <Layout user={user} onLogout={onLogout}>
      <div style={styles.heading}>
        <button type="button" style={styles.backButton} onClick={onBack}>Back to dashboard</button>
        <h1>My Assigned Cases</h1>
      </div>

      <div style={styles.grid}>
        {assignments.map(item=>(
          <div key={item.incident_id} style={styles.card}>
            <h3>{item.title}</h3>

            <p>{item.description}</p>

            <span>{item.priority}</span>
          </div>
        ))}
      </div>
    </Layout>
  );
}

const styles={

  grid:{
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",
    gap:20
  },

  heading:{display:"flex",alignItems:"center",gap:16,marginBottom:20},
  backButton:{border:"1px solid #CBD5E1",background:"white",padding:"8px 12px",borderRadius:8,cursor:"pointer"},

  card:{
    background:"white",
    padding:22,
    borderRadius:16,
    boxShadow:"0 8px 25px rgba(0,0,0,.08)"
  }

};

export default MyAssignments;