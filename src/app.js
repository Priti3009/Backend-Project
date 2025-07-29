import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors"

const app=express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,   //the request can come only through the origin which is the frontend ,so cors_origin defines in .env is used here
    Credential:true
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))  //when data comes from url
app.use(express.static("public")) //express configuration to store any images or pdf files in the server itself 
app.use(cookieParser());

//import routes
import userRouter from './routes/user.routes.js'

//routes declaration
app.use("/api/v1/users",userRouter); //control goes to userRouter.js (  http://localhost:8000/api/v1/users/register or  http://localhost:8000/api/v1/users/login)

export {app};