import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyResetCodeSchema,
  resetPasswordSchema,
} from '../validations/auth.validation.js';
import { logger } from '../config/logger.config.js';
import { ZodError } from 'zod';

class AuthController {
  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Register a new user (Customer or Vendor)
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             oneOf:
   *               - $ref: '#/components/schemas/CustomerRegisterRequest'
   *               - $ref: '#/components/schemas/VendorRegisterRequest'
   *           examples:
   *             customer:
   *               summary: Customer Registration
   *               value:
   *                 firstName: John
   *                 lastName: Doe
   *                 email: john.doe@example.com
   *                 password: password123
   *                 role: CUSTOMER
   *             vendor:
   *               summary: Vendor Registration
   *               value:
   *                 firstName: Jane
   *                 lastName: Smith
   *                 email: jane.smith@example.com
   *                 password: password123
   *                 role: VENDOR
   *                 companyName: ABC Corp
   *                 productCategory: Electronics
   *                 gstNumber: 22AAAAA0000A1Z5
   *     responses:
   *       201:
   *         description: User registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Validation error or user already exists
   *       500:
   *         description: Internal server error
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
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
      logger.error('Register controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *           example:
   *             email: john.doe@example.com
   *             password: password123
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: Invalid email or password
   *       500:
   *         description: Internal server error
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData);

      if (!result.success) {
        res.status(401).json(result);
        return;
      }

      res.status(200).json(result);
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
      logger.error('Login controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * @swagger
   * /api/auth/profile:
   *   get:
   *     summary: Get current user profile
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const user = await authService.getProfile(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: user,
      });
    } catch (error) {
      logger.error('Get profile controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * @swagger
   * /api/auth/users:
   *   get:
   *     summary: Get all users (Admin only)
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access required
   *       500:
   *         description: Internal server error
   */
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await authService.getAllUsers();

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: users,
      });
    } catch (error) {
      logger.error('Get all users controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * @swagger
   * /api/auth/forgot-password:
   *   post:
   *     summary: Request password reset
   *     description: Sends a 6-digit verification code to the user's email for password reset
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ForgotPasswordRequest'
   *           example:
   *             email: john.doe@example.com
   *     responses:
   *       200:
   *         description: Verification code sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MessageResponse'
   *       400:
   *         description: Validation error
   *       500:
   *         description: Internal server error
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(validatedData);

      res.status(200).json(result);
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
      logger.error('Forgot password controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * @swagger
   * /api/auth/verify-reset-code:
   *   post:
   *     summary: Verify password reset code
   *     description: Verifies the 6-digit code sent to user's email
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/VerifyResetCodeRequest'
   *           example:
   *             email: john.doe@example.com
   *             code: "123456"
   *     responses:
   *       200:
   *         description: Code verification result
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MessageResponse'
   *       400:
   *         description: Validation error or invalid code
   *       500:
   *         description: Internal server error
   */
  async verifyResetCode(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = verifyResetCodeSchema.parse(req.body);
      const result = await authService.verifyResetCode(validatedData);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
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
      logger.error('Verify reset code controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * @swagger
   * /api/auth/reset-password:
   *   post:
   *     summary: Reset password
   *     description: Sets a new password after code verification
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ResetPasswordRequest'
   *           example:
   *             email: john.doe@example.com
   *             code: "123456"
   *             newPassword: newPassword123
   *             confirmPassword: newPassword123
   *     responses:
   *       200:
   *         description: Password reset successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MessageResponse'
   *       400:
   *         description: Validation error or invalid code
   *       500:
   *         description: Internal server error
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(validatedData);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
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
      logger.error('Reset password controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     CustomerRegisterRequest:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - role
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: Customer's first name
 *         lastName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: Customer's last name
 *         email:
 *           type: string
 *           format: email
 *           description: Customer's email address
 *         password:
 *           type: string
 *           minLength: 6
 *           maxLength: 100
 *           description: Customer's password
 *         role:
 *           type: string
 *           enum: [CUSTOMER]
 *           description: Must be CUSTOMER for customer registration
 *     VendorRegisterRequest:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - role
 *         - companyName
 *         - productCategory
 *         - gstNumber
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: Vendor's first name
 *         lastName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: Vendor's last name
 *         email:
 *           type: string
 *           format: email
 *           description: Vendor's email address
 *         password:
 *           type: string
 *           minLength: 6
 *           maxLength: 100
 *           description: Vendor's password
 *         role:
 *           type: string
 *           enum: [VENDOR]
 *           description: Must be VENDOR for vendor registration
 *         companyName:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Vendor's company name
 *         productCategory:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Vendor's product category
 *         gstNumber:
 *           type: string
 *           minLength: 15
 *           maxLength: 15
 *           pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
 *           description: Vendor's GST number (15 characters)
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           description: User's password
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [ADMIN, VENDOR, CUSTOMER]
 *             token:
 *               type: string
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *     VerifyResetCodeRequest:
 *       type: object
 *       required:
 *         - email
 *         - code
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         code:
 *           type: string
 *           minLength: 6
 *           maxLength: 6
 *           pattern: '^\d{6}$'
 *           description: 6-digit verification code sent to email
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *         - code
 *         - newPassword
 *         - confirmPassword
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         code:
 *           type: string
 *           minLength: 6
 *           maxLength: 6
 *           pattern: '^\d{6}$'
 *           description: 6-digit verification code sent to email
 *         newPassword:
 *           type: string
 *           minLength: 6
 *           maxLength: 100
 *           description: New password
 *         confirmPassword:
 *           type: string
 *           minLength: 6
 *           maxLength: 100
 *           description: Confirm new password (must match newPassword)
 *     MessageResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 */

export const authController = new AuthController();
