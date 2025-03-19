const Category = require("../../models/categorySchema")
const Brand = require('../../models/brandSchema'); 
const Product= require('../../models/productSchema');
const Order = require("../../models/orderSchema");
const Coupon = require('../../models/couponSchema')


const loadCouponPage = async(req,res)=>{
    try {
        const currentDate = new Date();
        
        // Get all coupons and update their status if needed
        const coupons = await Coupon.find();
        
        // Update status for expired or maxed out coupons
        for(let coupon of coupons) {
            let shouldUpdate = false;
            
            // Check if coupon is expired
            if(coupon.expireOn < currentDate && coupon.isList) {
                coupon.isList = false;
                shouldUpdate = true;
            }
            
            // Check if usage limit is reached
            if(coupon.UsageLimit && coupon.userId.length >= coupon.UsageLimit && coupon.isList) {
                coupon.isList = false;
                shouldUpdate = true;
            }

            // Save coupon if status changed
            if(shouldUpdate) {
                await coupon.save();
            }
        }

        // Get updated coupons
        const updatedCoupons = await Coupon.find();
        res.render('coupon', { coupon: updatedCoupons });

    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}
const addCoupon = async (req, res) => {
    try {
        const { code, offerPrice, createon, expireOn, minimumPrice, UsageLimit } = req.body
        
        
        const discountAmount = parseFloat(offerPrice);
        const minAmount = parseFloat(minimumPrice);
        
       
        if (discountAmount >= minAmount) {
            return res.status(400).json({ error: 'Discount amount must be less than minimum amount' });
        }
        
       
        const existingCoupon = await Coupon.findOne({
            name: { $regex: new RegExp(`^${code}$`, 'i') }
        });
        
        if (existingCoupon) {
           
            return res.status(409).json({ error: 'Coupon code already exists' });
        }
        
        const coupon = new Coupon({
            name: code,
            offerPrice: offerPrice, 
            createon: createon,
            expireOn: expireOn,
            minimumPrice: minimumPrice,
            UsageLimit: UsageLimit,
           
        })
        await coupon.save()
        
        // Return success response for AJAX request
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(200).json({ success: true });
        }
        // Regular form submission fallback
        res.redirect('/admin/coupon')
    } catch (error) {
        console.error(error)
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({ message: "server err" });
        }
        res.status(500).json({ message: "server err" })
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