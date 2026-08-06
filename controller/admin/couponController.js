const Category = require("../../models/categorySchema")
const Brand = require('../../models/brandSchema'); 
const Product = require('../../models/productSchema');
const Order = require("../../models/orderSchema");
const Coupon = require('../../models/couponSchema');
const { STATUS_CODES, MESSAGES } = require("../../helpers/constants");

const loadCouponPage = async (req, res) => {
    try {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
    
        const coupons = await Coupon.find();
        

        for (let coupon of coupons) {
            let shouldUpdate = false;
            
            const expiry = new Date(coupon.expireOn);
            expiry.setHours(23, 59, 59, 999);
            const isExpired = new Date() > expiry;

            if (isExpired && coupon.isList) {
                coupon.isList = false;
                shouldUpdate = true;
            }

            if (shouldUpdate) {
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
            .sort({ createdOn: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.render('coupon', { 
            coupons: paginatedCoupons,
            currentpage: page,
            totalpage: totalpage,
            search
        });

    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
    }
}

const addCoupon = async (req, res) => {
    try {
        const code = req.body.code || req.body.name;
        const { offerPrice, createon, expireOn, minimumPrice, UsageLimit } = req.body;
        
        if (!code || !/^[a-zA-Z0-9]+$/.test(code)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: MESSAGES.ADMIN_COUPON.COUPON_ALPHANUMERIC });
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!expireOn || new Date(expireOn) < today) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: MESSAGES.ADMIN_COUPON.EXPIRY_PAST });
        }

        const limit = parseInt(UsageLimit);
        if (isNaN(limit) || limit <= 0) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: MESSAGES.ADMIN_COUPON.USAGE_LIMIT_MIN });
        }
        
        const discountAmount = parseFloat(offerPrice);
        const minAmount = parseFloat(minimumPrice);
        
        if (discountAmount >= minAmount) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: MESSAGES.ADMIN_COUPON.DISCOUNT_LIMIT });
        }
        
        const existingCoupon = await Coupon.findOne({
            name: { $regex: new RegExp(`^${code}$`, 'i') }
        });
        
        if (existingCoupon) {
            return res.status(STATUS_CODES.CONFLICT).json({ error: MESSAGES.ADMIN_COUPON.DUPLICATE_COUPON });
        }
        
        const coupon = new Coupon({
            name: code,
            offerPrice: offerPrice, 
            createon: createon,
            expireOn: expireOn,
            minimumPrice: minimumPrice,
            UsageLimit: UsageLimit,
        });
        await coupon.save();
        
   
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(STATUS_CODES.OK).json({ success: true });
        }

        res.redirect('/admin/coupon');
    } catch (error) {
        console.error(error);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
        }
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
    }
}

const listCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        await Coupon.findByIdAndUpdate(couponId, { isList: true });
        res.redirect('/admin/coupon');
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
    }
};

const unlistCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        await Coupon.findByIdAndUpdate(couponId, { isList: false });
        res.redirect('/admin/coupon');
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
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
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
    }
};

const editCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        const { code, offerPrice, minimumPrice, UsageLimit, expireOn } = req.body;

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ error: MESSAGES.ADMIN_COUPON.NOT_FOUND });
        }

        const name = (code || '').trim().toUpperCase();
        if (!name || !/^[A-Z0-9]+$/.test(name)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: MESSAGES.ADMIN_COUPON.COUPON_ALPHANUMERIC });
        }

        const discountAmount = parseFloat(offerPrice);
        const minAmount = parseFloat(minimumPrice);
        
        if (isNaN(discountAmount) || discountAmount <= 0) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: MESSAGES.ADMIN_COUPON.DISCOUNT_MIN });
        }
        if (isNaN(minAmount) || minAmount < 0) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: MESSAGES.ADMIN_COUPON.MIN_PURCHASE_LIMIT });
        }
        if (discountAmount >= minAmount) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: MESSAGES.ADMIN_COUPON.DISCOUNT_LIMIT });
        }

        const limit = parseInt(UsageLimit);
        if (isNaN(limit) || limit <= 0) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: MESSAGES.ADMIN_COUPON.USAGE_LIMIT_MIN });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!expireOn || new Date(expireOn) < today) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: MESSAGES.ADMIN_COUPON.EXPIRY_PAST });
        }

        const existingCoupon = await Coupon.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            _id: { $ne: couponId }
        });
        
        if (existingCoupon) {
            return res.status(STATUS_CODES.CONFLICT).json({ error: MESSAGES.ADMIN_COUPON.DUPLICATE_COUPON });
        }

        coupon.name = name;
        coupon.offerPrice = discountAmount;
        coupon.minimumPrice = minAmount;
        coupon.UsageLimit = limit;
        coupon.expireOn = expireOn;

        await coupon.save();

        return res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.ADMIN_COUPON.UPDATE_SUCCESS });
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.SERVER_ERROR });
    }
};

module.exports = {
    loadCouponPage,
    addCoupon,
    listCoupon,
    unlistCoupon,
    loadEditCoupon,
    editCoupon
};