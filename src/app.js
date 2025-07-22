import cookieParser from "cookie-parser";
import express from "express";

const app=express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,   //the request can come only through the origin which is the frontend ,so cors_origin defines in .env is used here
    Credential:true
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))  //when data comes from url
app.use(express.static("public")) //express configuration to store any images or pdf files in the server itself 
app.use(cookieParser());
export {app};