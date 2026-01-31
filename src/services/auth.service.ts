import { db } from '../config/db.config.js';
import { authHelper } from '../helpers/auth.helper.js';
import type {
  RegisterSchemaType,
  LoginSchemaType,
  ForgotPasswordSchemaType,
  VerifyResetCodeSchemaType,
  ResetPasswordSchemaType,
} from '../validations/auth.validation.js';
import type { AuthResponse, UserResponse } from '../types/auth.types.js';
import { logger } from '../config/logger.config.js';
import {
  redisService,
  type CachedUserData,
  type CachedUserWithPassword,
} from './redis.service.js';
import { sendWelcomeEmail } from '../templates/email/welcome.email.template.js';
import { sendPasswordResetEmail } from '../templates/email/passwordReset.email.template.js';
import { sendPasswordResetSuccessEmail } from '../templates/email/password-reset.email.template.js';

class AuthService {
  /**
   * Register a new user
   * 1. Create user in database (with role-specific fields)
   * 2. Flush all user-related data from Redis
   * 3. Populate Redis with new data
   */
  async register(data: RegisterSchemaType): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await db.users.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists',
        };
      }

      // Hash password
      const hashedPassword = authHelper.hashPassword(data.password);

      // Create full name by concatenating first and last name
      const fullName = `${data.firstName} ${data.lastName}`;

      // Prepare user data based on role
      const userData: {
        name: string;
        email: string;
        passwordHash: string;
        role: 'CUSTOMER' | 'VENDOR';
        companyName?: string;
        gstin?: string;
      } = {
        name: fullName,
        email: data.email,
        passwordHash: hashedPassword,
        role: data.role,
      };

      // Add vendor-specific fields if role is VENDOR
      if (data.role === 'VENDOR') {
        userData.companyName = data.companyName;
        userData.gstin = data.gstNumber;
      }

      // Create user
      const user = await db.users.create({
        data: userData,
      });

      // STEP 1: Flush all user-related data from Redis
      await redisService.flushAllUserData();
      logger.info(
        'Flushed all user data from Redis after new user registration'
      );

      // STEP 2: Populate Redis with new user data
      const userToCache: CachedUserData = {
        id: user.id,
        username: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      await redisService.populateUserById(userToCache);
      logger.info('Populated Redis with new user data');

      // STEP 3: Fetch all users from DB and populate Redis
      const allUsers = await db.users.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      const mappedUsers = allUsers.map(u => ({ ...u, username: u.name }));
      await redisService.populateUsers(mappedUsers as CachedUserData[]);
      logger.info(
        `Populated Redis with ${allUsers.length} users after registration`
      );

      // Generate token
      const token = authHelper.generateToken(
        user.name,
        user.email,
        user.id,
        user.role
      );

      logger.info(`User registered successfully: ${user.email}`);

      // Send welcome email (non-blocking)
      logger.info(`Sending welcome email to: ${user.email}`);
      sendWelcomeEmail(user.email, user.name)
        .then(() => {
          logger.info(`Welcome email sent successfully to: ${user.email}`);
        })
        .catch(error => {
          logger.error(`Failed to send welcome email to ${user.email}:`, error);
        });

      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            username: user.name,
            email: user.email,
            role: user.role,
          },
          token,
        },
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   * 1. First try to fetch user from Redis cache
   * 2. If cache miss, fetch from database and populate cache
   * 3. Verify password and return token
   */
  async login(data: LoginSchemaType): Promise<AuthResponse> {
    try {
      let user: CachedUserWithPassword | null = null;

      // STEP 1: Try to fetch user from Redis cache first
      const cachedUser = await redisService.fetchUserByEmail(data.email);

      if (cachedUser) {
        // Cache HIT - use cached data
        logger.info('Login: Redis HIT for email');
        user = cachedUser;
      } else {
        // STEP 2: Cache MISS - fetch from database
        logger.info('Login: Redis MISS - fetching from database');
        const dbUser = await db.users.findUnique({
          where: { email: data.email },
        });

        if (dbUser) {
          // Populate Redis cache for next time
          const userToCache: CachedUserWithPassword = {
            id: dbUser.id,
            username: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
            password: dbUser.passwordHash,
            isDeleted: dbUser.isDeleted,
            isRestricted: dbUser.isRestricted,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt,
          };
          await redisService.populateUserByEmail(userToCache);
          logger.info('Login: Populated Redis with user data');
          user = userToCache;
        }
      }

      // User not found
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Check if user is deleted or restricted
      if (user.isDeleted) {
        return {
          success: false,
          message: 'This account has been deleted',
        };
      }

      if (user.isRestricted) {
        return {
          success: false,
          message: 'This account has been restricted',
        };
      }

      // Verify password
      const isPasswordValid = await authHelper.passwordVerify(
        data.password,
        user.password
      );

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Generate token
      const token = authHelper.generateToken(
        user.username,
        user.email,
        user.id,
        user.role
      );

      logger.info(`User logged in successfully: ${user.email}`);

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
          token,
        },
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get user profile by ID
   * 1. First try to fetch from Redis cache
   * 2. If cache miss, fetch from database and populate cache
   */
  async getProfile(userId: string): Promise<UserResponse | null> {
    try {
      // STEP 1: Try to fetch from Redis cache first
      const cachedUser = await redisService.fetchUserById(userId);

      if (cachedUser) {
        // Cache HIT - return cached data
        logger.info(`Profile: Redis HIT for user ${userId}`);
        return cachedUser as UserResponse;
      }

      // STEP 2: Cache MISS - fetch from database
      logger.info(
        `Profile: Redis MISS for user ${userId} - fetching from database`
      );
      const user = await db.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // STEP 3: Populate Redis cache for next time
      if (user) {
        const mappedUser = { ...user, username: user.name };
        await redisService.populateUserById(mappedUser as CachedUserData);
        logger.info(`Profile: Populated Redis with user ${userId}`);
      }

      return user ? { ...user, username: user.name } : null;
    } catch (error) {
      logger.error('Get profile error:', error);
      throw error;
    }
  }

  /**
   * Get all users (Admin only)
   * 1. First try to fetch all users from Redis cache
   * 2. If cache miss, fetch from database and populate cache
   */
  async getAllUsers(): Promise<UserResponse[]> {
    try {
      // STEP 1: Try to fetch all users from Redis cache first
      const cachedUsers = await redisService.fetchUsers();

      if (cachedUsers) {
        // Cache HIT - return cached data
        logger.info(
          `GetAllUsers: Redis HIT - returning ${cachedUsers.length} users from cache`
        );
        return cachedUsers as UserResponse[];
      }

      // STEP 2: Cache MISS - fetch from database
      logger.info('GetAllUsers: Redis MISS - fetching from database');
      const users = await db.users.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // STEP 3: Populate Redis cache for next time
      const mappedUsers = users.map(u => ({ ...u, username: u.name }));
      await redisService.populateUsers(mappedUsers as CachedUserData[]);
      logger.info(`GetAllUsers: Populated Redis with ${users.length} users`);

      return users.map(u => ({ ...u, username: u.name }));
    } catch (error) {
      logger.error('Get all users error:', error);
      throw error;
    }
  }

  /**
   * Generate a 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Forgot Password - Send verification code to user's email
   * Uses Redis to store verification codes with TTL
   */
  async forgotPassword(
    data: ForgotPasswordSchemaType
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by email
      const user = await db.users.findUnique({
        where: { email: data.email },
      });

      // For security, always return success message even if user doesn't exist
      // This prevents email enumeration attacks
      if (!user) {
        logger.info(
          `Password reset requested for non-existent email: ${data.email}`
        );
        return {
          success: true,
          message:
            'If an account with this email exists, a verification code has been sent.',
        };
      }

      // Check if user is deleted or restricted
      if (user.isDeleted) {
        return {
          success: false,
          message: 'This account has been deleted.',
        };
      }

      // Generate new verification code
      const verificationCode = this.generateVerificationCode();
      const expiresInMinutes = 15;

      // Store verification code in Redis with TTL
      const stored = await redisService.storePasswordResetCode(
        user.email,
        verificationCode
      );
      logger.info(
        `Password reset code generated: ${verificationCode} for email: ${user.email}`
      );
      logger.info(`Code stored in Redis: ${stored}`);

      // Send password reset email
      await sendPasswordResetEmail(
        user.email,
        user.name,
        verificationCode,
        expiresInMinutes
      );

      logger.info(`Password reset code sent to: ${user.email}`);

      return {
        success: true,
        message:
          'If an account with this email exists, a verification code has been sent.',
      };
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw error;
    }
  }

  /**
   * Verify Reset Code - Check if the code is valid
   */
  async verifyResetCode(
    data: VerifyResetCodeSchemaType
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('===== VERIFY RESET CODE START =====');
      logger.info(`Email received: "${data.email}"`);
      logger.info(
        `Code received: "${data.code}" (type: ${typeof data.code}, length: ${data.code?.length})`
      );

      // Find user by email
      const user = await db.users.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        logger.warn(`User not found for email: ${data.email}`);
        return {
          success: false,
          message: 'Invalid verification code.',
        };
      }

      logger.info(`User found: ${user.id}`);

      // Get verification code from Redis
      const storedCode = await redisService.getPasswordResetCode(data.email);

      logger.info(
        `Raw stored code from Redis: "${storedCode}" (type: ${typeof storedCode})`
      );

      // Handle null case
      if (storedCode === null || storedCode === undefined) {
        logger.warn(`No code found in Redis for email: ${data.email}`);
        return {
          success: false,
          message: 'Invalid or expired verification code.',
        };
      }

      // Convert both to strings and trim
      const storedCodeStr = String(storedCode).trim();
      const receivedCodeStr = String(data.code).trim();

      logger.info(
        `Stored code (normalized): "${storedCodeStr}" (length: ${storedCodeStr.length})`
      );
      logger.info(
        `Received code (normalized): "${receivedCodeStr}" (length: ${receivedCodeStr.length})`
      );

      // Character-by-character comparison for debugging
      logger.info('Character comparison:');
      for (
        let i = 0;
        i < Math.max(storedCodeStr.length, receivedCodeStr.length);
        i++
      ) {
        const storedChar = storedCodeStr[i] || 'MISSING';
        const receivedChar = receivedCodeStr[i] || 'MISSING';
        const match = storedChar === receivedChar ? '✓' : '✗';
        logger.info(
          `  [${i}]: stored="${storedChar}" received="${receivedChar}" ${match}`
        );
      }

      const codesMatch = storedCodeStr === receivedCodeStr;
      logger.info(`Final comparison result: ${codesMatch}`);

      if (!codesMatch) {
        logger.warn(`Code verification FAILED for ${data.email}`);
        return {
          success: false,
          message: 'Invalid or expired verification code.',
        };
      }

      logger.info(`Reset code verified successfully for: ${user.email}`);
      logger.info('===== VERIFY RESET CODE END =====');

      return {
        success: true,
        message: 'Verification code is valid.',
      };
    } catch (error) {
      logger.error('Verify reset code error:', error);
      throw error;
    }
  }

  /**
   * Reset Password - Set new password after code verification
   */
  async resetPassword(
    data: ResetPasswordSchemaType
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by email
      const user = await db.users.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid verification code.',
        };
      }

      // Get verification code from Redis
      const storedCode = await redisService.getPasswordResetCode(data.email);

      // Normalize both codes to strings and trim whitespace
      const normalizedStoredCode = storedCode?.toString().trim();
      const normalizedReceivedCode = data.code?.toString().trim();

      if (
        !normalizedStoredCode ||
        normalizedStoredCode !== normalizedReceivedCode
      ) {
        return {
          success: false,
          message: 'Invalid or expired verification code.',
        };
      }

      // Hash new password
      const hashedPassword = authHelper.hashPassword(data.newPassword);

      // Update user password
      await db.users.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          updatedAt: new Date(),
        },
      });

      // Delete the verification code from Redis (one-time use)
      await redisService.deletePasswordResetCode(data.email);

      // Invalidate Redis cache for this user
      await redisService.flushAllUserData();
      logger.info(`Password reset successfully for: ${user.email}`);

      // Send password reset success email (non-blocking)
      sendPasswordResetSuccessEmail(user.email, user.name).catch(error => {
        logger.error(
          `Failed to send password reset success email to ${user.email}:`,
          error
        );
      });

      return {
        success: true,
        message:
          'Password has been reset successfully. You can now login with your new password.',
      };
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
