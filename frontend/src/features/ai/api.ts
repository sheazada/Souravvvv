import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';

export type ForecastRunRow = {
  id: string;
  runNo: string;
  forecastName: string;
  forecastPeriodStart: string;
  forecastPeriodEnd: string;
  status: string;
  createdAt: string;
  items?: Array<{
    id: string;
    variantId: string;
    projectedDemandQty: number;
    currentStockQty: number;
    suggestedProcurementQty: number;
    confidenceScore: number;
    variant?: any;
  }>;
};

export const AiApi = {
  parsePurchaseInvoiceOcr(rawTextOrImageUrl: string, supplierId?: string) {
    return apiClient<ApiSuccess<any>>('/ai/ocr/purchase-invoice', {
      method: 'POST',
      body: JSON.stringify({ rawTextOrImageUrl, supplierId }),
    });
  },
  parseVoiceOrder(transcript: string, retailerId?: string) {
    return apiClient<ApiSuccess<any>>('/ai/voice-order', {
      method: 'POST',
      body: JSON.stringify({ transcript, retailerId }),
    });
  },
  queryAssistant(queryText: string) {
    return apiClient<ApiSuccess<any>>('/ai/assistant/query', {
      method: 'POST',
      body: JSON.stringify({ queryText }),
    });
  },
  listForecastRuns(query?: { page?: number; limit?: number }) {
    return apiClient<PaginatedApiSuccess<ForecastRunRow>>(`/forecast-runs${buildQueryString(query)}`);
  },
  createForecastRun(payload: { forecastName: string; forecastDays?: number; growthFactorPercentage?: number }) {
    return apiClient<ApiSuccess<ForecastRunRow>>('/forecast-runs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getForecastRunById(id: string) {
    return apiClient<ApiSuccess<ForecastRunRow>>(`/forecast-runs/${id}`);
  },
};
