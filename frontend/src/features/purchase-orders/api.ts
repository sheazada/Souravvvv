import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  CreatePurchaseOrderFromDemandPayload,
  CreatePurchaseOrderPayload,
  PurchaseInvoiceDetail,
  PurchaseInvoiceListItem,
  PurchaseOrderDetail,
  PurchaseOrderItem,
  PurchaseOrderListFilters,
  PurchaseOrderListItem,
  SupplierReturnDetail,
  SupplierReturnListItem,
  UpdatePurchaseOrderDemandExtrasPayload,
} from '@/types/purchase-orders';

export const PurchaseOrdersApi = {
  list(filters?: PurchaseOrderListFilters) {
    return apiClient<PaginatedApiSuccess<PurchaseOrderListItem>>(
      `/purchase-orders${buildQueryString(filters)}`,
    );
  },
  create(payload: CreatePurchaseOrderPayload) {
    return apiClient<ApiSuccess<PurchaseOrderDetail>>('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  createFromDemand(payload: CreatePurchaseOrderFromDemandPayload) {
    return apiClient<ApiSuccess<PurchaseOrderDetail>>(
      '/purchase-orders/from-demand-consolidation',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
  getById(id: string) {
    return apiClient<ApiSuccess<PurchaseOrderDetail>>(`/purchase-orders/${id}`);
  },
  getItems(id: string) {
    return apiClient<ApiSuccess<PurchaseOrderItem[]>>(`/purchase-orders/${id}/items`);
  },
  updateDemandExtras(id: string, payload: UpdatePurchaseOrderDemandExtrasPayload) {
    return apiClient<ApiSuccess<PurchaseOrderDetail>>(`/purchase-orders/${id}/demand-extras`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  approve(id: string) {
    return apiClient<ApiSuccess<PurchaseOrderDetail>>(`/purchase-orders/${id}/approve`, {
      method: 'POST',
    });
  },
  cancel(id: string) {
    return apiClient<ApiSuccess<PurchaseOrderDetail>>(`/purchase-orders/${id}/cancel`, {
      method: 'POST',
    });
  },
};

export const PurchaseInvoicesApi = {
  list(params?: Record<string, any>) {
    return apiClient<PaginatedApiSuccess<PurchaseInvoiceListItem>>(
      `/purchase-invoices${buildQueryString(params)}`,
    );
  },
  getById(id: string) {
    return apiClient<ApiSuccess<PurchaseInvoiceDetail>>(`/purchase-invoices/${id}`);
  },
  create(payload: Record<string, any>) {
    return apiClient<ApiSuccess<PurchaseInvoiceDetail>>('/purchase-invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  approve(id: string) {
    return apiClient<ApiSuccess<PurchaseInvoiceDetail>>(`/purchase-invoices/${id}/approve`, {
      method: 'POST',
    });
  },
  post(id: string) {
    return apiClient<ApiSuccess<PurchaseInvoiceDetail>>(`/purchase-invoices/${id}/post`, {
      method: 'POST',
    });
  },
};

export const SupplierReturnsApi = {
  list(params?: Record<string, any>) {
    return apiClient<PaginatedApiSuccess<SupplierReturnListItem>>(
      `/supplier-returns${buildQueryString(params)}`,
    );
  },
  getById(id: string) {
    return apiClient<ApiSuccess<SupplierReturnDetail>>(`/supplier-returns/${id}`);
  },
  create(payload: Record<string, any>) {
    return apiClient<ApiSuccess<SupplierReturnDetail>>('/supplier-returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  approve(id: string) {
    return apiClient<ApiSuccess<SupplierReturnDetail>>(`/supplier-returns/${id}/approve`, {
      method: 'POST',
    });
  },
  post(id: string) {
    return apiClient<ApiSuccess<SupplierReturnDetail>>(`/supplier-returns/${id}/post`, {
      method: 'POST',
    });
  },
};
