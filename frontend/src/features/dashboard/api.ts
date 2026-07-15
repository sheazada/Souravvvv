import { apiClient, buildQueryString } from '@/lib/api/client';
import type {
  DashboardSummary,
  DeliveryPerformance,
  MonthlySalesPoint,
  StaffPerformanceRow,
  TopProductRow,
  TopRetailerRow,
} from '@/types/dashboard';
import type { ApiSuccess } from '@/types/api';

export type DashboardFilters = {
  date?: string;
  fromDate?: string;
  toDate?: string;
  routeId?: string;
};

export const DashboardApi = {
  getSummary(filters?: DashboardFilters) {
    return apiClient<ApiSuccess<DashboardSummary>>(
      `/dashboard/summary${buildQueryString(filters)}`,
    );
  },
  getMonthlySales(filters?: DashboardFilters) {
    return apiClient<ApiSuccess<MonthlySalesPoint[]>>(
      `/dashboard/charts/monthly-sales${buildQueryString(filters)}`,
    );
  },
  getTopProducts(filters?: DashboardFilters) {
    return apiClient<ApiSuccess<TopProductRow[]>>(
      `/dashboard/charts/top-products${buildQueryString(filters)}`,
    );
  },
  getTopRetailers(filters?: DashboardFilters) {
    return apiClient<ApiSuccess<TopRetailerRow[]>>(
      `/dashboard/charts/top-retailers${buildQueryString(filters)}`,
    );
  },
  getDeliveryPerformance(filters?: DashboardFilters) {
    return apiClient<ApiSuccess<DeliveryPerformance>>(
      `/dashboard/charts/delivery-performance${buildQueryString(filters)}`,
    );
  },
  getStaffPerformance(filters?: DashboardFilters) {
    return apiClient<ApiSuccess<StaffPerformanceRow[]>>(
      `/dashboard/charts/staff-performance${buildQueryString(filters)}`,
    );
  },
};
