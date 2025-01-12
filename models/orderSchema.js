const mongoose = require ("mongoose");
// const { Types } = require("mongoose");
const {Schema} = mongoose;

const orderSchema = new Schema({
    orderedItems:[{
        products:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        },
        status:{
            type:String,
            default:"pending",
            enum:["pending","Processing","Shipped","delivered","Cancelled","Return request","Returned"]
        }
        }],
        // totalPrice:{
        //     type:Number,
            
        // },

        discount:{
            type:Number,
            default:0
        },
    finalAmount:{
        type:Number,
    },
    address:{
        type: Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    user:{
        type: Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    invoiceDate:{
        type:Date
    },
    status:{
        type:String,
        default:"pending",
        enum:["pending","Processing","Shipped","delivered","Cancelled","Return request","Returned"]
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    coupenApplied:{
        type:Boolean,
        default:false
    },
    paymentMethod:{
        type:String,
    }
})

const Order = mongoose.model("order",orderSchema);
module.exports = Order;