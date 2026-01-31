import { db } from '../config/db.config.js';
import { logger } from '../config/logger.config.js';
import { Prisma } from '../generated/prisma/client.js';

interface CreateInvoiceParams {
  vendorId: string;
  orderId: string;
}

export const salesInvoiceService = {
  /**
   * Create a sales invoice for a specific order
   */
  createInvoice: async ({ vendorId, orderId }: CreateInvoiceParams) => {
    try {
      // 1. Validate Order exists and belongs to Vendor
      // Fetch order details including products to get taxPercentage
      const order = await db.salesOrder.findUnique({
        where: { id: orderId },
        include: {
          invoices: true,
          details: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.vendorId !== vendorId) {
        throw new Error('Unauthorized access to this order');
      }

      // Check if invoice already exists?? Allow multiple invoices?
      // Current requirement seems to imply one invoice per order or maybe multiple.
      // Assuming multiple allowed or valid per business logic, but let's proceed.

      // 2. Generate Invoice Number (Simple unique generation)
      // Format: INV-YYYYMMDD-RANDOM
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
      const invoiceNumber = `INV-${dateStr}-${randomStr}`;

      // 3. Calculate Tax Amount based on Product Tax Percentage
      let totalTaxAmount = new Prisma.Decimal(0);

      for (const detail of order.details) {
        // detail.subtotal is quantity * unitPrice
        // tax for this line item = subtotal * (product.taxPercentage / 100)

        //NEED TO FIX
        // const taxRate = detail.product.taxPercentage || new Prisma.Decimal(0);
        const taxRate = 18;
        const lineTax = detail.subtotal.mul(taxRate).div(100);
        totalTaxAmount = totalTaxAmount.add(lineTax);
      }

      // 4. Calculate Grand Total
      // Grand Total = Order Value + Total Tax Amount
      const grandTotal = new Prisma.Decimal(order.totalOrderValue).add(
        totalTaxAmount
      );

      // 5. Create Invoice
      const invoice = await db.salesInvoice.create({
        data: {
          orderId: order.id,
          invoiceNumber: invoiceNumber,
          taxAmount: totalTaxAmount,
          grandTotal: grandTotal,
          deliveryStatus: 'PROCESSING', // Default
          isPaid: false,
        },
      });

      return invoice;
    } catch (error) {
      logger.error('Error in createInvoice service', error);
      throw error;
    }
  },
};
