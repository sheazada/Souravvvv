import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess } from '@/types/api';
import type {
  CollectionReportData,
  DailyDispatchReportRow,
  DailyPurchaseReportRow,
  MonthlyBusinessSummaryRow,
  OutstandingReportData,
  ProductWiseSalesReportRow,
  ReportFilters,
} from '@/types/reports';

export const ReportsApi = {
  getDailyPurchase(filters?: ReportFilters) {
    return apiClient<ApiSuccess<DailyPurchaseReportRow[]>>(
      `/reports/daily-purchase${buildQueryString(filters)}`,
    );
  },
  getDailyDispatch(filters?: ReportFilters) {
    return apiClient<ApiSuccess<DailyDispatchReportRow[]>>(
      `/reports/daily-dispatch${buildQueryString(filters)}`,
    );
  },
  getProductWiseSales(filters?: ReportFilters) {
    return apiClient<ApiSuccess<ProductWiseSalesReportRow[]>>(
      `/reports/product-wise-sales${buildQueryString(filters)}`,
    );
  },
  getCollection(filters?: ReportFilters) {
    return apiClient<ApiSuccess<CollectionReportData>>(
      `/reports/collection${buildQueryString(filters)}`,
    );
  },
  getOutstanding(filters?: ReportFilters) {
    return apiClient<ApiSuccess<OutstandingReportData>>(
      `/reports/outstanding${buildQueryString(filters)}`,
    );
  },
  getMonthlyBusinessSummary(filters?: ReportFilters) {
    return apiClient<ApiSuccess<MonthlyBusinessSummaryRow[]>>(
      `/reports/monthly-business-summary${buildQueryString(filters)}`,
    );
  },
};
