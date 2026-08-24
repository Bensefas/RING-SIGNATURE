function UniversityLogo() {
    return (
      <div style={styles.container}>
        <div style={styles.logo}>
          UIRS
        </div>
  
        <div>
          <div style={styles.title}>
            University Incident
          </div>
  
          <div style={styles.subtitle}>
            Reporting System
          </div>
        </div>
      </div>
    );
  }
  
  const styles = {
    container:{
      display:"flex",
      alignItems:"center",
      gap:15,
      marginBottom:35
    },
  
    logo:{
      width:58,
      height:58,
      borderRadius:16,
      background:"linear-gradient(135deg,#2563EB,#123C69)",
      color:"white",
      display:"flex",
      justifyContent:"center",
      alignItems:"center",
      fontWeight:"bold",
      fontSize:20,
      boxShadow:"0 8px 20px rgba(37,99,235,.35)"
    },
  
    title:{
      color:"white",
      fontWeight:700,
      fontSize:18
    },
  
    subtitle:{
      color:"#CBD5E1",
      fontSize:13
    }
  };
  
  export default UniversityLogo;