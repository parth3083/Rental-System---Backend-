import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters'),
  email: z.email('Invalid email format'),
  password: z
    .string('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters'),
  role: z.enum(['ADMIN', 'VENDOR', 'CUSTOMER']).optional().default('CUSTOMER'),
});

export const loginSchema = z.object({
  email: z.email('Invalid email format'),
  password: z.string('Password is required').min(1, 'Password is required'),
});

export type RegisterSchemaType = z.infer<typeof registerSchema>;
export type LoginSchemaType = z.infer<typeof loginSchema>;
