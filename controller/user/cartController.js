const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")
const User = require("../../models/userSchema")
const Cart = require('../../models/cartSchema')


const loadAddToCart = async (req, res) => {
    try {
        const userId = req.session.user
        const cart = await Cart.findOne({ user: userId }).populate({ path: "items.product", populate: { path: "category", select: "categoryOffer" } })



        if (cart) {
            const totalPrice = cart.items.reduce((total, item) => total + item.price, 0);
            const user = await User.findById({ _id: userId })
            res.render('cart', { cart: cart, totalPrice: Math.floor(totalPrice), user: user })
        } else {
            res.render('cart', { message: "cart is empty" })
        }
    } catch (error) {
        console.error(error)
        res.status(500).json("server error")
    }
}

const addToCart = async (req, res) => {
    const userId = req.session.user
    const productId = req.params.productId;
    const quantity = parseInt(req.body.quantity, 10);


    if (!userId) {
        return res.status(400).send('User ID is required');
    }

    const product = await Product.findById(productId).populate('category')
    const productOffer = product.productOffer || 0
    const categoryOffer = product.category.categoryOffer || 0

    const bestOffer = Math.max(productOffer, categoryOffer)
    const finalPrice = bestOffer > 0 ? product.salePrice - (product.salePrice * bestOffer / 100) : product.salePrice
    if (!product) {
        return res.status(404).send('Product not found');
    }
    let cart = await Cart.findOne({ user: userId });


    if (!cart) {
        cart = new Cart({
            user: userId,
            items: [{ product: productId, quantity, price: Math.floor(finalPrice * quantity) }]
        });
    } else {
        const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);


        if (existingItemIndex !== -1) {
            cart.items[existingItemIndex].quantity += quantity;
            cart.items[existingItemIndex].price += finalPrice * quantity;
        } else {
            cart.items.push({ product: productId, quantity, price:Math.floor(finalPrice * quantity) });
        }
    }


    await cart.save();
    res.json({ success: true, message: "added to cart" })

};

const incrementQuantity = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const userId = req.session.user
        const cart = await Cart.findOne({ user: userId }).populate({ path: "items.product", populate: { path: "category", select: "categoryOffer" } })

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
            return res.status(400).json("Quantity exceeded");
        } else if (currentQuantity >= product.maxQtyPerPerson) {
            return res.status(400).json("Maximum quantity for one product exceeded");
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