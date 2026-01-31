import { db } from '../config/db.config.js';
import { Prisma } from '../generated/prisma/client.js';
import type {
  GetProductsRequest,
  ProductCardDto,
  ProductDetailDto,
  PagedResult,
} from '../types/product.types.js';
import type {
  CreateProductSchemaType,
  UpdateProductSchemaType,
} from '../validations/product.validation.js';
import { DurationUnit } from '../types/product.types.js';
import { logger } from '../config/logger.config.js';

class ProductService {
  async getProducts(
    params: GetProductsRequest
  ): Promise<PagedResult<ProductCardDto>> {
    try {
      const {
        searchTerm,
        pageNumber = 1,
        pageSize = 10,
        brands,
        colors,
        categoryId,
        minPrice,
        maxPrice,
        duration,
      } = params;

      // 1. Calculate Duration Logic
      let durationMultiplier = 1;
      let durationLabel = 'Per Day';

      if (duration) {
        const { value, unit } = duration;
        // e.g. "Total for 2 Months"
        durationLabel = `Total for ${value} ${unit}${value > 1 ? 's' : ''}`;

        switch (unit) {
          case DurationUnit.Hour:
            durationMultiplier = value / 24;
            break;
          case DurationUnit.Day:
            durationMultiplier = value;
            break;
          case DurationUnit.Week:
            durationMultiplier = value * 7;
            break;
          case DurationUnit.Month:
            durationMultiplier = value * 30;
            break;
        }
      }

      // 2. Build Prisma Where Clause
      const where: Prisma.ProductWhereInput = {
        deletedAt: null,
        // Assuming we show available or all? User object has IsAvailable bool.
        // Usually list endpoints show all but verify availability.
        // Let's not filter by isAvailable unless implicitly required, or just show status.
        // However, we probably want published products only if that flag exists.
        isPublished: true,
      };

      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { brand: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      if (brands && brands.length > 0) {
        where.brand = { in: brands };
      }

      if (colors && colors.length > 0) {
        where.color = { in: colors };
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }

      // Price Filtering
      // MinPrice/MaxPrice in request usually means "User's Budget for the total duration"
      // So we filter: dailyPrice * multiplier >= minPrice
      // => dailyPrice >= minPrice / multiplier
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.dailyPrice = {};
        if (minPrice !== undefined) {
          where.dailyPrice.gte = minPrice / durationMultiplier;
        }
        if (maxPrice !== undefined) {
          where.dailyPrice.lte = maxPrice / durationMultiplier;
        }
      }

      // 3. Execute Query
      const [totalCount, products] = await Promise.all([
        db.product.count({ where }),
        db.product.findMany({
          where,
          skip: (pageNumber - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // 4. Map Results
      const items: ProductCardDto[] = products.map(p => {
        const dailyPrice = Number(p.dailyPrice);
        let originalPrice = dailyPrice * durationMultiplier;

        if (duration) {
          const { value, unit } = duration;
          if (unit === DurationUnit.Hour && p.hourlyPrice) {
            originalPrice = Number(p.hourlyPrice) * value;
          } else if (unit === DurationUnit.Week && p.weeklyPrice) {
            originalPrice = Number(p.weeklyPrice) * value;
          } else if (unit === DurationUnit.Month && p.monthlyPrice) {
            originalPrice = Number(p.monthlyPrice) * value;
          }
        }

        // Calculate discount
        // Final = Original - (Original * Discount / 100)
        const discountAmount = originalPrice * (p.discountPercentage / 100);
        const finalPrice = originalPrice - discountAmount;

        return {
          id: p.id,
          name: p.name,
          brand: p.brand,
          imageUrl: p.imageUrl,
          color: p.color,
          priceLabel: durationLabel,
          originalPrice,
          finalPrice,
          discountPercentage: p.discountPercentage,
          isAvailable: p.isAvailable,
        };
      });

      return {
        items,
        totalCount,
        pageNumber,
        pageSize,
      };
    } catch (error) {
      logger.error('Get products service error:', error);
      throw error;
    }
  }

  async getProductById(productId: string): Promise<ProductDetailDto> {
    try {
      const product = await db.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          vendor: true,
          stock: true,
        },
      });

      if (!product || product.isDeleted) {
        throw new Error('Product not found');
      }

      return {
        id: product.id,
        vendorId: product.vendorId,
        name: product.name,
        brand: product.brand,
        color: product.color,
        imageUrl: product.imageUrl,
        description: product.description,

        dailyPrice: Number(product.dailyPrice),
        hourlyPrice: product.hourlyPrice ? Number(product.hourlyPrice) : null,
        weeklyPrice: product.weeklyPrice ? Number(product.weeklyPrice) : null,
        monthlyPrice: product.monthlyPrice
          ? Number(product.monthlyPrice)
          : null,

        discountPercentage: product.discountPercentage,
        taxPercentage: Number(product.taxPercentage),
        securityDeposit: product.securityDeposit
          ? Number(product.securityDeposit)
          : null,

        isAvailable: product.isAvailable,
        isPublished: product.isPublished,
        categoryId: product.categoryId,

        createdAt: product.createdAt,
        updatedAt: product.updatedAt,

        category: {
          id: product.category.id,
          name: product.category.name,
        },

        vendor: {
          id: product.vendor.id,
          name: product.vendor.name,
          companyName: product.vendor.companyName,
        },

        stock: product.stock
          ? {
              totalPhysicalQuantity: product.stock.totalPhysicalQuantity,
            }
          : null,
      };
    } catch (error) {
      logger.error('Get product by id service error:', error);
      throw error;
    }
  }

  async createProduct(vendorId: string, data: CreateProductSchemaType) {
    try {
      // Logic to handle pricing: At least one price is guaranteed by validation.
      // Requirement: "Vendor can give values in one of the 4 prices so we need to handle that logic and enter values in db accordingly"
      // DB has `dailyPrice` as required.

      let dailyPrice = data.dailyPrice;

      // If dailyPrice is not provided, derive it for the DB requirement.
      if (dailyPrice === undefined || dailyPrice === null) {
        if (data.hourlyPrice != null) {
          dailyPrice = data.hourlyPrice * 24; // Assumption: 24h per day
        } else if (data.weeklyPrice != null) {
          dailyPrice = data.weeklyPrice / 7;
        } else if (data.monthlyPrice != null) {
          dailyPrice = data.monthlyPrice / 30; // Assumption: 30 days per month
        }
      }

      // Fallback (should be covered by validation)
      if (dailyPrice === undefined) {
        throw new Error('Daily price could not be determined.');
      }

      const product = await db.product.create({
        data: {
          vendorId,
          name: data.name,
          description: data.description,
          brand: data.brand,
          color: data.color,
          categoryId: data.categoryId,
          imageUrl: data.imageUrl,

          hourlyPrice: data.hourlyPrice ?? null,
          dailyPrice: dailyPrice,
          weeklyPrice: data.weeklyPrice ?? null,
          monthlyPrice: data.monthlyPrice ?? null,

          discountPercentage: data.discountPercentage,
          taxPercentage: data.taxPercentage,
          securityDeposit: data.securityDeposit,
          isPublished: data.isPublished,
        },
      });

      return product;
    } catch (error) {
      logger.error('Create product service error:', error);
      throw error;
    }
  }

  async updateProduct(
    productId: string,
    vendorId: string,
    data: UpdateProductSchemaType
  ): Promise<ProductCardDto> {
    try {
      const existingProduct = await db.product.findUnique({
        where: { id: productId },
      });

      if (!existingProduct) {
        throw new Error('Product not found');
      }

      if (existingProduct.vendorId !== vendorId) {
        throw new Error('You are not authorized to update this product');
      }

      let dailyPrice = data.dailyPrice;

      if (dailyPrice === undefined || dailyPrice === null) {
        if (data.hourlyPrice != null) {
          dailyPrice = data.hourlyPrice * 24;
        } else if (data.weeklyPrice != null) {
          dailyPrice = data.weeklyPrice / 7;
        } else if (data.monthlyPrice != null) {
          dailyPrice = data.monthlyPrice / 30;
        }
      }

      const updateData: Prisma.ProductUncheckedUpdateInput = {
        name: data.name,
        description: data.description,
        brand: data.brand,
        color: data.color,
        categoryId: data.categoryId,
        imageUrl: data.imageUrl,
        discountPercentage: data.discountPercentage,
        taxPercentage: data.taxPercentage,
        securityDeposit: data.securityDeposit,
        isAvailable: data.isAvailable,
        isPublished: data.isPublished,

        hourlyPrice: data.hourlyPrice ?? null,
        weeklyPrice: data.weeklyPrice ?? null,
        monthlyPrice: data.monthlyPrice ?? null,

        dailyPrice: dailyPrice!, // dailyPrice is guaranteed by validation or derivation logic
      };

      const updatedProduct = await db.product.update({
        where: { id: productId },
        data: updateData,
      });

      // Map to ProductCardDto (Default view: Per Day)
      const p = updatedProduct;
      const durationMultiplier = 1;
      const durationLabel = 'Per Day';

      const originalPrice = Number(p.dailyPrice);
      const discountAmount = originalPrice * (p.discountPercentage / 100);
      const finalPrice = originalPrice - discountAmount;

      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        imageUrl: p.imageUrl,
        color: p.color,
        priceLabel: durationLabel,
        originalPrice,
        finalPrice,
        discountPercentage: p.discountPercentage,
        isAvailable: p.isAvailable,
      };
    } catch (error) {
      logger.error('Update product service error:', error);
      throw error;
    }
  }

  async deleteProduct(productId: string, vendorId: string): Promise<void> {
    try {
      const existingProduct = await db.product.findUnique({
        where: { id: productId },
      });

      if (!existingProduct) {
        throw new Error('Product not found');
      }

      if (existingProduct.vendorId !== vendorId) {
        throw new Error('You are not authorized to delete this product');
      }

      await db.product.update({
        where: { id: productId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Delete product service error:', error);
      throw error;
    }
  }
}

export const productService = new ProductService();
