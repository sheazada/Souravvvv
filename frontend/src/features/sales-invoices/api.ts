import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  GenerateSalesInvoicePayload,
  SalesInvoiceDetail,
  SalesInvoiceFilters,
  SalesInvoiceListItem,
} from '@/types/sales-invoices';

export const SalesInvoicesApi = {
  list(filters?: SalesInvoiceFilters) {
    return apiClient<PaginatedApiSuccess<SalesInvoiceListItem>>(
      `/sales-invoices${buildQueryString(filters)}`,
    );
  },
  generate(payload: GenerateSalesInvoicePayload) {
    return apiClient<ApiSuccess<SalesInvoiceDetail>>('/sales-invoices/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  createAssisted(payload: GenerateSalesInvoicePayload) {
    return apiClient<ApiSuccess<SalesInvoiceDetail>>('/sales-invoices/assisted', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getById(id: string) {
    return apiClient<ApiSuccess<SalesInvoiceDetail>>(`/sales-invoices/${id}`);
  },
  post(id: string) {
    return apiClient<ApiSuccess<SalesInvoiceDetail>>(`/sales-invoices/${id}/post`, {
      method: 'POST',
    });
  },
  cancel(id: string) {
    return apiClient<ApiSuccess<SalesInvoiceDetail>>(`/sales-invoices/${id}/cancel`, {
      method: 'POST',
    });
  },
  shareWhatsApp(id: string) {
    return apiClient<ApiSuccess<{ salesInvoiceId: string; messageText: string }>>(
      `/sales-invoices/${id}/share/whatsapp`,
      { method: 'POST' },
    );
  },
};
