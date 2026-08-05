const { STATUS_CODES, MESSAGES } = require("../../helpers/constants");
const mongoose = require("mongoose");
const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const walletHelper = require("../../helpers/walletHelper");
const Coupon = require("../../models/couponSchema");

const resolveOrderStatus = (orderedItems) => {
  const activeItems = orderedItems.filter(item => item.status !== "Cancelled" && item.status !== "Returned");
  
  if (activeItems.length === 0) {
    const statuses = orderedItems.map(item => item.status);
    if (statuses.includes("Returned")) {
      return "Returned";
    }
    return "Cancelled";
  }
  
  const activeStatuses = activeItems.map(item => item.status);
  
  if (activeStatuses.some(s => s === "Return request")) {
    return "Return request";
  }
  if (activeStatuses.some(s => s === "Shipped")) {
    return "Shipped";
  }
  if (activeStatuses.some(s => s === "Processing")) {
    return "Processing";
  }
  if (activeStatuses.some(s => s === "pending")) {
    return "pending";
  }
  if (activeStatuses.every(s => s === "delivered")) {
    return "delivered";
  }
  return "pending";
};

const loadAdminLogin = async (req, res) => {
  try {
    res.render("adminlogin", {
      error: null,
      email: null
    });
  } catch (error) {

    res.status(STATUS_CODES.OK).json({ message: MESSAGES.ADMIN.LOAD_LOGIN_ERROR });
  }
};
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render("adminlogin", { error: MESSAGES.ADMIN.EMAIL_PASSWORD_REQUIRED, email });
    }

    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      return res.render("adminlogin", { error: MESSAGES.ADMIN.INVALID_ADMIN_CREDENTIALS, email });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.render("adminlogin", { error: MESSAGES.ADMIN.INCORRECT_PASSWORD, email });
    }

    req.session.admin = admin._id;
    res.redirect("/admin/dashboard");

  } catch (error) {
    console.error(error);
    res.render("adminlogin", { error: MESSAGES.ADMIN.LOGIN_ERROR, email });
  }
};

const loadDashboard = async (req, res) => {
  try {
    res.render("dashboard");
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.ADMIN.DASHBOARD_LOAD_ERROR });
  }
};

const loadUsers = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = req.query.page || 1;
    const limit = 7;

    let queryConditions = [
      { name: { $regex: ".*" + search + ".*", $options: "i" } },
      { email: { $regex: ".*" + search + ".*", $options: "i" } },
    ];

    if (/^\d+$/.test(search)) {
      queryConditions.push({ phone: Number(search) });
    }

    const user = await User.find({
      isAdmin: false,
      $or: queryConditions,
    })
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .exec();

    const count = await User.countDocuments({
      isAdmin: false,
      $or: queryConditions,
    });

    const totalpage = Math.ceil(count / limit);

    res.render("userList", {
      users: user,
      search: search,
      pagination: {
        totalpage: totalpage,
        currentpage: page,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.ADMIN.USERS_LOAD_ERROR });
  }
};
const blockUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.ADMIN.INVALID_USER_ID });
    } else {
      await User.findByIdAndUpdate({ _id: userId }, { isBlocked: true });
      return res.status(STATUS_CODES.OK).json(MESSAGES.ADMIN.USER_BLOCKED_SUCCESS);
    }
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.BAD_REQUEST).json(MESSAGES.ADMIN.USER_BLOCK_ERROR);
  }
};
const unblockUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    await User.findByIdAndUpdate({ _id: userId }, { isBlocked: false });
    return res.status(STATUS_CODES.OK).json(MESSAGES.ADMIN.USER_UNBLOCKED_SUCCESS);
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.BAD_REQUEST).json(MESSAGES.ADMIN.USER_UNBLOCK_ERROR);
  }
};

const loadcategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const searchQuery = req.query.search || "";

    let condition = {};
    if (searchQuery) {
      condition = {
        $or: [
          { name: { $regex: searchQuery, $options: "i" } },
          { description: { $regex: searchQuery, $options: "i" } },
        ],
      };
    }

    const category = await Category.find(condition)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const count = await Category.countDocuments(condition);
    const totalpage = Math.ceil(count / limit) || 1;

    res.render("category", {
      category: category,
      currentpage: page,
      totalpage: totalpage,
      currentPage: page,
      totalPages: totalpage,
      totalcategories: count,
      searchQuery: searchQuery,
    });
  } catch (error) {
    console.error("Error in loadcategory:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.ADMIN.CATEGORY_LOAD_ERROR });
  }
};
const unlistCategory = async (req, res) => {
  try {
    const categoryId = req.query.id || req.params.catId;
    if (categoryId) {
      await Category.findByIdAndUpdate(
        { _id: categoryId },
        { isListed: false }
      );
    }
    return res.redirect("/admin/category");
  } catch (error) {
    console.error(error);
    return res.redirect("/admin/category");
  }
};

const listCategory = async (req, res) => {
  try {
    const categoryId = req.query.id || req.params.catId;
    if (categoryId) {
      await Category.findByIdAndUpdate(
        { _id: categoryId },
        { isListed: true }
      );
    }
    return res.redirect("/admin/category");
  } catch (error) {
    console.error(error);
    return res.redirect("/admin/category");
  }
};

const addCategory = async (req, res) => {
  try {
    const { name, description, categoryOffer } = req.body;
    const trimmedName = name ? name.trim() : "";
    const trimmedDesc = description ? description.trim() : "";
    const parsedOffer = categoryOffer ? parseInt(categoryOffer) : 0;

    if (!trimmedName) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ADMIN.CATEGORY_NAME_REQUIRED,
      });
    }

    if (!trimmedDesc) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ADMIN.CATEGORY_DESC_REQUIRED,
      });
    }

    if (!/^[A-Za-z0-9\s]+$/.test(trimmedName)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ADMIN.CATEGORY_NAME_INVALID,
      });
    }

    if (trimmedName.length < 3 || trimmedName.length > 30) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ADMIN.CATEGORY_NAME_LENGTH,
      });
    }

    if (trimmedDesc.length < 5 || trimmedDesc.length > 150) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ADMIN.CATEGORY_DESC_LENGTH,
      });
    }

    if (parsedOffer < 0 || parsedOffer > 100) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Category offer must be between 0 and 100",
      });
    }

    const existCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (existCategory) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ADMIN.CATEGORY_EXISTS,
      });
    }

    const category = new Category({ 
      name: trimmedName, 
      description: trimmedDesc, 
      categoryOffer: parsedOffer 
    });
    await category.save();
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: MESSAGES.ADMIN.CATEGORY_ADD_SUCCESS,
    });
  } catch (error) {
    console.error(error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ADMIN.CATEGORY_ADD_ERROR,
    });
  }
};
const loadEditCategory = async (req, res) => {
  try {
    const categoryid = req.query.id;
    const category = await Category.findById({ _id: categoryid });
    res.render("editcategory", { category: category });
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.ADMIN.CATEGORY_EDIT_LOAD_ERROR });
  }
};
const editCategory = async (req, res) => {
  try {
    const catid = req.params.categoryId;
    const { name, description, categoryOffer } = req.body;
    const trimmedName = name ? name.trim() : "";
    const trimmedDesc = description ? description.trim() : "";
    const parsedOffer = categoryOffer !== undefined ? parseInt(categoryOffer) : 0;

    const category = await Category.findById({ _id: catid });
    if (!category) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.ADMIN.CATEGORY_NOT_FOUND });
    }

    if (!trimmedName) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ADMIN.CATEGORY_NAME_REQUIRED,
      });
    }

    if (!trimmedDesc) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ADMIN.CATEGORY_DESC_REQUIRED,
      });
    }

    if (!/^[A-Za-z0-9\s]+$/.test(trimmedName)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ADMIN.CATEGORY_NAME_INVALID,
      });
    }

    if (trimmedName.length < 3 || trimmedName.length > 30) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ADMIN.CATEGORY_NAME_LENGTH,
      });
    }

    if (trimmedDesc.length < 5 || trimmedDesc.length > 150) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ADMIN.CATEGORY_DESC_LENGTH,
      });
    }

    if (parsedOffer < 0 || parsedOffer > 100) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Category offer must be between 0 and 100",
      });
    }

    const existCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
      _id: { $ne: catid }
    });

    if (existCategory) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ADMIN.CATEGORY_EXISTS,
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      { _id: catid },
      {
        name: trimmedName,
        description: trimmedDesc,
        categoryOffer: parsedOffer,
      },
      { new: true }
    );
    if (updatedCategory) {
      return res.json({ success: true, message: MESSAGES.ADMIN.CATEGORY_UPDATE_SUCCESS });
    }
    return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.ADMIN.CATEGORY_NOT_FOUND });
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.ADMIN.CATEGORY_EDIT_ERROR });
  }
};
const addOffer = async (req, res) => {
  try {
    const { categoryId, percentage } = req.body;
    const percentNum = parseFloat(percentage);
    if (isNaN(percentNum) || percentNum < 1 || percentNum > 100) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ status: false, message: "Category offer must be a number between 1 and 100" });
    }
    const category = await Category.findById(categoryId);
    category.categoryOffer = percentNum;
    await category.save();
    res.status(STATUS_CODES.OK).json({ status: true });
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ status: false, message: MESSAGES.SERVER_ERROR });
  }
};

const removeOffer = async (req, res) => {
  try {
    const { categoryId } = req.body;
    const category = await Category.findById(categoryId);
    category.categoryOffer = 0;
    await category.save();
    res.status(STATUS_CODES.OK).json({ status: true });
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ status: false, message: MESSAGES.SERVER_ERROR });
  }
};
const loadbrand = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    let query = {};
    if (search) {
      query = { name: { $regex: search, $options: 'i' } };
    }

    const brand = await Brand.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalBrands = await Brand.countDocuments(query);
    const totalPages = Math.ceil(totalBrands / limit) || 1;

    if (page < 1 || (totalPages > 0 && page > totalPages)) {
      return res.redirect(`/admin/brand?page=1${search ? '&search=' + search : ''}`);
    }

    res.render("brand", {
      brand,
      currentpage: page,
      totalpage: totalPages,
      totalbrand: totalBrands,
      search,
    });
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.ADMIN.BRAND_LOAD_ERROR });
  }
};
const addBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const trimmed = (name || '').trim();

    if (!trimmed) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Brand name is required.' });
    }
    if (/^[0-9]/.test(trimmed)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Brand name cannot start with a number.' });
    }
    if (trimmed.length < 2) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Brand name must be at least 2 characters.' });
    }

    const existBrand = await Brand.findOne({ name: { $regex: new RegExp(`^${trimmed}$`, 'i') } });
    if (existBrand) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.ADMIN.BRAND_EXISTS });
    }

    const newBrand = new Brand({ name: trimmed });
    await newBrand.save();
    res.redirect("/admin/brand");
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.ADMIN.BRAND_ADD_ERROR });
  }
};

const listBrand = async (req, res) => {
  try {
    const brandId = req.params.brandId;
    if (brandId) {
      const updateBrand = await Brand.findByIdAndUpdate(
        { _id: brandId },
        { isListed: true }
      );
      res.redirect("/admin/brand");
    }
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.ADMIN.BRAND_LIST_ERROR });
  }
};
const unlistBrand = async (req, res) => {
  try {
    const brandId = req.params.brandId;
    if (brandId) {
      const updateBrand = await Brand.findByIdAndUpdate(
        { _id: brandId },
        { isListed: false }
      );
      res.redirect("/admin/brand");
    }
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.ADMIN.BRAND_UNLIST_ERROR });
  }
};

const editBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { name } = req.body;
    const trimmed = (name || '').trim();

    if (!trimmed) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ status: false, message: 'Brand name is required.' });
    }
    if (/^[0-9]/.test(trimmed)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ status: false, message: 'Brand name cannot start with a number.' });
    }
    if (trimmed.length < 2) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ status: false, message: 'Brand name must be at least 2 characters.' });
    }

    const duplicate = await Brand.findOne({
      name: { $regex: new RegExp(`^${trimmed}$`, 'i') },
      _id: { $ne: brandId }
    });

    if (duplicate) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ status: false, message: 'A brand with this name already exists' });
    }

    await Brand.findByIdAndUpdate(brandId, { name: trimmed });
    res.json({ status: true, message: 'Brand updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ status: false, message: MESSAGES.SERVER_ERROR });
  }
};
const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 7;
    const search = req.query.search || '';
    const status = req.query.status || '';

    let query = {};
    if (search) {
      const User = require("../../models/userSchema");
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      });
      const userIds = matchingUsers.map(u => u._id);

      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { user: { $in: userIds } }
      ];
    }

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate("orderedItems.products")
      .populate("user")
      .sort({ createdOn: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const count = await Order.countDocuments(query);
    const totalpage = Math.ceil(count / limit) || 1;

    res.render("orderslist", {
      orders,
      currentpage: page,
      totalpage: totalpage,
      search,
      status,
    });
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.ADMIN.ORDERS_LOAD_ERROR });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate("user")
      .populate("orderedItems.products");

    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ error: MESSAGES.ADMIN.ORDER_NOT_FOUND });
    }

    const address = await Address.findOne({ userId: order.user });
    let specificAddress = null;

    if (address && address.address) {
      specificAddress = address.address.find(
        (addr) => addr._id.toString() === order.address.toString()
      );
    }

    res.render("orderdetails", { order, specificAddress });
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.ADMIN.ORDER_DETAILS_ERROR });
  }
};


const changeStatus = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status, cancelReason } = req.body;

    const order = await Order.findOne({ "orderedItems._id": itemId });
    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, error: MESSAGES.ADMIN.ORDER_NOT_FOUND });
    }

    const item = order.orderedItems.id(itemId);
    if (!item) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, error: MESSAGES.ADMIN.ITEM_NOT_FOUND });
    }

    if (item.status === "Returned") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: "Cannot change status of a returned item",
      });
    }

    if (item.status === "Cancelled") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: "Cannot change status of a cancelled item",
      });
    }
    if (item.status === "delivered") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: "Cannot change status of a delivered item",
      });
    }

    const stateIndices = {
      "pending": 0,
      "Processing": 1,
      "Shipped": 2,
      "delivered": 3
    };

    if (status !== item.status) {
      const currentIdx = stateIndices[item.status];
      const newIdx = stateIndices[status];
      let isAllowed = false;

      // 1. Moving between progress states: must move strictly forward
      if (currentIdx !== undefined && newIdx !== undefined) {
        if (newIdx > currentIdx) {
          isAllowed = true;
        }
      }

      // 2. Cancellation: only allowed from pending or Processing
      if (status === "Cancelled" && (item.status === "pending" || item.status === "Processing")) {
        isAllowed = true;
      }

      if (!isAllowed) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: `Cannot transition status from "${item.status}" to "${status}".`
        });
      }
    }

    const previousStatus = item.status;

    if (status === 'Cancelled') {
      if (!cancelReason) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: MESSAGES.ADMIN.CANCEL_REASON_REQUIRED
        });
      }

      const itemQuantity = item.quantity;
      let itemSalePrice = 0;


      if (item) {
        const product = await Product.findById({
          _id: item.products,
        }).populate("category");

        if (product) {

          product.quantity += item.quantity;
          await product.save();

          const productOffer = product.productOffer || 0;
          const categoryOffer = product.category.categoryOffer || 0;
          const bestOffer = Math.max(productOffer, categoryOffer);
          const salePrice = product.salePrice;
          itemSalePrice = bestOffer > 0 ? Math.floor(salePrice - (salePrice * bestOffer) / 100) : salePrice;
        }
      }


      const price = item.price - itemSalePrice;
      let couponRefundAmount = 0;
      let isCouponRemoved = false;

      if (order.couponId) {
        const remainingItems = order.orderedItems.filter(
          item => item.status !== "Returned" && item.status !== "Cancelled" && item._id.toString() !== itemId
        );

        let newTotal = 0;
        if (remainingItems.length >= 0) {
          for (let i = 0; i < remainingItems.length; i++) {
            const items = await Product.findById({
              _id: remainingItems[i].products,
            }).populate("category");

            const productOffer = items.productOffer || 0;
            const categoryOffer = items.category.categoryOffer || 0;
            const bestOffer = Math.max(productOffer, categoryOffer);
            const salePrice = items.salePrice;
            newTotal +=
              bestOffer > 0
                ? Math.floor(salePrice - (salePrice * bestOffer) / 100) * remainingItems[i].quantity
                : salePrice * remainingItems[i].quantity;
          }
        }

        const coupon = await Coupon.findById({ _id: order.couponId });
        if (coupon && newTotal < coupon.minimumPrice) {
          couponRefundAmount = order.couponDiscount;
          order.couponDiscount = 0;
          order.couponId = null;
          isCouponRemoved = true;
          const userIndex = coupon.userId.indexOf(order.user);
          if (userIndex !== -1) {
            coupon.userId.splice(userIndex, 1);
            await coupon.save();
          }
        }
      }


      if (order.paymentMethod !== "COD") {
        const cancelAmount = isCouponRemoved
          ? (itemSalePrice * itemQuantity) - couponRefundAmount
          : itemSalePrice * itemQuantity;

        order.finalAmount -= cancelAmount;
        order.subtotal -= item.price;
        order.productdiscount -= price;


        const userId = order.user;
        const transactionType = "credit";

        await walletHelper.updateWalletBalance(
          userId,
          cancelAmount,
          transactionType
        );
      }

      item.status = status;
      item.cancelReason = cancelReason;
    } else {

      item.status = status;
    }

    await order.save();

    order.status = resolveOrderStatus(order.orderedItems);
    await order.save();


    if (previousStatus !== "delivered" && status === "delivered") {
      try {
        const user = await User.findById(order.user);

        if (user) {
          if (user.referredBy && !user.referralBonusApplied) {
            await walletHelper.updateWalletBalance(user._id, 100, 'credit');

            const referrer = await User.findOne({ referralCode: user.referredBy });

            if (referrer) {
              await walletHelper.updateWalletBalance(referrer._id, 100, 'credit');
            }
            user.referralBonusApplied = true;
            await user.save();

            console.log(`Referral bonus applied: User ${user._id} received 100 rupees, Referrer received 100 rupees`);
          }
        }
      } catch (error) {
        console.error("Error processing referral bonus:", error);
      }
    }

    res.setHeader("Content-Type", "application/json");
    return res.json({ success: true });
  } catch (error) {
    console.error("Error in changeStatus:", error);
    res.setHeader("Content-Type", "application/json");
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, error: MESSAGES.ADMIN.ORDER_UPDATE_ERROR });
  }
};

const approveReturn = async (req, res) => {
  try {

    const { itemId } = req.params;
    const order = await Order.findOne({ "orderedItems._id": itemId });
    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, error: MESSAGES.ADMIN.ORDER_NOT_FOUND });
    }
    const currentDate = new Date();
    const item = order.orderedItems.find(
      (item) => item._id.toString() === itemId
    );
    if (!item) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, error: MESSAGES.ADMIN.ITEM_NOT_FOUND });
    }
    console.log(order, "order1")

    if (item.status !== "Return request") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: MESSAGES.ADMIN.ITEM_NOT_IN_RETURN_STATUS
      });
    }

    const deliveryDate = new Date(item.deliveryDate);
    const diffDays = (currentDate - deliveryDate) / (1000 * 60 * 60 * 24);
    console.log(order, "order2")

    if (diffDays > 10) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        message: MESSAGES.ADMIN.RETURN_DAYS_EXCEEDED,
      });
    }
    console.log(order, "order3")
    try {

      console.log(order, "order4")

      const product = await Product.findById(item.products).populate("category");
      if (!product) {
        return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, error: MESSAGES.ADMIN.PRODUCT_NOT_FOUND });
      }

      console.log(order, "order5")


      const getSalePrice = (product) => {
        const productOffer = product.productOffer || 0;
        const categoryOffer = product.category?.categoryOffer || 0;
        const bestOffer = Math.max(productOffer, categoryOffer);
        return bestOffer > 0 ? Math.floor(product.salePrice - (product.salePrice * bestOffer) / 100) : product.salePrice;
      };



      console.log(order, "order6")
      item.status = "Returned";
      const itemSalePrice = getSalePrice(product);

      const updatedQuantity = item.quantity;
      console.log(item.price, itemSalePrice, "order6.1")

      const price = item.price - itemSalePrice;
      console.log(price, "price")


      let couponRefundAmount = 0;
      let isCouponRemoved = false;
      console.log(order, "order7")
      if (order.couponId) {
        const remainingItems = order.orderedItems.filter(
          item => item.status !== "Returned" && item.status !== "Cancelled"
        );
        console.log(remainingItems, "remainingItems")
        let newtotal = 0;
        if (remainingItems.length >= 0) {
          for (let i = 0; i < remainingItems.length; i++) {
            const items = await Product.findById({
              _id: remainingItems[i].products,
            }).populate("category");
            const productOffer = items.productOffer || 0;
            const categoryOffer = items.category.categoryOffer || 0;
            const bestOffer = Math.max(productOffer, categoryOffer);
            const salePrice = items.salePrice;
            newtotal +=
              bestOffer > 0
                ? Math.floor(salePrice - (salePrice * bestOffer) / 100) * remainingItems[i].quantity
                : salePrice * remainingItems[i].quantity;
          }
        }
        console.log(order, "order8")
        const coupon = await Coupon.findById({ _id: order.couponId });
        console.log(coupon, "coupon")
        console.log(newtotal, coupon.minimumPrice, "newtotal")
        if (newtotal < coupon.minimumPrice) {
          couponRefundAmount = order.couponDiscount;
          order.couponDiscount = 0;
          order.couponId = null;
          isCouponRemoved = true;
          const userIndex = coupon.userId.indexOf(order.user);
          if (userIndex !== -1) {
            coupon.userId.splice(userIndex, 1);
            await coupon.save();
          }
        }
      }

      console.log(order.orderedItems, "order9.orderedItems")
      order.status = resolveOrderStatus(order.orderedItems);


      console.log(order, "orderfinal")
      const refundAmount = isCouponRemoved
        ? (itemSalePrice * updatedQuantity) - couponRefundAmount
        : itemSalePrice * updatedQuantity;


      product.quantity += updatedQuantity;
      await product.save();





      order.finalAmount -= refundAmount;
      order.subtotal -= item.price;
      order.productdiscount -= price;
      await order.save();

      if (order.user) {
        await walletHelper.updateWalletBalance(order.user, refundAmount, "credit");
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: MESSAGES.ADMIN.RETURN_APPROVE_SUCCESS
      });
    } catch (innerError) {
      console.error("Error in processing return:", innerError);
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: MESSAGES.ADMIN.RETURN_APPROVE_ERROR
      });
    }
  } catch (error) {
    console.error("Error in approveReturn:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ADMIN.RETURN_APPROVE_ERROR
    });
  }
};

const declineReturn = async (req, res) => {
  try {
    const { itemId } = req.params;
    const order = await Order.findOne({ "orderedItems._id": itemId });

    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, error: MESSAGES.ADMIN.ORDER_NOT_FOUND });
    }

    const item = order.orderedItems.id(itemId);
    if (!item) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, error: MESSAGES.ADMIN.ITEM_NOT_FOUND });
    }

    if (item.status !== "Return request") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: MESSAGES.ADMIN.ITEM_NOT_IN_RETURN_STATUS
      });
    }

    item.status = "delivered";
    item.returnReason = null;
    order.status = resolveOrderStatus(order.orderedItems);
    await order.save();

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: MESSAGES.ADMIN.RETURN_DECLINE_SUCCESS
    });
  } catch (error) {
    console.error("Error in declineReturn:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ADMIN.RETURN_DECLINE_ERROR
    });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error desroying session", err);
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, error: MESSAGES.ADMIN.LOGOUT_ERROR });
      } else {
        console.log("back to lgin");
        res.redirect("/admin");
      }
    });
  } catch (error) {
    console.log("unexpected error during logout", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, error: MESSAGES.SERVER_ERROR });
  }
};
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
  editBrand,
  getOrders,
  getOrderDetails,
  changeStatus,
  removeOffer,
  approveReturn,
  declineReturn,
  logout,
};
