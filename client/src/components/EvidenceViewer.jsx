import { Image, FileText } from "lucide-react";

function EvidenceViewer({ files=[] }){

  if(files.length===0){

    return(
      <div style={styles.empty}>
        No evidence uploaded.
      </div>
    );

  }

  return(
    <div style={styles.container}>

      {files.map(file=>{

        const isImage=
          file.file_type?.startsWith("image");

        return(

          <div
            key={file.file_id}
            style={styles.card}
          >

            {isImage && file.file_url ? (

              <img
                src={file.file_url}
                alt={file.file_name}
                style={styles.image}
              />

            ):(

              <div style={styles.pdfBox}>
                <FileText size={40}/>
              </div>

            )}

            <div style={styles.info}>

              {isImage ? (
                <Image size={18}/>
              ):(
                <FileText size={18}/>
              )}

              <div>
                <span>{file.file_name}</span>
                <small style={styles.meta}>CID: {file.ipfs_cid}</small>
                {file.file_url && (
                  <a href={file.file_url} target="_blank" rel="noreferrer" style={styles.link}>
                    Open evidence
                  </a>
                )}
                {file.file_hash && (
                  <small style={styles.meta}>SHA-256: {file.file_hash}</small>
                )}
              </div>

            </div>

          </div>

        );

      })}

    </div>
  );

}

const styles={

  container:{
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
    gap:16,
    marginTop:16
  },

  card:{
    background:"#F8FAFC",
    borderRadius:12,
    overflow:"hidden",
    boxShadow:"0 4px 12px rgba(0,0,0,.08)"
  },

  image:{
    width:"100%",
    height:150,
    objectFit:"cover"
  },

  pdfBox:{
    height:150,
    display:"flex",
    justifyContent:"center",
    alignItems:"center",
    background:"#E2E8F0"
  },

  info:{
    display:"flex",
    gap:8,
    alignItems:"center",
    padding:10,
    fontSize:13
  },

  meta:{
    display:"block",
    marginTop:4,
    color:"#64748B",
    fontSize:11,
    wordBreak:"break-all"
  },

  link:{
    display:"block",
    marginTop:4,
    color:"#2563EB",
    fontSize:11
  },

  empty:{
    background:"#F8FAFC",
    padding:18,
    borderRadius:10,
    color:"#64748B",
    textAlign:"center"
  }

};

export default EvidenceViewer;