import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  AreaWiseDemandRow,
  CreateDemandConsolidationPayload,
  DemandConsolidationDetail,
  DemandConsolidationItem,
  DemandConsolidationListFilters,
  DemandConsolidationListItem,
  DemandSourceOrder,
  RouteWiseDemandRow,
  UpdateDemandConsolidationItemPayload,
} from '@/types/demand-consolidations';

export const DemandConsolidationsApi = {
  list(filters?: DemandConsolidationListFilters) {
    return apiClient<PaginatedApiSuccess<DemandConsolidationListItem>>(
      `/demand-consolidations${buildQueryString(filters)}`,
    );
  },
  create(payload: CreateDemandConsolidationPayload) {
    return apiClient<ApiSuccess<DemandConsolidationDetail>>('/demand-consolidations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getById(id: string) {
    return apiClient<ApiSuccess<DemandConsolidationDetail>>(`/demand-consolidations/${id}`);
  },
  getItems(id: string) {
    return apiClient<ApiSuccess<DemandConsolidationItem[]>>(`/demand-consolidations/${id}/items`);
  },
  updateItem(id: string, itemId: string, payload: UpdateDemandConsolidationItemPayload) {
    return apiClient<ApiSuccess<DemandConsolidationItem>>(
      `/demand-consolidations/${id}/items/${itemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },
  rebuild(id: string) {
    return apiClient<ApiSuccess<DemandConsolidationDetail>>(`/demand-consolidations/${id}/rebuild`, {
      method: 'POST',
    });
  },
  approve(id: string) {
    return apiClient<ApiSuccess<DemandConsolidationDetail>>(`/demand-consolidations/${id}/approve`, {
      method: 'POST',
    });
  },
  getSourceOrders(id: string) {
    return apiClient<ApiSuccess<DemandSourceOrder[]>>(`/demand-consolidations/${id}/source-orders`);
  },
  getProductWiseSummary(id: string) {
    return apiClient<ApiSuccess<DemandConsolidationItem[]>>(
      `/demand-consolidations/${id}/summary/product-wise`,
    );
  },
  getRouteWiseSummary(id: string) {
    return apiClient<ApiSuccess<RouteWiseDemandRow[]>>(
      `/demand-consolidations/${id}/summary/route-wise`,
    );
  },
  getAreaWiseSummary(id: string) {
    return apiClient<ApiSuccess<AreaWiseDemandRow[]>>(
      `/demand-consolidations/${id}/summary/area-wise`,
    );
  },
  shareWhatsApp(id: string) {
    return apiClient<ApiSuccess<{ demandConsolidationId: string; messageText: string }>>(
      `/demand-consolidations/${id}/share/whatsapp`,
      {
        method: 'POST',
      },
    );
  },
};
