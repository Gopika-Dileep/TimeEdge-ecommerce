const Brand = require('../../models/brandSchema');
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const fs = require('fs').promises;
const path = require('path');
const sharp = require("sharp");
const { STATUS_CODES, MESSAGES } = require("../../helpers/constants");

const LoadProduct = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const search = req.query.search || '';
        const query = search ? { productName: { $regex: search, $options: 'i' } } : {};

        const product = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('category')
            .populate('brand');

        const count = await Product.countDocuments(query);
        const totalpage = Math.ceil(count / limit);
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isListed: true });

        if (category && brand) {
            res.render('product', {
                product: product,
                currentpage: page,
                totalpage: totalpage,
                totalproduct: count,
                search: search
            });
        }
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.BAD_REQUEST).json(MESSAGES.ADMIN_PRODUCT.LOAD_ERROR);
    }
}

const loadAddProduct = async (req, res) => {
     try {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isListed: true });
        res.render("addproduct", {
            cat: category,
            brand: brand
        });
     } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.ADMIN_PRODUCT.LOAD_ADD_PRODUCT_ERROR });
     }
}

const addProducts = async (req, res) => {
    try {
        const products = req.body;

        const productExists = await Product.findOne({ 
            productName: { $regex: new RegExp(`^${products.productName}$`, 'i') } 
        });

        if (productExists) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                productExists: true,
                success: false,
                message: MESSAGES.ADMIN_PRODUCT.PRODUCT_EXISTS,
                showSweetAlert: true
            });
        }

        const images = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const originalImagePath = file.path;

                const uploadDir = path.join("public", "uploads", "productImages");
                const resizedFilename = `resized-${Date.now()}-${file.filename}`;
                const resizedImagePath = path.join(uploadDir, resizedFilename);

                await sharp(originalImagePath)
                    .resize({ width: 1000, height: 1000 })
                    .toFile(resizedImagePath);
                images.push(resizedFilename);
            }
        }

        const categoryId = await Category.findOne({ name: products.category });
        if (!categoryId) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                error: true,
                message: MESSAGES.ADMIN_PRODUCT.INVALID_CATEGORY
            });
        }
        const newcat = categoryId._id;
        
        const brandId = await Brand.findOne({ name: products.brand });
        const newbrand = brandId._id;

        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            brand: newbrand,
            category: newcat,
            regularPrice: products.regularPrice || 0,
            salePrice: products.salePrice,
            createdOn: new Date(),
            quantity: products.quantity,
            size: products.size,
            productImage: images,
            status: "Available",
        });
        
        await newProduct.save();

        return res.redirect('/admin/product');
    } catch (error) {
        console.error('Product Add Error:', error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('error', {
            message: MESSAGES.ADMIN_PRODUCT.ADD_PRODUCT_ERROR,
            error: error.message
        });
    }
};

const loadeditproduct = async (req, res) => {
    try {
        const productId = req.query.id;
        const product = await Product.findById({ _id: productId })
            .populate('category')  
            .populate('brand');  
        const category = await Category.find({});
        const brand = await Brand.find({});
        res.render("editproduct", {
            product: product,
            brand: brand,
            cat: category
        });
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(MESSAGES.SERVER_ERROR);
    }
}

const editproduct = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findOne({ _id: id });
        const data = req.body;
        const existingProduct = await Product.findOne({
            productName: data.productName,
            id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: MESSAGES.ADMIN_PRODUCT.PRODUCT_EXISTS_OTHER });
        }
        
        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files; i++) {
                images.push(req.files[i].filename);
            }
        }

        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            category: product.category,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            color: data.color
        };

        if (req.files && req.files.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }

        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        res.redirect("/admin/product");
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(MESSAGES.SERVER_ERROR);
    }
}

const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToserver, productIdToServer } = req.body;
        
        // Find the product
        const product = await Product.findById(productIdToServer);
        if (!product) {
            return res.json({ success: false, message: MESSAGES.ADMIN_PRODUCT.PRODUCT_NOT_FOUND });
        }

        // Check if image exists in product's images
        const imageIndex = product.productImage.indexOf(imageNameToserver);
        if (imageIndex === -1) {
            return res.json({ success: false, message: MESSAGES.ADMIN_PRODUCT.IMAGE_NOT_FOUND });
        }

        // Remove image from array
        product.productImage.splice(imageIndex, 1);
        
        // Save the product
        await product.save();

        // Delete the physical file
        const imagePath = path.join(__dirname, '../../public/uploads/productImages', imageNameToserver);
        await fs.unlink(imagePath).catch(err => console.log('File delete error:', err));

        res.json({ success: true, message: MESSAGES.ADMIN_PRODUCT.IMAGE_DELETE_SUCCESS });
    } catch (error) {
        console.error('Delete image error:', error);
        res.json({ success: false, message: MESSAGES.ADMIN_PRODUCT.IMAGE_DELETE_FAILED });
    }
};

const updateproduct = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const categoryDoc = await Category.findOne({ name: data.category });
        const brandDoc = await Brand.findOne({ name: data.brand });
        
        const categoryId = categoryDoc._id;
        
        const image = [];
        const product = await Product.findById({ _id: id });

        if (Array.isArray(req.files) && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                image.push(req.files[i].filename);
            }
        }

        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: brandDoc._id,
            category: categoryId,
            regularPrice: data.regularPrice, 
            salePrice: data.salePrice,
            quantity: data.quantity || product.quantity
        };

        if (image.length > 0) {
            updateFields.$push = { productImage: { $each: image } };
        }

        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        return res.redirect("/admin/product");
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json(MESSAGES.SERVER_ERROR);
    }
};

const listproduct = async (req, res) => {
     try {
        const product = req.query.id;
        await Product.findByIdAndUpdate({ _id: product }, { isListed: true });
        return res.redirect('/admin/product');
     } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.BAD_REQUEST).json(MESSAGES.SERVER_ERROR);
     }
}

const unlistproduct = async (req, res) => {
      try {
        const product = req.query.id;
        await Product.findByIdAndUpdate({ _id: product }, { isListed: false });
        return res.redirect('/admin/product');
      } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.BAD_REQUEST).json(MESSAGES.SERVER_ERROR);
      }
}

const addOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;
        const percentNum = parseFloat(percentage);
        if (isNaN(percentNum) || percentNum < 0 || percentNum > 99) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ status: false, message: MESSAGES.ADMIN_PRODUCT.INVALID_PERCENT });
        }
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ status: false, message: MESSAGES.ADMIN_PRODUCT.PRODUCT_NOT_FOUND });
        }
        product.productOffer = percentNum;
        product.offerAmount = Math.floor(product.salePrice * percentNum / 100);
        await product.save();
        res.json({ status: true });
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
    }
}

const removeOffer = async (req, res) => {
    try {
        const { productId } = req.body;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ status: false, message: MESSAGES.ADMIN_PRODUCT.PRODUCT_NOT_FOUND });
        }
        product.productOffer = 0;
        product.offerAmount = 0;
        await product.save();
        res.json({ status: true });
    } catch (error) {
        console.log(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ status: false, message: MESSAGES.SERVER_ERROR });
    }
}

module.exports = {
    LoadProduct,
    addProducts,
    loadAddProduct,
    loadeditproduct,
    editproduct,
    deleteSingleImage,
    updateproduct,
    listproduct,
    unlistproduct,
    addOffer,
    removeOffer
};
