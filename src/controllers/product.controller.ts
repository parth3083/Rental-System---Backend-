import { type Request, type Response } from 'express';
import { productService } from '../services/product.service.js';
import {
  type GetProductsRequest,
  DurationUnit,
} from '../types/product.types.js';
import { logger } from '../config/logger.config.js';

export const getProducts = async (req: Request, res: Response) => {
  try {
    // Extract and transform query params to match GetProductsRequest interface
    // Note: req.query values are strings or arrays of strings.
    const query = req.query;

    const request: GetProductsRequest = {
      searchTerm: query.searchTerm as string,
      pageNumber: query.pageNumber ? Number(query.pageNumber) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 10,

      brands: query.brands
        ? Array.isArray(query.brands)
          ? (query.brands as string[])
          : [query.brands as string]
        : undefined,
      colors: query.colors
        ? Array.isArray(query.colors)
          ? (query.colors as string[])
          : [query.colors as string]
        : undefined,
      categoryId: query.categoryId ? Number(query.categoryId) : undefined,

      minPrice: query.minPrice ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
    };

    // Handle Duration object reconstruction from query params
    // Expecting duration[value] and duration[unit] from extended query parser
    // or flat params durationValue, durationUnit
    if (query['duration[value]'] && query['duration[unit]']) {
      request.duration = {
        value: Number(query['duration[value]']),
        unit: query['duration[unit]'] as DurationUnit,
      };
    } else if (query.durationValue && query.durationUnit) {
      // Fallback for flat params
      request.duration = {
        value: Number(query.durationValue),
        unit: query.durationUnit as DurationUnit,
      };
    }

    const result = await productService.getProducts(request);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Error in getProducts controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
