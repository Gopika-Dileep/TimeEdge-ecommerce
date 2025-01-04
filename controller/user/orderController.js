const User = require("../../models/userSchema");
const Category = require('../../models/categorySchema');
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require("../../models/orderSchema");



const getCheckoutPage = async(req,res)=>{
    try {
        const userId = req.session.user

        const cart = await Cart.findOne({ user: userId }).populate('items.product')
       
        if(!cart||cart.items.length==0){
            return res.render('cart',{message:"cart is empty"})
        }
            const address= await Address.find({userId})
           
            let subtotal=0
            cart.items.forEach(item=>{
                subtotal+=item.price* item.quantity
            })
            let cartId = cart?._id
            res.render('checkout',{cart:cart.items,address:address,total:subtotal,cartId:cartId})


    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}

const createOrder = async(req,res)=>{
    try {
        const { cartId, addressId, paymentMethod } = req.body;
        const cart = await Cart.findById({ _id: cartId }).populate("items.product");
        let totalPrice = 0;
        const user = cart.user
        console.log(user,'usercrateorder')
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
            user
        });

        await newOrder.save();
        cart.items = [];
        await cart.save();

         res.status(200).json({ success: true, orderId: newOrder._id });

    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}

const getOrderConfirmationPage = async(req,res)=>{
    try {
        const orderId = req.query.orderId;

        res.render('orderconfirmation',{orderId});
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
  
}

const showOrder = async(req,res)=>{
    try {
        const orderId = req.query.id
        const order = await Order.findById({_id:orderId}).populate('orderedItems.products')
        console.log(order.orderedItems,'order')
        res.render('showorderpage',{order})
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}
const cancelOrder = async(req,res)=>{
    try {
        const orderId = req.params.orderId
        console.log(orderId,'orderid')
        const order = await Order.findByIdAndUpdate({_id:orderId},{status:"Cancelled"},{new:true})
         
        res.status(200).json({success:true,message:"order cancelled successfully"})
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}
// const listOrder = async(req,res)=>{
//     try {
//         const orders = await Order.find({}).populate('orderedItems.products')
//         res.render('profile',{orders})
//     } catch (error) {
//         console.error(error)
//         res.status(500).json({message:"server error"})
//     }
// }
module.exports = {
    getCheckoutPage,
    getOrderConfirmationPage,
    createOrder,
    showOrder,
    cancelOrder
}

