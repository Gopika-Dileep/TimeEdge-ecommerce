const User = require("../../models/userSchema");
const Category = require('../../models/categorySchema');
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema")
const crypto = require("crypto");
const walletHelper = require('../../helpers/walletHelper');

const dotenv = require("dotenv")
dotenv.config()

const Razorpay = require("razorpay");
// const { default: mongoose } = require("mongoose");


const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user

        const cart = await Cart.findOne({ user: userId }).populate('items.product')
        const coupon = await Coupon.find({})

        if (!cart || cart.items.length == 0) {
            return res.render('cart', { message: "cart is empty" })
        }
        const address = await Address.find({ userId })

        let subtotal = 0
        cart.items.forEach(item => {
            subtotal += item.price * item.quantity
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
        const { cartId, addressId, paymentMethod, couponId } = req.body;
        console.log("body", req.body)
        let coupon = 0
        if (couponId) {
            coupon = await Coupon.findById({ _id: couponId });
        }

        const cart = await Cart.findById({ _id: cartId }).populate("items.product");
        let totalPrice = 0;
        const user = cart.user
        for (let item of cart.items) {
            const product = item.product;

            const quantity = item.quantity;

            if (product.quantity < quantity) {
                return res.status(400).send(`Not enough stock for product ${product.name}`);
            }
            product.quantity -= quantity;
            await product.save();

            totalPrice += product.salePrice * quantity;

        }
        let discount = 0;
        if (coupon) {
            discount = coupon.offerPrice
            totalPrice = totalPrice - discount
        }

        const finalAmount = totalPrice;
        const newOrder = new Order({
            orderedItems: cart.items.map(item => ({
                products: item.product,
                quantity: item.quantity,
                price: item.product.salePrice,
            })),
            finalAmount,
            address: addressId,
            invoiceDate: new Date(),
            status: "pending",
            paymentMethod,
            discount,
            user
        });

        await newOrder.save();
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
        const { addressId, paymentMethod, couponId, orderId, paymentId, razorpaySignature, cartId } = req.body;

        // const userId = req.session.user;
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET_KEY)
            .update(`${orderId}|${paymentId || ''}`)
            .digest("hex")

        if (generatedSignature === razorpaySignature) {
            let coupon = 0
            if (couponId) {
                coupon = await Coupon.findById({ _id: couponId });
            }
            const cart = await Cart.findById({ _id: cartId }).populate("items.product");
            let totalPrice = 0;
            const user = cart.user
            for (let item of cart.items) {
                const product = item.product;

                const quantity = item.quantity;

                if (product.quantity < quantity) {
                    return res.status(400).send(`Not enough stock for product ${product.name}`);
                }
                product.quantity -= quantity;
                await product.save();

                totalPrice += product.salePrice * quantity;

            }
            let discount = 0;
            if (coupon) {
                discount = coupon.offerPrice
                totalPrice = totalPrice - discount
            }

            const finalAmount = totalPrice;
            const newOrder = new Order({
                orderedItems: cart.items.map(item => ({
                    products: item.product,
                    quantity: item.quantity,
                    price: item.product.salePrice,
                })),
                finalAmount,
                address: addressId,
                invoiceDate: new Date(),
                status: "pending",
                paymentMethod,
                discount,
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
        const order = await Order.findById({ _id: orderId }).populate('orderedItems.products')
        console.log(order.orderedItems, 'order')
        res.render('showorderpage', { order })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "server error" })
    }
}
const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId
        const { productId } = req.body
        const order = await Order.findById({ _id: orderId })
        const orderItems = order.orderedItems
        let updatedQuantity;
        for (let item of orderItems) {
            if (item.products.toString() == productId) {
                item.status = "Cancelled"
                updatedQuantity = item.quantity
                if (order.paymentMethod !== 'COD') {
                    const cancelamount = item.price;
                    const transactionType = 'credit';
                    const userId = req.session.user;
                    await walletHelper.updateWalletBalance(userId, cancelamount, transactionType)
                }
            }
        }
        await order.save()
        const productUpdate = await Product.findById({ _id: productId })
        productUpdate.quantity += updatedQuantity;
        await productUpdate.save()
        res.status(200).json({ success: true, message: "order cancelled successfully" })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "server error" })
    }
}

const returnOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId
        const { productId } = req.body
        const order = await Order.findById({ _id: orderId })
        const orderItems = order.orderedItems
        const userId=req.session.user;
        let updatedQuantity;
        for (let item of orderItems) {
            if (item.products.toString() == productId) {
                item.status = "Returned"
                updatedQuantity = item.quantity
                const cancelamount = item.price;
                const transactionType = 'credit';
                    await walletHelper.updateWalletBalance(userId, cancelamount, transactionType)
                
            }
        }
        await order.save()
        const productUpdate = await Product.findById({ _id: productId })
        productUpdate.quantity += updatedQuantity;
        await productUpdate.save()
        res.status(200).json({ success: true, message: "order returned successfully" })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "server error" })
    }
}
module.exports = {
    getCheckoutPage,
    getOrderConfirmationPage,
    createOrder,
    showOrder,
    cancelOrder,
    returnOrder,
    orderRazorpay,
    verifyRazorPayOrder
}

