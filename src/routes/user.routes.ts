import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: Router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management endpoints
 */

// All routes require authentication
router.use(authMiddleware);

// GET /api/users/me - Get current user details
router.get('/me', userController.getUserDetails);

// PATCH /api/users/me - Update current user details
router.patch('/me', userController.updateUserDetails);

// POST /api/users/change-password - Change password (authenticated user)
router.post('/change-password', userController.changePassword);

export default router;
