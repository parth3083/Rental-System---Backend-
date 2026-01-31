import { Router } from 'express';
import authRoutes from './auth.routes.js';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

export default router;
