const express=require("express")
const router = express.Router()
const userController = require("../controller/user/userController")
const productController = require('../controller/user/productController')
const cartController = require('../controller/user/cartController')
const profileController = require("../controller/user/profileController")
const orderController = require("../controller/user/orderController")
const wishlistController = require("../controller/user/wishlistController")
const couponController = require("../controller/user/couponController")

const {userAuth,adminAuth,checkUser} = require("../middleware/auth");


router.get("/login",userController.loadlogin)
router.post("/login",userController.login)
router.get("/logout",userController.logout);

router.get("/signup",checkUser,userController.loadSignup)
router.post("/signup",userController.signup)
router.get('/otpverify',userController.loadotp)
router.post('/otpverify',userController.otpverify)
router.get('/',productController.loadhome)
router.get('/shop',productController.loadshop)
router.get('/filter',productController.filterProduct)
router.get('/filterPriceRange',productController.filterProductByPrice)

router.get('/productDetails',productController.productDetails)

router.get('/cart',userAuth,cartController.loadAddToCart)
router.post('/addToCart/:productId',userAuth,cartController.addToCart)

router.patch('/increment/:itemId',userAuth,cartController.incrementQuantity); 
router.patch('/decrement/:itemId',userAuth,cartController.decrementQuantity);
router.post('/remove/:itemId',userAuth,cartController.removeItem);


router.get("/forgot-password",profileController.getForgotPassPage)
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.post("/resend-forgot-otp",profileController.resendOtp);




router.get("/profile",userAuth,profileController.userProfile);
router.get('/change-email',userAuth,profileController.changeEmail)
router.post('/change-email',userAuth,profileController.changeEmailValid)
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp);
router.post("/update-email",userAuth,profileController.updateEmail);
router.get('/change-password',userAuth,profileController.changePassword)
router.post("/change-password",userAuth,profileController.changePasswordValid);
router.post("/verify-changepassword-otp",userAuth,profileController.verifychangePasswordOtp);
router.get("/reset-password",profileController.getResetPassPage)
router.post("/reset-password",profileController.postNewPassword);
router.get("/addAddress",userAuth,profileController.addAddress);
router.post("/addAddress",userAuth,profileController.postAddAddress);
router.get("/editAddress",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.postEditAddress)
router.get("/deleteAddress",userAuth,profileController.deleteAddress)



router.get('/checkout',userAuth,orderController.getCheckoutPage);


router.post('/create-order',userAuth, orderController.createOrder);
router.post('/placeOrderRazorPay',userAuth,orderController.orderRazorpay)
router.post('/verifyRazorPayOrder',userAuth,orderController.verifyRazorPayOrder)
router.get('/order-confirmation',userAuth,orderController.getOrderConfirmationPage);

router.get('/order',userAuth,orderController.showOrder)
router.post('/cancelorder/:orderId',userAuth,orderController.cancelOrder)
router.post('/returnorder/:orderId',userAuth,orderController.returnOrder)


router.get('/wishlist',userAuth,wishlistController.loadWishlist)
router.post('/addToWishlist/:productId',userAuth,wishlistController.addToWishlist)
router.post('/removeitem/:itemId',userAuth,wishlistController.removeItem)

router.post('/verifyCoupon',userAuth,couponController.verifyCoupon)



module.exports=router

