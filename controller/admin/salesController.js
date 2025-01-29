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
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            size: 'A4'
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

        doc.pipe(res);

        const startX = 50;
        const columnWidths = [100, 100, 150, 100, 100];
        const rowHeight = 42;
        const itemsPerPage = 12; 
        const tableWidth = columnWidths.reduce((a, b) => a + b, 0);

        const createHeader = (pageNum) => {
            doc.fontSize(18)
               .font('Helvetica-Bold')
               .text('Sales Report', { align: 'center' });
            
            doc.moveDown(0.5);
            doc.fontSize(10)
               .font('Helvetica')
               .text(`Generated on: ${new Date().toLocaleDateString()} | Page ${pageNum}`, { align: 'right' });

            const startY = 100;
            doc.rect(startX, startY, tableWidth, rowHeight)
               .fill('#e0e0e0');

            doc.fillColor('black').font('Helvetica-Bold');
            const headers = ['Date', 'Product', 'Customer', 'Amount', 'Discount'];
            let currentX = startX;

            headers.forEach((header, i) => {
                doc.text(header, currentX + 5, startY + 7, { 
                    width: columnWidths[i], 
                    align: 'left' 
                });
                currentX += columnWidths[i];
            });

            return startY + rowHeight; 
        };

        const drawTableRow = (order, currentY) => {
            let currentX = startX;
            const rowData = [
                order.date.toString().substring(0, 10),
                order.product,
                order.userId.name,
                `₹${order.totalAmount}`,
                `₹${order.discount || 0}`
            ];

            doc.rect(startX, currentY, tableWidth, rowHeight)
               .strokeColor('#cccccc')
               .stroke();

            doc.font('Helvetica').fontSize(10);
            rowData.forEach((data, i) => {
                doc.text(data, currentX + 5, currentY + 7, {
                    width: columnWidths[i],
                    align: 'left'
                });
                currentX += columnWidths[i];
            });

            return currentY + rowHeight;
        };

        const createSummary = (currentY) => {
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('Summary', startX, currentY + 20);
            
            const totalAmount = salesData.reduce((sum, order) => sum + order.totalAmount, 0);
            const totalDiscount = salesData.reduce((sum, order) => sum + (order.discount || 0), 0);

            doc.font('Helvetica')
               .fontSize(10)
               .text(`Total Orders: ${salesData.length}`, startX, currentY + 40)
               .text(`Total Amount: ₹${totalAmount}`, startX + 200, currentY + 40)
               .text(`Total Discount: ₹${totalDiscount}`, startX + 400, currentY + 40);
        };

        let currentPage = 1;
        let currentY = createHeader(currentPage);

        salesData.forEach((order, index) => {
            if (currentY > 700) { 
                doc.addPage();
                currentPage++;
                currentY = createHeader(currentPage);
            }

            currentY = drawTableRow(order, currentY);

            if (index === salesData.length - 1) {
                if (currentY > 650) { 
                    currentPage++;
                    currentY = 100;
                }
                createSummary(currentY);
            }
        });

        doc.end();
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

