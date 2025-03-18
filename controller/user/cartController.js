const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")
const User = require("../../models/userSchema")
const Cart = require('../../models/cartSchema')

const loadAddToCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const itemsPerPage = 2;
        const page = parseInt(req.query.page) || 1;
        
        const cart = await Cart.findOne({ user: userId }).populate({
            path: "items.product",
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

        if (cart) {
            const validItems = cart.items.filter(item => {
                const product = item.product;
                return product && 
                       product.isListed && 
                       product.category && 
                       product.category.isListed &&
                       product.brand &&
                       product.brand.isListed;
            });

            const totalPrice = validItems.reduce((total, item) => {
                const product = item.product;
                
                // Calculate best offer similar to addToCart function
                const productOffer = product.productOffer || 0;
                const categoryOffer = product.category.categoryOffer || 0;
                const bestOffer = Math.max(productOffer, categoryOffer);
                
                // Apply the best offer to calculate final price
                const finalPrice = bestOffer > 0 ? 
                    product.salePrice - (product.salePrice * bestOffer / 100) : 
                    product.salePrice;
                
                return total + ((finalPrice) * item.quantity);
            }, 0);

            const user = await User.findById({ _id: userId });
            
            const totalItems = validItems.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            
            const paginatedItems = validItems.slice(startIndex, endIndex);
            const paginatedCart = {
                ...cart.toObject(),
                items: paginatedItems
            };

            cart.items = validItems;
            await cart.save();

            res.render('cart', {
                cart: paginatedCart,
                totalPrice: Math.floor(totalPrice),
                user: user,
                currentPage: page,
                totalPages: totalPages,
                hasNextPage: endIndex < totalItems,
                hasPrevPage: page > 1,
                message: validItems.length < cart.items.length ? 
                    "Some items were removed from your cart because they are no longer available." : 
                    null
            });
        } else {
            res.render('cart', { message: "Cart is empty" });
        }
    } catch (error) {
        console.error("Cart loading error:", error);
        res.status(500).json("server error");
    }
};
const addToCart = async (req, res) => {
    try {
        const userId = req.session.user
        const productId = req.params.productId;
        const quantity = parseInt(req.body.quantity, 10);

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const product = await Product.findById(productId).populate('category')
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

       
        if (product.quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Product is out of stock' });
        }

        let cart = await Cart.findOne({ user: userId });
        
      
        const productOffer = product.productOffer || 0
        const categoryOffer = product.category.categoryOffer || 0
        const bestOffer = Math.max(productOffer, categoryOffer)
        const finalPrice = bestOffer > 0 ? product.salePrice - (product.salePrice * bestOffer / 100) : product.salePrice

        // console.log(productOffer,categoryOffer, bestOffer,finalPrice,'price calculation')

        console.log(cart,'cart')
        if (!cart) {
            
            if (quantity > product.maxQtyPerPerson) {
                return res.status(400).json({ success: false, message: 'Maximum quantity for one product exceeded' });
            }
            
          
            if (quantity > product.quantity) {
                return res.status(400).json({ success: false, message: 'Requested quantity exceeds available stock' });
            }
            
            cart = new Cart({
                user: userId,
                items: [{ product: productId, quantity, price: (finalPrice * quantity) }]
            });
            // console.log(cart,'cart1')
        } else {
            const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);
            // console.log(existingItemIndex,'existingItemIndex')
            
            if (existingItemIndex !== -1) {
                const newQuantity = cart.items[existingItemIndex].quantity + quantity;
                // console.log(newQuantity,'newQuantity')
                
                if (newQuantity > product.maxQtyPerPerson) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Maximum quantity for one product exceeded' 
                    });
                }
                
                
                if (newQuantity > product.quantity) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Requested quantity exceeds available stock' 
                    });
                }
                // console.log(newQuantity, Math.floor(finalPrice * newQuantity),'finalamount')
                cart.items[existingItemIndex].quantity = newQuantity;
                cart.items[existingItemIndex].price = (finalPrice * newQuantity);
            } else {
                
                if (quantity > product.maxQtyPerPerson) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Maximum quantity for one product exceeded' 
                    });
                }
                
                if (quantity > product.quantity) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Requested quantity exceeds available stock' 
                    });
                }
                // console.log(finalPrice,quantity,'quantity')
                cart.items.push({ product: productId, quantity, price: (finalPrice * quantity) });
            }
        }
        // console.log(cart,'cart2')
        await cart.save();
        return res.json({ success: true, message: "Added to cart" });
    } catch (error) {
        console.error("Add to cart error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const incrementQuantity = async (req, res) => {
    try {
        const itemId = req.params.itemId
        console.log(itemId,'itemId')
        const userId = req.session.user
        console.log(userId,'userId')

        const cart = await Cart.findOne({ user: userId }).populate({ path: "items.product", populate: { path: "category", select: "categoryOffer" } })
        console.log(cart,'cart')

        if (!cart) {
            return res.status(404).json("Cart not found");
        }

        const item = cart.items.find(item => item._id.toString() === itemId);
        if (!item) {
            return res.status(404).json("Item not found in cart");
        }

        const product = await Product.findById(item.product).populate('category')


        const currentQuantity = item.quantity

        if (currentQuantity >= product.quantity) {
            return res.status(400).json({message:"product is out of stock"});
        } else if (currentQuantity >= product.maxQtyPerPerson) {
            return res.status(400).json({message:"Maximum quantity for one product exceeded"});
        } else {
            const productOffer = product.productOffer || 0
            const categoryOffer = product.category.categoryOffer || 0
    
            const bestOffer = Math.max(productOffer, categoryOffer)
            const finalPrice = bestOffer > 0 ? product.salePrice - (product.salePrice * bestOffer / 100) : product.salePrice
            item.quantity += 1;
            item.price = Math.floor(item.quantity * finalPrice);
           
            const test = await cart.save();

            return res.status(200).json({ success: true, message: "Quantity incremented" });
        }


    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: "server error" })

    }
}


const decrementQuantity = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const userId = req.session.user
        const cart = await Cart.findOne({ user: userId }).populate({ path: "items.product", populate: { path: "category", select: "categoryOffer" } })
      
        if (!cart) {
            return res.status(404).json("Cart not found")
        }
        const item = cart.items.find(item => item._id.toString() === itemId)
        if (!item) {
            return res.status(404).json("Item not found in cart")
        }
        if (item.quantity === 1) {
            return res.status(400).json("Minimum quantity reached")
        }
        const product = await Product.findById(item.product).populate('category')

        const currentQuantity = item.quantity

        if (currentQuantity >= product.quantity) {
            return res.status(400).json("Quantity exceeded");
        } else {
            const productOffer = product.productOffer || 0
            const categoryOffer = product.category.categoryOffer || 0
    
            const bestOffer = Math.max(productOffer, categoryOffer)
            const finalPrice = bestOffer > 0 ? product.salePrice - (product.salePrice * bestOffer / 100) : product.salePrice
            item.quantity -= 1;
            item.price = Math.floor(item.quantity * finalPrice);
            await cart.save();
            return res.status(200).json({ success: true, message: "Quantity incremented" });
        }

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: "server error" })
    }
}
const removeItem = async (req, res) => {
    try {
        const itemId = req.params.itemId
        

        const userId = req.session.user
       



        const cart = await Cart.findOne({ user: userId });
       


        if (cart) {
            const cartLength = cart.items.length
            cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

            if (cart.items.length < cartLength) {

                await cart.save()
             


                return res.json({ success: true, message: "item removed successfully" })
            }
        }
        return res.status(404).json({ success: false, message: 'Item not found.' });


    } catch (error) {
        console.error(error) 
        return res.status(500).json({ success: false, message: "server error" })
    }
}




module.exports = {
    loadAddToCart,
    addToCart,
    incrementQuantity,
    decrementQuantity,
    removeItem
}