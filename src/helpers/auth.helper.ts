import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET!;

type AuthHelper = {
  hashPassword: (password: string) => string;
  generateToken: (username: string, email: string, id: string) => string;
  passwordVerify: (
    password: string,
    hashedPassword: string
  ) => Promise<boolean>;
};

class AuthHelpers implements AuthHelper {
  constructor() {}
  hashPassword = (password: string): string => {
    const hashedPassword: string = bcrypt.hashSync(password, 10);
    return hashedPassword;
  };
  generateToken = (username: string, email: string, id: string): string => {
    const token = jwt.sign({ username, email, id }, jwtSecret, {
      expiresIn: '1d',
    });
    return token;
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
