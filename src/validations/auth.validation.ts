import { z } from 'zod';

// Base schema for common fields
const baseRegisterSchema = z.object({
  firstName: z
    .string({ message: 'First name is required' })
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters'),
  lastName: z
    .string({ message: 'Last name is required' })
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters'),
  email: z.string().email('Invalid email format'),
  password: z
    .string({ message: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters'),
});

// Customer registration schema
export const customerRegisterSchema = baseRegisterSchema.extend({
  role: z.literal('CUSTOMER').default('CUSTOMER'),
});

// Vendor registration schema with additional fields
export const vendorRegisterSchema = baseRegisterSchema.extend({
  role: z.literal('VENDOR'),
  companyName: z
    .string({ message: 'Company name is required' })
    .min(1, 'Company name is required')
    .max(255, 'Company name must not exceed 255 characters'),
  gstNumber: z
    .string({ message: 'GST number is required' })
    .min(15, 'GST number must be 15 characters')
    .max(15, 'GST number must be 15 characters')
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      'Invalid GST number format'
    ),
});

// Combined register schema that discriminates based on role
export const registerSchema = z.discriminatedUnion('role', [
  customerRegisterSchema,
  vendorRegisterSchema,
]);

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string({ message: 'Password is required' })
    .min(1, 'Password is required'),
});

// Inferred types
export type CustomerRegisterSchemaType = z.infer<typeof customerRegisterSchema>;
export type VendorRegisterSchemaType = z.infer<typeof vendorRegisterSchema>;
export type RegisterSchemaType = z.infer<typeof registerSchema>;
export type LoginSchemaType = z.infer<typeof loginSchema>;

// Forgot Password Schema - Step 1: Request password reset
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

// Verify Reset Code Schema - Step 2: Verify the code sent to email
export const verifyResetCodeSchema = z.object({
  email: z.string().email('Invalid email format'),
  code: z
    .string({ message: 'Verification code is required' })
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only digits'),
});

// Reset Password Schema - Step 3: Set new password
export const resetPasswordSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    code: z
      .string({ message: 'Verification code is required' })
      .length(6, 'Verification code must be 6 digits')
      .regex(/^\d{6}$/, 'Verification code must contain only digits'),
    newPassword: z
      .string({ message: 'New password is required' })
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password must not exceed 100 characters'),
    confirmPassword: z
      .string({ message: 'Confirm password is required' })
      .min(1, 'Confirm password is required'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Inferred types for password reset flow
export type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeSchemaType = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;
