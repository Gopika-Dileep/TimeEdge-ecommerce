const User = require("../../models/userSchema");
const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt")


const loadlogin = async (req,res)=>{
    try {
     
        res.render("login")
    } catch (error) {
        console.error(error);
        res.status(400).json({message:"an error occured while loading loginpage"})
    }
}
const login = async (req,res)=>{
    try {
        const {email,password } = req.body
        const user = await User.findOne({email,isVerified:true})
        if(user){
            if(user.isBlocked==true){
                res.render('login',{message:"User is blocked by admin"})
            }else{
                const userPassword = await bcrypt.compare(password,user.password)
                if(userPassword){
                    req.session.user= user._id
                    res.redirect("/")
                }
            }
        }else{
            res.status(400).json({message:"user not found"})
        }
    } catch (error) {
        console.error(error)
        res.status(400).json({message:"an error occured while loading home page"})
    }
}

const loadSignup = async(req,res)=>{
    try {
        res.render("signup")
    } catch (error) {
        console.error(error)
        res.status(400).json({message:"error while loading signup "})
    }
}

function  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();

}

async function sendVerificationMail(email,otp){
    try {
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:true,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const sendemail = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"verify your account",
            text:`your otp is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        })
    
        return sendemail.accepted.length>0;
    } catch (error) {
        console.error("Error sending mail", error);
        return false;
    }
}

const signup = async(req,res)=>{
    try {
        const {name,email,password,phone}=req.body
        const existUser=await User.findOne({email},{isVerified:true})
        if(existUser){
            res.status(400).json({message:"user already exist"})   
        }else{
            const securepassword= await bcrypt.hash(password,10)
            const otp = generateOtp()
            console.log(otp,"otp")
            const emailsend= await sendVerificationMail(email,otp)
            const newUser = await new User({
                name,
                email,
                phone,
                password:securepassword,
                otp
            }).save()
            setTimeout(async ()=>{
               await User.updateOne({email:email},{$unset:{otp:1}})
            },60000)
            const userId=newUser._id
            
            res.status(200).json({ userId }); 
        }
    } catch (error) {
        console.error(error)
        res.status(400).json({message:"error while creating user "})
    }
}
const loadotp = async (req,res)=>{
   try {
        res.render("otpVerification")
   } catch (error) {
    console.error(error);
    res.status(400).json({message:"cannot find email"})
   }
}
const otpverify= async(req,res)=>{ 
    try {
        const {userId,otp}=req.body
        const user=await User.findById({_id:userId})
        const userOtp=user.otp
        if(userOtp===otp){
            const saveUser = await User.findByIdAndUpdate({_id:userId},{isVerified:true},{new:true})
       return res.status(200).json({message:"succesfull"})
        }else{
            return res.status(404).json({message:"invalid otp"})
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({message:"cannot find email"})
    }
}

module.exports={
    loadlogin,
    loadSignup,
    signup,
    loadotp,
    otpverify,
    login,
   
}