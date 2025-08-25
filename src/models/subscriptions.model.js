import mongoose, {Schema} from "mongoose";

const subscriptionSchema=new Schema({
    subscriber:{
        type:Schema.Types.ObjectId,         //one who is subscribing (subscriber is basically a User only)
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,         // to whom subscriber is subscribing (Channel is basically a User only)
        ref:"User"
    }
},{
    timestamps:true
})
export const Subscription=mongoose.model("Subscription",subscriptionSchema)