import mongoose ,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"

const userSchema=new Schema({
    username:{
        type:String,
        required:true,
        unique : true,
        lowercase:true,
        trim:true,
        index:true    //this is given for optimizing searching 
    },
    email:{
        type:String,
        required:true,
        unique : true,
        lowercase:true,
        trim:true,  
    },
    fullName:{
        type:String,
        required:true,
        trim:true,  
        index:true
    },
    avatar :{
        type:String,   //we will use cloudanary url
        required:true
    },
    coverImage:{
        type:String, 
    },
    watchHistory:[
        {
        type:Schema.Types.ObjectId,
        ref:"Video"
        }
    ],
    password:{
        type:String,        //password cannot be kept as a string in DB...it has to be encrypted and decrypted (challenge to be solved later)
        required:[true,"Password is required"]   //required field is true along with a custom error message (if password absent error shown)
    },
    refreshToken:{
        type:String
    }
},
{timestamps:true})

userSchema.pre("save",async function(next){
    if (!this.isModified("password")) return next();  //if password is not modified then return from this method
    this.password=bcrypt.hash(this.password , 10)  //10 is the number of rounds
    next();    //call next to go to next middleware

})    //middleware function (hook) that runs before a specific action (like save, find, remove, etc.).In this case , we are encrypting the password before saving it. 


userSchema.methods.isPasswordCorrect=async function(password){   //this is a custom method named "isPasswordCorrect" for authorization if psd is correct
   return  await bcrypt.compare(password,this.password)     //bcrypt checks this and return true or false

}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign(                                   //directly return the access token 
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullName:this.fullName

        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(                                   //directly return the access token 
        {
            _id:this._id              //we keep less info here because it gets refreshed regularly
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:REFRESH_TOKEN_EXPIRY
        }
    )
}
export const User=mongoose.model("User",userSchema)