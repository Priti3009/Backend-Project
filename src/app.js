import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors"

const app=express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,   //the request can come only through the origin which is the frontend ,so cors_origin defines in .env is used here
    credentials:true
}))
app.use(express.json({limit:"16kb"}))            //when data comes from json, this middleware parse it to normal js object.
app.use(express.urlencoded({extended:true,limit:"16kb"}))  //when data comes from url-encoded(HTML forms), this middleware parse it to normal js object.
app.use(express.static("public"))     //Tells Express to serve static files (images, PDFs, CSS, etc.) from the public folder.(http://localhost:8000/logo.png  if file inside public folder)
app.use(cookieParser());         //middleware to parse the cookies (req.cookies)

//import routes
import userRouter from './routes/user.routes.js'

//routes declaration
app.use("/api/v1/users",userRouter); //Mounts the userRouter at /api/v1/users.Control goes to user.routes.js (  http://localhost:8000/api/v1/users/register )

export {app};