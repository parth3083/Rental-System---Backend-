import type { UsersRole } from '../generated/prisma/client.js';

export interface JwtPayload {
  id: string;
  email: string;
  username: string;
  role: UsersRole;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  role?: UsersRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      username: string;
      email: string;
      role: UsersRole;
    };
    token: string;
  };
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: UsersRole;
  createdAt: Date;
  updatedAt: Date;
}

// Extend Express Request to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
