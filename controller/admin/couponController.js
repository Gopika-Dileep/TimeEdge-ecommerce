const Category = require("../../models/categorySchema")
const Brand = require('../../models/brandSchema'); 
const Product= require('../../models/productSchema');
const Order = require("../../models/orderSchema");
const Coupon = require('../../models/couponSchema')


const loadCouponPage = async(req,res)=>{
    try {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
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

        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const search = req.query.search || '';
        
        let query = {};
        if (search) {
            query = { name: { $regex: search, $options: 'i' } };
        }

        const totalCoupons = await Coupon.countDocuments(query);
        const totalpage = Math.ceil(totalCoupons / limit) || 1;

        const paginatedCoupons = await Coupon.find(query)
            .skip((page - 1) * limit)
            .limit(limit);

        res.render('coupon', { 
            coupons: paginatedCoupons,
            currentpage: page,
            totalpage: totalpage,
            search
        });

    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}
const addCoupon = async (req, res) => {
    try {
        const code = req.body.code || req.body.name;
        const { offerPrice, createon, expireOn, minimumPrice, UsageLimit } = req.body
        
        if (!code || !/^[a-zA-Z0-9]+$/.test(code)) {
            return res.status(400).json({ error: 'Coupon code must be alphanumeric only (letters and numbers)' });
        }
        
        const today = new Date();
        today.setHours(0,0,0,0);
        if (!expireOn || new Date(expireOn) < today) {
            return res.status(400).json({ error: 'Expiry date cannot be in the past' });
        }

        const limit = parseInt(UsageLimit);
        if (isNaN(limit) || limit <= 0) {
            return res.status(400).json({ error: 'Usage limit must be at least 1' });
        }
        
        const discountAmount = parseFloat(offerPrice);
        const minAmount = parseFloat(minimumPrice);
        
       
        if (discountAmount >= minAmount) {
            return res.status(400).json({ error: 'Discount amount must be less than minimum purchase amount' });
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
const listCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        await Coupon.findByIdAndUpdate(couponId, { isList: true });
        res.redirect('/admin/coupon');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
};

const unlistCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        await Coupon.findByIdAndUpdate(couponId, { isList: false });
        res.redirect('/admin/coupon');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
};

const loadEditCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.redirect('/admin/coupon');
        }
        res.render('editcoupon', { coupon });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
};

const editCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        const { code, offerPrice, minimumPrice, UsageLimit, expireOn } = req.body;

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        const name = (code || '').trim().toUpperCase();
        if (!name || !/^[A-Z0-9]+$/.test(name)) {
            return res.status(400).json({ error: 'Coupon code must be alphanumeric only (letters and numbers)' });
        }

        const discountAmount = parseFloat(offerPrice);
        const minAmount = parseFloat(minimumPrice);
        
        if (isNaN(discountAmount) || discountAmount <= 0) {
            return res.status(400).json({ error: 'Discount amount must be greater than 0' });
        }
        if (isNaN(minAmount) || minAmount < 0) {
            return res.status(400).json({ error: 'Minimum purchase must be at least 0' });
        }
        if (discountAmount >= minAmount) {
            return res.status(400).json({ error: 'Discount amount must be less than minimum purchase amount' });
        }

        const limit = parseInt(UsageLimit);
        if (isNaN(limit) || limit <= 0) {
            return res.status(400).json({ error: 'Usage limit must be at least 1' });
        }

        const today = new Date();
        today.setHours(0,0,0,0);
        if (!expireOn || new Date(expireOn) < today) {
            return res.status(400).json({ error: 'Expiry date cannot be in the past' });
        }

        const existingCoupon = await Coupon.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            _id: { $ne: couponId }
        });
        
        if (existingCoupon) {
            return res.status(409).json({ error: 'Coupon code already exists' });
        }

        coupon.name = name;
        coupon.offerPrice = discountAmount;
        coupon.minimumPrice = minAmount;
        coupon.UsageLimit = limit;
        coupon.expireOn = expireOn;

        await coupon.save();

        return res.status(200).json({ success: true, message: 'Coupon updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error while editing coupon' });
    }
};

module.exports={
    loadCouponPage,
    addCoupon,
    listCoupon,
    unlistCoupon,
    loadEditCoupon,
    editCoupon
}