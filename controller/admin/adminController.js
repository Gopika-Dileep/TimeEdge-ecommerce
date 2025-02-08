const mongoose = require("mongoose")
const User = require("../../models/userSchema")
const bcrypt = require("bcrypt")
const Category = require("../../models/categorySchema")
const Brand = require('../../models/brandSchema'); 
const Product= require('../../models/productSchema');
const Order = require("../../models/orderSchema");

const loadAdminLogin = async (req, res) => {
    try {
        res.render("adminlogin")
    } catch (error) {
        console.error(error)
        res.status(200).json({ message: "Error while load adminlogin page" })
    }
}
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body
        const admin = await User.findOne({ email, isAdmin: true })
        if (admin) {
            const passwordmatch = await bcrypt.compare(password, admin.password)
            if (passwordmatch) {
                req.session.admin = admin._id
                res.redirect('admin/dashboard')
            }
        }

    } catch (error) {
        console.error(error)
        res.status(200).json({ message: "Error while login" })
    }
}
const loadDashboard = async (req, res) => {
    try {
        res.render('dashboard')
    } catch (error) {
        console.error(error)
        res.status(400).json({ message: "error while loading dashboard" })
    }
}

const loadUsers = async (req, res) => {
    try {
        let search = req.query.search || ""
        let page = req.query.page || 1
        const limit = 3

        const user = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
            ],
        }).limit(limit)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 })
            .exec()



        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
            ],
        })

        const totalpage = Math.ceil(count / limit)

        res.render("userList", {
            users: user,
            search: search,
            pagination: {
                totalpage: totalpage,
                currentpage: page
            }
        })


    } catch (error) {
        console.error(error)
        res.status(400).json({ message: "error while loaading users" })
    }
}
const blockUser = async (req, res) => {
    try {
        const userId = req.params.userId

        if (!userId) {
            res.status(400).json({ message: "invalid user id" })
        } else {
            await User.findByIdAndUpdate({ _id: userId }, { isBlocked: true })
        return res.status(200).json("user blocked")
         
        }
    } catch (error) {
        console.error(error)
        res.status(400).json("error while blocking user")
    }

}
const unblockUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        await User.findByIdAndUpdate({ _id: userId }, { isBlocked: false })
        return res.status(200).json("user blocked")

    } catch (error) {
        console.error(error)
        res.status(400).json("error while unblocking user")
    }
}
// const loadcategory = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1
//         const limit = 3
//         const category = await Category.find({}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
//         const count = await Category.countDocuments({})
//         const totalpage = Math.ceil(count / limit)
//         res.render('category', {
//             category: category,
//             currentpage: page,
//             totalpage: totalpage,
//             totalcategories: count,

//         })
//     } catch (error) {
//         console.error(error)
//         res.status(400).json("error while loading category")
//     }
// }
const loadcategory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const searchQuery = req.query.search || '';

        let condition = {};
        if (searchQuery) {
            condition = {
                $or: [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { description: { $regex: searchQuery, $options: 'i' } }
                ]
            };
        }

        const category = await Category.find(condition)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const count = await Category.countDocuments(condition);
        const totalpage = Math.ceil(count / limit);

        res.render('category', {
            category: category,
            currentpage: page,
            totalpage: totalpage,
            totalcategories: count,
            searchQuery: searchQuery
        });
    } catch (error) {
        console.error('Error in loadcategory:', error);
        res.status(500).json({ error: "Error while loading categories" });
    }
};
const unlistCategory = async (req, res) => {
    try {
        const categoryId = req.params.catId
        console.log(categoryId,"categoryId")
        if (categoryId) {
            console.log("dfgfs");
            
       const news=await Category.findByIdAndUpdate({ _id: categoryId }, { isListed: false },{new:true})
       console.log(news,"new")
           return  res.status(200).json("category unlisted ")
        }else{
        res.status(404).json({ message: "category not found" })

        }
    } catch (error) {
        console.error(error)
        res.status(400).json({ message: "error while unlisting category" })
    }
}

const listCategory = async (req, res) => {
    try {
        const listCategory = req.params.catId
        console.log(listCategory,"listCategory")

        if (listCategory) {
            console.log("sdf")
           const news= await Category.findByIdAndUpdate({ _id: listCategory }, { isListed: true },{new:true})
       console.log(news,"new")

       return res.status(200).json("category listed ")


        }else{
            res.status(404).json({ message: "category not found" })
    
            }
    } catch (error) {
        console.error(error)
        req.status(400).json({ message: "error while listing category" })
    }
}

const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        console.log(req.body, 'cat body');

        if (!name || !description) {
            return res.status(400).json({ 
                success: false, 
                message: "Name and description are required" 
            });
        }
        const existCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });
        console.log(existCategory, 'cat existCategory');

        if (existCategory) {
            return res.status(400).json({ 
                success: false, 
                message: "Category already exists" 
            });
        }

        const category = new Category({ name, description });
        console.log(category, 'cat category');
        
        await category.save();
        return res.status(200).json({
            success: true,
            message: "Category added successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            success: false, 
            message: "Error while adding category" 
        });
    }
}
const loadEditCategory = async (req,res)=>{
    try {
        const categoryid=req.query.id
        const category = await Category.findById({_id:categoryid})
        res.render('editcategory',{category:category})
    } catch (error) {
        console.error(error)
        res.status(400).json({message:"error while loading edit page"})
    }
}
const editCategory = async (req,res)=>{
    try {

        const catid=req.params.categoryId
        console.log(catid,"catid")
        const {name,description} = req.body

        const category = await Category.findById({_id:catid})
     
        if(category){
            const updatedCategory = await Category.findByIdAndUpdate({_id:category._id},{
                name:name||category.name, description:description||category.description
            },{new:true})
            if(updatedCategory){
                return res.redirect('/editCategory')
            }
        }
      
        
    } catch (error) {
        console.error(error)    
        res.status(400).json({message:"error while eiting the category "})
    }
}
const addOffer = async (req, res) => {
    try {
        const { categoryId, percentage } = req.body;
        const category = await Category.findById(categoryId);
        category.categoryOffer = percentage;
        await category.save();
        res.status(200).json({ status: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Server error" });
    }
};

const removeOffer = async (req, res) => {
    try {
        const { categoryId } = req.body;
        const category = await Category.findById(categoryId);
        category.categoryOffer = 0;
        await category.save();
        res.status(200).json({ status: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Server error" });
    }
};
const loadbrand = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;
        
        const brand = await Brand.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        const totalBrands = await Brand.countDocuments({});
        const totalPages = Math.ceil(totalBrands / limit);

        if (page < 1 || page > totalPages) {
            return res.redirect('/admin/brand?page=1');
        }

        res.render('brand', {
            brand,
            currentpage: page,
            totalpage: totalPages,
            totalbrand: totalBrands,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error while loading brand page" });
    }
};
const addBrand = async (req,res)=>{
    try {
        const {name} = req.body
        console.log(req.body,'name')
            const existBrand = await Brand.findOne({name:name})
            if(existBrand){
                res.status(400).json({message:"Brand already exist"})
            }else{
                const newBrand = new Brand({name})
                await newBrand.save()
                res.redirect('/admin/brand')
            }
        
    } catch (error) {
        console.error(error)
        res.status(400).json({message:"error while adding brand"})
    }
}

const listBrand = async (req,res)=>{
         try {
            const brandId = req.params.brandId
            if(brandId){
                const updateBrand = await Brand.findByIdAndUpdate({_id:brandId},{isListed:true})
                res.redirect("/admin/brand")
            }
         } catch (error) {
            console.error(error)
            res.status(400).json({message:"error while listing brand"})
         }
}
const unlistBrand = async (req,res)=>{
    try {
        const brandId = req.params.brandId
        if(brandId){
            const updateBrand = await Brand.findByIdAndUpdate({_id:brandId},{isListed:false})
            res.redirect("/admin/brand")
        }
        
    } catch (error) {
        console.error(error)
        res.status(400).json({message:"error while unlisting brand"})
    }
}
const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 7;
        const orders = await Order.find()
            .populate('orderedItems.products')
            .populate('user')
            .sort({ createdOn: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const count = await Order.countDocuments();
        const totalpage = Math.ceil(count / limit);

        res.render('orderslist', {
            orders,
            currentpage: page,
            totalpage: totalpage
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "error while getting orders" });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate("user").populate("orderedItems.products").populate('address');
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.render("orderdetails", { order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch order details" });
    }
};
const changeStatus = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { status } = req.body;

        const order = await Order.findOne({ "orderedItems._id": itemId });
        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found" });
        }

        const item = order.orderedItems.id(itemId);
        if (!item) {
            return res.status(404).json({ success: false, error: "Item not found" });
        }

        if (item.status === "Returned") {
            return res.status(400).json({ success: false, error: "Cannot change status of a returned item" });
        }

        if (item.status === "Cancelled") {
            return res.status(400).json({ success: false, error: "Cannot change status of a cancelled item" });
        }

        item.status = status;
        await order.save();

        const itemStatuses = order.orderedItems.map(item => item.status);
        if (itemStatuses.every(s => s === "delivered")) {
            order.status = "delivered";
        } else if (itemStatuses.some(s => s === "Processing" || s === "Shipped")) {
            order.status = "Processing";
        } else if (itemStatuses.some(s => s === "Pending")) {
            order.status = "Pending";
        } else if (itemStatuses.some(s => s === "Cancelled" || s === "Return request" || s === "Returned")) {
            order.status = "Cancelled";
        } else {
            order.status = "pending";
        }
        await order.save();

        res.setHeader('Content-Type', 'application/json');
        return res.json({ success: true });
    } catch (error) {
        console.error('Error in changeStatus:', error);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ success: false, error: "Failed to update order status" });
    }
};
const logout = async (req,res)=>{
    try {
        req.session.destroy(err =>{
            if(err){
                console.log("Error desroying session",err);
                return res.status(400).json({message:"error while logout"})
            }else{
                console.log('back to lgin')
            res.redirect("/admin")
            }
        })
    } catch (error) {
        console.log("unexpected error during logout",error);
        res.status(500).json({message:"server error"})
        
    }
}
module.exports = {
    loadAdminLogin,
    adminLogin,
    loadDashboard,
    loadUsers,
    blockUser,
    unblockUser,
    loadcategory,
    unlistCategory,
    listCategory,
    addCategory,
    loadEditCategory,
    editCategory,
    addOffer,
    loadbrand,
    addBrand,
    listBrand,
    unlistBrand,
    getOrders,
    getOrderDetails,
    changeStatus,
    removeOffer,
    logout
}