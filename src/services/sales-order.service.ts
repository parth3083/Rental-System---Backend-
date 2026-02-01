import { db } from '../config/db.config.js';
import { logger } from '../config/logger.config.js';
import {
  Prisma,
  OrderStatus,
  DeliveryStatus,
} from '../generated/prisma/client.js';
import { cartService } from './cart.service.js';

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
            isService: true,
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
            details: {
              select: {
                end_date: true,
                product: {
                  select: {
                    name: true,
                  },
                },
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

        // Check for expiration
        const today = new Date();
        let message = null;

        const hasExpiredItem = order.details.some(detail => {
          if (!detail.end_date) return false;
          return new Date(detail.end_date) < today;
        });

        if (hasExpiredItem) {
          message =
            'Due date has expired please return your product or late fee will apply';
        }

        return {
          id: order.id,
          customer: order.customer,
          status: status,
          payment_plan: order.paymentPlan,
          total_order_value: order.totalOrderValue,
          created_at: order.createdAt.toISOString().split('T')[0], // YYYY-MM-DD
          payment_amount_pending: pendingAmount,
          invoice_number: invoice?.invoiceNumber || null,
          message: message,
          is_service: order.isService,
          product_names: order.details.map(d => d.product.name),
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

  getOrdersByCustomerId: async ({
    customerId,
    page,
    limit,
  }: {
    customerId: string;
    page: number;
    limit: number;
  }) => {
    try {
      const skip = (page - 1) * limit;

      const [total, orders] = await Promise.all([
        db.salesOrder.count({
          where: {
            customerId: customerId,
            deletedAt: null,
          },
        }),
        db.salesOrder.findMany({
          where: {
            customerId: customerId,
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
            paymentPlan: true,
            totalOrderValue: true,
            createdAt: true,
            isService: true,
            vendor: {
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
            details: {
              select: {
                end_date: true,
                product: {
                  select: {
                    name: true,
                  },
                },
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

        // Check for expiration
        const today = new Date();
        let message = null;

        const hasExpiredItem = order.details.some(detail => {
          if (!detail.end_date) return false;
          return new Date(detail.end_date) < today;
        });

        if (hasExpiredItem) {
          message =
            'Due date has expired please return your product or late fee will apply';
        }

        return {
          id: order.id,
          vendor: order.vendor,
          status: status,
          payment_plan: order.paymentPlan,
          total_order_value: order.totalOrderValue,
          created_at: order.createdAt.toISOString().split('T')[0], // YYYY-MM-DD
          payment_amount_pending: pendingAmount,
          invoice_number: invoice?.invoiceNumber || null,
          message: message,
          is_service: order.isService,
          product_names: order.details.map(d => d.product.name),
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
      logger.error('Error in getOrdersByCustomerId service', error);
      throw error;
    }
  },

  createOrdersFromCart: async (data: { customerId: string }) => {
    try {
      const { customerId } = data;

      // 1. Fetch all cart items for the user
      const cartItems = await db.cart.findMany({
        where: { userId: customerId },
        include: { product: { include: { stock: true } } },
      });

      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      // Check stock availability for all items first
      for (const item of cartItems) {
        if (item.isService) {
          if (!item.startDate || !item.endDate) {
            throw new Error(
              `Start and end date required for rental item: ${item.product.name}`
            );
          }
          const isAvailable = await cartService.checkStockAvailability(
            item.productId,
            item.startDate,
            item.endDate,
            item.quantity
          );

          if (!isAvailable) {
            throw new Error(
              `Insufficient stock for rental item: ${item.product.name}`
            );
          }
        } else {
          // Purchase
          const totalStock = item.product.stock?.totalPhysicalQuantity || 0;
          if (totalStock < item.quantity) {
            throw new Error(
              `Insufficient stock for purchase item: ${item.product.name}`
            );
          }
        }
      }

      // 2. Group items by (vendorId + isService)
      const groups = new Map<
        string,
        {
          vendorId: string;
          isService: boolean;
          items: typeof cartItems;
        }
      >();

      for (const item of cartItems) {
        const vendorId = item.product.vendorId;
        const key = `${vendorId}-${item.isService}`;

        if (!groups.has(key)) {
          groups.set(key, {
            vendorId,
            isService: item.isService,
            items: [],
          });
        }
        groups.get(key)!.items.push(item);
      }

      // 3. Create Orders for each group
      const createdOrders = [];

      for (const group of groups.values()) {
        const { vendorId, isService, items: groupItems } = group;

        // Calculate Totals and Details
        let totalOrderValue = new Prisma.Decimal(0);
        const orderDetailsData = [];

        for (const item of groupItems) {
          const product = item.product;
          const unitPrice = product.dailyPrice;
          let subtotal = new Prisma.Decimal(0);
          let startDate: Date | undefined;
          let endDate: Date | undefined;
          let rentalDays = 0;

          if (isService) {
            if (!item.startDate || !item.endDate) {
              throw new Error(
                `Start and end date required for rental item: ${item.product.name}`
              );
            }
            startDate = new Date(item.startDate);
            endDate = new Date(item.endDate);

            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            rentalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (rentalDays < 1) rentalDays = 1;

            subtotal = unitPrice.mul(item.quantity).mul(rentalDays);
          } else {
            // PURCHASE (Not a service)
            subtotal = unitPrice.mul(item.quantity);
          }

          const totalDepositAmount = (
            product.securityDeposit || new Prisma.Decimal(0)
          ).mul(item.quantity);

          totalOrderValue = totalOrderValue.add(subtotal);

          orderDetailsData.push({
            productId: product.id,
            quantity: item.quantity,
            unitPrice: unitPrice,
            subtotal: subtotal,
            totalDepositAmount: totalDepositAmount,
            start_date: startDate || null,
            end_date: endDate || null,
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
            details: {
              create: orderDetailsData,
            },
          },
          include: {
            details: true,
          },
        });

        // Handle Stock Deduction for APPROVED Purchase Orders
        if (initialStatus === OrderStatus.APPROVED && !isService) {
          for (const item of groupItems) {
            await db.stock.update({
              where: { productId: item.productId },
              data: {
                totalPhysicalQuantity: { decrement: item.quantity },
              },
            });
            // Log transaction
            await db.stockTransaction.create({
              data: {
                productId: item.productId,
                orderId: order.id,
                moveType: 'SALE',
                quantity: item.quantity,
                startDate: new Date(),
                endDate: new Date(),
              },
            });
          }
        }

        createdOrders.push(order);
      }
      // 4. Clear Cart for User
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
      // 1. Fetch Order with details to know products
      const order = await db.salesOrder.findUnique({
        where: { id: orderId },
        include: { details: true },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // 2. Validate Ownership
      if (order.vendorId !== vendorId) {
        throw new Error('Unauthorized access to this order');
      }

      // 3. Handle Stock Deduction if status changing to APPROVED
      if (
        status === OrderStatus.APPROVED &&
        order.status !== OrderStatus.APPROVED
      ) {
        if (order.isService) {
          // RENTAL: Check availability and Reserve
          for (const detail of order.details) {
            if (!detail.start_date || !detail.end_date) {
              throw new Error(
                `Missing dates for rental item in order detail ${detail.id}`
              );
            }
            const isAvailable = await cartService.checkStockAvailability(
              detail.productId,
              detail.start_date,
              detail.end_date,
              detail.quantity
            );
            if (!isAvailable) {
              throw new Error(
                `Insufficient stock to approve order for product ID ${detail.productId}`
              );
            }
          }

          // If all ok, Create Transactions
          for (const detail of order.details) {
            await db.stockTransaction.create({
              data: {
                productId: detail.productId,
                orderId: order.id,
                moveType: 'RENTAL',
                quantity: detail.quantity,
                startDate: detail.start_date!,
                endDate: detail.end_date!,
              },
            });
          }
        } else if (!order.isService) {
          // PURCHASE
          for (const detail of order.details) {
            const stock = await db.stock.findUnique({
              where: { productId: detail.productId },
            });
            if (!stock || stock.totalPhysicalQuantity < detail.quantity) {
              throw new Error(
                `Insufficient stock to approve purchase for product ID ${detail.productId}`
              );
            }

            await db.stock.update({
              where: { productId: detail.productId },
              data: { totalPhysicalQuantity: { decrement: detail.quantity } },
            });

            await db.stockTransaction.create({
              data: {
                productId: detail.productId,
                orderId: order.id,
                moveType: 'SALE',
                quantity: detail.quantity,
                startDate: new Date(),
                endDate: new Date(),
              },
            });
          }
        }
      }

      // 4. Update Status
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

  calculateReturn: async (orderId: string) => {
    try {
      // 1. Fetch Order and related data
      const order = await db.salesOrder.findUnique({
        where: { id: orderId },
        include: {
          invoices: true,
          paymentLedgers: true,
          details: true,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // 2. Fetch/Calculate Grand Total from Invoice
      // Assuming one invoice per order for now or taking the latest/active one.
      // The prompt says "grandtotal from sales_invoice table for that orderID".
      // Let's assume the sum of all invoices or just the single main invoice.
      // Usually there is one main invoice.
      const grandTotal = order.invoices.reduce((sum, invoice) => {
        return sum.add(new Prisma.Decimal(invoice.grandTotal));
      }, new Prisma.Decimal(0));

      // 3. Fetch/Calculate Total Amount Paid from Payment Ledger
      const totalPaid = order.paymentLedgers.reduce((sum, ledger) => {
        return sum.add(new Prisma.Decimal(ledger.amountPaid));
      }, new Prisma.Decimal(0));

      // 4. Fetch/Calculate Total Deposit and Late Fees from Order Details
      let totalDeposit = new Prisma.Decimal(0);
      let totalLateFee = new Prisma.Decimal(0);
      const today = new Date();

      for (const detail of order.details) {
        // Aggregate Deposit
        if (detail.totalDepositAmount) {
          totalDeposit = totalDeposit.add(
            new Prisma.Decimal(detail.totalDepositAmount)
          );
        }

        // Calculate Late Fee if applicable
        if (detail.end_date) {
          const endDate = new Date(detail.end_date);
          if (today > endDate) {
            const diffTime = Math.abs(today.getTime() - endDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // delta of today - enddate (in days)

            // late fee = base * quantity * delta
            // base = unitPrice (as per prompt)
            const unitPrice = new Prisma.Decimal(detail.unitPrice);
            const quantity = new Prisma.Decimal(detail.quantity);
            const lateFee = unitPrice.mul(quantity).mul(diffDays);

            totalLateFee = totalLateFee.add(lateFee);
          }
        }
      }

      // 5. Final Calculation
      // final payment = deposit + totalPaid - grandtotal (Initial logic)
      // final payment = final payment - latefee

      // Using Prisma Decimal for precision
      let finalPayment = totalDeposit.add(totalPaid).sub(grandTotal);
      finalPayment = finalPayment.sub(totalLateFee);

      // 6. Update Invoice Status to COMPLETED if not already
      // The prompt says: "just before sending the final payload we change the delevery Status in sales_invoice table to COMPLETED"
      // We need to update all associated invoices or the main one.
      // Assuming we update all related invoices.

      // We need to use updateMany or iterate. Prism's updateMany updates multiple.
      await db.salesInvoice.updateMany({
        where: {
          orderId: orderId,
        },
        data: {
          deliveryStatus: DeliveryStatus.COMPLETED,
        },
      });

      return {
        orderId,
        grandTotal: Number(grandTotal),
        totalPaid: Number(totalPaid),
        totalDeposit: Number(totalDeposit),
        totalLateFee: Number(totalLateFee),
        finalPayment: Number(finalPayment),
      };
    } catch (error) {
      logger.error('Error in calculateReturn service', error);
      throw error;
    }
  },
  getOrderById: async (orderId: string, userId: string) => {
    try {
      const order = await db.salesOrder.findUnique({
        where: { id: orderId },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
            },
          },
          vendor: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
            },
          },
          invoices: true,
          details: {
            include: {
              product: true,
            },
          },
          paymentLedgers: true,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Authorization Check
      if (order.customerId !== userId && order.vendorId !== userId) {
        throw new Error('Unauthorized access to this order');
      }

      // Calculate pending amount
      const totalPaid = order.paymentLedgers.reduce((sum, ledger) => {
        return sum.add(new Prisma.Decimal(ledger.amountPaid || 0));
      }, new Prisma.Decimal(0));

      const pendingAmount = new Prisma.Decimal(order.totalOrderValue || 0).sub(
        totalPaid
      );

      // Determine status from invoice if available
      const invoice = order.invoices.length > 0 ? order.invoices[0] : null;
      const status = invoice ? invoice.deliveryStatus : order.status;

      return {
        ...order,
        status: status,
        payment_amount_pending: pendingAmount,
      };
    } catch (error) {
      logger.error('Error in getOrderById service', error);
      throw error;
    }
  },
};
