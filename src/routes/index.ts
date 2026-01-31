import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';

const router: Router = Router();

// Mount auth routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);

export default router;
