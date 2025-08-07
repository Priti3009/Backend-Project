import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";

cloudinary.config({    //this configuartion allows for file handling (give the account and login )
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary=async function(localFilePath){
    try{
        if(!localFilePath)  return null;

        //upload file on clodinary
       const response= await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })

        //file has been uploaded successfully
        //console.log("File is uploaded on cloudinary" , response.url)  <-  to check file is uploaded or not
        fs.unlinkSync(localFilePath);        //unlink(remove) the file from local server after upload to cloudinary
        return response;


    }catch(error){
        fs.unlinkSync(localFilePath)   //remove the locally saved temporary file as the upload operation got failed
        return null; 

    }
}

export {uploadOnCloudinary}