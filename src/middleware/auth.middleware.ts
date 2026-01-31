import type { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import { logger } from '../config/logger.config.js';
import { authHelper } from '../helpers/auth.helper.js';
import type { UsersRole } from '../generated/prisma/client.js';

/**
 * Middleware to authenticate JWT token
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.error('Missing access token');
    res.status(401).json({
      success: false,
      message: 'Access token required',
    });
    return;
  }

  const decoded = authHelper.verifyToken(token);

  if (!decoded) {
    logger.error('Invalid or expired token');
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
    return;
  }

  req.user = decoded;
  next();
};

/**
 * Middleware factory to restrict access based on roles
 * @param allowedRoles - Array of roles that are allowed to access the route
 */
export const roleMiddleware = (...allowedRoles: UsersRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `User ${req.user.email} attempted to access restricted route. Required roles: ${allowedRoles.join(', ')}, User role: ${req.user.role}`
      );
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user is an admin
 */
export const adminOnly = roleMiddleware('ADMIN');

/**
 * Middleware to check if user is a vendor or admin
 */
export const vendorOrAdmin = roleMiddleware('ADMIN', 'VENDOR');

/**
 * Middleware to check if user is a customer, vendor, or admin
 */
export const anyAuthenticated = roleMiddleware('ADMIN', 'VENDOR', 'CUSTOMER');
