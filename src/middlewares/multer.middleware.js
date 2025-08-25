import multer from "multer";      //multer is a middleware for handling multipart/form-data (file uploads).

const storage = multer.diskStorage({
    destination:function (req,file,cb){
        cb(null,"./public/temp")   // Save uploaded files in this folder
    },
    filename :function(req,file,cb){
        cb(null,file.originalname)  // Use the original file name
    }
})

export const upload = multer({
    storage,
})