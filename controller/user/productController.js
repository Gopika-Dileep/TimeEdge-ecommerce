const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")
const User = require("../../models/userSchema")
const Wishlist = require("../../models/wishlistSchema")


const loadhome = async (req, res) => {
    try {
        const userId = req.session.user
        const categories = await Category.find({ isListed: true })
        const brands = await Brand.find({ isListed: true })
        
        const products = await Product.find({ 
            isListed: true,
            category: { $in: categories.map(cat => cat._id) },
            brand: { $in: brands.map(brand => brand._id) }
        })
        .sort({ createdAt: -1 })
        .limit(9)
        .populate('category')
        .populate('brand');

        let productsWithWishlist = [...products];
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId: userId });
            productsWithWishlist = products.map(product => {
                const productObj = product.toObject();
                productObj.inWishlist = wishlist ? wishlist.products.some(item => 
                    item.productId.toString() === product._id.toString()
                ) : false;
                return productObj;
            });
        }
        
        if (userId) {
            const user = await User.findById({ _id: userId })
            if(user.isBlocked===true){
              return  res.render('login', { message: "User is blocked by admin" });
            }
            res.render('home', { user: user, product: productsWithWishlist})
        } else {
            res.render("home", { product: productsWithWishlist})
        }
    } catch (error) {
        console.error(error)
        res.status(500).json("server error")
    }
}

const loadshop = async (req, res) => {
    try {
        const userId = req.session.user;
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isListed: true });

        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const search = req.query.search || '';
        const query = search ? { productName: { $regex: search, $options: 'i' } } : {};

        const product = await Product.find({ ...query, isListed: true ,    category: { $in: category.map(cat => cat._id) },
        brand: { $in: brand.map(brand => brand._id) } })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('category')
            .populate('brand');

        const totalproduct = await Product.countDocuments({ ...query, isListed: true });
        const totalpage = Math.ceil(totalproduct / limit);

        if (userId) {
            const userData = await User.findById({ _id: userId });
            if (userData) {
                return res.render("shop", {
                    user: userData,
                    product: product,
                    category: category,
                    brand: brand,
                    totalproduct: totalproduct,
                    currentpage: page,
                    totalpage: totalpage,
                    search: ''
                });
            }
        } else {
            return res.render("shop", {
                product: product,
                category: category,
                brand: brand,
                totalproduct: totalproduct,
                currentpage: page,
                totalpage: totalpage,
                search: ''
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json("server error");
    }
}


const productDetails = async (req, res) => {
    try {
        const userId = req.session.user
        const productId = req.query.id

        const product = await Product.findOne({ 
            _id: productId,
            isListed: true 
        })
        .populate({
            path: 'category',
            match: { isListed: true }
        })
        .populate({
            path: 'brand',
            match: { isListed: true } 
        })

        if (!product || !product.category || !product.brand) {
            return res.status(404).render('product-not-found');
        }

        const findCategory = product.category
        const findBrand = product.brand
        
        const relatedProducts = await Product.find({ 
            category: findCategory._id, 
            _id: { $ne: productId },
            isListed: true 
        }).limit(3)

        // Check if product is in user's wishlist
        let isInWishlist = false;
        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                if(user.isBlocked===true){
                    return res.render('login', { message: "User is blocked by admin" });
                }
                const wishlist = await Wishlist.findOne({ userId: userId });
                isInWishlist = wishlist ? wishlist.products.some(item => item.productId.toString() === productId) : false;
            }
        }

        if (userId) {
            const user = await User.findById(userId);
            res.render('productdetails', {
                user: user,
                product: product,
                quantity: product.quantity,
                category: findCategory,
                brand: findBrand,
                relatedProducts: relatedProducts,
                isInWishlist: isInWishlist
            })
        } else {
            res.render('productdetails', {
                product: product,
                quantity: product.quantity,
                category: findCategory,
                brand: findBrand,
                relatedProducts: relatedProducts,
                isInWishlist: false
            })
        }
    } catch (error) {
        console.error(error)
        res.status(500).json("server error") 
    }
}

const shopProducts = async (req, res) => {
    try {
        const user = req.session.user;
        const search = req.query.search || '';
        const categoryId = req.query.category;
        const brandId = req.query.brand;
        const priceSort = req.query.sort;
        const priceGt = req.query.gt ? parseInt(req.query.gt) : null;
        const priceLt = req.query.lt ? parseInt(req.query.lt) : null;
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 6;
        
       
        const categories = await Category.find({ isListed: true });
        const brands = await Brand.find({ isListed: true });

    
        const listedCategoryIds = categories.map(cat => cat._id);
        const listedBrandIds = brands.map(brand => brand._id);

      
        let query = { 
            isListed: true,
            category: { $in: listedCategoryIds },
            brand: { $in: listedBrandIds }
        };

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            query.$or = [
                { productName: { $regex: escapedSearch, $options: 'i' } },
                { description: { $regex: escapedSearch, $options: 'i' } }
            ];
        }
        
        if (categoryId && listedCategoryIds.some(id => id.toString() === categoryId)) {
            query.category = categoryId;
        }

        
        if (brandId && listedBrandIds.some(id => id.toString() === brandId)) {
            query.brand = brandId;
        }

      
        if (priceGt !== null && priceLt !== null) {
            query.salePrice = { $gte: priceGt, $lte: priceLt };
        } else if (priceGt !== null) {
            query.salePrice = { $gte: priceGt };
        } else if (priceLt !== null) {
            query.salePrice = { $lte: priceLt };
        }

      
        let sortOption = {};
        if (priceSort === 'asc') {
            sortOption = { salePrice: 1 };
        } else if (priceSort === 'desc') {
            sortOption = { salePrice: -1 };
        }

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        const products = await Product.find(query)
            .populate('category')
            .populate('brand')
            .sort(sortOption)
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);

        
        let productsWithWishlist = [...products];
        if (user) {
            const wishlist = await Wishlist.findOne({ userId: user });
            productsWithWishlist = products.map(product => {
                const productObj = product.toObject();
                productObj.inWishlist = wishlist ? wishlist.products.some(item => 
                    item.productId.toString() === product._id.toString()
                ) : false;
                return productObj;
            });
        }

     
        const renderOptions = {
            product: productsWithWishlist,
            category: categories,
            brand: brands,
            search: search,
            selectedCategory: categoryId,
            selectedBrand: brandId,
            priceSort: priceSort,
            minPrice: priceGt,
            maxPrice: priceLt,
            currentpage: page,
            totalpage: totalPages
        };

       
        if (user) {
            const userData = await User.findOne({ _id: user });
            if(userData.isBlocked===true){
                return  res.render('login', { message: "User is blocked by admin" });
              }
      
            renderOptions.user = userData;
        }

        res.render("shop", renderOptions);

    } catch (error) {
        console.error('Shop Products Error:', error);
        res.status(500).json({ error: "Server error occurred" });
    }
};

module.exports = {
    loadhome,
    loadshop,
    productDetails,
    shopProducts
}
