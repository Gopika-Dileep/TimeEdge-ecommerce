const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");
const crypto = require("crypto");
const walletHelper = require("../../helpers/walletHelper");
const mongoose = require("mongoose");

const dotenv = require("dotenv");
dotenv.config();

const Razorpay = require("razorpay");
const PDFDocument = require('pdfkit');


const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;

    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    const currentDate = new Date();

    const coupon = await Coupon.find({
    expireOn: { $gt: currentDate },  
    $or: [
        { UsageLimit: { $gt: 0 } },  
        { UsageLimit: { $exists: false } }  
    ]
    }); 


    let filteredCoupons = [] 

    for(let c of coupon) {
      const couponUsed = await Order.countDocuments({couponId:c._id, user: userId})
      if(couponUsed <  c.UsageLimit) {
        filteredCoupons.push(c)
      }
    }

    console.log(filteredCoupons, "filtered coupon")
   
    if (!cart || cart.items.length == 0) {
      return res.render("cart", { message: "cart is empty" });
    }
    const address = await Address.find({ userId });

    let subtotal = 0;
    cart.items.forEach((item) => {
      console.log(item.price, item.quantity, "item.price");
      subtotal += item.price;
      console.log(subtotal, "subtotal");
    });

    const user = await User.findById({ _id: userId });
    let cartId = cart?._id;

    res.render("checkout", {
      cart: cart.items,
      address: address,
      total: subtotal,
      cartId: cartId,
      user: user,
      coupon: filteredCoupons,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
};

const createOrder = async (req, res) => {
  try {
    const {
      cartId,
      addressId,
      paymentMethod,
      couponCode,
      finalAmount,
      couponDiscount,
      subtotal,
    } = req.body;
    console.log(req.body,'dfdddddddd');
    if(finalAmount>=2000){
      return res.status(400).json({success:false,message:"item above 2000 cant be in COD "})
    }

    const cart = await Cart.findById({ _id: cartId }).populate("items.product");
    console.log(cart, "cart");
    const user = cart.user;

    let discountTotalPrice = 0;
    for (let item of cart.items) {
      const product = item.product;
      const quantity = item.quantity;

      console.log(item.product.salePrice, "saleprice")
      console.log(item.price, "item price")
      console.log(item.quantity, "quantity")

      discountTotalPrice += (item.product.salePrice * quantity) - item.price

      if (product.quantity < quantity) {
        return res
          .status(400)
          .send(`Not enough stock for product ${product.name}`);
      }
      product.quantity -= quantity;
      await product.save();
    }

    let coupon;
    if (couponCode) {
      coupon = await Coupon.findOne({ name: couponCode });
    }

    const newOrder = new Order({
      orderedItems: cart.items.map((item) => ({
        products: item.product,
        quantity: item.quantity,
        price: item.product.salePrice,
      })),
      productdiscount: Math.abs(discountTotalPrice),
      subtotal: subtotal + discountTotalPrice,
      finalAmount,
      address: addressId,
      invoiceDate: new Date(),
      status: "pending",
      paymentMethod,
      couponDiscount,
      couponId: coupon?._id || null,
      user,
    });

    const ordersaving = await newOrder.save();
    console.log(ordersaving, "ordesaving");
    cart.items = [];
    await cart.save();

    res.status(200).json({ success: true, orderId: newOrder._id, finalAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
};
const razorpayInstance = new Razorpay({   
  key_id: process.env.RAZORPAY_ID_KEY,   
  key_secret: process.env.RAZORPAY_SECRET_KEY, 
});  

const orderRazorpay = async (req, res) => {   
  try {     
    const { totalAmount } = req.body;
    console.log(totalAmount, "totalAmount");
    
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
}; 

const verifyRazorPayOrder = async (req, res) => {   
  try {     
    const {       
      addressId,       
      paymentMethod,       
      couponCode,       
      orderId,       
      paymentId,       
      razorpaySignature,       
      cartId,       
      finalAmount,       
      couponDiscount,       
      subtotal,
      paymentStatus 
    } = req.body;
    
    console.log('Verifying RazorPay Order')

   
    let paymentVerificationStatus = false;
    if (paymentId && razorpaySignature) {
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET_KEY)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      paymentVerificationStatus = generatedSignature === razorpaySignature;
    }

    const orderPaymentStatus = paymentStatus || 
      (paymentVerificationStatus ? 'Paid' : 'Failed');

    let coupon;
    if (couponCode) {
      coupon = await Coupon.findOne({ name: couponCode });
    }

    const cart = await Cart.findById({ _id: cartId }).populate(
      "items.product"
    );
    const user = cart.user;
    let discountTotalPrice = 0;

    for (let item of cart.items) {
      const product = item.product;
      const quantity = item.quantity;

      discountTotalPrice += (item.product.salePrice * quantity) - item.price
      if (product.quantity < quantity) {
        return res
          .status(400)
          .send(`Not enough stock for product ${product.name}`);
      }
      product.quantity -= quantity;
      await product.save();
    }

    const newOrder = new Order({
      orderedItems: cart.items.map((item) => ({
        products: item.product,
        quantity: item.quantity,
        price: item.product.salePrice,
        status: "pending" 
      })),
      productdiscount: Math.abs(discountTotalPrice),
      subtotal: subtotal + discountTotalPrice,
      finalAmount,
      address: addressId,
      invoiceDate: new Date(),
      status: "pending", 
      paymentMethod,
      couponDiscount,
      couponId: coupon?._id || null,
      user,
      paymentStatus: orderPaymentStatus 
    });

    await newOrder.save();
    
    
    cart.items = [];
    await cart.save();

    res
      .status(200)
      .json({ 
        success: paymentVerificationStatus, 
        orderId: newOrder._id, 
        finalAmount,
        paymentStatus: orderPaymentStatus 
      });
  } catch (error) {
    console.error("Error in verifying RazorPay order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify RazorPay order",
      error: error.message
    });
  }
};

const walletPayment = async (req, res) => {
  try {
    const {
      addressId,
      cartId,
      paymentMethod,
      couponCode,
      subtotal,
      couponDiscount,
      finalAmount,
    } = req.body;

    const userId = req.session.user;
    const user = await User.findById({ _id: userId });
    const wallet = await Wallet.findOne({ userId: userId });

    if (!wallet || wallet.balance < finalAmount) {
      return res
        .status(400)
        .json({ message: "insufficient blance in your wallet" });
    }
    let coupon = 0;
    if (couponCode) {
      coupon = await Coupon.findOne({ name: couponCode });
    }

    const cart = await Cart.findById({ _id: cartId }).populate("items.product");

    let discountTotalPrice = 0;
    for (let item of cart.items) {
      const product = item.product;
      const quantity = item.quantity;

      discountTotalPrice += (item.product.salePrice * quantity) - item.price

      if (product.quantity < quantity) {
        return res
          .status(400)
          .send("Not enough stock for product ${product.name}");
      }
      product.quantity -= quantity;
      await product.save();

    }

    const transactionType = "debit";

    await walletHelper.updateWalletBalance(
      userId,
      finalAmount,
      transactionType
    );

    const newOrder = new Order({
      orderedItems: cart.items.map((item) => ({
        products: item.product,
        quantity: item.quantity,
        price: item.product.salePrice,
      })),
      productdiscount: Math.abs(discountTotalPrice),
      subtotal: subtotal + discountTotalPrice,
      finalAmount,
      address: addressId,
      invoiceDate: new Date(),
      status: "pending",
      paymentMethod,
      couponDiscount,
      couponId: coupon?._id || null,
      user,
      paymentStatus:"Paid"
    });

    const ordersaving = await newOrder.save();
    cart.items = [];
    await cart.save();

    res.status(200).json({ success: true, orderId: newOrder._id, finalAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
};

const getOrderConfirmationPage = async (req, res) => {
  try {
    const orderId = req.query.orderId;

    res.render("orderconfirmation", { orderId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
};

const showOrder = async (req, res) => {
  try {
    const orderId = req.query.id;
    const userId = req.session.user;
    const user = await User.findById({ _id: userId });
    const order = await Order.findById({ _id: orderId }).populate(
      "orderedItems.products"
    );
    const address = await Address.findOne({ userId: req.session.user });

    const addressess = address.address;

    const specificAddress = addressess.find(
      (addr) => addr._id.toString() == order.address.toString()
    );
    console.log(order, specificAddress);

    res.render("showorderpage", { order, specificAddress, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
};
const cancelOrderItem = async (req, res) => {
  try {
    const orderId = req.params.itemId;
    const { itemId, reason } = req.body;

    if (!reason.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Cancellation reason is required" });
    }

    const order = await Order.findById(orderId);

    if (order.couponId)
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

    const orderItem = order.orderedItems.find(
      (item) => item._id.toString() === itemId
    );

    if (!orderItem) {
      return res
        .status(404)
        .json({ success: false, message: "Order item not found" });
    }

    if (
      ["cancelled", "delivered", "returned"].includes(
        orderItem.status.toLowerCase()
      )
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Item cannot be cancelled" });
    }

    orderItem.status = "Cancelled";
    orderItem.cancelReason = reason;

    const itemQuantity = orderItem.quantity

    let itemSaleprice = 0
    
    if(orderItem) {
        const item = await Product.findById({
            _id: orderItem.products,
          }).populate("category");

        const productOffer = item.productOffer || 0;
        const categoryOffer = item.category.categoryOffer || 0;
        const bestOffer = Math.max(productOffer, categoryOffer);
        const salePrice = item.salePrice;
        itemSaleprice = bestOffer > 0 ? Math.floor(salePrice -(salePrice*bestOffer)/100): salePrice
    }

    await order.save();

    let couponRefudAmount = 0 ;
    let isCouponRemoved = false ;

    if (order.couponId) {
        const remainingItems = order.orderedItems.filter(
            item => item.status !== "Returned" && item.status !== "Cancelled"
          );          
      
          let newtotal = 0;
          if (remainingItems.length >= 0) {
            for (let i = 0; i < remainingItems.length; i++) {
              const items = await Product.findById({
                _id: remainingItems[i].products,
              }).populate("category");
              const productOffer = items.productOffer || 0;
              const categoryOffer = items.category.categoryOffer || 0;
              const bestOffer = Math.max(productOffer, categoryOffer);
              const salePrice = items.salePrice;
              newtotal +=
                bestOffer > 0
                  ? Math.floor(salePrice - (salePrice * bestOffer) / 100) * remainingItems[i].quantity
                  : salePrice * remainingItems[i].quantity;
            }
          }

          const coupon = await Coupon.findById({_id:order.couponId})
          if(newtotal<coupon.minimumPrice){
            couponRefudAmount = order.couponDiscount;
            order.couponDiscount =  0 ;
            order.couponId = null;
            isCouponRemoved = true;

          }
    }

    if (order.paymentMethod !== "COD") {
      const cancelAmount = isCouponRemoved ? (itemSaleprice * itemQuantity) - couponRefudAmount : itemSaleprice * itemQuantity
      order.finalAmount -= cancelAmount
      await order.save()
      const transactionType = "credit";
      const userId = req.session.user;
      await walletHelper.updateWalletBalance(
        userId,
        cancelAmount,
        transactionType
      );
    }

    await order.save();
    const itemStatuses = order.orderedItems.map((item) => item.status);
    if (itemStatuses.every((s) => s === "delivered")) {
      order.status = "delivered";
    } else if (
      itemStatuses.some((s) => s === "Processing" || s === "Shipped")
    ) {
      order.status = "Processing";
    } else if (itemStatuses.some((s) => s === "Pending")) {
      order.status = "Pending";
    } else if (
      itemStatuses.every(
        (s) => s === "Cancelled" || s === "Return request" || s === "Returned"
      )
    ) {
      order.status = "Cancelled";
    } else {
      order.status = "pending";
    }
    await order.save();
    console.log(order, "order");

    const product = await Product.findById(orderItem.products);
    console.log(product, "product");

    if (product) {
      product.quantity += orderItem.quantity;
      await product.save();
    }

    res
      .status(200)
      .json({ success: true, message: "Order item cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const returnOrder = async (req, res) => {
    try {
      const { orderId } = req.params;
      const { productId, reason } = req.body;
      
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
  
      const orderItems = order.orderedItems;
      const currentDate = new Date();
      
  
      const item = orderItems.find((item) => item.products.toString() === productId);
  
      if (!item) {
        return res.status(404).json({ message: "Product not found in order" });
      }
  
      if (item.status !== "delivered") {
        return res.status(400).json({ message: "Only delivered items can be returned" });
      }
  
      const deliveryDate = new Date(item.deliveryDate);
      const diffDays = (currentDate - deliveryDate) / (1000 * 60 * 60 * 24);
  
      if (diffDays > 10) {
        return res.status(400).json({
          message: "You cannot return an item after 10 days of delivery",
        });
      }
  
      item.status = "Return request";
      item.returnReason = reason;
  
      const product = await Product.findById(productId).populate("category");
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
  
     order.save()
      res.status(200).json({ success: true, message: "Order returned successfully" });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };
  
const postNewAddress = async (req, res) => {
  try {
    const {
      addressType,
      name,
      phone,
      altPhone,
      landMark,
      city,
      state,
      pincode,
    } = req.body;
    const userId = req.session.user;

    const userAddress = await Address.findOne({ userId });
    let newAddress;

    if (!userAddress) {
      newAddress = new Address({
        userId,
        address: [
          {
            addressType,
            name,
            phone,
            altPhone,
            landMark,
            city,
            state,
            pincode,
          },
        ],
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
        pincode,
      };
      userAddress.address.push(newAddress);
      await userAddress.save();
    }
    console.log("fgjgh");

    res.status(200).json({
      _id: newAddress._id,
      name: newAddress.name,
      addressType: newAddress.addressType,
      phone: newAddress.phone,
      altPhone: newAddress.altPhone,
      landMark: newAddress.landMark,
      city: newAddress.city,
      state: newAddress.state,
      pincode: newAddress.pincode,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
};

const posteditAddress = async (req, res) => {
  try {
    const addressId = req.params.addressId;
    const updatedData = req.body;

    if (
      !updatedData.name ||
      !updatedData.phone ||
      !updatedData.landMark ||
      !updatedData.city ||
      !updatedData.state ||
      !updatedData.pincode ||
      !updatedData.addressType
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (!/^\d{10}$/.test(updatedData.phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    if (updatedData.altPhone && !/^\d{10}$/.test(updatedData.altPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alternative phone number format",
      });
    }

    const result = await Address.findOneAndUpdate(
      {
        "address._id": addressId,
      },
      {
        $set: {
          "address.$": {
            _id: addressId,
            name: updatedData.name,
            addressType: updatedData.addressType,
            phone: updatedData.phone,
            altPhone: updatedData.altPhone || null,
            landMark: updatedData.landMark,
            city: updatedData.city,
            state: updatedData.state,
            pincode: updatedData.pincode,
          },
        },
      },
      { new: true } 
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const updatedAddress = result.address.find(
      (addr) => addr._id.toString() === addressId
    );

    res.status(200).json({
      success: true,
      _id: updatedAddress._id,
      name: updatedAddress.name,
      addressType: updatedAddress.addressType,
      phone: updatedAddress.phone,
      altPhone: updatedAddress.altPhone,
      landMark: updatedAddress.landMark,
      city: updatedAddress.city,
      state: updatedAddress.state,
      pincode: updatedAddress.pincode,
    });
  } catch (error) {
    console.error("Error in editAddressCheckout:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getAddress = async (req, res) => {
  try {
    const addressId = req.params.addressId;
    console.log("iam here");
    const currAddress = await Address.findOne({
      "address._id": addressId,
    });

    if (!currAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const addressData = currAddress.address.find((item) => {
      return item._id.toString() === addressId.toString();
    });

    if (!addressData) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.status(200).json({
      success: true,
      address: {
        _id: addressData._id,
        name: addressData.name,
        addressType: addressData.addressType,
        phone: addressData.phone,
        altPhone: addressData.altPhone,
        landMark: addressData.landMark,
        city: addressData.city,
        state: addressData.state,
        pincode: addressData.pincode,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const initiateRepayment = async (req, res) => {
  try {
    const { orderId } = req.body;
   const orderCreatedId=orderId
    const order = await Order.findOne({orderId:orderId});
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const options = {       
      amount: order.finalAmount * 100,  
      currency: "INR",
      receipt: `repay_${orderId}`
    };
    
    const razorpayOrder = await razorpayInstance.orders.create(options);      
    console.log( orderCreatedId,"orderCreatedId")
    
    res.json({       
      success: true,  
      orderCreatedId,
      orderId: razorpayOrder.id,       
      amount: razorpayOrder.amount,       
      currency: razorpayOrder.currency,       
      key: process.env.RAZORPAY_ID_KEY,     
    });   
  } catch (error) {     
    console.error("Error in creating Razorpay Repayment Order:", error);     
    res.status(500).json({       
      success: false,       
      message: "Failed to create Razorpay repayment order.",       
      error: error.message,     
    });   
  } 
};

const verifyRepaymentOrder = async (req, res) => {
  try {
    console.log("sdfghjkl")
    const { 
      orderId, 
      paymentId, 
      razorpayOrderId,
      razorpaySignature 
    } = req.body;
    console.log(orderId,"check1")

    const order = await Order.findOne({orderId:orderId});
    console.log(order,"check2")

    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET_KEY)
      .update(`${razorpayOrderId}|${paymentId}`)
      .digest("hex");
    console.log("check2222",generatedSignature)
    console.log("paymentId",paymentId)
    console.log("razorpayOrderId",razorpayOrderId)



    const paymentVerificationStatus = generatedSignature === razorpaySignature;
    console.log(paymentVerificationStatus,"check3")



    if (paymentVerificationStatus) {
    console.log("check333")
      
      order.paymentStatus = 'Paid';
      await order.save();
    console.log(order,"check333")


      res.json({
        success: true,
        message: "Payment verified successfully"
      });
    } else {
      res.json({
        success: false,
        message: "Payment verification failed"
      });
    }
  } catch (error) {
    console.error("Error in verifying repayment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify repayment",
      error: error.message
    });
  }
};



const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Fetch the order with populated products and user
    const order = await Order.findOne({ orderId: orderId })
      .populate('orderedItems.products')
      .populate('user');

    if (!order) {
      return res.status(404).send('Order not found');
    }

    // **Filter only delivered products**
    const deliveredItems = order.orderedItems.filter(item => item.status === 'delivered');

    if (deliveredItems.length === 0) {
      return res.status(400).send('No delivered items in this order');
    }

    const address = await Address.findOne({ userId: order.user });
    const specificAddress = address?.address.find(
      (addr) => addr._id.toString() === order.address.toString()
    );

    // Create a PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

    doc.pipe(res); // Stream directly to response

    // **Header Section**
    doc.font('Helvetica-Bold')
      .fontSize(24)
      .text('TIME EDGE', { align: 'left' })
      .moveDown(0.5)
      .fontSize(12)
      .text('Private Limited', { align: 'left' });

    doc.moveDown(1)
      .fontSize(18)
      .text('Invoice', { align: 'right' })
      .fontSize(10)
      .text(`Invoice#: ${order.orderId}`, { align: 'right' })
      .text(`Date: ${new Date(order.createdOn).toLocaleDateString()}`, { align: 'right' });

    // **Shipping Address**
    doc.moveDown(2).fontSize(12).text('Shipping Address:', { continued: false });

    if (specificAddress) {
      doc.font('Helvetica')
        .text(`${order.user.name}`)
        .text(`${specificAddress.addressLine || ''}`)
        .text(`${specificAddress.city || ''}, ${specificAddress.state || ''}, ${specificAddress.pincode || ''}`)
        .text(`${specificAddress.phone || ''}`);
    }

    doc.moveDown(2).font('Helvetica-Bold').fontSize(10);

    // **Table Headers**
    const tableTop = doc.y;
    doc.text('ITEM DESCRIPTION', 50, tableTop, { width: 250 })
       .text('PRICE', 300, tableTop, { width: 100, align: 'right' })
       .text('QTY', 400, tableTop, { width: 50, align: 'right' })
       .text('TOTAL', 450, tableTop, { width: 100, align: 'right' });

    doc.moveDown(0.5).strokeColor('#000000').lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.font('Helvetica');

    // **List Delivered Items**
    let yPosition = doc.y + 15;
    let subTotal = 0;

    deliveredItems.forEach((item) => {
      const totalItemPrice = item.price * item.quantity;
      subTotal += totalItemPrice;

      doc.text(item.products.productName, 50, yPosition, { width: 250 })
         .text(`${item.price.toFixed(2)}`, 300, yPosition, { width: 100, align: 'right' })
         .text(item.quantity.toString(), 400, yPosition, { width: 50, align: 'right' })
         .text(`${totalItemPrice.toFixed(2)}`, 450, yPosition, { width: 100, align: 'right' });

      yPosition += 20;
    });

    // **Totals Section**
    doc.moveDown(2).strokeColor('#000000').lineWidth(1)
      .moveTo(300, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    const totalsStart = doc.y + 15;
    const discount = order.productdiscount || 0;
    const couponDiscount = order.couponDiscount || 0;
    const grandTotal = subTotal - discount - couponDiscount;

    doc.font('Helvetica')
       .text('SUB TOTAL', 300, totalsStart, { width: 150, align: 'left' })
       .text(`${subTotal.toFixed(2)}`, 450, totalsStart, { width: 100, align: 'right' })
       .text('Discount', 300, totalsStart + 20, { width: 150, align: 'left' })
       .text(`-${discount.toFixed(2)}`, 450, totalsStart + 20, { width: 100, align: 'right' })
       .text('Coupon Discount', 300, totalsStart + 40, { width: 150, align: 'left' })
       .text(`-${couponDiscount.toFixed(2)}`, 450, totalsStart + 40, { width: 100, align: 'right' });

    doc.font('Helvetica-Bold')
       .text('Grand Total', 300, totalsStart + 70, { width: 150, align: 'left' })
       .text(`${grandTotal.toFixed(2)}`, 450, totalsStart + 70, { width: 100, align: 'right' });

    // **Footer**
    doc.moveDown(4)
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('Contact', 50, doc.y)
       .font('Helvetica')
       .fontSize(9)
       .text('Time Edge Inc., 123 Main Street')
       .text('Email: support@timeedge.com')
       .text('www.timeedge.com');

    doc.moveDown(2)
       .fontSize(9)
       .text('Thank you for choosing us!', { align: 'left' })
       .text('We appreciate your trust in us and hope you enjoy your purchase.', { align: 'left' })
       .text('If you have any questions, feel free to reach out to our support team.', { align: 'left' });

    doc.end();

  } catch (error) {
    console.error('Invoice Generation Error:', error);
    res.status(500).send('Error generating invoice');
  }
};

module.exports = {
  getCheckoutPage,
  getOrderConfirmationPage,
  createOrder,
  showOrder,
  cancelOrderItem,
  returnOrder,
  orderRazorpay,
  verifyRazorPayOrder,
  walletPayment,
  postNewAddress,
  posteditAddress,
  getAddress,
  initiateRepayment,
  verifyRepaymentOrder,
  downloadInvoice
};
