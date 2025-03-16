const User = require("../models/userSchema");

const userAuth = async (req,res,next)=>{
    
    if(req.session.user){
        const user=await User.findById({_id:req.session.user})
            if(user && !user.isBlocked){
                next();
            }else{
                res.redirect("/login")
            }
      
    }else{
        res.redirect("/login")
    }
}

const checkUser = (req, res, next) => {
    if(req.session.user) {
        next()
    } else {
        res.redirect('/login')
    }
}

const checkAdmin = async (req, res, next) => {
    if(req.session.admin) {
        res.redirect('/admin/dashboard')
    } else {
        next();
    }
}



const adminAuth = (req,res,next)=>{
    if(!req.session.admin){
        res.redirect('/admin')
    }else{
        next()
    }
}

const isLogin = async(req,res,next)=>{
    try {                  
       if(req.session.user){
        res.setHeader('Cache-Control', 'no-store')
          return next();
       }else{
          return res.redirect('/')
       }
    } catch (error) {
       console.log(error.message);
    }
}

const isLogout = async(req,res,next)=>{
   try {
      if(req.session.user){
        res.setHeader('Cache-Control', 'no-store')
       return res.redirect('/home');
      } else {
         return next();
      }

   } catch (error) {
      console.log(error.message);
   }
}

module.exports ={
    userAuth,
    adminAuth,
    checkUser,
    checkAdmin,
    isLogin,
    isLogout
}