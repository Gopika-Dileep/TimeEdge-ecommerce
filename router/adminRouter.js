const express = require("express")
const router = express.Router()
const adminController = require("../controller/adminController");

router.get('/',adminController.loadAdminLogin)
router.post('/',adminController.adminLogin)
router.get('/dashboard',adminController.loadDashboard)
router.get('/users',adminController.loadUsers)
router.get('/user-block/:userId',adminController.blockUser)
router.get('/user-unblock/:userId',adminController.unblockUser)
router.get('/category',adminController.loadcategory)
router.get('/unlistCategory/:catId',adminController.unlistCategory)
router.post('/addCategory',adminController.addCategory)
router.get('/listCategory/:catId',adminController.listCategory)
router.get('/editCategory',adminController.loadEditCategory)
router.post('/editCategory/:categoryId',adminController.editCategory)
module.exports=router