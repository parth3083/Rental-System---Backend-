import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import {
  authMiddleware,
  vendorOrAdmin,
} from '../middleware/auth.middleware.js';

const router: Router = Router();

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post(
  '/',
  authMiddleware,
  vendorOrAdmin,
  productController.createProduct
);
router.put(
  '/:id',
  authMiddleware,
  vendorOrAdmin,
  productController.updateProduct
);
router.delete(
  '/:id',
  authMiddleware,
  vendorOrAdmin,
  productController.deleteProduct
);

export default router;
