const mongoose = require('mongoose')

const brandSchema=mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    // brandimage:{
    //     type:[String],
    //     required:true
    // },
    isListed:{
        type:Boolean,
        default:true
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
})

const Brand = mongoose.model('Brand',brandSchema)

module.exports = Brand