const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const { STATUS_CODES, MESSAGES } = require("../../helpers/constants");

// Shared helper — all queries use the same filter so cards, charts and tables always match
async function buildDashboardData(orderFilter, userFilter) {

  // 1. Revenue: sum price*qty of delivered items within the filtered orders
  const revenueAgg = await Order.aggregate([
    { $match: orderFilter },
    { $unwind: "$orderedItems" },
    { $match: { "orderedItems.status": "delivered" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } }
      }
    }
  ]);
  const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

  // 2. Cancelled: item-level cancellations within filtered orders
  const cancelledAgg = await Order.aggregate([
    { $match: orderFilter },
    { $unwind: "$orderedItems" },
    { $match: { "orderedItems.status": "Cancelled" } },
    { $group: { _id: null, totalCancelled: { $sum: 1 } } }
  ]);
  const cancelledCount = cancelledAgg.length > 0 ? cancelledAgg[0].totalCancelled : 0;

  // 3. Sales: total product units sold in the filtered period (excluding Cancelled, Returned, payment failed)
  const salesAgg = await Order.aggregate([
    { $match: orderFilter },
    { $unwind: "$orderedItems" },
    { $match: { "orderedItems.status": { $nin: ["Cancelled", "Returned", "payment failed"] } } },
    { $group: { _id: null, totalQty: { $sum: "$orderedItems.quantity" } } }
  ]);
  const salesData = salesAgg.length > 0 ? salesAgg[0].totalQty : 0;

  // 4. New customers: non-admin users registered in the filtered period
  const newUsersCount = await User.countDocuments({ ...userFilter, isAdmin: false });

  // 5. Top 4 products by qty sold (exclude cancelled/returned items)
  const products = await Order.aggregate([
    { $match: orderFilter },
    { $unwind: "$orderedItems" },
    { $match: { "orderedItems.status": { $nin: ["Cancelled", "Returned", "payment failed"] } } },
    { $group: { _id: "$orderedItems.products", totalOrder: { $sum: "$orderedItems.quantity" } } },
    { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDetails" } },
    { $unwind: "$productDetails" },
    { $project: { _id: 1, productName: "$productDetails.productName", totalOrder: 1 } },
    { $sort: { totalOrder: -1 } },
    { $limit: 4 }
  ]);

  // 6. Top 4 categories by qty sold (exclude cancelled/returned items)
  const categories = await Order.aggregate([
    { $match: orderFilter },
    { $unwind: "$orderedItems" },
    { $match: { "orderedItems.status": { $nin: ["Cancelled", "Returned", "payment failed"] } } },
    { $lookup: { from: "products", localField: "orderedItems.products", foreignField: "_id", as: "productDetails" } },
    { $unwind: "$productDetails" },
    { $group: { _id: "$productDetails.category", totalOrder: { $sum: "$orderedItems.quantity" } } },
    { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "categoryDetails" } },
    { $unwind: "$categoryDetails" },
    { $project: { categoryName: "$categoryDetails.name", totalOrder: 1 } },
    { $sort: { totalOrder: -1 } },
    { $limit: 4 }
  ]);

  // 7. Top 4 brands by qty sold (exclude cancelled/returned items)
  const brands = await Order.aggregate([
    { $match: orderFilter },
    { $unwind: "$orderedItems" },
    { $match: { "orderedItems.status": { $nin: ["Cancelled", "Returned", "payment failed"] } } },
    { $lookup: { from: "products", localField: "orderedItems.products", foreignField: "_id", as: "productDetails" } },
    { $unwind: "$productDetails" },
    { $group: { _id: "$productDetails.brand", totalOrder: { $sum: "$orderedItems.quantity" } } },
    { $lookup: { from: "brands", localField: "_id", foreignField: "_id", as: "brandDetails" } },
    { $unwind: "$brandDetails" },
    { $project: { brandName: "$brandDetails.name", totalOrder: 1 } },
    { $sort: { totalOrder: -1 } },
    { $limit: 4 }
  ]);

  // 8. User registration by date (chronological for chart display)
  const users = await User.aggregate([
    { $match: { ...userFilter, isAdmin: false } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: 10 }
  ]);

  return {
    product: products, category: categories, brand: brands, users,
    products, categories, brands,
    productData:  products.map(i   => ({ productName:  i.productName,  totalOrder: i.totalOrder })),
    categoryData: categories.map(c => ({ categoryName: c.categoryName, totalOrder: c.totalOrder })),
    brandData:    brands.map(b     => ({ brandName:    b.brandName,    totalOrder: b.totalOrder })),
    userData:     users.map(u      => ({ date: u._id,  count: u.count })),
    totalRevenue, newUsersCount, salesData, cancelledCount
  };
}

// Page load — no filter means all-time data
const loadDashboard = async (req, res) => {
  try {
    const data = await buildDashboardData({}, {});
    res.render("dashboard", data);
  } catch (error) {
    console.error("Error in Loading Admin Dashboard", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
  }
};

// Filter endpoint — returns JSON for the chosen period
const filterData = async (req, res) => {
  try {
    const { filterValue } = req.query;
    let orderFilter = {};
    let userFilter  = {};
    const now = new Date();

    switch (filterValue) {
      case "daily": {
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        const end   = new Date(now); end.setHours(23, 59, 59, 999);
        orderFilter = { createdOn: { $gte: start, $lte: end } };
        userFilter  = { createdAt: { $gte: start, $lte: end } };
        break;
      }
      case "weekly": {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        orderFilter = { createdOn: { $gte: weekStart, $lte: weekEnd } };
        userFilter  = { createdAt: { $gte: weekStart, $lte: weekEnd } };
        break;
      }
      case "monthly": {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        orderFilter = { createdOn: { $gte: monthStart, $lte: monthEnd } };
        userFilter  = { createdAt: { $gte: monthStart, $lte: monthEnd } };
        break;
      }
      case "yearly": {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd   = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        orderFilter = { createdOn: { $gte: yearStart, $lte: yearEnd } };
        userFilter  = { createdAt: { $gte: yearStart, $lte: yearEnd } };
        break;
      }
      default:
        orderFilter = {};
        userFilter  = {};
    }

    const data = await buildDashboardData(orderFilter, userFilter);
    res.json(data);
  } catch (error) {
    console.error("Error in filtering dashboard data", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

module.exports = { loadDashboard, filterData };
