const { STATUS_CODES, MESSAGES } = require("../../helpers/constants");
const User = require("../../models/userSchema");
const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt")


const loadlogin = async (req,res)=>{
   if(!req.session.user) {
    try {
        const message = req.query.error || null;
        res.render("login", { message });
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.BAD_REQUEST).json({message:MESSAGES.USER_AUTH.LOGIN_PAGE_ERROR})
    }}else{
        res.redirect('/')
    }
}

const googleAuthCallback = async (req, res) => {
    try {
        
        if (!req.user || !req.user._id) {
            return res.redirect("/signup?error=unauthorized");
        }

        
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.redirect("/login?error=" + encodeURIComponent(MESSAGES.USER_AUTH.USER_NOT_FOUND));
        }

       
        if (user.isBlocked === true) {
            await req.logout(); 
            req.session.destroy((err) => {
                res.redirect("/login?error=" + encodeURIComponent(MESSAGES.USER_AUTH.USER_BLOCKED));
            });
            return;
        }

        
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
        const user = await User.findOne({ email });
    
        if (user) {
            if (user.isVerified === false) {
                return res.redirect('/login?error=' + encodeURIComponent(MESSAGES.USER_AUTH.UNVERIFIED_EMAIL));
            }
            if (user.isBlocked === true) {
                return res.redirect('/login?error=' + encodeURIComponent(MESSAGES.USER_AUTH.USER_BLOCKED));
            }
            const userPassword = await bcrypt.compare(password, user.password);
            if (userPassword) {
                req.session.user = user._id;
                res.redirect("/");
            } else {
                return res.redirect("/login?error=" + encodeURIComponent(MESSAGES.USER_AUTH.INCORRECT_PASSWORD));
            }
        } else {
            return res.redirect("/login?error=" + encodeURIComponent(MESSAGES.USER_AUTH.USER_NOT_FOUND));
        }
    } catch (error) {
        console.error(error);
        res.redirect("/login?error=" + encodeURIComponent(MESSAGES.USER_AUTH.HOME_PAGE_ERROR));
    }
    
}
const logout = async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                return res.json({message:MESSAGES.USER_AUTH.GENERIC_ERROR})
            }else{
                return res.redirect('/')
            }
        })
    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}
const loadSignup = async (req, res) => {
    try {
        res.render("signup");
    } catch (error) {
        console.error("Error loading signup page:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.USER_AUTH.SIGNUP_PAGE_ERROR });
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
            subject: "Verify your account — TimeEdge",
            html: `
            <div style="font-family: 'Inter', sans-serif; background-color: #080808; color: #f0ede8; padding: 40px; text-align: center; border: 1px solid rgba(201,168,76,0.2); max-width: 500px; margin: auto;">
                <h2 style="color: #c9a84c; font-family: 'Playfair Display', serif; font-size: 24px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 20px;">TIME EDGE</h2>
                <p style="color: #a09484; font-size: 14px; margin-top: 20px; line-height: 1.6;">Thank you for starting your journey with TimeEdge. Use the verification code below to activate your account:</p>
                <div style="font-size: 32px; font-weight: bold; color: #c9a84c; letter-spacing: 5px; margin: 30px 0; padding: 15px 30px; background-color: #111111; display: inline-block; border: 1px dashed rgba(201,168,76,0.4); min-width: 160px;">
                    ${otp}
                </div>
                <p style="color: #5a5248; font-size: 12px; margin-top: 30px;">This code is valid for 60 seconds. Do not share this OTP with anyone.</p>
                <div style="border-top: 1px solid rgba(201,168,76,0.1); margin-top: 40px; padding-top: 20px; font-size: 11px; color: #5a5248;">
                    Fine Horology & Luxury Timepieces
                </div>
            </div>
            `
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
        
        // Backend Validation
        if (!name || name.trim().length < 3) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.USER_AUTH.INVALID_USERNAME });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.USER_AUTH.INVALID_EMAIL });
        }
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phone || !phoneRegex.test(phone)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.USER_AUTH.INVALID_PHONE });
        }
        if (!password || password.length < 8 || !/(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/.test(password)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.USER_AUTH.WEAK_PASSWORD });
        }
        
        const existingUser = await User.findOne({ email, isVerified: true });
        if (existingUser) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.USER_AUTH.DUPLICATE_EMAIL });
        }

        // Clean up previous unverified registrations for this email
        await User.deleteMany({ email, isVerified: false });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const otp = generateOtp();
        const emailSent = await sendVerificationMail(email, otp);
        console.log(otp, "otp");
        
        if (!emailSent) {
            return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.USER_AUTH.EMAIL_SEND_FAILED });
        }
       
        const newUser = await new User({
            name,
            email,
            phone,
            password: hashedPassword,
            otp
        }).save();

        setTimeout(async () => {
            await User.updateOne({ _id: newUser._id, isVerified: false }, { $unset: { otp: 1 } });
        }, 60000); 
        
        res.status(STATUS_CODES.OK).json({ userId: newUser._id });
    } catch (error) {
        console.error("Error in signup:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.USER_AUTH.CREATE_USER_ERROR });
    }
};

const loadotp = async (req, res) => {
    try {
        const userId = req.query.id;
        res.render("otpVerification", { userId });
    } catch (error) {
        console.error("Error loading OTP page:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.USER_AUTH.OTP_PAGE_ERROR });
    }
};

const otpverify = async (req, res) => {
    try {
        const { userId, otp } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: MESSAGES.USER_AUTH.USER_NOT_FOUND });
        }

        if (!user.otp) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.USER_AUTH.OTP_EXPIRED });
        }

        if (user.otp !== otp) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.USER_AUTH.OTP_INVALID });
        }

        await User.findByIdAndUpdate(userId, {
            isVerified: true,
            $unset: { otp: 1 }
        });

        res.status(STATUS_CODES.OK).json({ message: MESSAGES.USER_AUTH.VERIFY_SUCCESS });
    } catch (error) {
        console.error("Error in OTP verification:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.USER_AUTH.OTP_VERIFY_ERROR });
    }
};



const resendOtp = async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Cooldown check
        const now = Date.now();
        if (req.session.lastOtpTime && (now - req.session.lastOtpTime < 60000)) {
            const waitSecs = Math.ceil((60000 - (now - req.session.lastOtpTime)) / 1000);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.USER_AUTH.OTP_RESEND_WAIT(waitSecs) });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: MESSAGES.USER_AUTH.USER_NOT_FOUND });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationMail(user.email, otp);
        console.log(otp,"otp")
        
        if (!emailSent) {
            return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.USER_AUTH.OTP_SEND_FAILED });
        }

        req.session.lastOtpTime = now;
        user.otp = otp;
        await user.save();

        setTimeout(async () => {
            await User.updateOne({ _id: userId, isVerified: false }, { $unset: { otp: 1 } });
        }, 60000); 

        res.status(STATUS_CODES.OK).json({ message: MESSAGES.USER_AUTH.OTP_SEND_SUCCESS });
    } catch (error) {
        console.error("Error in resend OTP:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.USER_AUTH.OTP_SEND_ERROR });
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