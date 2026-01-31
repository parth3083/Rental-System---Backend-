import { db } from '../config/db.config.js';
import { logger } from '../config/logger.config.js';
import { Prisma, OrderStatus } from '../generated/prisma/client.js';

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

  createOrdersFromCart: async (data: { customerId: string }) => {
    try {
      const { customerId } = data;

      // 1. Fetch all cart items for the user
      const cartItems = await db.cart.findMany({
        where: { userId: customerId },
        include: { product: true },
      });

      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      // 2. Group items by (vendorId + isService + startDate + endDate)
      const groups = new Map<
        string,
        {
          vendorId: string;
          isService: boolean;
          startDate?: Date;
          endDate?: Date;
          items: typeof cartItems;
        }
      >();

      for (const item of cartItems) {
        const vendorId = item.product.vendorId;

        // Normalize dates
        let startIso = 'null';
        let endIso = 'null';
        let startDateObj: Date | undefined;
        let endDateObj: Date | undefined;

        if (item.isService) {
          if (!item.startDate || !item.endDate) {
            // Should not happen ideally if validated on cart addition
            throw new Error(
              `Start and End date required for RENTAL/Service item ${item.productId}`
            );
          }
          startDateObj = new Date(item.startDate);
          endDateObj = new Date(item.endDate);
          startIso = startDateObj.toISOString();
          endIso = endDateObj.toISOString();
        }

        const key = `${vendorId}-${item.isService}-${startIso}-${endIso}`;

        if (!groups.has(key)) {
          groups.set(key, {
            vendorId,
            isService: item.isService,
            startDate: startDateObj!,
            endDate: endDateObj!,
            items: [],
          });
        }
        groups.get(key)!.items.push(item);
      }

      // 3. Create Orders for each group
      const createdOrders = [];

      for (const group of groups.values()) {
        const {
          vendorId,
          isService,
          startDate,
          endDate,
          items: groupItems,
        } = group;

        // Calculate Totals and Details
        let totalOrderValue = new Prisma.Decimal(0);
        const orderDetailsData = [];

        let rentalDays = 0;
        if (isService && startDate && endDate) {
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          rentalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (rentalDays < 1) rentalDays = 1;
        }

        for (const item of groupItems) {
          const product = item.product;
          const unitPrice = product.dailyPrice;
          let subtotal = new Prisma.Decimal(0);

          if (isService) {
            subtotal = unitPrice.mul(item.quantity).mul(rentalDays);
          } else {
            // PURCHASE (Not a service)
            subtotal = unitPrice.mul(item.quantity);
          }

          totalOrderValue = totalOrderValue.add(subtotal);

          orderDetailsData.push({
            productId: product.id,
            quantity: item.quantity,
            unitPrice: unitPrice,
            subtotal: subtotal,
          });
        }

        const initialStatus = !isService
          ? OrderStatus.APPROVED
          : OrderStatus.DRAFT;

        const order = await db.salesOrder.create({
          data: {
            customerId,
            vendorId,
            isService,
            status: initialStatus,
            paymentPlan: 'FULL_UPFRONT', // Default
            totalOrderValue,
            startDate: startDate || null,
            endDate: endDate || null,
            details: {
              create: orderDetailsData,
            },
          },
          include: {
            details: true,
          },
        });
        createdOrders.push(order);
      }

      // 4. Clear Cart for User ?? - Usually standard behavior.
      // Assuming we should clear the cart after successful order creation
      await db.cart.deleteMany({
        where: { userId: customerId },
      });

      return createdOrders;
    } catch (error) {
      logger.error('Error in createOrdersFromCart service', error);
      throw error;
    }
  },

  /**
   * Update sales order status (Vendor only)
   */
  updateOrderStatus: async ({
    vendorId,
    orderId,
    status,
  }: {
    vendorId: string;
    orderId: string;
    status: OrderStatus;
  }) => {
    try {
      // 1. Fetch Order
      const order = await db.salesOrder.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // 2. Validate Ownership
      if (order.vendorId !== vendorId) {
        throw new Error('Unauthorized access to this order');
      }

      // 3. Update Status
      const updatedOrder = await db.salesOrder.update({
        where: { id: orderId },
        data: {
          status: status,
        },
      });

      return updatedOrder;
    } catch (error) {
      logger.error('Error in updateOrderStatus service', error);
      throw error;
    }
  },
};
