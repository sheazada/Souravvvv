import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';

export type SalesReturnRow = {
  id: string;
  returnNo: string;
  retailerId: string;
  salesInvoiceId?: string | null;
  returnType: string;
  returnDate: string;
  source: string;
  status: string;
  remarks?: string | null;
  items: Array<{
    id: string;
    variantId: string;
    returnQty: number;
    reason?: string | null;
    disposition?: string | null;
    creditAmount: number;
  }>;
};

export type ClaimRow = {
  id: string;
  claimNo: string;
  partyType: string;
  partyId?: string | null;
  claimType: string;
  claimAmount: number;
  status: string;
  resolutionNotes?: string | null;
  createdAt: string;
};

export const ReturnsApi = {
  listSalesReturns(query?: { page?: number; limit?: number; search?: string; status?: string; returnType?: string }) {
    return apiClient<PaginatedApiSuccess<SalesReturnRow>>(`/sales-returns${buildQueryString(query)}`);
  },
  createSalesReturn(payload: Record<string, any>) {
    return apiClient<ApiSuccess<SalesReturnRow>>('/sales-returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  approveSalesReturn(id: string) {
    return apiClient<ApiSuccess<SalesReturnRow>>(`/sales-returns/${id}/approve`, {
      method: 'POST',
    });
  },
  rejectSalesReturn(id: string, remarks?: string) {
    return apiClient<ApiSuccess<SalesReturnRow>>(`/sales-returns/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  },
  listClaims(query?: { page?: number; limit?: number; search?: string; status?: string; partyType?: string }) {
    return apiClient<PaginatedApiSuccess<ClaimRow>>(`/claims${buildQueryString(query)}`);
  },
  createClaim(payload: Record<string, any>) {
    return apiClient<ApiSuccess<ClaimRow>>('/claims', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  approveClaim(id: string, resolutionNotes?: string) {
    return apiClient<ApiSuccess<ClaimRow>>(`/claims/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNotes }),
    });
  },
};
