import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

const API="http://localhost:5000";

function MyAssignments({ user,onLogout }) {

  const [assignments,setAssignments]=useState([]);

  useEffect(()=>{
    loadAssignments();
  },[]);

  const loadAssignments=async()=>{

    try{

      const token=localStorage.getItem("token");

      const res=await axios.get(
        `${API}/api/incidents/assigned`,
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
  };

  return(
    <Layout user={user} onLogout={onLogout}>
      <h1>Assigned Investigations</h1>

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

  card:{
    background:"white",
    padding:22,
    borderRadius:16,
    boxShadow:"0 8px 25px rgba(0,0,0,.08)"
  }

};

export default MyAssignments;