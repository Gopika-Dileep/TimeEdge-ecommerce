const express = require("express")
const session = require("express-session")
const app = express()
const path = require("path")
const dotenv = require("dotenv")
const userRouter = require("./router/userRouter")
const adminRouter = require("./router/adminRouter")

const dbconnect = require("./config/db")
dotenv.config()
dbconnect()

const PORT = process.env.PORT

app.use(session({
    secret:process.env.SECRET_KEY,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:true,
        httpOnly:true,
        maxAge:72*60*60*1000

    }
}))


app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
            

app.use("/",userRouter)
app.use("/admin",adminRouter)


app.listen(PORT,()=>{
    console.log(`server is running ${PORT}` );
})