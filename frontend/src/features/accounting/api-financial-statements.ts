import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess } from '@/types/api';

export const FinancialStatementsApi = {
  getTrialBalance(query?: { fromDate?: string; toDate?: string }) {
    return apiClient<ApiSuccess<any>>(`/finance/trial-balance${buildQueryString(query)}`);
  },
  getProfitLoss(query?: { fromDate?: string; toDate?: string }) {
    return apiClient<ApiSuccess<any>>(`/finance/profit-loss${buildQueryString(query)}`);
  },
  getBalanceSheet(query?: { asOfDate?: string }) {
    return apiClient<ApiSuccess<any>>(`/finance/balance-sheet${buildQueryString(query)}`);
  },
  getGstSummary(query?: { fromDate?: string; toDate?: string }) {
    return apiClient<ApiSuccess<any>>(`/finance/gst-summary${buildQueryString(query)}`);
  },
};
