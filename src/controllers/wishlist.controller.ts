import type { Request, Response } from 'express';
import { wishlistService } from '../services/wishlist.service.js';
import { logger } from '../config/logger.config.js';

export const wishlistController = {
  getWishlist: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const wishlistItems = await wishlistService.getWishlist(userId);
      res.status(200).json({ success: true, data: wishlistItems });
    } catch (error: any) {
      logger.error('Error getting wishlist:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  },

  addToWishlist: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { productId } = req.body;

      if (!productId) {
        res.status(400).json({
          success: false,
          message: 'Product ID is required',
        });
        return;
      }

      const wishlistItem = await wishlistService.addToWishlist(
        userId,
        productId
      );
      res.status(200).json({ success: true, data: wishlistItem });
    } catch (error: any) {
      logger.error('Error adding to wishlist:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  },

  removeFromWishlist: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      // Support both body and params, but prioritize body as per "take productId from request" usually implying payload
      const productId = req.body.productId || req.params.productId;

      if (!productId) {
        res.status(400).json({
          success: false,
          message: 'Product ID is required',
        });
        return;
      }

      await wishlistService.removeFromWishlist(userId, productId);
      res
        .status(200)
        .json({ success: true, message: 'Item removed from wishlist' });
    } catch (error: any) {
      logger.error('Error removing from wishlist:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  },
};
