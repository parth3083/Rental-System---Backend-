/**
 * Redis Cache Key Constants
 * Use these constants to maintain consistent cache key naming across the application
 */
export const REDIS_KEYS = {
  // User related cache keys
  USERS: {
    ALL: 'cache:users:all',
    BY_ID: (id: string) => `cache:users:${id}`,
    BY_EMAIL: (email: string) => `cache:users:email:${email}`,
    PROFILE: (id: string) => `cache:users:profile:${id}`,
  },

  // Session related cache keys
  SESSION: {
    USER: (userId: string) => `session:user:${userId}`,
    TOKEN: (token: string) => `session:token:${token}`,
  },

  // Token blacklist
  BLACKLIST: {
    TOKEN: (token: string) => `blacklist:token:${token}`,
  },

  // Rate limiting
  RATE_LIMIT: {
    IP: (ip: string) => `ratelimit:ip:${ip}`,
    USER: (userId: string) => `ratelimit:user:${userId}`,
    ENDPOINT: (endpoint: string, identifier: string) =>
      `ratelimit:${endpoint}:${identifier}`,
  },

  // General cache
  CACHE: {
    GENERIC: (key: string) => `cache:${key}`,
  },

  // Password reset
  PASSWORD_RESET: {
    CODE: (email: string) => `password_reset:code:${email}`,
  },
} as const;

/**
 * Redis TTL (Time To Live) Constants in seconds
 */
export const REDIS_TTL = {
  // Short-lived cache (1-5 minutes)
  VERY_SHORT: 60, // 1 minute
  SHORT: 300, // 5 minutes

  // Medium-lived cache (15-60 minutes)
  MEDIUM: 900, // 15 minutes
  DEFAULT: 1800, // 30 minutes
  LONG: 3600, // 1 hour

  // Long-lived cache (hours to days)
  VERY_LONG: 21600, // 6 hours
  HALF_DAY: 43200, // 12 hours
  ONE_DAY: 86400, // 24 hours
  ONE_WEEK: 604800, // 7 days

  // Session and auth related
  SESSION: 86400, // 24 hours
  REFRESH_TOKEN: 604800, // 7 days
  TOKEN_BLACKLIST: 604800, // 7 days (match refresh token expiry)

  // Rate limiting
  RATE_LIMIT: 60, // 1 minute window

  // Password reset
  PASSWORD_RESET_CODE: 900, // 15 minutes
} as const;

/**
 * Type definitions for Redis keys and TTL
 */
export type RedisKeyType = string;
export type RedisTTLType = number;
