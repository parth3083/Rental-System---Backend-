import { db } from '../config/db.config.js';
import { logger } from '../config/logger.config.js';
import type { Category } from '../generated/prisma/client.js';

class CategoryService {
  async getCategories(): Promise<Category[]> {
    try {
      const categories = await db.category.findMany({
        orderBy: {
          name: 'asc',
        },
      });
      return categories;
    } catch (error) {
      logger.error('Get categories service error:', error);
      throw error;
    }
  }
}

export const categoryService = new CategoryService();
