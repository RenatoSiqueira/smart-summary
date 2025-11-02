export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DateRange {
  startDate?: Date | string;
  endDate?: Date | string;
}

