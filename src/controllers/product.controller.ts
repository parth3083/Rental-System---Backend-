import type { Request, Response } from 'express';
import { productService } from '../services/product.service.js';
import {
  getProductsSchema,
  createProductSchema,
  updateProductSchema,
} from '../validations/product.validation.js';
import { logger } from '../config/logger.config.js';
import { ZodError } from 'zod';

class ProductController {
  /**
   * @swagger
   * /api/products:
   *   get:
   *     summary: Get products with filtering and pagination
   *     tags: [Products]
   *     parameters:
   *       - in: query
   *         name: searchTerm
   *         schema:
   *           type: string
   *       - in: query
   *         name: pageNumber
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 10
   *       - in: query
   *         name: brands
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *       - in: query
   *         name: colors
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *       - in: query
   *         name: categoryId
   *         schema:
   *           type: integer
   *       - in: query
   *         name: minPrice
   *         schema:
   *           type: number
   *       - in: query
   *         name: maxPrice
   *         schema:
   *           type: number
   *       - in: query
   *         name: duration
   *         schema:
   *           type: object
   *           properties:
   *             value:
   *               type: integer
   *             unit:
   *               type: string
   *               enum: [Hour, Day, Week, Month]
   *         description: JSON string or object for duration filter
   *     responses:
   *       200:
   *         description: Products retrieved successfully
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
   *                   $ref: '#/components/schemas/PagedResultProduct'
   *       400:
   *         description: Validation error
   *       500:
   *         description: Internal server error
   */
  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const validatedParams = getProductsSchema.parse(req.query);

      const result = await productService.getProducts(validatedParams);

      res.status(200).json({
        success: true,
        message: 'Products retrieved successfully',
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      logger.error('Get products controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * @swagger
   * /api/products/{id}:
   *   get:
   *     summary: Get product details by ID
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Product details retrieved successfully
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
   *                   $ref: '#/components/schemas/ProductDetail'
   *       404:
   *         description: Product not found
   *       500:
   *         description: Internal server error
   */
  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await productService.getProductById(id as string);

      res.status(200).json({
        success: true,
        message: 'Product details retrieved successfully',
        data: result,
      });
    } catch (error: any) {
      if (error.message === 'Product not found') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      logger.error('Get product by id controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * @swagger
   * /api/products:
   *   post:
   *     summary: Create a new product
   *     tags: [Products]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateProductRequest'
   *     responses:
   *       201:
   *         description: Product created successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createProductSchema.parse(req.body);

      // Expected that authMiddleware has populated req.user
      const user = (req as any).user;

      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const result = await productService.createProduct(user.id, validatedData);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      logger.error('Create product controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * @swagger
   * /api/products/{id}:
   *   put:
   *     summary: Replace a product (Full Update)
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateProductRequest'
   *     responses:
   *       200:
   *         description: Product updated successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Product not found
   *       500:
   *         description: Internal server error
   */
  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = updateProductSchema.parse(req.body);

      const user = (req as any).user; // Auth middleware populates this

      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const result = await productService.updateProduct(
        id as string,
        user.id,
        validatedData
      );

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      if (error.message === 'Product not found') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message === 'You are not authorized to update this product') {
        res.status(403).json({
          success: false,
          message: error.message,
        });
        return;
      }

      logger.error('Update product controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * @swagger
   * /api/products/{id}:
   *   delete:
   *     summary: Soft delete a product
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Product deleted successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden (Not authorized to delete this product)
   *       404:
   *         description: Product not found
   *       500:
   *         description: Internal server error
   */
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      await productService.deleteProduct(id as string, user.id);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error: any) {
      if (error.message === 'Product not found') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message === 'You are not authorized to delete this product') {
        res.status(403).json({
          success: false,
          message: error.message,
        });
        return;
      }

      logger.error('Delete product controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}

export const productController = new ProductController();
