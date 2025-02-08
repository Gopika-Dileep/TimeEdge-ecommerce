const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema'); // Assuming you have a user schema

// const loadDashboard = async (req, res) => {
//         try {
    
//             // Best selling product order
//             const product = await Order.aggregate([
//                 { $unwind: "$items" },
//                 {
//                     $group: {
//                         _id: "$items.productId",
//                         totalOrder: { $sum: "$items.quantity" },
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "products",
//                         localField: "_id",
//                         foreignField: "_id",
//                         as: "productDetails",
//                     },
//                 },
//                 { $unwind: "$productDetails" },
//                 {
//                     $project: {
//                         _id: 1,
//                         productName: "$productDetails.productName",
//                         totalOrder: 1,
//                     },
//                 },
//                 { $sort: { totalOrder: -1 } },
//                 { $limit: 10 },
//             ]);
    
    
//             // Best selling category order
//             const category = await Order.aggregate([
//                 { $unwind: "$items" },
//                 {
//                     $lookup: {
//                         from: "products",
//                         localField: "items.productId",
//                         foreignField: "_id",
//                         as: "productDetails",
//                     },
//                 },
//                 { $unwind: "$productDetails" },
//                 {
//                     $group: {
//                         _id: "$productDetails.category",
//                         totalOrder: { $sum: "$items.quantity" },
//                     },
//                 },
//                 {
//                     $lookup: {
//                         from: "categories",
//                         localField: "_id",
//                         foreignField: "_id",
//                         as: "categoryDetails",
//                     },
//                 },
//                 { $unwind: "$categoryDetails" },
//                 {
//                     $project: {
//                         categoryName: "$categoryDetails.name",
//                         totalOrder: 1,
//                     },
//                 },
//                 { $sort: { totalOrder: -1 } },
//                 { $limit: 10 }, // Limit to top 10 categories
//             ]);
    
    
//             // chart data for product
//             const productData = product.map((item) => ({
//                 productName: item.productName,
//                 totalOrder: item.totalOrder,
//             }));
    
    
//             // chart data for category
//             const categoryData = category.map((cat) => ({
//                 categoryName: cat.categoryName,
//                 totalOrder: cat.totalOrder,
//             }));
    
    
//             //console.log("pr",categoryData)
    
//             res.render("adminDashboard", { product, category, productData, categoryData })
//         } catch (error) {
//             console.error("Error in Loading Admin Dashboard", error);
//         }
//     }
    
const loadDashboard = async (req, res) => {
    try {
        // Best selling product order
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

        // Best selling category order
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

        // Best selling brands order
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

        // Chart data for products
        const productData = product.map((item) => ({
            productName: item.productName,
            totalOrder: item.totalOrder,
        }));

        // Chart data for categories
        const categoryData = category.map((cat) => ({
            categoryName: cat.categoryName,
            totalOrder: cat.totalOrder,
        }));

        // Chart data for brands
        const brandData = brand.map((b) => ({
            brandName: b.brandName,
            totalOrder: b.totalOrder,
        }));

        res.render("dashboard", { 
            product, 
            category, 
            brand, 
            productData, 
            categoryData, 
            brandData 
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

        // Set up date filtering based on the selected option
        switch (filterValue) {
            case 'daily':
                filterCondition = { 
                    createdOn: { 
                        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        $lt: new Date(new Date().setHours(23, 59, 59, 999)) 
                    } 
                };
                break;
            case 'weekly':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                filterCondition = { createdOn: { $gte: weekAgo } };
                break;
            case 'monthly':
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                filterCondition = { createdOn: { $gte: monthAgo } };
                break;
            case 'yearly':
                const yearAgo = new Date();
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                filterCondition = { createdOn: { $gte: yearAgo } };
                break;
            default:
                filterCondition = {};
        }

        // Best selling products
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

        // Best selling categories
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

        // Best selling brands
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

        // Prepare chart data
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

        res.json({
            products,
            categories,
            brands,
            productData,
            categoryData,
            brandData
        });
    } catch (error) {
        console.error("Error in filtering dashboard data", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
// module.exports = loadDashboard;


// module.exports = loadDashboard;


// Additional method for handling dashboard filtering
// exports.filterDashboard = async (req, res) => {
//     try {
//         const { filterValue } = req.query;
//         let startDate, endDate;

//         // Determine date range based on filter
//         switch(filterValue) {
//             case 'daily':
//                 startDate = new Date();
//                 endDate = new Date();
//                 startDate.setHours(0, 0, 0, 0);
//                 endDate.setHours(23, 59, 59, 999);
//                 break;
//             case 'weekly':
//                 startDate = new Date();
//                 startDate.setDate(startDate.getDate() - 7);
//                 endDate = new Date();
//                 break;
//             case 'monthly':
//                 startDate = new Date();
//                 startDate.setMonth(startDate.getMonth() - 1);
//                 endDate = new Date();
//                 break;
//             case 'yearly':
//                 startDate = new Date();
//                 startDate.setFullYear(startDate.getFullYear() - 1);
//                 endDate = new Date();
//                 break;
//             default:
//                 throw new Error('Invalid filter value');
//         }

//         // Aggregate data based on the selected filter
//         const filteredData = await Order.aggregate([
//             {
//                 $match: {
//                     createdOn: { 
//                         $gte: startDate, 
//                         $lte: endDate 
//                     }
//                 }
//             },
//             {
//                 $group: {
//                     _id: { 
//                         $dateToString: { 
//                             format: filterValue === 'daily' ? "%H" : 
//                                     filterValue === 'weekly' ? "%d" : 
//                                     filterValue === 'monthly' ? "%d" : "%m", 
//                             date: "$createdOn" 
//                         }
//                     },
//                     sales: { $sum: "$finalAmount" },
//                     orders: { $sum: 1 },
//                     customers: { $addToSet: "$user" }
//                 }
//             },
//             { $sort: { _id: 1 } }
//         ]);

//         // Prepare response
//         res.json({
//             salesData: filteredData.map(item => item.sales),
//             ordersData: filteredData.map(item => item.orders),
//             customersData: filteredData.map(item => item.customers.length),
//             totalSales: filteredData.reduce((sum, item) => sum + item.sales, 0),
//             customers: filteredData.reduce((sum, item) => sum + item.customers.length, 0),
//             orders: filteredData.reduce((sum, item) => sum + item.orders, 0)
//         });
//     } catch (error) {
//         console.error('Dashboard Filter Error:', error);
//         res.status(500).json({ error: 'Error filtering dashboard' });
//     }
// };

module.exports={
    loadDashboard,
    filterData
}