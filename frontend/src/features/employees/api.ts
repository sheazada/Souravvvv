import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';

export type EmployeeRow = {
  id: string;
  employeeCode: string;
  fullName: string;
  designation?: string | null;
  mobile?: string | null;
  email?: string | null;
  drivingLicenseNo?: string | null;
  assignedRouteId?: string | null;
  isActive: boolean;
};

export const EmployeesApi = {
  list(query?: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    return apiClient<PaginatedApiSuccess<EmployeeRow>>(`/employees${buildQueryString(query)}`);
  },
  create(payload: Record<string, any>) {
    return apiClient<ApiSuccess<EmployeeRow>>('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: Record<string, any>) {
    return apiClient<ApiSuccess<EmployeeRow>>(`/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  updateStatus(id: string, isActive: boolean) {
    return apiClient<ApiSuccess<EmployeeRow>>(`/employees/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },
};
