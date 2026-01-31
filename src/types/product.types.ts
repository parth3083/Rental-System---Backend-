export enum DurationUnit {
  Hour = 'Hour',
  Day = 'Day',
  Month = 'Month',
  Year = 'Year',
}

export interface RentalDurationFilter {
  value: number;
  unit: DurationUnit;
}

export interface GetProductsRequest {
  // --- Basic Filters ---
  searchTerm?: string;
  pageNumber?: number; // Default 1
  pageSize?: number; // Default 10

  // --- Sidebar Filters ---
  brands?: string[] | undefined;
  colors?: string[] | undefined;
  categoryId?: number | undefined;

  // --- Price Range Slider ---
  minPrice?: number | undefined; // C# uses decimal, TS uses number
  maxPrice?: number | undefined;

  // --- The New Duration Logic ---
  duration?: RentalDurationFilter | undefined;
}

export interface ProductCardDto {
  id: number;
  name: string;
  brand: string;
  imageUrl: string;
  color: string;

  // --- Pricing Display ---
  priceLabel: string;
  originalPrice: number; // decimal in C#
  finalPrice: number;
  discountPercentage: number;

  // --- Availability ---
  isAvailable: boolean;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
