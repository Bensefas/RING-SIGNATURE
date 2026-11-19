const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadDirectory = path.resolve(__dirname, "..", "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({

  destination(req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename(req,file,cb){

    const unique =
      Date.now()+"-"+Math.round(Math.random()*1e9);

    cb(
      null,
      unique+path.extname(file.originalname)
    );

  }

});

const fileFilter=(req,file,cb)=>{

  const allowed=[
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
  ];

  if(allowed.includes(file.mimetype)){
    cb(null,true);
  }else{
    cb(new Error("Unsupported file type."));
  }

};

module.exports=multer({

  storage,
  fileFilter,
  limits:{
    fileSize:10*1024*1024
  }

});