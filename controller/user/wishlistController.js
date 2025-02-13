const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const Brand = require('../../models/brandSchema')
const Wishlist= require('../../models/wishlistSchema')


const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const itemsPerPage = 2; 
        const page = parseInt(req.query.page) || 1;

       
        const wishlist = await Wishlist.findOne({ userId: userId }).populate({
            path: "products.productId",
            populate: [
                {
                    path: "category",
                    select: "name isListed categoryOffer"
                },
                {
                    path: "brand",
                    select: "name isListed"
                }
            ]
        });

        const user = await User.findById({ _id: userId });

        if (wishlist && wishlist.products.length > 0) {
            const validProducts = wishlist.products.filter(item => {
                const product = item.productId;
                return product && 
                       product.isListed && 
                       product.category && 
                       product.category.isListed && 
                       product.brand &&
                       product.brand.isListed;
            });

            const productsWithPrices = validProducts.map(item => {
                const product = item.productId;
                let price = product.salePrice;

                if (product.productOffer > 0) {
                    price -= product.offerAmount;
                }

                if (product.category && product.category.categoryOffer > 0) {
                    const categoryDiscount = (price * product.category.categoryOffer) / 100;
                    price -= categoryDiscount;
                }

                return {
                    ...item.toObject(),
                    finalPrice: Math.floor(price)
                };
            });

            const totalItems = productsWithPrices.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;

            const paginatedProducts = productsWithPrices.slice(startIndex, endIndex);
            const paginatedWishlist = {
                ...wishlist.toObject(),
                products: paginatedProducts
            };

            wishlist.products = validProducts;
            await wishlist.save();

            res.render('wishlist', {
                path: '/wishlist',
                user: user,
                wishlist: paginatedWishlist,
                currentPage: page,
                totalPages: totalPages,
                hasNextPage: endIndex < totalItems,
                hasPrevPage: page > 1,
                message: validProducts.length < wishlist.products.length ?
                    "Some items were removed from your wishlist because they are no longer available." :
                    null
            });
        } else {
            res.render('wishlist', {
                path: '/wishlist',
                user: user,
                wishlist: null,
                message: "Wishlist is empty"
            });
        }
    } catch (error) {
        console.error("Wishlist loading error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// const addToWishlist = async(req,res)=>{
//      try {
//         const userId = req.session.user
//         const productId = req.params.productId
//         const wishlist = await Wishlist.findOne({userId:userId})
//         const product = await Product.findById({_id:productId})
//         // console.log(productId,'product')
//         // console.log(product,'product')
//         // console.log(wishlist,'whislist')

//         if(!product){
//             return res.status(404).json({success:false,message:"Product not found"})
//         }
//         if(wishlist){
//            const existProduct = wishlist.products.find((item)=>item.productId.toString()===productId)
//            if(existProduct){
//                return res.status(400).json({success:false,message:"Product already in wishlist"})
//            }
//            wishlist.products.push({productId:productId,price:product.salePrice,stockStatus:product.status})
//            wishlist.save()
//            return res.status(200).json({success:true,message:"Product added to wishlist"})
//         }
//         const newWishlist = new Wishlist({userId:userId,
//             products:[{
//                 productId,
//                 price:product.salePrice,
//                 stockStatus:product.status,
//             }

//             ]
//         })
//         // console.log(newWishlist,'new wishlist')
//         await newWishlist.save()
//        return  res.status(200).json({success:true,message:"product added to wishlist"})
//      } catch (error) {
//         console.log(error)
//         res.status(500).json({message:"Server error"})
//      }
// }
const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.params.productId;
        const wishlist = await Wishlist.findOne({ userId: userId });
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (!wishlist) {
            const newWishlist = new Wishlist({
                userId: userId,
                products: [{ productId, price: product.salePrice, stockStatus: product.status }]
            });
            await newWishlist.save();
            return res.status(200).json({ success: true, action: 'added', message: "Product added to wishlist" });
        }

   
        const productIndex = wishlist.products.findIndex(item => item.productId.toString() === productId);

        if (productIndex !== -1) {
            wishlist.products.splice(productIndex, 1);
            await wishlist.save();
            return res.status(200).json({ success: true, action: 'removed', message: "Product removed from wishlist" });
        } else {
            wishlist.products.push({ productId, price: product.salePrice, stockStatus: product.status });
            await wishlist.save();
            return res.status(200).json({ success: true, action: 'added', message: "Product added to wishlist" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const removeItem = async(req,res)=>{
    try {
        const productId = req.params.itemId
        console.log(productId,'produtid')
        const userId = req.session.user
        console.log(userId,'user')
        
        const wishlist = await Wishlist.findOne({userId:userId})
        console.log(wishlist,'wishlist')
        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found' });
        }

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
        res.status(500).json({message:"server error"})
    }
}

module.exports ={
    loadWishlist,
    addToWishlist,
    removeItem
}