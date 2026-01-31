import { db } from '../config/db.config.js';
import { authHelper } from '../helpers/auth.helper.js';
import type {
  RegisterSchemaType,
  LoginSchemaType,
} from '../validations/auth.validation.js';
import type { AuthResponse, UserResponse } from '../types/auth.types.js';
import type { UserRole } from '../generated/prisma/client.js';
import { logger } from '../config/logger.config.js';
import {
  redisService,
  type CachedUserData,
  type CachedUserWithPassword,
} from './redis.service.js';

class AuthService {
  /**
   * Register a new user
   * 1. Create user in database
   * 2. Flush all user-related data from Redis
   * 3. Populate Redis with new data
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

      // STEP 1: Flush all user-related data from Redis
      await redisService.flushAllUserData();
      logger.info(
        'Flushed all user data from Redis after new user registration'
      );

      // STEP 2: Populate Redis with new user data
      const userToCache: CachedUserData = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      await redisService.populateUserById(userToCache);
      logger.info('Populated Redis with new user data');

      // STEP 3: Fetch all users from DB and populate Redis
      const allUsers = await db.user.findMany({
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
      await redisService.populateUsers(allUsers as CachedUserData[]);
      logger.info(
        `Populated Redis with ${allUsers.length} users after registration`
      );

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
        const dbUser = await db.user.findUnique({
          where: { email: data.email },
        });

        if (dbUser) {
          // Populate Redis cache for next time
          const userToCache: CachedUserWithPassword = {
            id: dbUser.id,
            username: dbUser.username,
            email: dbUser.email,
            role: dbUser.role,
            password: dbUser.password,
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

      // STEP 3: Populate Redis cache for next time
      if (user) {
        await redisService.populateUserById(user as CachedUserData);
        logger.info(`Profile: Populated Redis with user ${userId}`);
      }

      return user;
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

      // STEP 3: Populate Redis cache for next time
      await redisService.populateUsers(users as CachedUserData[]);
      logger.info(`GetAllUsers: Populated Redis with ${users.length} users`);

      return users;
    } catch (error) {
      logger.error('Get all users error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
