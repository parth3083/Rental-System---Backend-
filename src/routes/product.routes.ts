import { Router } from 'express';
import { getProducts } from '../controllers/product.controller.js';

const router: Router = Router();

router.get('/', getProducts);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get paginated products with advanced filtering
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Search by name, brand, or description
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: brands
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by one or more brands
 *       - in: query
 *         name: colors
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by one or more colors
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           format: double
 *         description: Minimum price filter (interpreted based on duration)
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           format: double
 *         description: Maximum price filter (interpreted based on duration)
 *       - in: query
 *         name: duration[value]
 *         schema:
 *           type: integer
 *         description: Rental duration value (e.g., 2)
 *       - in: query
 *         name: duration[unit]
 *         schema:
 *           type: string
 *           enum: [Hour, Day, Month, Year]
 *         description: Rental duration unit (e.g., Month)
 *     responses:
 *       200:
 *         description: Successful response with paginated products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Products retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/PagedProductResult'
 *       500:
 *         description: Server error
 */

export default router;
