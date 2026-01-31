import { db } from '../config/db.config.js';
import { logger } from '../config/logger.config.js';

export const wishlistService = {
  /**
   * Get all wishlist items for a user
   */
  getWishlist: async (userId: string) => {
    try {
      const wishlistItems = await db.wishlist.findMany({
        where: { userId },
        include: {
          product: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      return wishlistItems;
    } catch (error) {
      logger.error(`Error fetching wishlist for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Add item to wishlist
   */
  addToWishlist: async (userId: string, productId: string) => {
    try {
      // Check if product exists
      const product = await db.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Upsert wishlist item (create if not exists, do nothing if exists)
      // Actually, upsert is good to handle idempotency.
      const wishlistItem = await db.wishlist.upsert({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        update: {}, // No updates needed if it already exists
        create: {
          userId,
          productId,
        },
      });

      return wishlistItem;
    } catch (error) {
      logger.error(`Error adding to wishlist for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Remove item from wishlist
   */
  removeFromWishlist: async (userId: string, productId: string) => {
    try {
      // We use deleteMany to avoid error if it doesn't exist, or delete with try/catch
      // But delete throws if record doesn't exist.
      // Standard Prisma delete requires a unique identifier.
      // We can use delete on composite key.
      await db.wishlist.delete({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });
      return { message: 'Item removed from wishlist' };
    } catch (error: any) {
      // If record not found, Prisma throws P2025.
      if (error.code === 'P2025') {
        // It's already gone, so success effectively? Or 404?
        // Usually for delete, if it's not there, it's fine.
        return { message: 'Item not found in wishlist or already removed' };
      }
      logger.error(
        `Error removing item from wishlist for user ${userId}:`,
        error
      );
      throw error;
    }
  },
};
