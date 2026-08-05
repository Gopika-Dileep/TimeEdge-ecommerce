const { STATUS_CODES, MESSAGES } = require("../../helpers/constants");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const Cart = require("../../models/cartSchema");
const env = require("dotenv").config();
const Wallet = require('../../models/walletSchema');

const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById({ _id: userId });
        const orders = await Order.find({ user: userId }).sort({ createdOn: -1 })
            .populate({
                path: 'orderedItems.products',
                model: 'Product'
            });

        const userAddress = await Address.findOne({ userId: userId });
        const wallet = await Wallet.findOne({ userId: req.session.user });

        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const totalOrders = orders.length;
        const totalpage = Math.ceil(totalOrders / limit);
        const currentOrders = orders.slice((page - 1) * limit, page * limit);

        res.render("", {
            user: userData,
            wallet,
            userAddress: userAddress,
            orders: currentOrders,
            currentpage: page,
            totalpage: totalpage
        });
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
    }
}

const changeEmail = async(req,res)=>{
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        res.render('change-email', { path: '/change-email', user })
    } catch (error) {
       console.error(error)
       res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR}) 
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

const changeEmailValid = async(req,res)=>{
    try {
        const {email}=req.body
        const userId = req.session.user;
        const currentUser = await User.findById(userId);

        if (!email) {
            return res.render('change-email', { path: '/change-email', user: currentUser, message: MESSAGES.USER_PROFILE.EMAIL_REQUIRED });
        }

        // If the user enters their current email address
        if (email.toLowerCase() === currentUser.email.toLowerCase()) {
            return res.render('change-email', { path: '/change-email', user: currentUser, message: MESSAGES.USER_PROFILE.SAME_EMAIL });
        }

        // If the entered email already belongs to another user
        const existUser = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (existUser) {
            return res.render('change-email', { path: '/change-email', user: currentUser, message: MESSAGES.USER_PROFILE.EMAIL_TAKEN });
        }

        // Send verification OTP to the new email address
        const otp = generateOtp()
        const emailsend = await sendVerificationMail(email, otp)
        console.log("OTP sent to new email:", otp)
        
        if (emailsend) {
            await User.updateOne({ _id: userId }, { $set: { otp: otp } })
            req.session.tempNewEmail = email; // Store the new email in session

            // Clear OTP in 60 seconds
            setTimeout(async () => {
                await User.updateOne({ _id: userId }, { $unset: { otp: 1 } })
            }, 60000)

            return res.render('change-email-otp', { success: MESSAGES.USER_PROFILE.OTP_SENT_NEW })
        } else {
            return res.render('change-email', { path: '/change-email', user: currentUser, message: MESSAGES.USER_PROFILE.OTP_SEND_ERROR })
        }
    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}

const verifyEmailOtp = async(req,res)=>{
    try {
        const {otp}=req.body
        const userId = req.session.user;
        const user = await User.findById({_id:userId})
        const userOtp = user.otp
        if (userOtp && userOtp === otp) {
            const newEmail = req.session.tempNewEmail;
            if (!newEmail) {
                return res.render('change-email', { path: '/change-email', user, message: MESSAGES.USER_PROFILE.SESSION_EXPIRED });
            }

            // Update user email
            await User.findByIdAndUpdate(userId, { $set: { email: newEmail } });
            // Clean up OTP and session variable
            await User.updateOne({ _id: userId }, { $unset: { otp: 1 } });
            delete req.session.tempNewEmail;

            const updatedUser = await User.findById(userId);
            return res.render('change-email', { path: '/change-email', user: updatedUser, successMessage: MESSAGES.USER_PROFILE.EMAIL_UPDATED });
        } else {
            return res.render('change-email-otp', { message: MESSAGES.USER_PROFILE.INVALID_OTP });
        }
    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}

const updateEmail=async(req,res)=>{
    res.redirect('/accountdetails');
}

const securepassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {
           console.error(error)
           res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}

const newChangePassword = async(req,res)=>{
    try {
        const userId = req.session.user

        const {confirmPassword,newPassword,currentPassword} = req.body
        const user = await User.findById({_id:userId})

        if(newPassword!==confirmPassword){
            return res.render('newchangepassword', {
                path: '/password',
                user,
                message: MESSAGES.USER_PROFILE.CONFIRM_PASSWORD_MISMATCH
            });
        }
        
        if (!user.password) {
            const passwordHash = await securepassword(newPassword);
            user.password = passwordHash;
            await user.save();
            return res.render('newchangepassword', {
                path: '/password',
                user,
                success: "Password set successfully!"
            });
        }

        const passwordMatch = await bcrypt.compare(currentPassword,user.password)
        if(!passwordMatch){
            return res.render('newchangepassword', {
                path: '/password',
                user,
                message: MESSAGES.USER_PROFILE.PASSWORD_MISMATCH
            });
        }

        const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
        if (isSameAsCurrent) {
            return res.render('newchangepassword', {
                path: '/password',
                user,
                message: "New password cannot be the same as the current password."
            });
        }

        const passwordHash= await securepassword(newPassword)
        user.password = passwordHash

        await user.save()
        return res.render('newchangepassword', {
            path: '/password',
            user,
            success: "Password updated successfully!"
        });
    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}

const getForgotPassPage = async (req,res)=>{
    try {
        res.render("forgot-password",{message:""});
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const forgotEmailValid = async(req,res)=>{
     try {
        const {email} = req.body;
        const findUser = await User.findOne({email:email});

        if(findUser){
            const otp = generateOtp()
            const emailsend = await sendVerificationMail(email,otp);
            console.log(otp,'otp')
            if(emailsend){

               await User.updateOne({email:email},{$set:{otp:otp}})

               setTimeout(async()=>{
                await User.updateOne({email:email},{$unset:{otp:1}})
               },60000)
               res.render("forgotPass-otp",{email}) 
            }else{
                res.render('forgot-password',{message:MESSAGES.USER_PROFILE.EMAIL_SEND_ERROR})
            }
        }else{
            res.render('forgot-password',{message:MESSAGES.USER_AUTH.USER_NOT_FOUND})
        }
     } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
     }
}

const verifyForgotPassOtp = async(req,res)=>{
    try {
        const {otp,email} = req.body
        console.log(req.body,'req.body')
  
        const user = await User.findOne({email:email})
        const userOtp=user.otp
        if(userOtp===otp){
            res.json({success:true,redirectUrl:`/reset-password?email=${encodeURIComponent(email)}`});

        }else{
            res.json({success:false,message:MESSAGES.USER_PROFILE.OTP_MISMATCH})
        }
        
        
    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}
const resendOtp = async(req,res)=>{
    try {
        const {email} = req.body
        
        // Cooldown check
        const now = Date.now();
        if (req.session.lastOtpTime && (now - req.session.lastOtpTime < 60000)) {
            const waitSecs = Math.ceil((60000 - (now - req.session.lastOtpTime)) / 1000);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: `Please wait ${waitSecs} seconds before resending OTP.` });
        }

        const findUser = await User.findOne({email:email})
        if(findUser){
            const otp = generateOtp()
            console.log(otp,'otp')
            const emailsend = await sendVerificationMail(email,otp);
            if(emailsend){
                req.session.lastOtpTime = now;
                await User.updateOne({email:email},{$set:{otp:otp}})

                setTimeout(async()=>{
                     await User.updateOne({email:email},{$unset:{otp:1}})
                },60000)
                res.status(STATUS_CODES.OK).json({success:true,message:MESSAGES.USER_PROFILE.OTP_RESENT})
            } else {
                res.status(STATUS_CODES.BAD_REQUEST).json({success:false,message:MESSAGES.USER_PROFILE.OTP_SEND_ERROR})
            }
        } else {
            res.status(STATUS_CODES.NOT_FOUND).json({success:false,message:MESSAGES.USER_AUTH.USER_NOT_FOUND})
        }
    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}

const changePassword = async(req,res)=>{
    try {
        const userId = req.session.user
        const user = await User.findById({_id:userId})
        res.render('newchangepassword',{
            path:'/password',
            user
        });
    } catch (error) {
       console.error(error)
       res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}

const changePasswordValid = async(req,res)=>{
    try {
        const {email}=req.body
        const existUser=await User.findOne({email})
        if(existUser){
            const otp = generateOtp()
            const emailsend=await sendVerificationMail(email,otp)
            console.log(otp, 'otp')
        if(emailsend){
            await User.updateOne({email:email},{$set:{otp:otp}})
            
            setTimeout(async()=>{
                await User.updateOne({email:email},{$unset:{otp:1}})

            },60000)

            res.render('change-password-otp',{message:MESSAGES.USER_PROFILE.EMAIL_SENT})
        }else{
            res.render('change-password',{message:MESSAGES.USER_PROFILE.EMAIL_SEND_ERROR})
        }

    }else{
        res.render('change-password',{message:MESSAGES.USER_AUTH.USER_NOT_FOUND})

    }
    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}


const verifychangePasswordOtp = async(req,res)=>{
    try {
        const {otp,email}=req.body
        const userId = req.session.user;
        const user = await User.findOne({email:email})
        const userOtp = user.otp
        if(userOtp===otp){
            res.json({success:true,redirectUrl:'/reset-password'})
        }else{
            res.json({success:false,message:MESSAGES.USER_PROFILE.OTP_MISMATCH})
        }

    } catch (error) {
       console.error(error)
       res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR}) 
    }
}

const getResetPassPage = async (req,res)=>{
    try {
        res.render("reset-password");

    } catch (error) {
        res.redirect("/pageerror")
    }
}



const postNewPassword = async(req,res)=>{
    try {
        const {newPassword,confirmPassword,email}=req.body
        if (newPassword===confirmPassword){
         const passwordHash = await securepassword(newPassword);
         const userdata = await User.findOne({email:email})
         const user = await User.updateOne({email:email},{$set:{password:passwordHash}})
         return res.json({ success: true, redirectUrl: "/login" });
        }else{
            res.render("reset-password",{message:MESSAGES.USER_PROFILE.PASSWORDS_DO_NOT_MATCH});
        }

    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}

const addAddress = async (req,res)=>{
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        res.render('add-address',{user:user})
    } catch (error) {
        console.error(error);
        res.redirect("/pageNotFound");
    }
}

const postAddAddress = async(req,res)=>{
    try {
        const userId = req.session.user
        if (!userId) {
            return res.redirect('/login');
        }
        const {addressType,name,city,landMark,state,pincode,phone,altPhone} = req.body
        const userAddress = await Address.findOne({userId: userId})
        if(!userAddress){
            const newaddress = new Address({
                userId: userId,
                address:[{addressType,name,city,landMark,state,pincode,phone,altPhone}]
            })
            await newaddress.save()
        }else{
           userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone})
           await userAddress.save()
        }
        res.redirect('/address')

    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}

// const editAddress = async(req,res)=>{
//        try {
//         const AddressId = req.query.id;
//         const user = req.session.user;
//         const currentAdd= await Address.findById({_id:AddressId})
//         res.render('edit-address',{currentAdd:currentAdd,user:user})
//        } catch (error) {
//           console.error(error)
//           res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
//        }
// }

const editAddress = async (req,res)=>{
    try {
        const addressId = req.query.id;
        const userId = req.session.user;
        const user = await User.findById(userId);
        const currAddress = await Address.findOne({
            "address._id": addressId,
        })
 
        if(!currAddress){
            return res.redirect("/pageNotFound")
        }

        const addressData = currAddress.address.find((item)=>{
            return item._id.toString()===addressId.toString();
        })

        if(!addressData){
            return res.redirect('/pageNotFound')
        }
        res.render("edit-address",{address : addressData, user:user})
    } catch (error) {
      console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}

const postEditAddress = async(req,res)=>{
    try {
        const {addressType,name,city,landMark,state,pincode,phone,altPhone}=req.body
        const addressId = req.query.id
        const findAddress = await Address.findOne({"address._id":addressId})
        if(findAddress){
            await Address.updateOne({'address._id':addressId},
                {$set:{
                    'address.$':{
                        id:addressId,
                        addressType:addressType,
                        name:name,
                        city:city,
                        landMark:landMark,
                        state:state,
                        pincode:pincode,
                        phone:phone,
                        altPhone:altPhone

                    }
                }

                 
            })
          res.redirect("/address")

        }
    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}

const deleteAddress = async(req,res)=>{
    try {
        const addressId = req.query.id;
        const findAddress = await Address.findOne({"address._id":addressId})
        if(findAddress){
            await Address.updateOne({"address._id":addressId},{$pull:{address:{_id:addressId}}})

        }
        res.redirect("/address")
    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}
// -------------------------------------------
const getOrderlistPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById({_id:userId});
    
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const search = req.query.search || '';
    
    const orders = await Order.find({ user: userId })
      .sort({ createdOn: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('orderedItems.products');

    const count = await Order.countDocuments({ user: userId });
    const totalpage = Math.ceil(count / limit);

    res.render('userorderlist', {
      path: '/orders',
      user,
      orders,
      currentpage: page,
      totalpage,
      totalOrders: count,
      search
    });
    
  } catch (error) {
    console.log(error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.SERVER_ERROR });
  }
}

const getAddressPage = async(req,res)=>{
    try {
        const userId = req.session.user
    const user = await User.findById({_id:userId})

        const userAddress = await Address.findOne({ userId: userId });
        res.render('useraddress',{path:'/address',userAddress,user})
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}
 
const getProfilePage = async(req,res)=>{
    try {
        const userId = req.session.user
        const user = await User.findById({_id:userId})
        res.render('userprofile',{path:'/accountdetails',user})
    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}
const getWalletPage = async(req,res)=>{
    try {
        const userId = req.session.user
        const user = await User.findById({_id:userId})
        const wallet = await Wallet.findOne({ userId:userId});

        const page = parseInt(req.query.page) || 1;
        const limit = 10; 
        if (wallet && wallet.transactions) {
            const totalTransactions = wallet.transactions.length;
            const totalpage = Math.ceil(totalTransactions / limit);
            
            wallet.transactions = wallet.transactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice((page - 1) * limit, page * limit);

            res.render('userwallet', {
                path: "/wallet",
                user,
                wallet,
                currentpage: page,
                totalpage
            });
        } else {
            res.render('userwallet', {
                path: "/wallet",
                user,
                wallet,
                currentpage: 1,
                totalpage: 1
            });
        }

    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({message:MESSAGES.SERVER_ERROR})
    }
}

const resendChangeEmailOtp = async (req, res) => {
    try {
        const userId = req.session.user;
        const newEmail = req.session.tempNewEmail;
        if (!newEmail) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Session expired. Please try changing your email again." });
        }

        // Cooldown check
        const now = Date.now();
        if (req.session.lastChangeEmailOtpTime && (now - req.session.lastChangeEmailOtpTime < 60000)) {
            const waitSecs = Math.ceil((60000 - (now - req.session.lastChangeEmailOtpTime)) / 1000);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: `Please wait ${waitSecs} seconds before resending OTP.` });
        }

        const otp = generateOtp();
        console.log("Resent OTP to new email:", otp);
        const emailsend = await sendVerificationMail(newEmail, otp);
        if (emailsend) {
            req.session.lastChangeEmailOtpTime = now;
            await User.updateOne({ _id: userId }, { $set: { otp: otp } });

            // Clear OTP in 60 seconds
            setTimeout(async () => {
                await User.updateOne({ _id: userId }, { $unset: { otp: 1 } });
            }, 60000);

            return res.status(STATUS_CODES.OK).json({ success: true, message: "OTP has been resent successfully." });
        } else {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Failed to send verification email. Please try again." });
        }
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR });
    }
};

module.exports={
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    resendChangeEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifychangePasswordOtp,
    getResetPassPage,
    postNewPassword,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    resendOtp,
    newChangePassword,
    getOrderlistPage,
    getAddressPage,
    getProfilePage,
    getWalletPage
}
