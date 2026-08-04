const Coupon = require('../../models/couponSchema')
const Order = require('../../models/orderSchema')



const applycoupon = async(req,res)=>{
    try {
        const userId = req.session.user
        const { couponCode, totalAmount } = req.body;
        // console.log(couponCode,totalAmount,'req.body')
        if (!couponCode) {
            return res.json({ success: false, message: 'Please enter a coupon code' });
        }
        const coupon = await Coupon.findOne({ name: { $regex: new RegExp("^" + couponCode.trim() + "$", "i") } });
        console.log(coupon,'coupon')

        if (!coupon) {
            console.log('coupon1')
            return res.json({ success: false, message: 'Invalid coupon code' });
        }

        if (coupon.userId && coupon.userId.some(id => id.toString() === userId.toString())) {
            return res.json({ success: false, message: 'You have already used this coupon' });
        }

        const couponUsed = await Order.countDocuments({couponId:coupon._id, user: userId})

        if(coupon.UsageLimit && couponUsed >= coupon.UsageLimit) {
            return res.json({ success: false, message: 'Coupon usage limit exceeded' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(coupon.expireOn);
        expiryDate.setHours(0, 0, 0, 0);
        if (today > expiryDate) {
            console.log('coupon2')
            return res.json({ success: false, message: 'Coupon has expired' });
        }

        if (totalAmount < coupon.minimumPrice) {
            console.log('coupon3')
            return res.json({ success: false, message: `Minimum purchase of ₹${coupon.minimumPrice} required` });
        }
        console.log(coupon,'coupon1')

        req.session.appliedCoupon = coupon;
        console.log(coupon.offerPrice,'coupon.discountPercentage')

        res.json({ 
            success: true, 
            offerPrice: coupon.offerPrice 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const removecoupon = async(req,res)=>{
    try {
        req.session.appliedCoupon = null;
        res.json({ success: true });
    } catch (error) {
       console.error(error)
       res.status(500).json({message:"server error"}) 
    }
}



module.exports={
    applycoupon,
    removecoupon
}