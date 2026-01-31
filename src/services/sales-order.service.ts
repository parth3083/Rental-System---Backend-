import { db } from '../config/db.config.js';
import { logger } from '../config/logger.config.js';
import { Prisma } from '../generated/prisma/client.js';

interface GetVendorOrdersParams {
  vendorId: string;
  page: number;
  limit: number;
}

export const salesOrderService = {
  /**
   * Get all sales orders for a specific vendor with pagination and specific fields
   * @param params - { vendorId, page, limit }
   * @returns Paginated list of sales orders with computed fields
   */
  getOrdersByVendorId: async ({
    vendorId,
    page,
    limit,
  }: GetVendorOrdersParams) => {
    try {
      const skip = (page - 1) * limit;

      const [total, orders] = await Promise.all([
        db.salesOrder.count({
          where: {
            vendorId: vendorId,
            deletedAt: null,
          },
        }),
        db.salesOrder.findMany({
          where: {
            vendorId: vendorId,
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
            paymentPlan: true,
            totalOrderValue: true,
            createdAt: true,
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                companyName: true,
              },
            },
            invoices: {
              select: {
                id: true,
                invoiceNumber: true,
                deliveryStatus: true,
              },
              where: {
                deletedAt: null,
              },
              take: 1,
              orderBy: {
                createdAt: 'desc',
              },
            },
            paymentLedgers: {
              select: {
                amountPaid: true,
              },
              where: {
                deletedAt: null,
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

      const formattedOrders = orders.map(order => {
        // Calculate pending amount
        const totalPaid = order.paymentLedgers.reduce((sum, ledger) => {
          return sum.add(new Prisma.Decimal(ledger.amountPaid || 0));
        }, new Prisma.Decimal(0));

        const pendingAmount = new Prisma.Decimal(
          order.totalOrderValue || 0
        ).sub(totalPaid);

        // Determine status
        // If invoice exists, take status from invoice (DeliveryStatus), otherwise order status (OrderStatus)
        const invoice = order.invoices[0];
        const status = invoice ? invoice.deliveryStatus : order.status;

        return {
          id: order.id,
          customer: order.customer,
          status: status,
          payment_plan: order.paymentPlan,
          total_order_value: order.totalOrderValue,
          created_at: order.createdAt.toISOString().split('T')[0], // YYYY-MM-DD
          payment_amount_pending: pendingAmount,
          invoice_number: invoice?.invoiceNumber || null,
        };
      });

      return {
        data: formattedOrders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getOrdersByVendorId service', error);
      throw error;
    }
  },
};
