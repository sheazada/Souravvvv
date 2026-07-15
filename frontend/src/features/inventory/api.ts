import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  CreateStockAdjustmentPayload,
  InventoryBatchFilters,
  InventoryBatchRow,
  InventoryStockFilters,
  StockAdjustmentDetail,
  StockAdjustmentFilters,
  StockAdjustmentListItem,
  StockMovementFilters,
  StockMovementRow,
  StockOnHandRow,
} from '@/types/inventory';

export const InventoryApi = {
  getStockOnHand(filters?: InventoryStockFilters) {
    return apiClient<ApiSuccess<StockOnHandRow[]>>(
      `/inventory/stock-on-hand${buildQueryString(filters)}`,
    );
  },
  getBatches(filters?: InventoryBatchFilters) {
    return apiClient<PaginatedApiSuccess<InventoryBatchRow>>(
      `/inventory/batches${buildQueryString(filters)}`,
    );
  },
  getBatch(id: string) {
    return apiClient<ApiSuccess<InventoryBatchRow>>(`/inventory/batches/${id}`);
  },
  getMovements(filters?: StockMovementFilters) {
    return apiClient<PaginatedApiSuccess<StockMovementRow>>(
      `/inventory/stock-movements${buildQueryString(filters)}`,
    );
  },
  getMovement(id: string) {
    return apiClient<ApiSuccess<StockMovementRow>>(`/inventory/stock-movements/${id}`);
  },
  getAdjustments(filters?: StockAdjustmentFilters) {
    return apiClient<PaginatedApiSuccess<StockAdjustmentListItem>>(
      `/stock-adjustments${buildQueryString(filters)}`,
    );
  },
  createAdjustment(payload: CreateStockAdjustmentPayload) {
    return apiClient<ApiSuccess<StockAdjustmentDetail>>('/stock-adjustments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getAdjustment(id: string) {
    return apiClient<ApiSuccess<StockAdjustmentDetail>>(`/stock-adjustments/${id}`);
  },
  approveAdjustment(id: string) {
    return apiClient<ApiSuccess<StockAdjustmentDetail>>(`/stock-adjustments/${id}/approve`, {
      method: 'POST',
    });
  },
  postAdjustment(id: string) {
    return apiClient<ApiSuccess<StockAdjustmentDetail>>(`/stock-adjustments/${id}/post`, {
      method: 'POST',
    });
  },
  getLowStockAlerts() {
    return apiClient<ApiSuccess<StockOnHandRow[]>>('/inventory/alerts/low-stock');
  },
  getExpiringProductAlerts() {
    return apiClient<ApiSuccess<InventoryBatchRow[]>>('/inventory/alerts/expiring-products');
  },
};
