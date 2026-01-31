import { db } from '../config/db.config.js';
import { logger } from '../config/logger.config.js';
import {
  type GetProductsRequest,
  type PagedResult,
  type ProductCardDto,
  DurationUnit,
  type RentalDurationFilter,
} from '../types/product.types.js';
import { Prisma } from '../generated/prisma/client.js';

class ProductService {
  async getProducts(
    request: GetProductsRequest
  ): Promise<PagedResult<ProductCardDto>> {
    try {
      const {
        pageNumber = 1,
        pageSize = 10,
        searchTerm,
        brands,
        colors,
        categoryId,
        minPrice,
        maxPrice,
        duration,
      } = request;

      // Calculate skip/take for pagination
      const skip = (pageNumber - 1) * pageSize;
      const take = pageSize;

      // Construct Where Clause
      const where: Prisma.ProductWhereInput = {
        isAvailable: true, // Default to showing available
      };

      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { brand: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
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

      // Handle Price Filtering
      // We assume the filter applies to the effective cost the user sees.
      // If a duration is selected, we interpret Min/Max price as the total budget for that duration.
      // We need to convert this back to a 'Daily Price' to filter efficiently in the DB.
      // Note: This ignores discount variations in the filter query for simplicity.
      let effectiveMinDaily = minPrice;
      let effectiveMaxDaily = maxPrice;

      if (duration && (minPrice !== undefined || maxPrice !== undefined)) {
        const multiplier = this.getDurationMultiplier(
          duration.unit,
          duration.value
        );
        if (multiplier > 0) {
          if (effectiveMinDaily !== undefined)
            effectiveMinDaily = effectiveMinDaily / multiplier;
          if (effectiveMaxDaily !== undefined)
            effectiveMaxDaily = effectiveMaxDaily / multiplier;
        }
      }

      if (effectiveMinDaily !== undefined || effectiveMaxDaily !== undefined) {
        where.dailyPrice = {};
        if (effectiveMinDaily !== undefined)
          where.dailyPrice.gte = effectiveMinDaily;
        if (effectiveMaxDaily !== undefined)
          where.dailyPrice.lte = effectiveMaxDaily;
      }

      // Execute Queries (Count and Fetch)
      const [totalCount, products] = await Promise.all([
        db.product.count({ where }),
        db.product.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // Map to DTOs
      const items = products.map(p => this.mapToProductCard(p, duration));

      return {
        items,
        totalCount,
        pageNumber,
        pageSize,
      };
    } catch (error) {
      logger.error('Get products error:', error);
      throw error;
    }
  }

  private mapToProductCard(
    product: any,
    duration?: RentalDurationFilter
  ): ProductCardDto {
    const dailyPrice = Number(product.dailyPrice);
    let originalPrice = dailyPrice;
    let priceLabel = 'Per Day';

    if (duration) {
      const multiplier = this.getDurationMultiplier(
        duration.unit,
        duration.value
      );
      originalPrice = dailyPrice * multiplier;
      priceLabel = `Total for ${duration.value} ${duration.unit}${duration.value > 1 ? 's' : ''}`;

      // Special case wording for standard units if desired
      if (duration.value === 1) {
        if (duration.unit === DurationUnit.Day) priceLabel = 'Per Day';
        if (duration.unit === DurationUnit.Month) priceLabel = 'Per Month';
      }
    }

    const discountPercentage = product.discountPercentage || 0;
    const finalPrice = originalPrice * (1 - discountPercentage / 100);

    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      color: product.color,
      priceLabel,
      originalPrice: Number(originalPrice.toFixed(2)),
      finalPrice: Number(finalPrice.toFixed(2)),
      discountPercentage,
      isAvailable: product.isAvailable,
    };
  }

  private getDurationMultiplier(unit: DurationUnit, value: number): number {
    let base = 1; // Day
    switch (unit) {
      case DurationUnit.Hour:
        base = 1 / 24;
        break;
      case DurationUnit.Day:
        base = 1;
        break;
      case DurationUnit.Month:
        base = 30;
        break;
      case DurationUnit.Year:
        base = 365;
        break;
    }
    return base * value;
  }
}

export const productService = new ProductService();
