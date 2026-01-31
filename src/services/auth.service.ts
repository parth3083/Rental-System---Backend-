import { db } from '../config/db.config.js';
import { authHelper } from '../helpers/auth.helper.js';
import type {
  RegisterSchemaType,
  LoginSchemaType,
} from '../validations/auth.validation.js';
import type { AuthResponse, UserResponse } from '../types/auth.types.js';
import type { UserRole } from '../generated/prisma/client.js';
import { logger } from '../config/logger.config.js';

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterSchemaType): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await db.user.findUnique({
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

      // Create user
      const user = await db.user.create({
        data: {
          username: data.username,
          email: data.email,
          password: hashedPassword,
          role: data.role as UserRole,
        },
      });

      // Generate token
      const token = authHelper.generateToken(
        user.username,
        user.email,
        user.id,
        user.role
      );

      logger.info(`User registered successfully: ${user.email}`);

      return {
        success: true,
        message: 'User registered successfully',
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
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: LoginSchemaType): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await db.user.findUnique({
        where: { email: data.email },
      });

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
   */
  async getProfile(userId: string): Promise<UserResponse | null> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      logger.error('Get profile error:', error);
      throw error;
    }
  }

  /**
   * Get all users (Admin only)
   */
  async getAllUsers(): Promise<UserResponse[]> {
    try {
      const users = await db.user.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return users;
    } catch (error) {
      logger.error('Get all users error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
