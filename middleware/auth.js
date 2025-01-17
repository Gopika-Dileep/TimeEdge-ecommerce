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

const checkUser = async (req, res, next) => {
    if(req.session.user) {
        res.redirect('/')
    } else {
        next();
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
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next();
        }else{
            res.redirect("/admin/login")
        }
    })
    .catch(error=>{
        console.log("Error in adminAuth middleware");
        res.status(500).send("internal Server Error")
    })
}


module.exports ={
    userAuth,
    adminAuth,
    checkUser,
    checkAdmin
}