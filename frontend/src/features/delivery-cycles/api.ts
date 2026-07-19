import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';

export type DeliveryCycleRow = {
  id: string;
  cycleCode: string;
  orderDate: string;
  deliveryDate: string;
  deliveryShift: string;
  cutoffAt: string;
  status: string;
};

export const DeliveryCyclesApi = {
  list(query?: { page?: number; limit?: number; search?: string; status?: string }) {
    return apiClient<PaginatedApiSuccess<DeliveryCycleRow>>(`/delivery-cycles${buildQueryString(query)}`);
  },
  create(payload: Record<string, any>) {
    return apiClient<ApiSuccess<DeliveryCycleRow>>('/delivery-cycles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: Record<string, any>) {
    return apiClient<ApiSuccess<DeliveryCycleRow>>(`/delivery-cycles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  getCutoffRules() {
    return apiClient<ApiSuccess<any>>('/cutoff-rules');
  },
  updateCutoffRules(payload: Record<string, any>) {
    return apiClient<ApiSuccess<any>>('/cutoff-rules', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  resolveActiveCycles() {
    return apiClient<ApiSuccess<any>>('/delivery-cycles/resolve', {
      method: 'POST',
    });
  },
};
