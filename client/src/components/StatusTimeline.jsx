import {
    CheckCircle,
    Shield,
    Search,
    Flag
  } from "lucide-react";
  
  const steps=[
    {id:1,label:"Submitted",icon:CheckCircle},
    {id:2,label:"Assigned",icon:Shield},
    {id:3,label:"Investigation",icon:Search},
    {id:4,label:"Resolved",icon:Flag}
  ];
  
  function StatusTimeline({statusId=1}){
  
    return(
  
      <div style={styles.container}>
  
        {steps.map((step,index)=>{
  
          const Icon=step.icon;
          const active=step.id<=statusId;
  
          return(
  
            <div key={step.id} style={styles.item}>
  
              <div
                style={{
                  ...styles.circle,
                  background:active?"#2563EB":"#CBD5E1"
                }}
              >
                <Icon size={18} color="white"/>
              </div>
  
              <span style={styles.label}>
                {step.label}
              </span>
  
              {index!==steps.length-1&&(
                <div
                  style={{
                    ...styles.line,
                    background:
                      step.id<statusId
                        ? "#2563EB"
                        : "#CBD5E1"
                  }}
                />
              )}
  
            </div>
  
          );
  
        })}
  
      </div>
  
    );
  
  }
  
  const styles={
    container:{
      display:"flex",
      justifyContent:"space-between",
      alignItems:"center",
      marginTop:18
    },
    item:{
      display:"flex",
      flexDirection:"column",
      alignItems:"center",
      position:"relative",
      flex:1
    },
    circle:{
      width:42,
      height:42,
      borderRadius:"50%",
      display:"flex",
      justifyContent:"center",
      alignItems:"center"
    },
    label:{
      marginTop:8,
      fontSize:12
    },
    line:{
      position:"absolute",
      top:20,
      left:"60%",
      width:"80%",
      height:3
    }
  };
  
  export default StatusTimeline;