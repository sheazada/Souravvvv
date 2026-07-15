import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  CreatePaymentAllocationPayload,
  CreatePaymentReceiptPayload,
  OutstandingAgingRow,
  PaymentAllocationRow,
  PaymentReceiptDetail,
  PaymentReceiptFilters,
  PaymentReceiptListItem,
  RetailerOutstandingRow,
  SupplierOutstandingRow,
} from '@/types/payments';

export const PaymentsApi = {
  list(filters?: PaymentReceiptFilters) {
    return apiClient<PaginatedApiSuccess<PaymentReceiptListItem>>(
      `/payment-receipts${buildQueryString(filters)}`,
    );
  },
  create(payload: CreatePaymentReceiptPayload) {
    return apiClient<ApiSuccess<PaymentReceiptDetail>>('/payment-receipts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getById(id: string) {
    return apiClient<ApiSuccess<PaymentReceiptDetail>>(`/payment-receipts/${id}`);
  },
  confirm(id: string) {
    return apiClient<ApiSuccess<PaymentReceiptDetail>>(`/payment-receipts/${id}/confirm`, {
      method: 'POST',
    });
  },
  cancel(id: string) {
    return apiClient<ApiSuccess<PaymentReceiptDetail>>(`/payment-receipts/${id}/cancel`, {
      method: 'POST',
    });
  },
  getAllocations(id: string) {
    return apiClient<ApiSuccess<PaymentAllocationRow[]>>(`/payment-receipts/${id}/allocations`);
  },
  createAllocation(id: string, payload: CreatePaymentAllocationPayload) {
    return apiClient<ApiSuccess<PaymentAllocationRow>>(`/payment-receipts/${id}/allocations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getRetailerOutstanding() {
    return apiClient<ApiSuccess<RetailerOutstandingRow[]>>('/outstanding/retailers');
  },
  getSupplierOutstanding() {
    return apiClient<ApiSuccess<SupplierOutstandingRow[]>>('/outstanding/suppliers');
  },
  getOutstandingAging() {
    return apiClient<ApiSuccess<OutstandingAgingRow[]>>('/outstanding/aging');
  },
};
