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
    adminAuth
}