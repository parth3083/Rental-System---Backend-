export type DurationUnit = 'Hour' | 'Day' | 'Week' | 'Month';

export const DurationUnit = {
  Hour: 'Hour',
  Day: 'Day',
  Week: 'Week',
  Month: 'Month',
} as const;

export interface RentalDurationFilter {
  value: number;
  unit: DurationUnit;
}

export interface GetProductsRequest {
  searchTerm?: string | undefined;
  pageNumber?: number | undefined; // default 1
  pageSize?: number | undefined; // default 10

  brands?: string[] | undefined;
  colors?: string[] | undefined;
  categoryId?: number | undefined;

  minPrice?: number | undefined;
  maxPrice?: number | undefined;

  duration?: RentalDurationFilter | undefined;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  brand: string;
  color: string;
  categoryId: number;
  imageUrl: string;
  hourlyPrice?: number;
  dailyPrice?: number;
  weeklyPrice?: number;
  monthlyPrice?: number;
  discountPercentage: number;
  taxPercentage?: number;
  securityDeposit: number;
  isPublished: boolean;
}

export interface ProductCardDto {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  color: string;

  priceLabel: string;
  originalPrice: number;
  finalPrice: number;
  discountPercentage: number;

  isAvailable: boolean;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
