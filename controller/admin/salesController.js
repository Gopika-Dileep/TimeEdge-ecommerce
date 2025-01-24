const Order = require("../../models/orderSchema");
const excelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require("fs");
const path = require("path");

const loadSalesReport = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const limit = 5;    
        const filtervalue = req.query.filtervalue || 'custom';
        const startDate = req.query.startDate || '';
        const endDate = req.query.endDate || '';

        let query = {};
        if (filtervalue !== 'custom') {
            const today = new Date();
            let start, end;

            switch (filtervalue) {
                case "daily":
                    start = new Date(today);
                    start.setHours(0, 0, 0, 0);
                    end = new Date(today);
                    end.setHours(23, 59, 59, 999);
                    break;
                case "weekly":
                    const startOfWeek = new Date(today);
                    const firstDayOfWeek = startOfWeek.getDate() - startOfWeek.getDay();
                    start = new Date(today.setDate(firstDayOfWeek));
                    start.setHours(0, 0, 0, 0);
                    end = new Date(today.setDate(firstDayOfWeek + 6));
                    end.setHours(23, 59, 59, 999);
                    break;
                case "monthly":
                    start = new Date(today.getFullYear(), today.getMonth(), 1);
                    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    end.setHours(23, 59, 59, 999);
                    break;
                case "yearly":
                    start = new Date(today.getFullYear(), 0, 1);
                    end = new Date(today.getFullYear(), 11, 31);
                    end.setHours(23, 59, 59, 999);
                    break;
                default:
                    start = new Date(0);
                    end = new Date();
                    break;
            }

            query.createdOn = { $gte: start, $lte: end };
        }

        if (startDate && endDate) {
            query.createdOn = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const totalOrders = await Order.find(query).sort({ createdOn: -1 }).populate('user').populate('orderedItems.products');
        const totalSalePrice = totalOrders.reduce((sum, order) => sum + order.finalAmount, 0);
        const saleCount = totalOrders.length;
        const couponDiscount = totalOrders.reduce((sum, order) => sum + order.discount, 0);
        const totalDiscount = totalOrders.reduce((sum, order) => sum + order.productdiscount, 0);
        const totalOrder = saleCount;
        const totalPage = Math.ceil(totalOrder / limit);

        const order = await Order.find(query).sort({ createdOn: -1 }).skip((page - 1) * limit).limit(limit).populate('user').populate('orderedItems.products');

        res.render('salesreport', {
            order,
            totalSalePrice,
            saleCount,
            couponDiscount,
            totalDiscount,
            totalPage,
            page: parseInt(page),
            filtervalue,
            startDate,
            endDate
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" });
    }
};

const filterOrder = async (req, res) => {
    try {
        const { filtervalue, startDate, endDate } = req.query;
        const today = new Date();
        let start, end;

        switch (filtervalue) {
            case "daily":
                start = new Date(today);
                start.setHours(0, 0, 0, 0);
                end = new Date(today);
                end.setHours(23, 59, 59, 999);
                break;
            case "weekly":
                const startOfWeek = new Date(today);
                const firstDayOfWeek = startOfWeek.getDate() - startOfWeek.getDay();
                start = new Date(today.setDate(firstDayOfWeek));
                start.setHours(0, 0, 0, 0);
                end = new Date(today.setDate(firstDayOfWeek + 6));
                end.setHours(23, 59, 59, 999);
                break;
            case "monthly":
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case "yearly":
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                end.setHours(23, 59, 59, 999);
                break;
            default:
                start = new Date(0);
                end = new Date();
                break;
        }

        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999);
        }

        const orders = await Order.find({
            createdOn: { $gte: start, $lte: end }
        })
            .sort({ createdOn: -1 })
            .populate('user')
            .populate('orderedItems.products');

        const totalSalePrice = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const saleCount = orders.length;
        const couponDiscount = orders.reduce((sum, order) => sum + order.discount, 0);
        const totalDiscount = orders.reduce((sum, order) => sum + order.productdiscount, 0);
        const totalPage = Math.ceil(saleCount / 5);

        return res.status(200).json({
            orders,
            saleCount,
            totalSalePrice,
            totalDiscount,
            couponDiscount,
            totalPage
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

        const orders = await Order.find({ createdOn: { $gte: start, $lte: end } }).sort({ createdOn: -1 })``.populate('user').populate('orderedItems.products');

        const totalSalePrice = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const saleCount = orders.length;
        const couponDiscount = orders.reduce((sum, order) => sum + order.discount, 0);
        const totalDiscount = orders.reduce((sum, order) => sum + order.productdiscount, 0);
        const totalPage = Math.ceil(saleCount / 5);

        return res.status(200).json({
            orders,
            saleCount,
            totalSalePrice,
            totalDiscount,
            couponDiscount,
            totalPage
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

const downloadpdf = async (req, res) => {
    try {
        const salesData = req.body.salesData;
        console.log(req.body.salesData,'salesdata')

        const pdfDoc = new PDFDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

        pdfDoc.pipe(res);

        pdfDoc.fontSize(18).text('Sales Report', { align: 'center' });
        pdfDoc.moveDown();

        salesData.forEach((order) => {
            pdfDoc
                .fontSize(12)
                .text(`Order ID: ${order._id} | User: ${order.userId.name} | Total: ${order.totalAmount} | Status: ${order.status}`);
            pdfDoc.moveDown();
        });

        pdfDoc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Failed to generate PDF');
    }
};

const downloadexcel = async (req, res) => {
    try {
        const salesData = req.body.salesData;
console.log(req.body.salesData,'saledate excel')
        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Order ID', key: '_id', width: 30 },
            { header: 'User', key: 'user', width: 30 },
            { header: 'Total Amount', key: 'totalAmount', width: 15 },
            { header: 'Status', key: 'status', width: 20 },
        ];

        salesData.forEach((data) => {
            worksheet.addRow({
                _id: data._id,
                user: data.userId.name,
                totalAmount: data.totalAmount,
                status: data.status,
            });
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        await workbook.xlsx.write(res);
        res.status(200).end();
    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).send('Failed to generate Excel');
    }
};

module.exports = {
    loadSalesReport,
    filterOrder,
    filterbyDate,
    downloadpdf,
    downloadexcel
};

