import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';

export type VehicleRow = {
  id: string;
  vehicleNo: string;
  vehicleType?: string | null;
  capacityCrates?: number | null;
  capacityWeightKg?: number | null;
  fuelType?: string | null;
  ownershipType?: string | null;
  isActive: boolean;
};

export const VehiclesApi = {
  list(query?: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    return apiClient<PaginatedApiSuccess<VehicleRow>>(`/vehicles${buildQueryString(query)}`);
  },
  create(payload: Record<string, any>) {
    return apiClient<ApiSuccess<VehicleRow>>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: Record<string, any>) {
    return apiClient<ApiSuccess<VehicleRow>>(`/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  updateStatus(id: string, isActive: boolean) {
    return apiClient<ApiSuccess<VehicleRow>>(`/vehicles/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },
};
