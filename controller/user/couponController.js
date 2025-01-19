const Coupon = require('../../models/couponSchema')


const verifyCoupon = async(req,res)=>{
    try {
        
        const {couponCode,subtotal} = req.body;
        const coupon = await Coupon.findById({_id:couponCode })
        if(!coupon){
            return res.status(404).json({success:false,message:"coupon not found"})

        }
        if(new Date > coupon.expireOn){
            return res.status(400).json({success:false,message:"coupon is expired"})
        }
        if(subtotal<coupon.minimumPrice){
            return res.status(400).json({success:false,message:`minimum purchase amount for this coupon is ₹ : ${coupon.minimumPrice}`})
        }
        if(coupon.UsageLimit<=0){
            return res.status(400).json({success:false,message:"coupon limit is reached"})
        }
        coupon.UsageLimit -= 1;
        await coupon.save()
        console.log(coupon,"coupon")
        return res.status(200).json({success:true,discount:coupon.offerPrice})
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}

module.exports={
    verifyCoupon
}