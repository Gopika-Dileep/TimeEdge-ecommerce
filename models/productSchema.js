const mongoose = require("mongoose")
const Category = require("./categorySchema")
const {Schema}= mongoose;


const productSchema = mongoose.Schema({
    productName:{
        type:String,
        required:true
    },
    productImage:{
        type:[String],
        required:true
    },
    
    description:{
        type:String,
        required:true,
    },
    brand:{
        type:Schema.Types.ObjectId,
        ref:"Brand",
        required:true
    },
    // brandName:{
    //     type:String,
    //     required:false
    // },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
    },

    regularPrice:{
        type:Number,
        required:true
    },
    salePrice:{
        type:Number,
        required:true
    },
    productOffer:{
        type:Number,
        default:0,
    },
    offerAmount:{
        type:Number,
        default:0
    },
    quantity:{
        type:Number,
        default:true
    },
    isListed:{
        type:Boolean,
        default:true
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    status:{
        type:String,
        enum:["Available","out of stock","Discontinued"],
        required:true,
        default:"Available",
    },
    maxQtyPerPerson:{
        type:Number,
        default:5,
    }
})

const Product = mongoose.model("Product",productSchema)
module.exports= Product