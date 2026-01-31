import type { Request, Response } from 'express';
import { cartService } from '../services/cart.service.js';
import { logger } from '../config/logger.config.js';

export const cartController = {
  addToCart: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { productId, quantity, startDate, endDate, isService } = req.body;

      // Default isService to true if not provided, to maintain backward compatibility unless specified otherwise
      const isServiceBool = isService !== false;

      if (!productId || typeof quantity !== 'number') {
        res
          .status(400)
          .json({
            success: false,
            message: 'Product ID and quantity are required',
          });
        return;
      }

      if (isServiceBool) {
        if (!startDate || !endDate) {
          res
            .status(400)
            .json({
              success: false,
              message: 'Start date and end date are required for service items',
            });
          return;
        }
      }

      const cartItem = await cartService.upsertCart(
        userId,
        productId,
        quantity,
        startDate,
        endDate,
        isServiceBool
      );
      res.status(200).json({ success: true, data: cartItem });
    } catch (error: any) {
      logger.error('Error adding to cart:', error);
      res
        .status(500)
        .json({
          success: false,
          message: error.message || 'Internal server error',
        });
    }
  },

  getCart: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const cartItems = await cartService.getCart(userId);
      res.status(200).json({ success: true, data: cartItems });
    } catch (error: any) {
      logger.error('Error getting cart:', error);
      res
        .status(500)
        .json({
          success: false,
          message: error.message || 'Internal server error',
        });
    }
  },

  removeFromCart: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      // const { productId } = req.body; // Expecting productId in body for delete based on prompt "request will have ProductID" for add, usually delete is param but I will support body or param.
      // Wait, standard REST is DELETE /cart/:productId.
      // But user said "apis will be ... delete ... request will have ProductID and quantity" for add cart.
      // For delete, usually just ProductID.
      // I'll stick to Route Parameter for DELETE: /:productId

      const pId = req.params.productId || req.body.productId;

      if (!pId) {
        res
          .status(400)
          .json({ success: false, message: 'Product ID is required' });
        return;
      }

      await cartService.removeFromCart(userId, pId);
      res
        .status(200)
        .json({ success: true, message: 'Item removed from cart' });
    } catch (error: any) {
      logger.error('Error removing from cart:', error);
      res
        .status(500)
        .json({
          success: false,
          message: error.message || 'Internal server error',
        });
    }
  },
};
