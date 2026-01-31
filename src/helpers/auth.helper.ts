import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import type { UsersRole } from '../generated/prisma/client.js';
import type { JwtPayload } from '../types/auth.types.js';

const jwtSecret = process.env.JWT_SECRET!;

type AuthHelper = {
  hashPassword: (password: string) => string;
  generateToken: (
    username: string,
    email: string,
    id: string,
    role: UsersRole
  ) => string;
  passwordVerify: (
    password: string,
    hashedPassword: string
  ) => Promise<boolean>;
  verifyToken: (token: string) => JwtPayload | null;
};

class AuthHelpers implements AuthHelper {
  constructor() {}

  hashPassword = (password: string): string => {
    const hashedPassword: string = bcrypt.hashSync(password, 10);
    return hashedPassword;
  };

  generateToken = (
    username: string,
    email: string,
    id: string,
    role: UsersRole
  ): string => {
    const token = jwt.sign({ username, email, id, role }, jwtSecret, {
      expiresIn: '1d',
    });
    return token;
  };

  verifyToken = (token: string): JwtPayload | null => {
    try {
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  };

  passwordVerify = async (
    password: string,
    hashedPassword: string
  ): Promise<boolean> => {
    const correctPassword = await bcrypt.compare(password, hashedPassword);
    if (correctPassword) return true;
    return false;
  };
}

export const authHelper = new AuthHelpers();
