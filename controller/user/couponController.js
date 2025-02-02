const Coupon = require('../../models/couponSchema')
const Order = require('../../models/orderSchema')


// const verifyCoupon = async(req,res)=>{
//     try {
        
//         const {couponCode,subtotal} = req.body;
//         const coupon = await Coupon.findById({_id:couponCode })
//         if(!coupon){
//             return res.status(404).json({success:false,message:"coupon not found"})

//         }
//         if(new Date > coupon.expireOn){
//             return res.status(400).json({success:false,message:"coupon is expired"})
//         }
//         if(subtotal<coupon.minimumPrice){
//             return res.status(400).json({success:false,message:`minimum purchase amount for this coupon is ₹ : ${coupon.minimumPrice}`})
//         }
//         if(coupon.UsageLimit<=0){
//             return res.status(400).json({success:false,message:"coupon limit is reached"})
//         }
//         coupon.UsageLimit -= 1;
//         await coupon.save()
//         console.log(coupon,"coupon")
//         return res.status(200).json({success:true,discount:coupon.offerPrice})
//     } catch (error) {
//         console.error(error)
//         res.status(500).json({message:"server error"})
//     }
// }
const applycoupon = async(req,res)=>{
    try {
        const userId = req.session.user
        const { couponCode, totalAmount } = req.body;
        console.log(couponCode,totalAmount,'req.body')
        const coupon = await Coupon.findOne({ name: couponCode });
        console.log(coupon,'coupon')

        const couponUsed = await Order.countDocuments({couponId:coupon._id, user: userId})

        if (!coupon) {
        console.log('coupon1')

            return res.json({ success: false, message: 'Invalid coupon' });
        }

        if(couponUsed >  coupon.UsageLimit) {
            return res.json({ success: false, message: 'Coupon usage exced' });
        }

        if (new Date() > coupon.expireOn) {
        console.log('coupon2')

            return res.json({ success: false, message: 'Coupon has expired' });
        }

        if (totalAmount < coupon.minimumPrice) {
        console.log('coupon3')

            return res.json({ success: false, message: 'Minimum purchase amount not met' });
        }
        console.log(coupon,'coupon1')

      
        req.session.appliedCoupon = coupon;
        console.log(coupon.offerPrice,'coupon.discountPercentage')


        res.json({ 
            success: true, 
            offerPrice: coupon.offerPrice 
        });
    } catch (error) {
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