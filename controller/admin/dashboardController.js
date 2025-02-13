const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema'); 

const loadDashboard = async (req, res) => {
    try {
        const revenueData = await Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $match: {
                    "orderedItems.status": "delivered"
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$finalAmount" }
                }
            }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        const cancelledData = await Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $match: {
                    "orderedItems.status": "Cancelled"
                }
            },
            {
                $group: {
                    _id: null,
                    totalCancelled: { $sum: 1 }
                }
            }
        ]);
        const cancelledCount = cancelledData.length > 0 ? cancelledData[0].totalCancelled : 0;

        const salesData = await Order.countDocuments();

        const newUsersCount = await User.countDocuments();

        const product = await Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $group: {
                    _id: "$orderedItems.products",
                    totalOrder: { $sum: "$orderedItems.quantity" },
                },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    _id: 1,
                    productName: "$productDetails.productName",
                    totalOrder: 1,
                },
            },
            { $sort: { totalOrder: -1 } },
            { $limit: 4},
        ]);

        const category = await Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.products",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.category",
                    totalOrder: { $sum: "$orderedItems.quantity" },
                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryDetails",
                },
            },
            { $unwind: "$categoryDetails" },
            {
                $project: {
                    categoryName: "$categoryDetails.name",
                    totalOrder: 1,
                },
            },
            { $sort: { totalOrder: -1 } },
            { $limit: 4 },
        ]);

        const brand = await Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.products",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.brand",
                    totalOrder: { $sum: "$orderedItems.quantity" },
                },
            },
            {
                $lookup: {
                    from: "brands",
                    localField: "_id",
                    foreignField: "_id",
                    as: "brandDetails",
                },
            },
            { $unwind: "$brandDetails" },
            {
                $project: {
                    brandName: "$brandDetails.name",
                    totalOrder: 1,
                },
            },
            { $sort: { totalOrder: -1 } },
            { $limit: 4 },
        ]);

        const users = await User.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 4 }
        ]);

        const productData = product.map((item) => ({
            productName: item.productName,
            totalOrder: item.totalOrder,
        }));

        const categoryData = category.map((cat) => ({
            categoryName: cat.categoryName,
            totalOrder: cat.totalOrder,
        }));

        const brandData = brand.map((b) => ({
            brandName: b.brandName,
            totalOrder: b.totalOrder,
        }));

        const userData = users.map((user) => ({
            date: user._id,
            count: user.count
        }));

        res.render("dashboard", { 
            product, 
            category, 
            brand,
            users,
            productData, 
            categoryData, 
            brandData,
            userData,
            totalRevenue,
            newUsersCount,
            salesData,
            cancelledCount
        });
    } catch (error) {
        console.error("Error in Loading Admin Dashboard", error);
        res.status(500).send("Internal Server Error");
    }
};

const filterData = async (req, res) => {
    try {
        const { filterValue } = req.query;
        let filterCondition = {};
        let userFilterCondition = {};

        const now = new Date();
        switch (filterValue) {
            case 'daily':
                filterCondition = { 
                    createdOn: { 
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lt: new Date(now.setHours(23, 59, 59, 999)) 
                    } 
                };
                userFilterCondition = {
                    createdAt: { 
                        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        $lt: new Date(new Date().setHours(23, 59, 59, 999)) 
                    }
                };
                break;
            case 'weekly':
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                filterCondition = { createdOn: { $gte: weekAgo } };
                userFilterCondition = { createdAt: { $gte: weekAgo } };
                break;
            case 'monthly':
                const monthAgo = new Date(now);
                monthAgo.setMonth(now.getMonth() - 1);
                filterCondition = { createdOn: { $gte: monthAgo } };
                userFilterCondition = { createdAt: { $gte: monthAgo } };
                break;
            case 'yearly':
                const yearAgo = new Date(now);
                yearAgo.setFullYear(now.getFullYear() - 1);
                filterCondition = { createdOn: { $gte: yearAgo } };
                userFilterCondition = { createdAt: { $gte: yearAgo } };
                break;
            default:
                filterCondition = {};
                userFilterCondition = {};
        }

        const revenueData = await Order.aggregate([
            { $match: filterCondition },
            { $unwind: "$orderedItems" },
            {
                $match: {
                    "orderedItems.status": "delivered"
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$finalAmount" }
                }
            }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        const cancelledData = await Order.aggregate([
            { $match: filterCondition },
            { $unwind: "$orderedItems" },
            {
                $match: {
                    "orderedItems.status": "Cancelled"
                }
            },
            {
                $group: {
                    _id: null,
                    totalCancelled: { $sum: 1 }
                }
            }
        ]);
        const cancelledCount = cancelledData.length > 0 ? cancelledData[0].totalCancelled : 0;

        const salesData = await Order.countDocuments(filterCondition);

        const newUsersCount = await User.countDocuments(userFilterCondition);

        const products = await Order.aggregate([
            { $match: filterCondition },
            { $unwind: "$orderedItems" },
            {
                $group: {
                    _id: "$orderedItems.products",
                    totalOrder: { $sum: "$orderedItems.quantity" },
                },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    _id: 1,
                    productName: "$productDetails.productName",
                    totalOrder: 1,
                },
            },
            { $sort: { totalOrder: -1 } },
            { $limit: 4 },
        ]);

        const categories = await Order.aggregate([
            { $match: filterCondition },
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.products",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.category",
                    totalOrder: { $sum: "$orderedItems.quantity" },
                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryDetails",
                },
            },
            { $unwind: "$categoryDetails" },
            {
                $project: {
                    categoryName: "$categoryDetails.name",
                    totalOrder: 1,
                },
            },
            { $sort: { totalOrder: -1 } },
            { $limit: 4 },
        ]);

        const brands = await Order.aggregate([
            { $match: filterCondition },
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.products",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.brand",
                    totalOrder: { $sum: "$orderedItems.quantity" },
                },
            },
            {
                $lookup: {
                    from: "brands",
                    localField: "_id",
                    foreignField: "_id",
                    as: "brandDetails",
                },
            },
            { $unwind: "$brandDetails" },
            {
                $project: {
                    brandName: "$brandDetails.name",
                    totalOrder: 1,
                },
            },
            { $sort: { totalOrder: -1 } },
            { $limit: 4 },
        ]);

        const users = await User.aggregate([
            { $match: userFilterCondition },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 4 }
        ]);

        const productData = products.map((item) => ({
            productName: item.productName,
            totalOrder: item.totalOrder,
        }));

        const categoryData = categories.map((cat) => ({
            categoryName: cat.categoryName,
            totalOrder: cat.totalOrder,
        }));

        const brandData = brands.map((b) => ({
            brandName: b.brandName,
            totalOrder: b.totalOrder,
        }));

        const userData = users.map((user) => ({
            date: user._id,
            count: user.count
        }));

        res.json({
            products,
            categories,
            brands,
            users,
            productData,
            categoryData,
            brandData,
            userData,
            totalRevenue,
            newUsersCount,
            salesData,
            cancelledCount
        });
    } catch (error) {
        console.error("Error in filtering dashboard data", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {
    loadDashboard,
    filterData
};