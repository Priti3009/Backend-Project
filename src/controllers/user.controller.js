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

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body

    const user=await User.findById(req.user._id)   // req.user(given by middleware ) will contain the user ..from that we will extract the user using its _id
    const isPasswordCorrect=user.isPasswordCorrect(oldPassword)   //this(isPasswordCorrect) is a method in user model,which compares the password given by user to that which is saved in the db

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old Password")
    }
    user.password=newPassword    //now chnage the oldPassword to newPassword
    await user.save({validateBeforeSave:false})   //use save function to save the user,but as the saved function is async used await

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed Successfully"))   //message send to user 

})
const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200),req.user ,"Current user fetched successfully")  //req.user(it is the user we got after middleware runs) is the message send
    })

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body   //take fields that are to be updated from req.body
    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user=await User.findByIdAndUpdate(   //find the user and update the details
        res.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new:true}  //the updated user is returned if this is made true
    ).select("-password")   //remove the password and then return user

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
}) 
const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path    //we will get the avatar from req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    //TODO: delete old image after setting new avatar img

    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }
    const user=await User.findByIdAndUpdate(   //find the user and update the details
        res.user?._id,
        {
            $set:{
               avatar:avatar.url    //update the avatar in db to the new avatar url
            }
        },
        {new:true}  //the updated user is returned if this is made true
    ).select("-password") 

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Avatar updated successfully"))

}) 

const updateUserCoverImage =asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path    //we will get the coverImage from req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"coverImage file is missing")
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on Cover Image")
    }
    const user=await User.findByIdAndUpdate(   //find the user and update the details
        res.user?._id,
        {
            $set:{
               coverImage:coverImage.url    //update the coverImage in db to the new coverImage url
            }
        },
        {new:true}  //the updated user is returned if this is made true
    ).select("-password") 

    return res
    .status(200)
    .json(new ApiResponse(200,user,"coverImage updated successfully"))

}) 

const getUserChannelProfile=asyncHandler(async(req,res)=>{  //this fucntion is to get the profile details like no. of subscribers and no. of channel subscribed

    const {username}=req.params;   //get the username whose details we want from the parameters

    if(!username?.trim){                      //check if username is there 
        throw new ApiError(400,"Username is missing");
    }

    const channel=await User.aggregate([      //mongodb aggregagtion pipeline 
        {
            $match:{
                username:username?.toLowerCase()    //first it will match the username from the db and check its availability 
            }
        },
        {
            $lookup:{                         //this will aggregate both the models-user and subscription (to give the number of subscribers of a channel)
                from:"subscriptions",         // from where we are taking the data
                localField:"_id",             // current model (user)  field to search in subcriptions model
                foreignField:"channel",       // name of the field of subscriptions model(we need channel to get the number of subscribers it have)
                as:"subscribers"           //collect all document under this name
            }
        },
        {
            $lookup:{
                from:"subscriptions", 
                localField:"_id",
                foreignField:"subscriber",      //we will match the subscriber with the _id(user) to get the documents where all user_id are same  and the channel field will give the channel it(the specific user) has subscribed to
                as:"subscribedTo"
            }
        },
        {
            $addFields:{                     //add new fields to the user model
                subscribersCount:{
                    $size:"$subscribers"      // to count the number of subscribers(we take $ sign because now subscribers is a field)
                },
                channelSubscribedToCount:{
                    $size:"$subscribedTo"       //to count the number of channels a user has subscribed to
                },
                isSubscribed:{       //return true if the loggedInuser is a subscriber
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},   //checks if the subscriber(current user) is present in the subscribers list($in operator is used to compare these two)
                        then:true,
                        else:false
                    }
                } 
            }
        },
        {
            $project:{          //this operator projects the info(select which info to give )
                fullName:1,
                username:1,
                subscribersCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1

            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(400,"channel does not exists")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")   //return the 1st value of channel array so that required values can be easily found
    )
})

const getWatchHistory=asyncHandler(async(req,res)=>{
    const user=User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{                       // pipeline to join users and videos to get watch history
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[                 // another pipeline inside videos to get the user-Info of the videos  (nested pipeline)
                    {
                        $lookup:{                  //get user-info from users-db by joining _id in users and owner in videos
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",  
                            pipeline:[                //this pipeline to get some specific fields from the users
                                {
                                 $project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1
                                }
                                }
                               
                            ]

                        }

                    },
                    {
                        $addFields:{        // to get the 1st element of the array 
                            owner:{    
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,     //only send 1st element of array
            "Watch History fetched successfully"
        )
    )
})
export {
     registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken ,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}