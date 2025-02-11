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

const filterOrder = async (req, res) => {
    try {
        const { filtervalue, startDate, endDate } = req.query;
        const today = new Date();
        let start, end;

        let query = {
            status: "delivered" 
        };

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

        query.createdOn = { $gte: start, $lte: end };

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
      const salesData = req.body.salesData;
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        size: 'A4'
      });
  
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
      doc.pipe(res);
  
      // Helper function to format currency
      const formatCurrency = (amount) => `₹${amount.toFixed(2)}`;
  
      // Add company header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('Sales Report', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });
  
      // Add summary section
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
  
      // Add sales details table
      doc.moveDown();
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Sales Details');
  
      // Table headers
      const startX = 50;
      const columnWidths = [80, 90, 80, 80, 80, 80];
      let currentY = doc.y + 10;
  
      const headers = ['Date', 'Order ID', 'Subtotal', 'Product Disc.', 'Coupon Disc.', 'Final Amount'];
      
      // Draw header background
      doc.rect(startX, currentY, doc.page.width - 100, 20)
         .fill('#f0f0f0');
  
      // Draw header text
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
  
      // Draw table rows
      currentY += 20;
      doc.font('Helvetica').fontSize(8);
  
      salesData.forEach((sale, index) => {
        // Add new page if needed
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
  
        // Draw row border
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
        const salesData = req.body.salesData;
        const workbook = new excelJS.Workbook();
        
        // Add metadata to the workbook
        workbook.creator = 'Admin';
        workbook.created = new Date();
        
        // Create main worksheet
        const worksheet = workbook.addWorksheet('Sales Report');

        // Define columns
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

        // Style the header row
        worksheet.getRow(1).font = {
            bold: true,
            size: 12
        };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add sales data
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

        // Add summary section with a gap
        worksheet.addRow([]); // Empty row for spacing
        worksheet.addRow([]); // Empty row for spacing
        
        const summaryStartRow = worksheet.rowCount + 1;
        
        // Calculate totals
        const totalOrders = salesData.length;
        const totalRevenue = salesData.reduce((sum, sale) => sum + sale.finalAmount, 0);
        const totalProductDiscount = salesData.reduce((sum, sale) => sum + sale.productDiscount, 0);
        const totalCouponDiscount = salesData.reduce((sum, sale) => sum + sale.couponDiscount, 0);

        // Add summary data
        worksheet.addRow(['Summary']).font = { bold: true, size: 14 };
        worksheet.addRow(['Total Orders:', totalOrders]);
        worksheet.addRow(['Total Revenue:', `₹${totalRevenue.toFixed(2)}`]);
        worksheet.addRow(['Total Product Discounts:', `₹${totalProductDiscount.toFixed(2)}`]);
        worksheet.addRow(['Total Coupon Discounts:', `₹${totalCouponDiscount.toFixed(2)}`]);

        // Style the numbers columns to show 2 decimal places
        worksheet.getColumn('subtotal').numFmt = '₹#,##0.00';
        worksheet.getColumn('productDiscount').numFmt = '₹#,##0.00';
        worksheet.getColumn('couponDiscount').numFmt = '₹#,##0.00';
        worksheet.getColumn('finalAmount').numFmt = '₹#,##0.00';

        // Add borders to the data cells
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

        // Set response headers
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition', 
            `attachment; filename=sales_report_${new Date().toISOString().split('T')[0]}.xlsx`
        );

        // Write to response
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

