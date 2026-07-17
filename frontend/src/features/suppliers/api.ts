import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';

export type SupplierRow = {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson?: string | null;
  mobile?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  paymentTermsDays?: number | null;
  isActive: boolean;
};

export const SuppliersApi = {
  list(query?: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    return apiClient<PaginatedApiSuccess<SupplierRow>>(`/suppliers${buildQueryString(query)}`);
  },
  create(payload: Record<string, any>) {
    return apiClient<ApiSuccess<SupplierRow>>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: Record<string, any>) {
    return apiClient<ApiSuccess<SupplierRow>>(`/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  getLedgerSummary(id: string) {
    return apiClient<ApiSuccess<any>>(`/suppliers/${id}/ledger-summary`);
  },
};
