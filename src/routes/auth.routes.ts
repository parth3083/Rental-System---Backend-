import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';

const router: Router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and authorization endpoints
 */

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Password reset routes (public)
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/profile', authMiddleware, authController.getProfile);
router.get('/users', authMiddleware, adminOnly, authController.getAllUsers);

export default router;
