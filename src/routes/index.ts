import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import salesOrderRoutes from './sales-order.routes.js';
import cartRoutes from './cart.routes.js';
import userRoutes from './user.routes.js';
import wishlistRoutes from './wishlist.routes.js';

const router: Router = Router();

// Mount auth routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/sales-orders', salesOrderRoutes);
router.use('/cart', cartRoutes);
router.use('/users', userRoutes);
router.use('/wishlist', wishlistRoutes);

export default router;
