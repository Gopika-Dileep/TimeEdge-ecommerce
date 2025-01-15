const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const Brand = require('../../models/brandSchema')
const Wishlist= require('../../models/wishlistSchema')


const loadWishlist = async(req,res)=>{
    try {
        const userId = req.session.user
        const user = await User.findById({_id:userId})
        const wishlist = await Wishlist.findOne({userId:userId}).populate('products.productId')
        res.render ('wishlist',{user:user,wishlist:wishlist})
    } catch (error) {
        console.error(error)
        res.status(500).json({message:"Server error"})
    }
}

const addToWishlist = async(req,res)=>{
     try {
        const userId = req.session.user
        const productId = req.params.productId
        const wishlist = await Wishlist.findOne({userId:userId})
        const product = await Product.findById({_id:productId})
        // console.log(productId,'product')
        // console.log(product,'product')
        // console.log(wishlist,'whislist')

        if(!product){
            return res.status(404).json({success:false,message:"Product not found"})
        }
        if(wishlist){
           const existProduct = wishlist.products.find((item)=>item.productId.toString()===productId)
           if(existProduct){
               return res.status(400).json({success:false,message:"Product already in wishlist"})
           }
           wishlist.products.push({productId:productId,price:product.salePrice,stockStatus:product.status})
           wishlist.save()
           return res.status(200).json({success:true,message:"Product added to wishlist"})
        }
        const newWishlist = new Wishlist({userId:userId,
            products:[{
                productId,
                price:product.salePrice,
                stockStatus:product.status,
            }

            ]
        })
        // console.log(newWishlist,'new wishlist')
        await newWishlist.save()
       return  res.status(200).json({success:true,message:"product added to wishlist"})
     } catch (error) {
        console.log(error)
        res.status(500).json({message:"Server error"})
     }
}
const removeItem = async(req,res)=>{
    try {
        const productId = req.params.itemId
        console.log(productId,'produtid')
        const userId = req.session.user
        console.log(userId,'user')
        
        const wishlist = await Wishlist.findOne({userId:userId})
        console.log(wishlist,'wishlist')

        const exists = wishlist.products.some(
            (item) => item.productId.toString() === productId.toString()
        );
        console.log('Does the product exist in the wishlist?', exists);
        

        wishlist.products = wishlist.products.filter(
            (item) => item.productId.toString() !== productId.toString()
        );
                console.log(wishlist.products,'reove')
        await wishlist.save();
        

       
        
        res.status(200).json({ success: true, message: 'Product removed from wishlist' });
    } catch (error) {
        console.error(error)
        res.return(500).json({message:"server error"})
    }
}

module.exports ={
    loadWishlist,
    addToWishlist,
    removeItem
}