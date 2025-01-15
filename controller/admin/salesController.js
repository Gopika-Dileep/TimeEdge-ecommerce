const Order = require("../../models/orderSchema")

const loadSalesReport = async(req,res)=>{
    try {
        const page = req.query.page||1
        const limit = 3
        const order = await Order.find({}).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).populate('user').populate('orderedItems.products')
        const totalSalePrice= order.reduce((sum,order)=>sum+order.finalAmount,0)
        const saleCount = await Order.countDocuments()
        const couponDiscount = order.reduce((sum,order)=>sum+order.discount,0)
        const totalDiscount= order.reduce((sum,order)=>sum+order.finalAmount,0)
        
        const totalOrder = await Order.countDocuments()
        const totalPage = totalOrder/limit
      
        res.render('salesreport',{
            order,
            totalSalePrice,
            saleCount,
            couponDiscount,
            totalDiscount,
            totalPage,
            page
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({message:"server error"})
    }
}
const filterOrder = async (req, res) => {
    try {
        const { filtervalue } = req.query;
        const today = new Date(); 
        let startDate, endDate;
        console.log(filtervalue, 'filtervalue')

        switch (filtervalue) {
            case "daily":
                startDate = new Date(today);  
                startDate.setHours(0, 0, 0, 0); 
                endDate = new Date(today); 
                endDate.setHours(23, 59, 59, 999); 
                break;
            case "weekly":
                const startOfWeek = new Date(today);
                const firstDayOfWeek = startOfWeek.getDate() - startOfWeek.getDay(); 
                const endOfWeek = new Date(today);
                const lastDayOfWeek = firstDayOfWeek + 6; 

                startDate = new Date(today.setDate(firstDayOfWeek)); 
                endDate = new Date(today.setDate(lastDayOfWeek)); 
                console.log(startDate, 'Start Date for Weekly');
                console.log(endDate, 'End Date for Weekly');
                break;
            case "monthly":
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); 
                break;
            case "yearly":
                startDate = new Date(today.getFullYear(), 0, 1); 
                endDate = new Date(today.getFullYear(), 11, 31); 
                break;
            default:
                startDate = new Date(0); 
                endDate = new Date(); 
                break;
        }
        console.log('Start Date:', startDate);
        console.log('End Date:', endDate);

        const orders = await Order.find({ 
            createdOn: { $gte: startDate, $lte: endDate }
        })
        .sort({ createdOn: -1 })
        .populate('user')
        .populate('orderedItems.products');
        
        console.log(orders,'orderess')

        const totalSalePrice = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const saleCount = orders.length; 
        const couponDiscount = orders.reduce((sum, order) => sum + order.discount, 0);
        const totalDiscount = orders.reduce((sum, order) => sum + order.finalAmount, 0);

        return res.status(200).json({
            orders,
            saleCount,
            totalSalePrice,
            totalDiscount,
            couponDiscount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


const filterbyDate = async (req, res) => {
    try {
        let { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            startDate = new Date().toISOString().split('T')[0]; 
            endDate = startDate;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        end.setUTCHours(23, 59, 59, 999); 
console.log(start,'start')
console.log(end,'end')

        const orders = await Order.find({ createdOn: { $gte: start, $lte: end } }).populate('user').populate('orderedItems.products')
      
        const totalSalePrice = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const saleCount = orders.length; 
        const couponDiscount = orders.reduce((sum, order) => sum + order.discount, 0);
        const totalDiscount = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        return res.status(200).json({
            orders,
            saleCount,
            totalSalePrice,
            totalDiscount,
            couponDiscount
        });
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
}

module.exports={
    loadSalesReport,
    filterOrder,
    filterbyDate
}

