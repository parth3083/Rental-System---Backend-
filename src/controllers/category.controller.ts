import type { Request, Response } from 'express';
import { categoryService } from '../services/category.service.js';
import { logger } from '../config/logger.config.js';

class CategoryController {
  /**
   * @swagger
   * /api/categories:
   *   get:
   *     summary: Get all categories
   *     tags: [Categories]
   *     responses:
   *       200:
   *         description: Categories retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Category'
   *       500:
   *         description: Internal server error
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const result = await categoryService.getCategories();

      res.status(200).json({
        success: true,
        message: 'Categories retrieved successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Get categories controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}

export const categoryController = new CategoryController();
