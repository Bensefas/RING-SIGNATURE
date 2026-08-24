function NotificationToast({ message, show }) {

    if (!show) return null;
  
    return (
      <div style={styles.toast}>
        {message}
      </div>
    );
  }
  
  const styles={
  
    toast:{
      position:"fixed",
      top:25,
      right:25,
      background:"#10B981",
      color:"white",
      padding:"14px 20px",
      borderRadius:12,
      boxShadow:"0 10px 25px rgba(0,0,0,.15)",
      zIndex:9999,
      fontWeight:"bold"
    }
  
  };
  
  export default NotificationToast;