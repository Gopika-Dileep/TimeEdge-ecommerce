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
        res.status(500).json({ message: "server error" });
    }
}

const changeEmail = async(req,res)=>{
    try {
        res.render('change-email')
    } catch (error) {
       console.error(error)
       res.status(500).json({message:"server error"}) 
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

            res.render('change-email-otp',{message:"email send to your mail"})
        }else{
            res.render('change-email',{message:"error while sending mail"})
        }

    }else{
        res.render('change-email',{message:"user not found"})

    }

    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}

const verifyEmailOtp = async(req,res)=>{
    try {
        const {otp}=req.body
        const userId = req.session.user;
        const user = await User.findById({_id:userId})
        const userOtp = user.otp
        if(userOtp===otp){
            res.render('new-email')
        }else{
            res.render('change-email-otp',{message:"invalid otp"})
        }
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}

const updateEmail=async(req,res)=>{
    try {
        const {newEmail}=req.body
        const userId = req.session.user
        const user=await User.findByIdAndUpdate({_id:userId},{$set:{email:newEmail}},{new:true})
        res.redirect('/')

    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }

}

const securepassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {
           console.error(error)
           res.status(500).json({message:"server error"})
    }
}

const newChangePassword = async(req,res)=>{
    try {
        const userId = req.session.user

        const {confirmPassword,newPassword,currentPassword} = req.body
        const user = await User.findById({_id:userId})
        const passwordMatch = await bcrypt.compare(currentPassword,user.password)
        if(!passwordMatch){
               return res.status(400).json({message:"current password is not matching"})
        }
        if(newPassword!==confirmPassword){
            return res.status(400).json({message:"confirmpassword not matching"})
        }
        // const diffpass = await bcrypt.compare(currentPassword,newPassword)
        // if(diffpass){
        //    return res.status(400).json({message:"new password should be different from old password"})
        // }
        const passwordHash= await securepassword(newPassword)
        user.password = passwordHash

        await user.save()
       return res.redirect('/accountdetails')
    } catch (error) {
        console.error(error)
        res.status(500).json({message:'server error'})
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
                res.render('forgot-password',{message:"error while sending mail"})
            }
        }else{
            res.render('forgot-password',{message:'user not found'})
        }
     } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
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
            res.json({success:false,message:"OTP not matching"})
        }
        
        
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}
const resendOtp = async(req,res)=>{
    try {
        const {email} = req.body
        console.log(req.body,'req.body')
        const findUser = await User.findOne({email:email})
        console.log(findUser,'findUser')
        if(findUser){
            const otp = generateOtp()
            console.log(otp,'otp')
            const emailsend = await sendVerificationMail(email,otp);
            if(emailsend){
                await User.updateOne({email:email},{$set:{otp:otp}})

                setTimeout(async()=>{
                     await User.updateOne({email:email},{$unset:{otp:1}})
                },60000)
                res.status(200).json({success:true,message:"Otp resent successfully"})

        }else{
            res.status(400).json({success:false,message:"error while sending otp"})
        }
    }
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
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
       res.status(500).json({message:"server error"})
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

            res.render('change-password-otp',{message:"email send to your mail"})
        }else{
            res.render('change-password',{message:"error while sending mail"})
        }

    }else{
        res.render('change-password',{message:"user not found"})

    }
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
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
            res.json({success:false,message:"OTP not matching"})
        }

    } catch (error) {
       console.error(error)
       res.status(500).json({message:"server error"}) 
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
            res.render("reset-password",{message:"Passwords do not match"});
        }

    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}

const addAddress = async (req,res)=>{
    try {
        const user = req.session.user;
        res.render('add-address',{user:user})
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const postAddAddress = async(req,res)=>{
    try {
        const userId = req.session.user
        const user = await User.findById({_id:userId})
        const {addressType,name,city,landMark,state,pincode,phone,altPhone} = req.body
        const userAddress = await Address.findOne({userId:user._id})
        if(!userAddress){
            const newaddress = new Address({
                userId:user._id,
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
        res.status(500).json({message:"server error"})
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
//           res.status(500).json({message:"server error"})
//        }
// }

const editAddress = async (req,res)=>{
    try {
        const addressId = req.query.id;
    
        const user = req.session.user;
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
        res.status(500).json({message:"server error"})
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
        res.status(500).json({message:"server error"})
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
        res.status(500).json({message:"server error"})
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
    res.status(500).json({ error: 'Internal server error' });
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
        res.status(500).json({message:"server error"})
    }
}
 
const getProfilePage = async(req,res)=>{
    try {
        const userId = req.session.user
        const user = await User.findById({_id:userId})
        res.render('userprofile',{path:'/accountdetails',user})
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
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
        res.status(500).json({message:"server error"})
    }
}


module.exports={
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
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
