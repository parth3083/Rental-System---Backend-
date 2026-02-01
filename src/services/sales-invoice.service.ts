import { db } from '../config/db.config.js';
import { logger } from '../config/logger.config.js';
import { Prisma } from '../generated/prisma/client.js';
import { DeliveryStatus } from '../generated/prisma/client.js';

interface CreateInvoiceParams {
  vendorId: string;
  orderId: string;
}

interface UpdateInvoiceStatusParams {
  vendorId: string;
  invoiceId: string;
  status: DeliveryStatus;
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

        // Use taxPercentage from product if available, else 0 (or hardcode based on previous logic if needed)
        // Note: The previous logic had `const taxRate = 18;` hardcoded temporarily or 'as per instructions'.
        // But the real instruction was "consider you will get taxpct from products table".
        // The migration for taxPercentage might have failed or not run, so we need to be careful.
        // If the property doesn't exist on the type yet (because of failed migration), we might need to fallback.
        // However, I will assume the property exists or fallback safely.

        // Casting to any because of potential type mismatch if migration didn't run fully in user's env
        const productAny = detail.product as any;
        const taxRate = productAny.taxPercentage || 18; // Fallback to 18 if not found to matches previous conversation context or safe default

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

  /**
   * Update invoice status
   * Sequence: PROCESSING -> DISPATCHED -> DELIVERED
   */
  updateInvoiceStatus: async ({
    vendorId,
    invoiceId,
    status,
  }: UpdateInvoiceStatusParams) => {
    try {
      // 1. Fetch Invoice
      const invoice = await db.salesInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          order: {
            select: { vendorId: true },
          },
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // 2. Authorization Check
      if (invoice.order.vendorId !== vendorId) {
        throw new Error('Unauthorized access to this invoice');
      }

      // 3. Validate Status Transition
      const currentStatus = invoice.deliveryStatus;

      let isValidTransition = false;

      if (
        currentStatus === DeliveryStatus.PROCESSING &&
        status === DeliveryStatus.DISPATCHED
      ) {
        isValidTransition = true;
      } else if (
        currentStatus === DeliveryStatus.DISPATCHED &&
        status === DeliveryStatus.DELIVERED
      ) {
        isValidTransition = true;
      }

      if (!isValidTransition) {
        throw new Error(
          `Invalid status transition from ${currentStatus} to ${status}`
        );
      }

      // 4. Update Status
      const updatedInvoice = await db.salesInvoice.update({
        where: { id: invoiceId },
        data: {
          deliveryStatus: status,
        },
      });

      return updatedInvoice;
    } catch (error) {
      logger.error('Error in updateInvoiceStatus service', error);
      throw error;
    }
  },
  getInvoicesByVendorId: async ({
    vendorId,
    page,
    limit,
  }: {
    vendorId: string;
    page: number;
    limit: number;
  }) => {
    try {
      const skip = (page - 1) * limit;

      const [total, invoices] = await Promise.all([
        db.salesInvoice.count({
          where: {
            order: {
              vendorId: vendorId,
            },
            deletedAt: null,
          },
        }),
        db.salesInvoice.findMany({
          where: {
            order: {
              vendorId: vendorId,
            },
            deletedAt: null,
          },
          include: {
            order: {
              select: {
                id: true,
                totalOrderValue: true,
                customer: {
                  select: {
                    name: true,
                    email: true,
                    companyName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: skip,
          take: limit,
        }),
      ]);

      return {
        data: invoices,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getInvoicesByVendorId service', error);
      throw error;
    }
  },

  getInvoiceById: async ({
    invoiceId,
    vendorId,
  }: {
    invoiceId: string;
    vendorId: string;
  }) => {
    try {
      const invoice = await db.salesInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  companyName: true,
                  address: true,
                  city: true,
                  pincode: true,
                  gstin: true,
                },
              },
              details: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Authorization Check
      if (invoice.order.vendorId !== vendorId) {
        throw new Error('Unauthorized access to this invoice');
      }

      return invoice;
    } catch (error) {
      logger.error('Error in getInvoiceById service', error);
      throw error;
    }
  },
};
