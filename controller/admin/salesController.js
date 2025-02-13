const Order = require("../../models/orderSchema");
const excelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require("fs");
const path = require("path");

const loadSalesReport = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const limit = 5;    
        const filtervalue = req.query.filtervalue || 'monthly';
        const startDate = req.query.startDate || '';
        const endDate = req.query.endDate || '';

        let query = {
            status: "delivered" 
        };

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

        const totalOrders = await Order.find(query).sort({ createdOn: -1 }).populate('user').populate({path:'orderedItems.products',populate:{path:'category',model:'Category'}});
        const totalSalePrice = totalOrders.reduce((sum, order) => sum + order.finalAmount, 0);
        const saleCount = totalOrders.length;
        const couponDiscount = totalOrders.reduce((sum, order) => sum + order.couponDiscount, 0);
        const totalDiscount = totalOrders.reduce((sum, order) => sum + order.productdiscount, 0)
        const totalOrder = saleCount;
        const totalPage = Math.ceil(totalOrder / limit);
        const order = await Order.find(query).sort({ createdOn: -1 }).skip((page - 1) * limit).limit(limit).populate('user').populate({path:'orderedItems.products',populate:{path:'category',model:'Category'}});
        
        res.render('salesreport', {
            order,
            totalSalePrice : Math.round(totalSalePrice),
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

async function getFilteredOrders(filtervalue, startDate, endDate) {
    let query = {
        status: "delivered"
    };

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
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        query.createdOn = { $gte: start, $lte: end };
    }

    return await Order.find(query)
        .sort({ createdOn: -1 })
        .populate('user')
        .populate('orderedItems.products');
}

const filterOrder = async (req, res) => {
    try {
        const { filtervalue, startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        
        let query = {
            status: "delivered"
        };

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
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999);
            query.createdOn = { $gte: start, $lte: end };
        }

const totalOrders = await Order.countDocuments(query);
const totalPage = Math.ceil(totalOrders / limit);

        const orders = await Order.find(query)
            .sort({ createdOn: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('user')
            .populate('orderedItems.products');

        const allOrders = await Order.find(query);
        const totalSalePrice = allOrders.reduce((sum, order) => sum + order.finalAmount, 0);
        const saleCount = allOrders.length;
        const couponDiscount = allOrders.reduce((sum, order) => sum + (order.couponDiscount || 0), 0);
        const totalDiscount = allOrders.reduce((sum, order) => sum + (order.productdiscount || 0), 0);


        return res.status(200).json({
            orders,
            saleCount,
            totalSalePrice: Math.round(totalSalePrice),
            totalDiscount: Math.round(totalDiscount),
            couponDiscount: Math.round(couponDiscount),
            totalPage,
            currentPage: page
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

        const query = {
            status: "delivered", 
            createdOn: { $gte: start, $lte: end }
        };

        const orders = await Order.find(query)
            .sort({ createdOn: -1 })
            .populate('user')
            .populate('orderedItems.products');

        const totalSalePrice = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const saleCount = orders.length;
        const couponDiscount = orders.reduce((sum, order) => sum + order.couponDiscount, 0);
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
        const { filtervalue, startDate, endDate } = req.body;
        console.log(req.body,"tessttt")
        
        const orders = await getFilteredOrders(filtervalue, startDate, endDate);
        
        const salesData = orders.map(order => ({
            date: order.createdOn,
            orderId: order.orderId,
            userName: order.user ? order.user.name : 'N/A',
            subtotal: order.subtotal,
            productDiscount: order.productdiscount || 0,
            couponDiscount: order.couponDiscount || 0,
            finalAmount: order.finalAmount,
            paymentMethod: order.paymentMethod
        }));

      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        size: 'A4'
      });
  
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
      doc.pipe(res);
  
      const formatCurrency = (amount) => `₹${amount.toFixed(2)}`;
  
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('Sales Report', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });
  
      doc.moveDown();
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Summary');
      
      const totalOrders = salesData.length;
      const totalRevenue = salesData.reduce((sum, sale) => sum + sale.finalAmount, 0);
      const totalProductDiscount = salesData.reduce((sum, sale) => sum + sale.productDiscount, 0);
      const totalCouponDiscount = salesData.reduce((sum, sale) => sum + sale.couponDiscount, 0);
  
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Total Orders: ${totalOrders}`)
         .text(`Total Revenue: ${formatCurrency(totalRevenue)}`)
         .text(`Total Product Discounts: ${formatCurrency(totalProductDiscount)}`)
         .text(`Total Coupon Discounts: ${formatCurrency(totalCouponDiscount)}`);
  
      doc.moveDown();
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Sales Details');
  
      const startX = 50;
      const columnWidths = [80, 90, 80, 80, 80, 80];
      let currentY = doc.y + 10;
  
      const headers = ['Date', 'Order ID', 'Subtotal', 'Product Disc.', 'Coupon Disc.', 'Final Amount'];
      
      doc.rect(startX, currentY, doc.page.width - 100, 20)
         .fill('#f0f0f0');
  
      let currentX = startX;
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#000000');
      
      headers.forEach((header, i) => {
        doc.text(header, currentX + 5, currentY + 5, {
          width: columnWidths[i],
          align: 'left'
        });
        currentX += columnWidths[i];
      });
  
      currentY += 20;
      doc.font('Helvetica').fontSize(8);
  
      salesData.forEach((sale, index) => {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
        }
  
        const rowData = [
          new Date(sale.date).toLocaleDateString(),
          sale.orderId,
          formatCurrency(sale.subtotal),
          formatCurrency(sale.productDiscount),
          formatCurrency(sale.couponDiscount),
          formatCurrency(sale.finalAmount)
        ];
  
        currentX = startX;
        rowData.forEach((data, i) => {
          doc.text(data, currentX + 5, currentY + 5, {
            width: columnWidths[i],
            align: 'left'
          });
          currentX += columnWidths[i];
        });
  
        doc.rect(startX, currentY, doc.page.width - 100, 20)
           .stroke('#dddddd');
  
        currentY += 20;
      });
  
      doc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).send('Failed to generate PDF');
    }
  };
  const downloadexcel = async (req, res) => {
    try {
        const { filtervalue, startDate, endDate } = req.body;
        
        const orders = await getFilteredOrders(filtervalue, startDate, endDate);
        
        const salesData = orders.map(order => ({
            date: order.createdOn,
            orderId: order.orderId,
            userName: order.user ? order.user.name : 'N/A',
            subtotal: order.subtotal,
            productDiscount: order.productdiscount || 0,
            couponDiscount: order.couponDiscount || 0,
            finalAmount: order.finalAmount,
            paymentMethod: order.paymentMethod
        }));

        const workbook = new excelJS.Workbook();
        
        workbook.creator = 'Admin';
        workbook.created = new Date();
        
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Order ID', key: 'orderId', width: 20 },
            { header: 'Customer Name', key: 'userName', width: 20 },
            { header: 'Subtotal (₹)', key: 'subtotal', width: 15 },
            { header: 'Product Discount (₹)', key: 'productDiscount', width: 20 },
            { header: 'Coupon Discount (₹)', key: 'couponDiscount', width: 20 },
            { header: 'Final Amount (₹)', key: 'finalAmount', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 15 }
        ];

        worksheet.getRow(1).font = {
            bold: true,
            size: 12
        };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        salesData.forEach((sale) => {
            worksheet.addRow({
                date: new Date(sale.date).toLocaleDateString(),
                orderId: sale.orderId,
                userName: sale.userName,
                subtotal: sale.subtotal,
                productDiscount: sale.productDiscount,
                couponDiscount: sale.couponDiscount,
                finalAmount: sale.finalAmount,
                paymentMethod: sale.paymentMethod
            });
        });

        worksheet.addRow([]); 
        worksheet.addRow([]); 
        
        const summaryStartRow = worksheet.rowCount + 1;
        
        const totalOrders = salesData.length;
        const totalRevenue = salesData.reduce((sum, sale) => sum + sale.finalAmount, 0);
        const totalProductDiscount = salesData.reduce((sum, sale) => sum + sale.productDiscount, 0);
        const totalCouponDiscount = salesData.reduce((sum, sale) => sum + sale.couponDiscount, 0);

        worksheet.addRow(['Summary']).font = { bold: true, size: 14 };
        worksheet.addRow(['Total Orders:', totalOrders]);
        worksheet.addRow(['Total Revenue:', `₹${totalRevenue.toFixed(2)}`]);
        worksheet.addRow(['Total Product Discounts:', `₹${totalProductDiscount.toFixed(2)}`]);
        worksheet.addRow(['Total Coupon Discounts:', `₹${totalCouponDiscount.toFixed(2)}`]);

        worksheet.getColumn('subtotal').numFmt = '₹#,##0.00';
        worksheet.getColumn('productDiscount').numFmt = '₹#,##0.00';
        worksheet.getColumn('couponDiscount').numFmt = '₹#,##0.00';
        worksheet.getColumn('finalAmount').numFmt = '₹#,##0.00';

        const dataEndRow = salesData.length + 1;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber <= dataEndRow) {
                row.eachCell({ includeEmpty: false }, (cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition', 
            `attachment; filename=sales_report_${new Date().toISOString().split('T')[0]}.xlsx`
        );

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

