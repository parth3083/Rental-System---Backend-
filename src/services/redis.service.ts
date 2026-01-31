import { redis } from '../config/redis.config.js';
import { logger } from '../config/logger.config.js';
import { REDIS_KEYS, REDIS_TTL } from '../config/redis.constants.js';
import type { UserRole } from '../generated/prisma/client.js';

/**
 * Cached user data interface (without password)
 */
export interface CachedUserData {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User data with password (for login verification)
 */
export interface CachedUserWithPassword extends CachedUserData {
  password: string;
  isDeleted: boolean;
  isRestricted: boolean;
}

/**
 * Redis Service Interface
 * Defines methods for populating and fetching data from Redis
 */
export interface IRedisService {
  // ===== FLUSH METHODS =====
  flushAllUserData(): Promise<boolean>;
  flushUserById(userId: string): Promise<boolean>;
  flushUserByEmail(email: string): Promise<boolean>;

  // ===== POPULATE METHODS =====
  populateUsers(users: CachedUserData[]): Promise<boolean>;
  populateUserById(user: CachedUserData): Promise<boolean>;
  populateUserByEmail(user: CachedUserWithPassword): Promise<boolean>;

  // ===== FETCH METHODS =====
  fetchUsers(): Promise<CachedUserData[] | null>;
  fetchUserById(userId: string): Promise<CachedUserData | null>;
  fetchUserByEmail(email: string): Promise<CachedUserWithPassword | null>;

  // ===== UTILITY METHODS =====
  ping(): Promise<string>;
}

/**
 * Redis Service Class
 * Provides methods for populating and fetching cached data
 */
class RedisService implements IRedisService {
  // ==================== FLUSH METHODS ====================

  /**
   * Flush all user-related data from Redis
   * Call this when a new user is created to ensure fresh data
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  async flushAllUserData(): Promise<boolean> {
    try {
      // Delete the all users cache
      const allUsersKey = REDIS_KEYS.USERS.ALL;
      await redis.del(allUsersKey);

      // Get all user-related keys and delete them
      // Note: In production, consider using SCAN instead of KEYS for large datasets
      const userKeys = await redis.keys('cache:users:*');
      if (userKeys.length > 0) {
        await redis.del(...userKeys);
      }

      logger.info(
        `Flushed all user data from Redis (${userKeys.length + 1} keys)`
      );
      return true;
    } catch (error) {
      logger.error('Error flushing all user data:', error);
      return false;
    }
  }

  /**
   * Flush a specific user from Redis by ID
   * @param userId - The user ID to flush
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  async flushUserById(userId: string): Promise<boolean> {
    try {
      const key = REDIS_KEYS.USERS.BY_ID(userId);
      await redis.del(key);

      // Also flush the all users cache since data changed
      await redis.del(REDIS_KEYS.USERS.ALL);

      logger.info(`Flushed user ${userId} from Redis`);
      return true;
    } catch (error) {
      logger.error(`Error flushing user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Flush a specific user from Redis by email
   * @param email - The user email to flush
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  async flushUserByEmail(email: string): Promise<boolean> {
    try {
      const key = REDIS_KEYS.USERS.BY_EMAIL(email);
      await redis.del(key);

      logger.info('Flushed user by email from Redis');
      return true;
    } catch (error) {
      logger.error('Error flushing user by email:', error);
      return false;
    }
  }

  // ==================== POPULATE METHODS ====================

  /**
   * Populate Redis with all users data
   * Call this after fetching all users from the database
   * @param users - Array of user data to cache
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  async populateUsers(users: CachedUserData[]): Promise<boolean> {
    try {
      const key = REDIS_KEYS.USERS.ALL;
      const serializedUsers = JSON.stringify(users);

      await redis.setex(key, REDIS_TTL.MEDIUM, serializedUsers);

      logger.info(
        `Populated Redis with ${users.length} users (TTL: ${REDIS_TTL.MEDIUM}s)`
      );
      return true;
    } catch (error) {
      logger.error('Error populating users in Redis:', error);
      return false;
    }
  }

  /**
   * Populate Redis with a single user by ID
   * Call this after fetching a user from the database
   * @param user - User data to cache
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  async populateUserById(user: CachedUserData): Promise<boolean> {
    try {
      const key = REDIS_KEYS.USERS.BY_ID(user.id);
      const serializedUser = JSON.stringify(user);

      await redis.setex(key, REDIS_TTL.LONG, serializedUser);

      logger.debug(
        `Populated Redis with user ${user.id} (TTL: ${REDIS_TTL.LONG}s)`
      );
      return true;
    } catch (error) {
      logger.error(`Error populating user ${user.id} in Redis:`, error);
      return false;
    }
  }

  /**
   * Populate Redis with a user by email (includes password for login)
   * Call this after fetching a user by email from the database
   * @param user - User data with password to cache
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  async populateUserByEmail(user: CachedUserWithPassword): Promise<boolean> {
    try {
      const key = REDIS_KEYS.USERS.BY_EMAIL(user.email);
      const serializedUser = JSON.stringify(user);

      // Shorter TTL for sensitive data
      await redis.setex(key, REDIS_TTL.SHORT, serializedUser);

      logger.debug(
        `Populated Redis with user by email (TTL: ${REDIS_TTL.SHORT}s)`
      );
      return true;
    } catch (error) {
      logger.error('Error populating user by email in Redis:', error);
      return false;
    }
  }

  // ==================== FETCH METHODS ====================

  /**
   * Fetch all users from Redis cache
   * Returns null if cache miss (need to fetch from database)
   * @returns Promise<CachedUserData[] | null> - Cached users or null if not found
   */
  async fetchUsers(): Promise<CachedUserData[] | null> {
    try {
      const key = REDIS_KEYS.USERS.ALL;
      const cached = await redis.get(key);

      if (!cached) {
        logger.debug('Redis MISS: All users not found in cache');
        return null;
      }

      const users = JSON.parse(cached as string) as CachedUserData[];
      logger.info(`Redis HIT: Fetched ${users.length} users from cache`);
      return users;
    } catch (error) {
      logger.error('Error fetching users from Redis:', error);
      return null;
    }
  }

  /**
   * Fetch a single user from Redis cache by ID
   * Returns null if cache miss (need to fetch from database)
   * @param userId - The user ID to fetch
   * @returns Promise<CachedUserData | null> - Cached user or null if not found
   */
  async fetchUserById(userId: string): Promise<CachedUserData | null> {
    try {
      const key = REDIS_KEYS.USERS.BY_ID(userId);
      const cached = await redis.get(key);

      if (!cached) {
        logger.debug(`Redis MISS: User ${userId} not found in cache`);
        return null;
      }

      const user = JSON.parse(cached as string) as CachedUserData;
      logger.info(`Redis HIT: Fetched user ${userId} from cache`);
      return user;
    } catch (error) {
      logger.error(`Error fetching user ${userId} from Redis:`, error);
      return null;
    }
  }

  /**
   * Fetch a user from Redis cache by email (for login)
   * Returns null if cache miss (need to fetch from database)
   * @param email - The user email to fetch
   * @returns Promise<CachedUserWithPassword | null> - Cached user with password or null if not found
   */
  async fetchUserByEmail(
    email: string
  ): Promise<CachedUserWithPassword | null> {
    try {
      const key = REDIS_KEYS.USERS.BY_EMAIL(email);
      const cached = await redis.get(key);

      if (!cached) {
        logger.debug('Redis MISS: User by email not found in cache');
        return null;
      }

      const user = JSON.parse(cached as string) as CachedUserWithPassword;
      logger.info('Redis HIT: Fetched user by email from cache');
      return user;
    } catch (error) {
      logger.error('Error fetching user by email from Redis:', error);
      return null;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Ping Redis to check connection
   * @returns Promise<string> - 'PONG' if connection is healthy
   */
  async ping(): Promise<string> {
    try {
      const result = await redis.ping();
      logger.debug('Redis ping successful');
      return result;
    } catch (error) {
      logger.error('Redis ping error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();

// Re-export constants for convenience
export { REDIS_KEYS, REDIS_TTL };
