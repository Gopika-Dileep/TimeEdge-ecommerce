const User = require("../../models/userSchema");
const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt")


const loadlogin = async (req,res)=>{
   if(!req.session.user) {
    try {
     
        res.render("login", { message: null });
    } catch (error) {
        console.error(error);
        res.status(400).json({message:"an error occured while loading loginpage"})
    }}else{
        res.redirect('/')
    }
}

const googleAuthCallback = async (req, res) => {
    try {
        // Check if req.user exists
        if (!req.user || !req.user._id) {
            return res.redirect("/signup?error=unauthorized");
        }

        // Fetch user from the database
        const user = await User.findById(req.user._id);

        // Check if user exists
        if (!user) {
            return res.render("login", { message: "User not found" });
        }

        // Check if the user is blocked
        if (user.isBlocked === true) {
            await req.logout(); // Use await if using Passport v0.6+
            req.session.destroy((err) => {
                if (err) {
                    console.error("Error destroying session:", err);
                    return res.render("signup", { message: "User is blocked by admin" });
                }
                res.render("login", { message: "User is blocked by admin" });
            });
            return;
        }

        // If user is not blocked, set session and proceed
        req.session.user = user._id;
        res.redirect("/");
    } catch (error) {
        console.error("Error during authentication:", error);
        res.redirect("/signup?error=server");
    }
};


const login = async (req,res)=>{
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, isVerified: true });
    
        if (user) {
            if (user.isBlocked === true) {
                res.render('login', { message: "User is blocked by admin" });
            } else {
                const userPassword = await bcrypt.compare(password, user.password);
                if (userPassword) {
                    req.session.user = user._id;
                    res.redirect("/");
                } else {
                    return res.render("login", { message: "Incorrect password" });
                }
            }
        } else {
            res.render("login", { message: "User not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "An error occurred while loading the home page" });
    }
    
}
const logout = async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                return res.json({message:"error"})
            }else{
                return res.redirect('/')
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}
const loadSignup = async (req, res) => {
    try {
        res.render("signup");
    } catch (error) {
        console.error("Error loading signup page:", error);
        res.status(500).json({ message: "Error loading signup page" });
    }
};

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationMail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        };

        const info = await transporter.sendMail(mailOptions);
        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending mail:", error);
        return false;
    }
};

const signup = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        
        const existingUser = await User.findOne({ email, isVerified: true });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        
        const hashedPassword = await bcrypt.hash(password, 10);
        
      
        const otp = generateOtp();
        const emailSent = await sendVerificationMail(email, otp);
        console.log(otp,"otp")
        
        if (!emailSent) {
            return res.status(500).json({ message: "Failed to send verification email" });
        }

       
        const newUser = await new User({
            name,
            email,
            phone,
            password: hashedPassword,
            otp
        }).save();

       
        setTimeout(async () => {
            await User.updateOne({ _id: newUser._id }, { $unset: { otp: 1 } });
        }, 60000); 
        

        res.status(200).json({ userId: newUser._id });
    } catch (error) {
        console.error("Error in signup:", error);
        res.status(500).json({ message: "Error creating user" });
    }
};

const loadotp = async (req, res) => {
    try {
        const userId = req.query.id;
        res.render("otpVerification", { userId });
    } catch (error) {
        console.error("Error loading OTP page:", error);
        res.status(500).json({ message: "Error loading OTP verification page" });
    }
};

const otpverify = async (req, res) => {
    try {
        const { userId, otp } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.otp) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        await User.findByIdAndUpdate(userId, {
            isVerified: true,
            $unset: { otp: 1 }
        });

        res.status(200).json({ message: "succesfull" });
    } catch (error) {
        console.error("Error in OTP verification:", error);
        res.status(500).json({ message: "Error verifying OTP" });
    }
};



const resendOtp = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationMail(user.email, otp);
        console.log(otp,"otp")
        
        if (!emailSent) {
            return res.status(500).json({ message: "Failed to send OTP" });
        }

        user.otp = otp;
        await user.save();

        
        setTimeout(async () => {
            await User.updateOne({ _id: userId }, { $unset: { otp: 1 } });
        },60000); 

       
        res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
        console.error("Error in resend OTP:", error);
        res.status(500).json({ message: "Error sending OTP" });
    }
};

module.exports={
    loadlogin,
    loadSignup,
    signup,
    loadotp,
    otpverify,
    login,
    logout,
    resendOtp,
    googleAuthCallback
}