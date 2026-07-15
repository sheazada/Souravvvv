export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  success: false;
  message: string;
  error?: {
    code?: string;
    details?: Array<{ field?: string; message: string }>;
  };
};

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedApiSuccess<T> = ApiSuccess<T[]> & {
  meta: PaginatedMeta;
};
