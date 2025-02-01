const User = require("../../models/userSchema");
const Category = require('../../models/categorySchema');
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema")
const Wallet = require("../../models/walletSchema")
const crypto = require("crypto");
const walletHelper = require('../../helpers/walletHelper');
const mongoose = require("mongoose");

const dotenv = require("dotenv")
dotenv.config()

const Razorpay = require("razorpay");
// const { default: mongoose } = require("mongoose");


const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user

        const cart = await Cart.findOne({ user: userId }).populate('items.product')
        const coupon = await Coupon.find({})
        console.timeLog(coupon,'coupon')

        if (!cart || cart.items.length == 0) {
            return res.render('cart', { message: "cart is empty" })
        }
        const address = await Address.find({ userId })

        let subtotal = 0
        cart.items.forEach(item => {
            console.log(item.price,item.quantity,'item.price')
            subtotal += item.price 
            console.log(subtotal,'subtotal')
        })

        const user = await User.findById({ _id: userId })
        let cartId = cart?._id
    
        res.render('checkout', { cart: cart.items, address: address, total: subtotal, cartId: cartId, user: user, coupon: coupon })


    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "server error" })
    }
}


const createOrder = async (req, res) => {
    try {
        const { cartId, addressId, paymentMethod, couponCode, finalAmount, couponDiscount, subtotal} = req.body;
        console.log(req.body,'xcj')

        const cart = await Cart.findById({ _id: cartId }).populate("items.product");
        let totalPrice = 0;
        const user = cart.user
        let itemdiscountprice;

        let discountTotalPrice;
        for (let item of cart.items) {
            const product = item.product;
            const quantity = item.quantity;
        itemdiscountprice=item.price

            discountTotalPrice= item.product.salePrice-item.price

            if (product.quantity < quantity) {
                return res.status(400).send(`Not enough stock for product ${product.name}`);
            }
            product.quantity -= quantity;
            await product.save();

            totalPrice +=itemdiscountprice * quantity

        }

        let coupon
        if (couponCode) {
            coupon = await Coupon.findOne({ name: couponCode });
        }

        console.log(coupon._id);
        const newOrder = new Order({
            orderedItems: cart.items.map(item => ({
                products: item.product,
                quantity: item.quantity,
                price: item.product.salePrice,
            })),
            productdiscount: Math.abs(discountTotalPrice),
            subtotal : subtotal + discountTotalPrice,
            finalAmount,
            address: addressId,
            invoiceDate: new Date(),
            status: "pending",
            paymentMethod,
            couponDiscount,
            couponId : coupon._id || null,
            user
        });

      
        
        const ordersaving = await newOrder.save();
        cart.items = [];
        await cart.save();

        res.status(200).json({ success: true, orderId: newOrder._id, finalAmount });

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "server error" })
    }
}


const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY,
});

const orderRazorpay = async (req, res) => {
    try {
        const { totalAmount } = req.body
        console.log(totalAmount,'totalAmount' )
        const options = {
            amount: totalAmount * 100,
            currency: "INR",
        };
        const order = await razorpayInstance.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_ID_KEY,
        });
    } catch (error) {
        console.error("Error in creating Razorpay Order:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create Razorpay order.",
            error: error.message,
        });
    }
}
const verifyRazorPayOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, couponCode, orderId, paymentId, razorpaySignature, cartId,finalAmount,couponDiscount,subtotal } = req.body;
        console.log(req.body,'dfghjk')

        // const userId = req.session.user;
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET_KEY)
            .update(`${orderId}|${paymentId || ''}`)
            .digest("hex")

        if (generatedSignature === razorpaySignature) {
            let coupon
            if (couponCode) {
                coupon = await Coupon.findOne({ name: couponCode });
            }
            const cart = await Cart.findById({ _id: cartId }).populate("items.product");
            let totalPrice = 0;
            const user = cart.user
        let itemdiscountprice;

            let discountTotalPrice;

            for (let item of cart.items) {
                const product = item.product;

                const quantity = item.quantity;
        itemdiscountprice=item.price

                discountTotalPrice= item.product.salePrice-item.price


                if (product.quantity < quantity) {
                    return res.status(400).send(`Not enough stock for product ${product.name}`);
                }
                product.quantity -= quantity;
                await product.save();

            totalPrice +=itemdiscountprice * quantity 
            }
           
            let discount = couponDiscount
            const finalAmount = totalPrice;
            const newOrder = new Order({
                orderedItems: cart.items.map(item => ({
                    products: item.product,
                    quantity: item.quantity,
                    price: item.product.salePrice,
                })),
                productdiscount: Math.abs(discountTotalPrice),
                subtotal : subtotal + discountTotalPrice,

                finalAmount,
                address: addressId,
                invoiceDate: new Date(),
                status: "pending",
                paymentMethod,
                couponDiscount : discount,
            couponId : coupon._id || null,

                user
            });

            await newOrder.save();
            cart.items = [];
            await cart.save();
            res.status(200).json({ success: true, orderId: newOrder._id, finalAmount });

        }
    } catch (error) {

    }
}

const walletPayment = async(req,res)=>{
    try {
        const {addressId, cartId, paymentMethod, couponCode, subtotal, couponDiscount,finalAmount }= req.body
        console.log(req.body,'fghj')
        const userId = req.session.user
        const user = await User.findById({_id:userId})
        const wallet= await Wallet.findOne({userId:userId})
        console.log(wallet)
        if(!wallet || wallet.balance<finalAmount){
            return res.status(400).json({message:"insufficient blance in your wallet"})

        }
        let coupon = 0
        if(couponCode){
            coupon = await Coupon.findOne({name:couponCode});
        }

        console.log(coupon)
        const cart = await Cart.findById({_id:cartId}).populate('items.product');
        let totalPrice = 0 
        let itemdiscountprice;
        let discountTotalPrice;
        for(let item of cart.items){
            const product = item.product;

            const quantity = item.quantity;

        itemdiscountprice=item.price
            discountTotalPrice= item.product.salePrice-item.price


            if(product.quantity < quantity){
                return res.status(400).send('Not enough stock for product ${product.name}')
            }
            product.quantity -= quantity;
            await product.save();


            totalPrice +=itemdiscountprice * quantity
        }
        
      
        const transactionType ='debit';

        await walletHelper.updateWalletBalance(userId,finalAmount,transactionType)

        const newOrder = new Order ({
            orderedItems: cart.items.map(item => ({
                products: item.product,
                quantity: item.quantity,
                price: item.product.salePrice,
            })),
            productdiscount: Math.abs(discountTotalPrice),
            subtotal : subtotal + discountTotalPrice,  
            finalAmount,
            address: addressId,
            invoiceDate: new Date(),
            status: "pending",
            paymentMethod,
            couponDiscount,
            couponId : coupon._id || null,
            user
        })

        const ordersaving = await newOrder.save();
        cart.items =[];
        await cart.save();

        res.status(200).json({success: true, orderId:newOrder._id,finalAmount})

    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}




const getOrderConfirmationPage = async (req, res) => {
    try {
        const orderId = req.query.orderId;

        res.render('orderconfirmation', { orderId });
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "server error" })
    }

}

const showOrder = async (req, res) => {
    try {
            const orderId = req.query.id
            const userId = req.session.user
            const user= await User.findById({_id:userId})
            const order = await Order.findById({ _id: orderId }).populate('orderedItems.products')
            const address = await Address.findOne({userId:req.session.user})
           
            const addressess = address.address

            const specificAddress= addressess.find((addr)=>addr._id.toString()==order.address.toString())

           
            res.render('showorderpage', { order ,specificAddress,user})
        } catch (error) {
        console.error(error)
        res.status(500).json({ message: "server error" })
    }
}
const cancelOrderItem = async (req, res) => {
    try {
        const orderId = req.params.itemId;
        console.log(orderId,'orderid')
        const { itemId, reason } = req.body;
        console.log(itemId,reason,'itemId')

        if (!reason.trim()) {
            return res.status(400).json({ success: false, message: "Cancellation reason is required" });
        }

        
        const order = await Order.findById(orderId);
        console.log(order,'order')

        
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        
        const orderItem = order.orderedItems.find(item => item._id.toString() === itemId);
        console.log(orderItem,'orderItem')

        
        if (!orderItem) {
            return res.status(404).json({ success: false, message: "Order item not found" });
        }

        
        if (['cancelled', 'delivered', 'returned'].includes(orderItem.status.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Item cannot be cancelled" });
        }

   
        orderItem.status = "Cancelled";
        orderItem.cancelReason = reason;

        if (order.paymentMethod !== 'COD') {
            const cancelAmount = order.finalAmount;
        console.log(order.finalAmount,'orderItem.finalAmount')
        console.log(cancelAmount,'cancelAmount')


            const transactionType = 'credit';
            const userId = req.session.user;
            await walletHelper.updateWalletBalance(userId, cancelAmount, transactionType);
        }

        await order.save();
        const itemStatuses = order.orderedItems.map(item => item.status);
        if (itemStatuses.every(s => s === "delivered")) {
            order.status = "delivered";
        } else if (itemStatuses.some(s => s === "Processing" || s === "Shipped")) {
            order.status = "Processing";
        } else if (itemStatuses.some(s => s === "Pending")) {
            order.status = "Pending";
        } else if (itemStatuses.some(s => s === "Cancelled" || s === "Return request" || s === "Returned")) {
            order.status = "Cancelled";
        } else {
            order.status = "pending";
        }
        await order.save();
        console.log(order,'order')


     
        const product = await Product.findById(orderItem.products);
        console.log(product,'product')

        if (product) {
            product.quantity += orderItem.quantity;
            await product.save();
        }

        res.status(200).json({ success: true, message: "Order item cancelled successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


const returnOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const { productId, reason } = req.body;

        const order = await Order.findById({ _id: orderId });
        const orderItems = order.orderedItems;
        const userId = req.session.user;
        let updatedQuantity;

        const currentDate = new Date();

        for (let item of orderItems) {
            if (item.products.toString() === productId) {
                if (item.status === "delivered") {
                    const deliveryDate = new Date(item.deliveryDate);
                    const diffTime = currentDate - deliveryDate;
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);

                    if (diffDays > 10) {
                        return res.status(400).json({ message: "You cannot return an item after 10 days of delivery" });
                    }
                }

                item.status = "Returned";
                item.returnReason = reason; 
                updatedQuantity = item.quantity;

                const refundAmount = item.price;
                const transactionType = 'credit';
                await walletHelper.updateWalletBalance(userId, refundAmount, transactionType);
            }
        }

        await order.save();

        const productUpdate = await Product.findById({ _id: productId });
        
        productUpdate.quantity += updatedQuantity;
        await productUpdate.save();

        res.status(200).json({ success: true, message: "Order returned successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const postNewAddress = async (req, res) => {
    try {
        const { addressType, name, phone, altPhone, landMark, city, state, pincode } = req.body;
        const userId = req.session.user;
        
        const userAddress = await Address.findOne({ userId });
        let newAddress;
        
        if (!userAddress) {
            newAddress = new Address({
                userId,
                address: [{ addressType, name, phone, altPhone, landMark, city, state, pincode }]
            });
            await newAddress.save();
        } else {
            newAddress = {
                _id: new mongoose.Types.ObjectId(),
                addressType,
                name,
                phone,
                altPhone,
                landMark,
                city,
                state,
                pincode
            };
            userAddress.address.push(newAddress);
            await userAddress.save();
        }

        res.status(200).json(newAddress);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
};


module.exports = {
    getCheckoutPage,
    // addAddress,
    getOrderConfirmationPage,
    createOrder,
    showOrder,
    cancelOrderItem,
    returnOrder,
    orderRazorpay,
    verifyRazorPayOrder,
    walletPayment,
    postNewAddress
}

