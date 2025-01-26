const Category = require("../../models/categorySchema")
const Brand = require('../../models/brandSchema'); 
const Product= require('../../models/productSchema');
const Order = require("../../models/orderSchema");
const Coupon = require('../../models/couponSchema')


const loadCouponPage = async(req,res)=>{
    try {
        const coupon = await Coupon.find()
        res.render('coupon',{coupon})
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}
const addCoupon = async (req,res)=>{
    try {
        const {code,offerPrice,createon,expireOn,minimumPrice,UsageLimit,isList} = req.body
       
        const coupon  = new Coupon({
            name:code,
            offerPrice:offerPrice, 
            createon:createon,
            expireOn:expireOn,
            minimumPrice:minimumPrice,
            UsageLimit:UsageLimit,
            isList:isList
        })
        await coupon.save()
        res.redirect('/admin/coupon')
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server err"})
    }
}

const loadEditCoupon = async(req,res)=>{
    try {
       const couponId = req.query.id

       const coupon = await Coupon.findById({_id:couponId})
       res.render('editcoupon',{coupon:coupon})
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}

const editCoupon = async(req,res)=>{
    try {
        const couponId=req.query.id
        console.log(couponId,'couponId')
        const {code,offerPrice,createon,expireOn,minimumPrice,UsageLimit,isList} = req.body
        const coupon = await Coupon.findById({_id:couponId})
        coupon.name = code
        coupon.offerPrice =offerPrice
        coupon.createon=createon
        coupon.expireOn=expireOn
        coupon.minimumPrice=minimumPrice
        coupon.UsageLimit=UsageLimit
        coupon.isList=isList

        await coupon.save()
        res.redirect('/admin/coupon')
        
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}
const deleteCoupon = async (req,res)=>{
    try {
        const couponId= req.query.id
        const coupon = await Coupon.findByIdAndDelete({_id:couponId})
        res.redirect('/admin/coupon')
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}

module.exports={
    loadCouponPage,
    addCoupon,
    loadEditCoupon,
    editCoupon,
    deleteCoupon
}