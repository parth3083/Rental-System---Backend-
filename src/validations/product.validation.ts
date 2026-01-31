import { z } from 'zod';

export const DurationUnitSchema = z.enum(['Hour', 'Day', 'Week', 'Month']);

export const RentalDurationFilterSchema = z.object({
  value: z.number().positive(),
  unit: DurationUnitSchema,
});

export const getProductsSchema = z.object({
  searchTerm: z.string().optional(),
  pageNumber: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),

  brands: z
    .union([z.string(), z.array(z.string())])
    .transform(val => (Array.isArray(val) ? val : [val]))
    .optional(),

  colors: z
    .union([z.string(), z.array(z.string())])
    .transform(val => (Array.isArray(val) ? val : [val]))
    .optional(),

  categoryId: z.coerce.number().optional(),

  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),

  // For complex object in query params, we might need to parse JSONString specifically if passed as string
  // OR structured if using body (but GET usually query).
  // Assuming it might come as a JSON string or individual params.
  // Given user request "If set (e.g., Value=2, Unit=Month)",
  // let's assume it might come as duration[value]=2&duration[unit]=Month or JSON.
  // We'll trust Zod to handle object structure if query parser supports valid nested objects (qs default in express)
  duration: z
    .any()
    .transform(val => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    })
    .pipe(RentalDurationFilterSchema.optional())
    .optional(),
});

export const createProductSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().min(1),
    brand: z.string().min(1),
    color: z.string().default('Generic'),
    categoryId: z.number().int(),
    imageUrl: z.string().url(),
    hourlyPrice: z.number().nonnegative().optional(),
    dailyPrice: z.number().nonnegative().optional(),
    weeklyPrice: z.number().nonnegative().optional(),
    monthlyPrice: z.number().nonnegative().optional(),
    discountPercentage: z.number().min(0).max(100).default(0),
    taxPercentage: z.number().min(0).max(100).default(0),
    securityDeposit: z.number().nonnegative(),
    isPublished: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (
      data.hourlyPrice == null &&
      data.dailyPrice == null &&
      data.weeklyPrice == null &&
      data.monthlyPrice == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'You must provide at least one price (Hourly, Daily, Monthly, or Weekly).',
        path: ['dailyPrice'],
      });
    }
  });

export type GetProductsSchemaType = z.infer<typeof getProductsSchema>;
export type CreateProductSchemaType = z.infer<typeof createProductSchema>;

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().min(1),
    brand: z.string().min(1),
    color: z.string().default('Generic'),
    categoryId: z.number().int(),
    imageUrl: z.string().url(),
    hourlyPrice: z.number().nonnegative().optional(),
    dailyPrice: z.number().nonnegative().optional(),
    weeklyPrice: z.number().nonnegative().optional(),
    monthlyPrice: z.number().nonnegative().optional(),
    discountPercentage: z.number().min(0).max(100).default(0),
    taxPercentage: z.number().min(0).max(100).default(0),
    securityDeposit: z.number().nonnegative(),
    isAvailable: z.boolean().default(true),
    isPublished: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (
      data.hourlyPrice == null &&
      data.dailyPrice == null &&
      data.weeklyPrice == null &&
      data.monthlyPrice == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'You must provide at least one price (Hourly, Daily, Monthly, or Weekly).',
        path: ['dailyPrice'],
      });
    }
  });

export type UpdateProductSchemaType = z.infer<typeof updateProductSchema>;
