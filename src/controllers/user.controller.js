import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken=async(userId)=>{   // method to get access and refresh token
    try{
        const user=await User.findById(userId);                 // first find the user from DB "User"
        const accessToken=user.generateAccessToken();          // then generate the tokens using the methods defined in userModel
        const refreshToken=user.generateRefreshToken();

        user.refreshToken=refreshToken;                        // set the refreshToken field of usermodel to the generated refreshToken
        await user.save({validateBeforeSave:false})            // Save the user without any validation check

        return {accessToken,refreshToken};

    }
    catch(error){
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // Validation -not empty
    // check if user already exists : check using username or email
    // check for images , check for avatar 
    // if available, upload them to cloudinary
    // create user object - create entry in db
    // remove password and refresh token field from response 
    // check for user creation 
    // return res

    const { fullName, email, username, password } = req.body   //get data from user

    if (
        [fullName, email, username, password].some((field) =>           //.some is a method to check each element of the array one by one ,and if anyone is empty,return true
            field?.trim() === "")                                  //it trims the field and after that if it is empty string then return true
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser= await User.findOne(                 //User is the model made with mongoose so it can interact with the db
        {
            $or:[{username},{email}]     //this returns the first user with the provided username or email
        }
    )
    if(existedUser){
        throw new ApiError(409,"User with email or username exists")    //if the user already exist,throw error again using helper func ApiError
    }
    const avatarLocalPath=req.files?.avatar[0]?.path   // as the avatar is passed through middleware(in routes),we need to get it from middleware using this
                                                       // ?. <- this is optional chaining, we look for avatar in storage file of multer(middleware)
                                                       // and [0] is the first object ,to that we can get the path using .path 
                                                       //and finally the avatar will be stored in avatarLocalPath from middlewre storage
    
   // const coverImageLocalPath=req.files?.coverImage[0].path

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){    //to check coverImage
        coverImageLocalPath=req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")   //check if avatar is present or not..if not throw error
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)            //upload both on cloudinary
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

   


    if(!avatar){
         throw new ApiError(400,"Avatar file is required")    // check if uploaded or not
    }
    const user=await User.create({                    //create user object - create entry in db
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    const createdUser=await User.findById(user._id).select(  //select() is a method by which we can get what we want and deselected those which we do not
        "-password -refreshToken"                         //here we need to remove password and refreshToken
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user");  //check user is present or not
    }

    return res.status(200).json(                           //this the response
        new ApiResponse(200,createdUser,"User registered successfully")       //creating a ApiResponse obj and sending the data to it
    )
})

const loginUser=asyncHandler(async(req,res)=>{
    // Take data from request body
    // username or email
    // find the user , if not found inform 
    // if user found , check passoword
    // if psd verified , generate acess and refresh token
    // send cookie

    const {username,email,password}=req.body;       //take data from request body

    if(!(username || email)){
        throw new ApiError(400,"username or email is required");
    }

    const user=await User.findOne({
        $or:[{username }, {email}]       // this operator is used to find either username or email from the DB
    })

    if(!user){
        throw new ApiError(400,"User does not exist");
    }

    const isPasswordValid=await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }

    const {accessToken,refreshToken}= await generateAccessAndRefreshToken(user._id);    // generated from the method defined above

    const loggedInUser=await User.findById(user._id).
    select("-password -refreshToken")                         // we do not send password and refreshToken to the user

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User Logged In Successfully"
        )
    )
    

})

const logoutUser=asyncHandler(async(req,res)=>{
    // Before this method , an middleware executes which gives us the user,which can be accessed over here by simply doing req.user._id
    await User.findByIdAndUpdate(                   //findByIdAndUpdate is a method which will find the user and also update the refreshToken 
        req.user._id,       
        {
            $set:{
                refreshToken:undefined               //here the refreshToken is set to undefined ,to logout the user
            }
        },{
            new:true                   //this is done to get the new updated user whenever accessed,not the old one
        }
    )
    
     const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},"User logged Out")
    )

})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request");
    }
   try {
     const decodedToken=jwt.verify(incomingRefreshToken,REFRESH_TOKEN_SECRET)
 
     const user=await User.findById(decodedToken?._id)
 
       if(!user){
         throw new ApiError(401,"Invalid refresh Token");
     }
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,"Refresh Token is expired or used");
     }
 
     const options ={
         httpOnly:true,
         secure:true
     }
 
     const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
 
     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",newRefreshToken,options)
     .json(
         new ApiResponse(
             200,
             {accessToken, refreshToken:newRefreshToken},
             "Access Token refreshed"
         )
 
     )
   } catch (error) {
    throw new ApiError(401,error?.message || "Invalid Token")
    
   }
})

export { registerUser,loginUser,logoutUser,refreshAccessToken }