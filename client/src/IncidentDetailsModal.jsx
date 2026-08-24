import { X, MapPin, Calendar, AlertTriangle } from "lucide-react";

function IncidentDetailsModal({ incident, onClose, onUpdateStatus }) {
  if (!incident) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2>{incident.title}</h2>

          <button style={styles.close} onClick={onClose}>
            <X size={20}/>
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.row}>
            <MapPin size={18}/>
            <span>{incident.incident_location || "Not provided"}</span>
          </div>

          <div style={styles.row}>
            <Calendar size={18}/>
            <span>{incident.incident_date || "Unknown date"}</span>
          </div>

          <div style={styles.row}>
            <AlertTriangle size={18}/>
            <span>{incident.priority}</span>
          </div>

          <div style={styles.description}>
            {incident.description}
          </div>

          <h3>Update Investigation Status</h3>

          <div style={styles.buttons}>
            <button onClick={() => onUpdateStatus(3)} style={styles.blue}>
              Under Investigation
            </button>

            <button onClick={() => onUpdateStatus(4)} style={styles.green}>
              Resolved
            </button>

            <button onClick={() => onUpdateStatus(5)} style={styles.red}>
              Escalate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay:{
    position:"fixed",
    inset:0,
    background:"rgba(0,0,0,.45)",
    display:"flex",
    justifyContent:"center",
    alignItems:"center",
    zIndex:1000
  },

  modal:{
    width:"700px",
    maxWidth:"90%",
    background:"white",
    borderRadius:18,
    padding:25
  },

  header:{
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center"
  },

  close:{
    border:"none",
    background:"transparent",
    cursor:"pointer"
  },

  body:{
    marginTop:20
  },

  row:{
    display:"flex",
    gap:10,
    alignItems:"center",
    marginBottom:12
  },

  description:{
    background:"#F8FAFC",
    padding:18,
    borderRadius:10,
    margin:"20px 0"
  },

  buttons:{
    display:"flex",
    gap:12,
    flexWrap:"wrap"
  },

  blue:{
    background:"#2563EB",
    color:"white",
    border:"none",
    padding:"12px 18px",
    borderRadius:10,
    cursor:"pointer"
  },

  green:{
    background:"#10B981",
    color:"white",
    border:"none",
    padding:"12px 18px",
    borderRadius:10,
    cursor:"pointer"
  },

  red:{
    background:"#DC2626",
    color:"white",
    border:"none",
    padding:"12px 18px",
    borderRadius:10,
    cursor:"pointer"
  }
};

export default IncidentDetailsModal;