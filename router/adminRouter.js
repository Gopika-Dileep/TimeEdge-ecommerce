const express = require("express")
const router = express.Router()
const multer = require("multer")
const upload = require('../helpers/multer')
const adminController = require("../controller/admin/adminController");
const productController = require("../controller/admin/productController")
const {userAuth,adminAuth} = require("../middleware/auth");

router.get('/',adminController.loadAdminLogin)
router.post('/',adminController.adminLogin)
router.get('/dashboard',adminAuth,adminController.loadDashboard)
router.get('/users',adminAuth,adminController.loadUsers)
router.get('/user-block/:userId',adminAuth,adminController.blockUser)
router.get('/user-unblock/:userId',adminAuth,adminController.unblockUser)
router.get('/category',adminAuth,adminController.loadcategory)
router.get('/unlistCategory/:catId',adminAuth,adminController.unlistCategory)
router.post('/addCategory',adminAuth,adminController.addCategory)
router.get('/listCategory/:catId',adminAuth,adminController.listCategory)
router.get('/editCategory',adminAuth,adminController.loadEditCategory)
router.post('/editCategory/:categoryId',adminAuth,adminController.editCategory)
router.get('/brand',adminAuth,adminController.loadbrand)
router.post('/addBrand',adminAuth,adminController.addBrand)
router.post('/listBrand/:brandId',adminAuth,adminController.listBrand)
router.post('/unlistBrand/:brandId',adminAuth,adminController.unlistBrand)
router.get('/product',adminAuth,productController.LoadProduct)
router.get('/addProducts',adminAuth,productController.loadAddProduct)
router.post('/addProducts',adminAuth,upload.array("images",4),productController.addProducts)
router.get('/editProduct',adminAuth,productController.loadeditproduct)

router.post("/editProduct/:id",adminAuth,upload.array("images",4),productController.updateproduct);
router.post("/editProduct/:id",adminAuth,upload.array("images",4),productController.editproduct);

router.post('/deleteImage', (req, res, next) => {
    console.log("Delete Image API hit");
    next();
},adminAuth, productController.deleteSingleImage);


router.get('/listProduct',adminAuth,productController.listproduct)
router.get('/unlistProduct',adminAuth,productController.unlistproduct)

router.get('/orders',adminAuth,adminController.getOrders)
router.get("/order/:orderId",  adminController.getOrderDetails)
router.post("/orders/:orderId/status",adminController.updateOrderStatus);



module.exports=router