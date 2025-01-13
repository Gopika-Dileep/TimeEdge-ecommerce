const mongoose = require("mongoose");

const {Schema} = mongoose

const transactionSchema = new Schema({
  transactionId:{
    type:String,
    required:true
  },
  transactionType:{
    type:String,
    required:true
  },
  amount:{
    type:Number,
    required:true
  },
  additionalDetails:{
    type:String
  },
  date:{
    type:Date,
    default:Date.now
  }
});

const onlinePurchaseSchema = new Schema({
  paymentId:{
    type:String,
    required:false
  },
  amount:{
    type:Number,
    required:false
  },
  date:{
    type:Date,
    default:Date.now
  }
});

const refundHistory = new Schema({
  refundId:{
    type:String,
    required:true
  },
  orderId:{
    type:String,
    required:true
  },
  amount:{
    type:Number,
    required:true
  },
  date:{
    type:Date,
    default:Date.now
  }
})


const walletSchema = new Schema({
  userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true
  },
  balance:{
    type:Number,
    default:0,
  },
  transactions:[transactionSchema],
  onlinePurchase:[onlinePurchaseSchema],
  refundHistory:[refundHistory]
})



const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;