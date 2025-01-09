const mongoose = require('mongoose')
const {Schema} = mongoose

const wishlistSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    products: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: "Product", 
                required: true,
            },
            price: {
                type: Number,
                required: true,
            },
            stockStatus: {
                type: String,
                required: true,
            },
            addedOn: {
                type: Date,
                default: Date.now,
            },
        },
    ],
});


const Wishlist = mongoose.model('Wishlist',wishlistSchema);
module.exports = Wishlist;