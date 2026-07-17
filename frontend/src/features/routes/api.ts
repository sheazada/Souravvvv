import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';

export type RouteRow = {
  id: string;
  code: string;
  name: string;
  areaId?: string | null;
  deliveryShift?: string | null;
  defaultCutoffTime?: string | null;
  isActive: boolean;
};

export type AreaRow = {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  state?: string | null;
  isActive: boolean;
};

export const RoutesApi = {
  list(query?: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    return apiClient<PaginatedApiSuccess<RouteRow>>(`/routes${buildQueryString(query)}`);
  },
  create(payload: Record<string, any>) {
    return apiClient<ApiSuccess<RouteRow>>('/routes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: Record<string, any>) {
    return apiClient<ApiSuccess<RouteRow>>(`/routes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  listAreas(query?: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    return apiClient<PaginatedApiSuccess<AreaRow>>(`/areas${buildQueryString(query)}`);
  },
  createArea(payload: Record<string, any>) {
    return apiClient<ApiSuccess<AreaRow>>('/areas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
