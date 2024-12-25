const mongoose = require("mongoose")
const dotenv=require("dotenv").config()

const uri=process.env.MONGO_URI
const dbconnect= async ()=>{
    try {
        await mongoose.connect(uri)
        console.log("db connected")
    } catch (error) {
        console.error("db connection failed")

    }
}
module.exports = dbconnect