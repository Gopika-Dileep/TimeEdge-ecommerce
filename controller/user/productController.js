const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")
const User = require("../../models/userSchema")



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
        
        if (userId) {
            const user = await User.findById({ _id: userId })
            res.render('home', { user: user, product: products })
        } else {
            res.render("home", { product: products })
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

const filterProduct = async (req, res) => {
    try {
        const user = req.session.user
        const categoryId = req.query.category
        const brandId = req.query.brand
        const category = await Category.find({ isListed: true })
        const brand = await Brand.find({ isListed: true })
        if (categoryId) {
            const findCategory = await Category.findOne({ _id: categoryId, isListed: true })
            const category = await Category.find()

            const product = await Product.find({ isListed: true, category: findCategory._id })

            return res.render("shop", {
                product: product,
                category: category,
                brand: brand,
                selectedCategory: categoryId,
                selectedBrand: null,
                totalpage: 0,
                currentpage: 1
            })
        }
        if (brandId) {
            const findBrand = await Brand.findOne({ _id: brandId, isListed: true })
            const brand = await Brand.find()

            const product = await Product.find({ isListed: true, brand: findBrand._id })
            return res.render("shop", {
                product: product,
                category: category,
                brand: brand,
                selectedCategory: null,
                selectedBrand: brandId,
                totalpage: 0,
                currentpage: 1

            })

        }
        const product = await Product.find({ isListed: true, quantity: { $gt: 0 } }).sort({ createdAt: -1 })
        const itemsperpage = 6
        const currentpage = parseInt(req.query.page) || 1
        const totalpage = Math.ceil(product.length / itemsperpage)
        const startIndex = (currentpage - 1) * itemsperpage
        const currentProducts = product.slice(startIndex, startIndex + itemsperpage)
        if (user) {
            const userData = await User.find({ isBlocked: false })
            res.render("shop", {
                user: userData,
                products: currentProducts,
                category,
                brand,
                selectedCategory: categoryId,
                selectedBrand: brandId,
                totalpage,
                currentpage,
            })
        }


    } catch (error) {
        console.error(error)
        res.status(500).json("server error")
    }
}
const filterProductByPrice = async (req, res) => {
    try {
        const user = req.session.user
        const userData = await User.findOne({ _id: user })
        const brand = await Brand.find({ isListed: true })

        const category = await Category.find({ isListed: true })

        const sort = req.query.sort || null

        const product = await Product.find({ salePrice: { $gt: 0, $lt: 100000 }, isListed: true, quantity: { $gt: 0 } })

        if (sort === "asc") {
            product.sort((a, b) => a.salePrice - b.salePrice);
        } else if (sort === "desc") {
            product.sort((a, b) => b.salePrice - a.salePrice);
        } else {
            product.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        const page = parseInt(req.query.page) || 1
        const limit = 9
        const skip = (page - 1) * limit
        const count = await Product.countDocuments({})
        const totalpage = Math.ceil(count / limit)
        const end = limit + skip
        const currentProducts = product.slice(skip, end)

        res.render("shop", {
            user: userData,
            product: currentProducts,
            category: category,
            brand: brand,
            currentpage: page,
            totalpage: totalpage
        })

    } catch (error) {
        console.error(error)
        res.status(500).json("server error")
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

        console.log(product, 'product')

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

        if (userId) {
            const user = await User.findById({ _id: userId })
            res.render('productdetails', {
                user: user,
                product: product,
                quantity: product.quantity,
                category: findCategory,
                brand: findBrand,
                relatedProducts: relatedProducts
            })
        } else {
            res.render('productdetails', {
                product: product,
                quantity: product.quantity,
                category: findCategory,
                brand: findBrand,
                relatedProducts: relatedProducts
            })
        }
    } catch (error) {
        console.error(error)
        res.status(500).json("server error") 
    }
}

const searchProducts = async (req, res) => {
    try {
        const search = req.query.search || '';
        res.redirect(`/shop?search=${encodeURIComponent(search)}`);
    } catch (error) {
        console.error(error);
        res.status(500).json("server error");
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
            query.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
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
            const userData = await User.findOne({ _id: user });
            const wishlist = userData.wishlist || [];
            
            productsWithWishlist = products.map(product => {
                const productObj = product.toObject();
                productObj.inWishlist = wishlist.includes(product._id.toString());
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
    filterProduct,
    filterProductByPrice,
    productDetails,
    searchProducts,
    shopProducts
}
