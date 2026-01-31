import type { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import {
  updateUserSchema,
  changePasswordSchema,
} from '../validations/user.validation.js';
import { logger } from '../config/logger.config.js';
import { ZodError } from 'zod';

class UserController {
  /**
   * @swagger
   * /api/users/me:
   *   get:
   *     summary: Get current user details
   *     description: Fetches the details of the currently authenticated user based on the JWT token. Returns role-specific fields.
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserDetailsResponse'
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  async getUserDetails(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const result = await userService.getUserDetails(userId, userRole);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      logger.error('Get user details controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * @swagger
   * /api/users/me:
   *   patch:
   *     summary: Update current user details
   *     description: Updates the profile details of the currently authenticated user. Vendors can update company-specific fields.
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateUserRequest'
   *           examples:
   *             customer:
   *               summary: Customer Update
   *               value:
   *                 name: John Doe
   *                 address: 123 Main Street
   *                 city: Mumbai
   *                 pincode: "400001"
   *             vendor:
   *               summary: Vendor Update
   *               value:
   *                 name: Jane Smith
   *                 address: 456 Business Park
   *                 city: Delhi
   *                 pincode: "110001"
   *                 companyName: ABC Corp Pvt Ltd
   *                 gstin: 22AAAAA0000A1Z5
   *     responses:
   *       200:
   *         description: User details updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserDetailsResponse'
   *       400:
   *         description: Validation error or no fields provided
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *       403:
   *         description: Forbidden - Cannot update vendor fields as non-vendor
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  async updateUserDetails(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const validatedData = updateUserSchema.parse(req.body);
      const result = await userService.updateUserDetails(
        userId,
        userRole,
        validatedData
      );

      if (!result.success) {
        const statusCode = result.message.includes('not found')
          ? 404
          : result.message.includes('not authorized')
            ? 403
            : 400;
        res.status(statusCode).json(result);
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
      logger.error('Update user details controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * @swagger
   * /api/users/change-password:
   *   post:
   *     summary: Change password for authenticated user
   *     description: Allows an authenticated user to change their password by providing their current password and a new password. This is different from the forgot password flow as the user must be logged in and know their current password.
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ChangePasswordRequest'
   *           example:
   *             currentPassword: oldPassword123
   *             newPassword: newSecurePassword456
   *     responses:
   *       200:
   *         description: Password changed successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MessageResponse'
   *       400:
   *         description: Validation error or current password incorrect
   *       401:
   *         description: Unauthorized - Invalid or missing token
   *       404:
   *         description: User not found
   *       500:
   *         description: Internal server error
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const validatedData = changePasswordSchema.parse(req.body);
      const result = await userService.changePassword(userId, validatedData);

      if (!result.success) {
        const statusCode = result.message.includes('not found')
          ? 404
          : result.message.includes('incorrect')
            ? 400
            : 400;
        res.status(statusCode).json(result);
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
      logger.error('Change password controller error:', error);
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
 *     UserDetailsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: User details retrieved successfully
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               example: clxyz123456789
 *             name:
 *               type: string
 *               example: John Doe
 *             email:
 *               type: string
 *               format: email
 *               example: john.doe@example.com
 *             role:
 *               type: string
 *               enum: [ADMIN, VENDOR, CUSTOMER]
 *               example: CUSTOMER
 *             address:
 *               type: string
 *               nullable: true
 *               example: 123 Main Street
 *             city:
 *               type: string
 *               nullable: true
 *               example: Mumbai
 *             pincode:
 *               type: string
 *               nullable: true
 *               example: "400001"
 *             companyName:
 *               type: string
 *               nullable: true
 *               description: Only returned for VENDOR users
 *               example: ABC Corp Pvt Ltd
 *             gstin:
 *               type: string
 *               nullable: true
 *               description: Only returned for VENDOR users
 *               example: 22AAAAA0000A1Z5
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 *     UpdateUserRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: User's full name
 *         address:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *           description: User's address
 *         city:
 *           type: string
 *           maxLength: 100
 *           nullable: true
 *           description: User's city
 *         pincode:
 *           type: string
 *           maxLength: 10
 *           nullable: true
 *           description: User's pincode
 *         companyName:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Vendor's company name (VENDOR only)
 *         gstin:
 *           type: string
 *           minLength: 15
 *           maxLength: 15
 *           pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
 *           description: Vendor's GSTIN (VENDOR only)
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           description: User's current password
 *         newPassword:
 *           type: string
 *           minLength: 6
 *           maxLength: 100
 *           description: New password (must be at least 6 characters)
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management endpoints
 */

export const userController = new UserController();
