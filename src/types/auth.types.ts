import type { UsersRole } from '../generated/prisma/client.js';

export interface JwtPayload {
  id: string;
  email: string;
  username: string;
  role: UsersRole;
}

// Customer registration input (firstName + lastName will be concatenated to fullName)
export interface CustomerRegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'CUSTOMER';
}

// Vendor registration input with additional fields
export interface VendorRegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'VENDOR';
  companyName: string;
  productCategory: string;
  gstNumber: string;
}

// Combined register input type
export type RegisterInput = CustomerRegisterInput | VendorRegisterInput;

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
