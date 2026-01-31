import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import { logger } from '../config/logger.config.js';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET!;

  if (!token) {
    logger.error('Missing access token');
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, jwtSecret, (err, _user) => {
    if (err) {
      logger.error('Invalid or expired token');
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    next();
  });
};
