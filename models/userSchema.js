const mongoose = require("mongoose")

const userSchema = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    phone:{
        type:Number,
        required:false,
    },
    password:{
        type:String,
        required:false,
    },
    googleId: { 
        type: String, 
        unique: true, 
        sparse: true 
    },
    otp:{
        type:String,
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    isBlocked:{
        type:Boolean,
        default:false
    }
})


const User = mongoose.model("User",userSchema)
module.exports= User