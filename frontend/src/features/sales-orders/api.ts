import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  AssistedSalesOrderPayload,
  SalesOrderDetail,
  SalesOrderListFilters,
  SalesOrderListItem,
} from '@/types/sales-orders';

export const SalesOrdersApi = {
  list(filters?: SalesOrderListFilters) {
    return apiClient<PaginatedApiSuccess<SalesOrderListItem>>(
      `/sales-orders${buildQueryString(filters)}`,
    );
  },
  getById(id: string) {
    return apiClient<ApiSuccess<SalesOrderDetail>>(`/sales-orders/${id}`);
  },
  createAssisted(payload: AssistedSalesOrderPayload) {
    return apiClient<ApiSuccess<SalesOrderListItem>>('/sales-orders/assisted', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  approve(id: string, note?: string) {
    return apiClient<ApiSuccess<SalesOrderListItem>>(`/sales-orders/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },
  cancel(id: string, reason?: string) {
    return apiClient<ApiSuccess<{ id: string }>>(`/sales-orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
