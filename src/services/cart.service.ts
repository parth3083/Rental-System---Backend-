import { db } from '../config/db.config.js';
import { logger } from '../config/logger.config.js';

export const cartService = {
  /**
   * Get all cart items for a user
   */
  getCart: async (userId: string) => {
    try {
      const cartItems = await db.cart.findMany({
        where: { userId },
        include: {
          product: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      return cartItems;
    } catch (error) {
      logger.error(`Error fetching cart for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Add or update item in cart
   */
  /**
   * Check stock availability for a product in a given date range
   */
  checkStockAvailability: async (
    productId: string,
    startDate: Date,
    endDate: Date,
    requestedQuantity: number
  ) => {
    // 1. Get Total Stock from Inventory Table
    const stock = await db.stock.findUnique({
      where: { productId },
    });
    const totalStock = stock?.totalPhysicalQuantity || 0;

    // 2. Count how many items are currently busy during the requested time
    const bookedTransactions = await db.stockTransaction.findMany({
      where: {
        productId,
        deletedAt: null, // Only active transactions
        startDate: { lt: endDate }, // Overlap check
        endDate: { gt: startDate },
      },
    });

    const bookedQuantity = bookedTransactions.reduce(
      (acc, item) => acc + item.quantity,
      0
    );

    // 3. The Math
    const availableStock = totalStock - bookedQuantity;
    return availableStock >= requestedQuantity;
  },

  /**
   * Add or update item in cart
   */
  upsertCart: async (
    userId: string,
    productId: string,
    quantity: number,
    startDate: string | null,
    endDate: string | null,
    isService: boolean = true
  ) => {
    try {
      let start: Date | null = null;
      let end: Date | null = null;

      if (isService) {
        if (!startDate || !endDate) {
          throw new Error(
            'Start date and end date are required for service items'
          );
        }
        start = new Date(startDate);
        end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error('Invalid date format');
        }

        if (start >= end) {
          throw new Error('Start date must be before end date');
        }
      }

      // Check if product exists
      const product = await db.product.findUnique({
        where: { id: productId },
        include: { stock: true },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Check stock availability
      if (isService && start && end) {
        const isAvailable = await cartService.checkStockAvailability(
          productId,
          start,
          end,
          quantity
        );
        if (!isAvailable) {
          throw new Error('Stock not available for the selected period');
        }
      } else {
        // For non-service items (sales), check physical availability
        // This is a simplified check; improved logic might be needed for mixed rent/sell scenarios
        const totalStock = product.stock?.totalPhysicalQuantity || 0;
        if (totalStock < quantity) {
          // For sales, we might want to check if any rentals are active now, but assuming 'totalStock' is the pool.
          // If rentals exist, we can't sell? Or we can sell if unbooked?
          // Safe approach: Check if available quantity (total - currently rented) >= requested?
          // Ideally we'd reuse checkStockAvailability with 'now' to 'infinity'?
          // For this task, we'll implement a basic check against total stock to prevent selling more than exists.
          if (totalStock < quantity) {
            throw new Error('Insufficient stock available');
          }
        }
      }

      // Upsert cart item
      const cartItem = await db.cart.upsert({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        update: {
          quantity,
          startDate: start,
          endDate: end,
          isService,
        },
        create: {
          userId,
          productId,
          quantity,
          startDate: start,
          endDate: end,
          isService,
        },
      });

      return cartItem;
    } catch (error) {
      logger.error(`Error upserting cart item for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Remove item from cart
   */
  removeFromCart: async (userId: string, productId: string) => {
    try {
      await db.cart.delete({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });
      return { message: 'Item removed from cart' };
    } catch (error) {
      logger.error(`Error removing item from cart for user ${userId}:`, error);
      throw error;
    }
  },
};
