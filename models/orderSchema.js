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
            },
            returnReason:{
                type:String
            },
            cancelReason :{
                type:String
            }
            }],
            subtotal:{
                type:Number,
                default: 0
            },
            couponDiscount:{
                type:Number,
                default:0
            },
            productdiscount:{
                type:Number,
                default:0
            },
        finalAmount:{
            type:Number,
        },
        orderId : {
            type: String,
        },
        address:{
            type: Schema.Types.ObjectId,
            ref:"Address",
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
        couponId :{
           type:Schema.Types.ObjectId,
            ref:"Coupen",
        },
        paymentMethod:{
            type:String,
        },
        deliveryDate: { 
            type: Date 
        },
        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed"],
            default: "Pending"
        }
    })
    
    async function generateOrderId() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        const todayStart = new Date(date.setHours(0, 0, 0, 0));
        const todayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const count = await mongoose.model('order').countDocuments({
            createdOn: {
            $gte: todayStart,
            $lte: todayEnd
          }
        });
      
        const sequence = (count + 1).toString().padStart(4, '0');
        
        return `ORD${year}${month}${day}${sequence}`;
      }
      
      orderSchema.pre('save', async function(next) {
        if (!this.orderId) {
          this.orderId = await generateOrderId();
        }
        this.updatedAt = Date.now();
        next();
      });

    const Order = mongoose.model("order",orderSchema);
   
    module.exports = Order;
