import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  CreateGoodsReceiptPayload,
  GoodsReceiptComparison,
  GoodsReceiptDetail,
  GoodsReceiptListFilters,
  GoodsReceiptListItem,
} from '@/types/goods-receipts';

export const GoodsReceiptsApi = {
  list(filters?: GoodsReceiptListFilters) {
    return apiClient<PaginatedApiSuccess<GoodsReceiptListItem>>(
      `/goods-receipts${buildQueryString(filters)}`,
    );
  },
  create(payload: CreateGoodsReceiptPayload) {
    return apiClient<ApiSuccess<GoodsReceiptDetail>>('/goods-receipts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getById(id: string) {
    return apiClient<ApiSuccess<GoodsReceiptDetail>>(`/goods-receipts/${id}`);
  },
  approve(id: string) {
    return apiClient<ApiSuccess<GoodsReceiptDetail>>(`/goods-receipts/${id}/approve`, {
      method: 'POST',
    });
  },
  post(id: string) {
    return apiClient<ApiSuccess<GoodsReceiptDetail>>(`/goods-receipts/${id}/post`, {
      method: 'POST',
    });
  },
  getComparison(id: string) {
    return apiClient<ApiSuccess<GoodsReceiptComparison>>(`/goods-receipts/${id}/comparison`);
  },
};
