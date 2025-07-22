import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"; //It’s a Mongoose plugin that lets  easily paginate results when using aggregation.Normally, pagination with aggregation in Mongoose is not built-in — this plugin solves that.

const videoSchema=new Schema({
    videoFile:{
        type:String,   //cloudanary url
        required:true
    },
    thumbnail:{
        type:String,   //cloudanary url
        required:true
    },
    title:{
        type:String,   
        required:true
    },
    description:{
        type:String,   
        required:true
    },
    duration:{
        type:Number,   //cloudanary url (it send info about the videos uploaded there,so we can get duration from there)
        required:true
    },
    views:{
        type:Number,   
        default:0
    },
    isPublished:{
        type:Boolean,   
        default:true
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
    
},
{timestamps:true})

videoSchema.plugin(mongooseAggregatePaginate) //plugin(...): A method provided by Mongoose to extend schema functionality.

export const Video=mongoose.model("Video",videoSchema)