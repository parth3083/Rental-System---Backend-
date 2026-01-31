import { db } from '../config/db.config.js';
import { authHelper } from '../helpers/auth.helper.js';
import type {
  UpdateUserSchemaType,
  ChangePasswordSchemaType,
} from '../validations/user.validation.js';
import { logger } from '../config/logger.config.js';
import { redisService, type CachedUserData } from './redis.service.js';
import type { UsersRole } from '../generated/prisma/client.js';

/**
 * User details response interface
 */
export interface UserDetailsResponse {
  id: string;
  name: string;
  email: string;
  role: UsersRole;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  companyName?: string | null;
  gstin?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Standard API response interface
 */
export interface ServiceResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

class UserService {
  /**
   * Get user details by ID with role-based data filtering
   * 1. First try to fetch from Redis cache
   * 2. If cache miss, fetch from database and populate cache
   * 3. Return role-specific fields
   */
  async getUserDetails(
    userId: string,
    userRole: UsersRole
  ): Promise<ServiceResponse<UserDetailsResponse>> {
    try {
      // STEP 1: Try to fetch from Redis cache first
      const cachedUser = await redisService.fetchUserById(userId);

      if (cachedUser) {
        logger.info(`GetUserDetails: Redis HIT for user ${userId}`);

        // Fetch full user data from DB for complete details (cache has limited data)
        const fullUser = await db.users.findUnique({
          where: { id: userId, isDeleted: false },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            address: true,
            city: true,
            pincode: true,
            companyName: true,
            gstin: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!fullUser) {
          return {
            success: false,
            message: 'User not found',
          };
        }

        // Filter response based on role
        const userDetails = this.filterUserDetailsByRole(fullUser, userRole);

        return {
          success: true,
          message: 'User details retrieved successfully',
          data: userDetails,
        };
      }

      // STEP 2: Cache MISS - fetch from database
      logger.info(
        `GetUserDetails: Redis MISS for user ${userId} - fetching from database`
      );

      const user = await db.users.findUnique({
        where: { id: userId, isDeleted: false },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          address: true,
          city: true,
          pincode: true,
          companyName: true,
          gstin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // STEP 3: Populate Redis cache for next time
      const userToCache: CachedUserData = {
        id: user.id,
        username: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      await redisService.populateUserById(userToCache);
      logger.info(`GetUserDetails: Populated Redis with user ${userId}`);

      // Filter response based on role
      const userDetails = this.filterUserDetailsByRole(user, userRole);

      return {
        success: true,
        message: 'User details retrieved successfully',
        data: userDetails,
      };
    } catch (error) {
      logger.error('Get user details error:', error);
      throw error;
    }
  }

  /**
   * Filter user details based on role
   * - VENDOR: Includes company details (companyName, gstin)
   * - CUSTOMER: Basic profile fields only
   * - ADMIN: All fields
   */
  private filterUserDetailsByRole(
    user: {
      id: string;
      name: string;
      email: string;
      role: UsersRole;
      address: string | null;
      city: string | null;
      pincode: string | null;
      companyName: string | null;
      gstin: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    requestingRole: UsersRole
  ): UserDetailsResponse {
    const baseDetails: UserDetailsResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      city: user.city,
      pincode: user.pincode,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // For VENDOR role or if the user IS a vendor, include company details
    if (user.role === 'VENDOR' || requestingRole === 'VENDOR') {
      baseDetails.companyName = user.companyName;
      baseDetails.gstin = user.gstin;
    }

    // ADMIN gets all details
    if (requestingRole === 'ADMIN') {
      baseDetails.companyName = user.companyName;
      baseDetails.gstin = user.gstin;
    }

    return baseDetails;
  }

  /**
   * Update user details
   * 1. Validate role-based field permissions
   * 2. Update user in database
   * 3. Invalidate Redis cache
   * 4. Return updated user data
   */
  async updateUserDetails(
    userId: string,
    userRole: UsersRole,
    data: UpdateUserSchemaType
  ): Promise<ServiceResponse<UserDetailsResponse>> {
    try {
      // Check if user exists
      const existingUser = await db.users.findUnique({
        where: { id: userId, isDeleted: false },
      });

      if (!existingUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Validate role-based field permissions
      if (userRole !== 'VENDOR' && userRole !== 'ADMIN') {
        // Non-vendors shouldn't update vendor-specific fields
        if (data.companyName || data.gstin) {
          return {
            success: false,
            message: 'You are not authorized to update vendor-specific fields',
          };
        }
      }

      // Prepare update data
      const updateData: {
        name?: string;
        address?: string | null;
        city?: string | null;
        pincode?: string | null;
        companyName?: string | null;
        gstin?: string | null;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      // Add fields that are provided
      if (data.name !== undefined) updateData.name = data.name;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.pincode !== undefined) updateData.pincode = data.pincode;

      // Vendor-specific fields
      if (userRole === 'VENDOR' || userRole === 'ADMIN') {
        if (data.companyName !== undefined)
          updateData.companyName = data.companyName;
        if (data.gstin !== undefined) updateData.gstin = data.gstin;
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 1) {
        return {
          success: false,
          message: 'No fields provided for update',
        };
      }

      // Update user in database
      const updatedUser = await db.users.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          address: true,
          city: true,
          pincode: true,
          companyName: true,
          gstin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Invalidate Redis cache
      await redisService.flushUserById(userId);
      await redisService.flushUserByEmail(updatedUser.email);
      logger.info(
        `UpdateUserDetails: Invalidated Redis cache for user ${userId}`
      );

      // Populate Redis with updated data
      const userToCache: CachedUserData = {
        id: updatedUser.id,
        username: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };
      await redisService.populateUserById(userToCache);
      logger.info(
        `UpdateUserDetails: Populated Redis with updated user ${userId}`
      );

      // Filter response based on role
      const userDetails = this.filterUserDetailsByRole(updatedUser, userRole);

      return {
        success: true,
        message: 'User details updated successfully',
        data: userDetails,
      };
    } catch (error) {
      logger.error('Update user details error:', error);
      throw error;
    }
  }

  /**
   * Change password for authenticated user
   * 1. Verify current password
   * 2. Hash new password
   * 3. Update password in database
   * 4. Invalidate Redis cache
   */
  async changePassword(
    userId: string,
    data: ChangePasswordSchemaType
  ): Promise<ServiceResponse> {
    try {
      // Fetch user with password from database
      const user = await db.users.findUnique({
        where: { id: userId, isDeleted: false },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await authHelper.passwordVerify(
        data.currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect',
        };
      }

      // Hash new password
      const hashedNewPassword = authHelper.hashPassword(data.newPassword);

      // Update password in database
      await db.users.update({
        where: { id: userId },
        data: {
          passwordHash: hashedNewPassword,
          updatedAt: new Date(),
        },
      });

      // Invalidate Redis cache for this user
      await redisService.flushUserById(userId);
      await redisService.flushUserByEmail(user.email);
      logger.info(`ChangePassword: Password changed for user ${userId}`);

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
