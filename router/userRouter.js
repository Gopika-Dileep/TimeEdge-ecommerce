const express=require("express")
const router = express.Router()
const userController = require("../controller/userController")

router.get("/login",userController.loadlogin)
router.post("/login",userController.login)
router.get("/signup",userController.loadSignup)
router.post("/signup",userController.signup)
router.get('/otpverify',userController.loadotp)
router.post('/otpverify',userController.otpverify)
router.get('/home',userController.loadhome)
module.exports=router

