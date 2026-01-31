import { z } from 'zod';

// Update user profile schema - base fields for all users
const baseUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must not exceed 255 characters')
    .optional(),
  address: z
    .string()
    .max(500, 'Address must not exceed 500 characters')
    .optional()
    .nullable(),
  city: z
    .string()
    .max(100, 'City must not exceed 100 characters')
    .optional()
    .nullable(),
  pincode: z
    .string()
    .max(10, 'Pincode must not exceed 10 characters')
    .optional()
    .nullable(),
});

// Vendor-specific update fields
export const vendorUpdateSchema = baseUpdateSchema.extend({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(255, 'Company name must not exceed 255 characters')
    .optional(),
  gstin: z
    .string()
    .length(15, 'GSTIN must be exactly 15 characters')
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      'Invalid GSTIN format'
    )
    .optional(),
});

// Customer update schema (base fields only)
export const customerUpdateSchema = baseUpdateSchema;

// Combined update schema that allows both customer and vendor fields
export const updateUserSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must not exceed 255 characters')
    .optional(),
  address: z
    .string()
    .max(500, 'Address must not exceed 500 characters')
    .optional()
    .nullable(),
  city: z
    .string()
    .max(100, 'City must not exceed 100 characters')
    .optional()
    .nullable(),
  pincode: z
    .string()
    .max(10, 'Pincode must not exceed 10 characters')
    .optional()
    .nullable(),
  // Vendor-specific fields (will be validated in service based on role)
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(255, 'Company name must not exceed 255 characters')
    .optional(),
  gstin: z
    .string()
    .length(15, 'GSTIN must be exactly 15 characters')
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      'Invalid GSTIN format'
    )
    .optional(),
});

// Change password schema - for authenticated users who know their current password
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ message: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: z
      .string({ message: 'New password is required' })
      .min(6, 'New password must be at least 6 characters')
      .max(100, 'New password must not exceed 100 characters'),
  })
  .refine(data => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

// Inferred types
export type UpdateUserSchemaType = z.infer<typeof updateUserSchema>;
export type ChangePasswordSchemaType = z.infer<typeof changePasswordSchema>;
