const { STATUS_CODES, MESSAGES } = require("../../helpers/constants");
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
        const user = await User.findById({ _id: userId });
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
                
               
                const productOffer = product.productOffer || 0;
                const categoryOffer = product.category.categoryOffer || 0;
                const bestOffer = Math.max(productOffer, categoryOffer);
                
               
                const finalPrice = bestOffer > 0 ? 
                    product.salePrice - (product.salePrice * bestOffer / 100) : 
                    product.salePrice;
                
                return total + ((finalPrice) * item.quantity);
            }, 0);

           
            cart.items = validItems;
            await cart.save();

            res.render('cart', {
                user: user,
                cart: cart,
                totalPrice: Math.floor(totalPrice),
                message: validItems.length < cart.items.length ? 
                    "Some items were removed from your cart because they are no longer available." : 
                    null
            });
        } else {
            res.render('cart', { user: user, cart: null, totalPrice: 0, message: MESSAGES.USER_CART.EMPTY });
        }
    } catch (error) {
        console.error("Cart loading error:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(MESSAGES.SERVER_ERROR);
    }
};
const addToCart = async (req, res) => {
    try {
        const userId = req.session.user
        const productId = req.params.productId;
        const quantity = parseInt(req.body.quantity, 10);

        if (!userId) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.USER_CART.USER_ID_REQUIRED });
        }

        const product = await Product.findById(productId).populate('category').populate('brand');
        if (!product || !product.isListed || !product.category || !product.category.isListed || !product.brand || !product.brand.isListed) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "This timepiece is currently unavailable." });
        }

       
        if (product.quantity <= 0) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.USER_CART.OUT_OF_STOCK });
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
                return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: `You already have the maximum allowed quantity (${product.maxQtyPerPerson}) of this product in your cart.` });
            }
            
            if (quantity > product.quantity) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.USER_CART.EXCEEDS_STOCK });
            }
            
            cart = new Cart({
                user: userId,
                items: [{ product: productId, quantity, price: (finalPrice * quantity) }]
            });
        } else {
            const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);
            
            if (existingItemIndex !== -1) {
                const newQuantity = cart.items[existingItemIndex].quantity + quantity;
                
                if (newQuantity > product.maxQtyPerPerson) {
                    return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                        success: false, 
                        message: `You already have the maximum allowed quantity (${product.maxQtyPerPerson}) of this product in your cart.` 
                    });
                }
                
                if (newQuantity > product.quantity) {
                    return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                        success: false, 
                        message: MESSAGES.USER_CART.EXCEEDS_STOCK 
                    });
                }
                cart.items[existingItemIndex].quantity = newQuantity;
                cart.items[existingItemIndex].price = (finalPrice * newQuantity);
            } else {
                if (quantity > product.maxQtyPerPerson) {
                    return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                        success: false, 
                        message: `You already have the maximum allowed quantity (${product.maxQtyPerPerson}) of this product in your cart.` 
                    });
                }
                
                if (quantity > product.quantity) {
                    return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                        success: false, 
                        message: MESSAGES.USER_CART.EXCEEDS_STOCK 
                    });
                }
                cart.items.push({ product: productId, quantity, price: (finalPrice * quantity) });
            }
        }
        // console.log(cart,'cart2')
        await cart.save();
        return res.json({ success: true, message: MESSAGES.USER_CART.ADDED_TO_CART, cartCount: cart.items.length });
    } catch (error) {
        console.error("Add to cart error:", error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR });
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
            return res.status(STATUS_CODES.NOT_FOUND).json(MESSAGES.USER_CART.CART_NOT_FOUND);
        }

        const item = cart.items.find(item => item._id.toString() === itemId);
        if (!item) {
            return res.status(STATUS_CODES.NOT_FOUND).json(MESSAGES.USER_CART.ITEM_NOT_FOUND);
        }

        const product = await Product.findById(item.product).populate('category').populate('brand');
        if (!product || !product.isListed || !product.category || !product.category.isListed || !product.brand || !product.brand.isListed) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "This timepiece is currently unavailable." });
        }


        const currentQuantity = item.quantity

        if (currentQuantity >= product.quantity) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({message:MESSAGES.USER_CART.OUT_OF_STOCK});
        } else if (currentQuantity >= product.maxQtyPerPerson) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({message: `You already have the maximum allowed quantity (${product.maxQtyPerPerson}) of this product in your cart.`});
        } else {
            const productOffer = product.productOffer || 0
            const categoryOffer = product.category.categoryOffer || 0
    
            const bestOffer = Math.max(productOffer, categoryOffer)
            const finalPrice = bestOffer > 0 ? product.salePrice - (product.salePrice * bestOffer / 100) : product.salePrice
            item.quantity += 1;
            item.price = Math.floor(item.quantity * finalPrice);
           
            const test = await cart.save();

            return res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.USER_CART.QTY_INCREMENTED });
        }


    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR })

    }
}


const decrementQuantity = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const userId = req.session.user
        const cart = await Cart.findOne({ user: userId }).populate({ path: "items.product", populate: { path: "category", select: "categoryOffer" } })
      
        if (!cart) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: MESSAGES.USER_CART.CART_NOT_FOUND })
        }
        const item = cart.items.find(item => item._id.toString() === itemId)
        if (!item) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: MESSAGES.USER_CART.ITEM_NOT_FOUND })
        }
        if (item.quantity === 1) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.USER_CART.MIN_QTY_REACHED })
        }
        const product = await Product.findById(item.product).populate('category').populate('brand');
        if (!product || !product.isListed || !product.category || !product.category.isListed || !product.brand || !product.brand.isListed) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "This timepiece is currently unavailable." });
        }

        const currentQuantity = item.quantity

        if (currentQuantity >= product.quantity) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.USER_CART.QTY_EXCEEDED });
        } else {
            const productOffer = product.productOffer || 0
            const categoryOffer = product.category.categoryOffer || 0
    
            const bestOffer = Math.max(productOffer, categoryOffer)
            const finalPrice = bestOffer > 0 ? product.salePrice - (product.salePrice * bestOffer / 100) : product.salePrice
            item.quantity -= 1;
            item.price = Math.floor(item.quantity * finalPrice);
            await cart.save();
            return res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.USER_CART.QTY_DECREMENTED });
        }

    } catch (error) {
        console.error(error)
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR })
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
             


                return res.json({ success: true, message: MESSAGES.USER_CART.ITEM_REMOVED })
            }
        }
        return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.USER_CART.ITEM_NOT_FOUND });


    } catch (error) {
        console.error(error) 
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR })
    }
}




module.exports = {
    loadAddToCart,
    addToCart,
    incrementQuantity,
    decrementQuantity,
    removeItem
}