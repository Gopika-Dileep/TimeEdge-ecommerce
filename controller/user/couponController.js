const { STATUS_CODES, MESSAGES } = require("../../helpers/constants");
const Coupon = require('../../models/couponSchema');
const Order = require('../../models/orderSchema');

const applycoupon = async (req, res) => {
    try {
        const userId = req.session.user;
        const { couponCode, totalAmount } = req.body;
        
        if (!couponCode) {
            return res.json({ success: false, message: MESSAGES.USER_COUPON.ENTER_CODE });
        }
        
        const coupon = await Coupon.findOne({ name: { $regex: new RegExp("^" + couponCode.trim() + "$", "i") } });

        if (!coupon) {
            return res.json({ success: false, message: MESSAGES.USER_COUPON.INVALID_CODE });
        }

        const usageCount = coupon.userId.filter(id => id.toString() === userId.toString()).length;
        if (coupon.UsageLimit && usageCount >= coupon.UsageLimit) {
            return res.json({ success: false, message: MESSAGES.USER_COUPON.LIMIT_EXCEEDED });
        }

        const expiryDate = new Date(coupon.expireOn);
        expiryDate.setHours(23, 59, 59, 999);
        
        if (new Date() > expiryDate) {
            return res.json({ success: false, message: MESSAGES.USER_COUPON.EXPIRED });
        }

        if (totalAmount < coupon.minimumPrice) {
            return res.json({ success: false, message: MESSAGES.USER_COUPON.MIN_PURCHASE(coupon.minimumPrice) });
        }

        req.session.appliedCoupon = coupon;

        res.json({ 
            success: true, 
            offerPrice: coupon.offerPrice 
        });
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR });
    }
};

const removecoupon = async (req, res) => {
    try {
        req.session.appliedCoupon = null;
        res.json({ success: true });
    } catch (error) {
       console.error(error);
       res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR }); 
    }
}

module.exports = {
    applycoupon,
    removecoupon
};