export interface GetUsersRequest {
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface UserCardDto {
  id: string;
  name: string;
  email: string;
  role: string;
  fullAddress?: string; // composite of address, city, pincode?
  createdAt: Date;
  // Add other fields as needed for the list view
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
