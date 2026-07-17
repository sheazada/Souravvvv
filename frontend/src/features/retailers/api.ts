import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  RetailerDetail,
  RetailerInvoiceRow,
  RetailerLedgerSummary,
  RetailerLedgerTransaction,
  RetailerListFilters,
  RetailerListItem,
  RetailerOrderRow,
  RetailerOutstandingData,
  RetailerPaymentRow,
} from '@/types/retailers';

export type UpdateOrderingModePayload = {
  orderingMode: 'self_service' | 'assisted' | 'hybrid';
  isOrderingEnabled: boolean;
  isBillingEnabled: boolean;
};

export const RetailersApi = {
  list(filters?: RetailerListFilters) {
    return apiClient<PaginatedApiSuccess<RetailerListItem>>(
      `/retailers${buildQueryString(filters)}`,
    );
  },
  getById(id: string) {
    return apiClient<ApiSuccess<RetailerDetail>>(`/retailers/${id}`);
  },
  create(payload: Record<string, any>) {
    return apiClient<ApiSuccess<RetailerDetail>>('/retailers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: Record<string, any>) {
    return apiClient<ApiSuccess<RetailerDetail>>(`/retailers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  updateStatus(id: string, payload: { businessStatus: string; reason?: string }) {
    return apiClient<ApiSuccess<RetailerDetail>>(`/retailers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  getOutstanding(id: string) {
    return apiClient<ApiSuccess<RetailerOutstandingData>>(`/retailers/${id}/outstanding`);
  },
  getOrders(id: string) {
    return apiClient<ApiSuccess<RetailerOrderRow[]>>(`/retailers/${id}/orders`);
  },
  getInvoices(id: string) {
    return apiClient<ApiSuccess<RetailerInvoiceRow[]>>(`/retailers/${id}/invoices`);
  },
  getPayments(id: string) {
    return apiClient<ApiSuccess<RetailerPaymentRow[]>>(`/retailers/${id}/payments`);
  },
  getReturns(id: string) {
    return apiClient<ApiSuccess<any[]>>(`/retailers/${id}/returns`);
  },
  getCrates(id: string) {
    return apiClient<ApiSuccess<any[]>>(`/retailers/${id}/crates`);
  },
  getLedgerSummary(id: string) {
    return apiClient<ApiSuccess<RetailerLedgerSummary>>(`/retailers/${id}/ledger-summary`);
  },
  getLedgerTransactions(id: string) {
    return apiClient<ApiSuccess<RetailerLedgerTransaction[]>>(`/retailers/${id}/ledger-transactions`);
  },
  updateOrderingMode(id: string, payload: UpdateOrderingModePayload) {
    return apiClient(`/retailers/${id}/ordering-mode`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
