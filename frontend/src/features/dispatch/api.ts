import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  AssignDispatchResourcesPayload,
  DispatchStopSummary,
  DispatchTripDetail,
  DispatchTripFilters,
  DispatchTripItem,
  DispatchTripListItem,
  GenerateDispatchTripPayload,
} from '@/types/dispatch';

export const DispatchApi = {
  list(filters?: DispatchTripFilters) {
    return apiClient<PaginatedApiSuccess<DispatchTripListItem>>(
      `/dispatch-trips${buildQueryString(filters)}`,
    );
  },
  generate(payload: GenerateDispatchTripPayload) {
    return apiClient<ApiSuccess<DispatchTripDetail>>('/dispatch-trips/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getById(id: string) {
    return apiClient<ApiSuccess<DispatchTripDetail>>(`/dispatch-trips/${id}`);
  },
  assignResources(id: string, payload: AssignDispatchResourcesPayload) {
    return apiClient<ApiSuccess<DispatchTripDetail>>(`/dispatch-trips/${id}/assign-resources`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  start(id: string) {
    return apiClient<ApiSuccess<DispatchTripDetail>>(`/dispatch-trips/${id}/start`, {
      method: 'POST',
    });
  },
  complete(id: string) {
    return apiClient<ApiSuccess<DispatchTripDetail>>(`/dispatch-trips/${id}/complete`, {
      method: 'POST',
    });
  },
  getStops(id: string) {
    return apiClient<ApiSuccess<DispatchStopSummary[]>>(`/dispatch-trips/${id}/stops`);
  },
  getLoadingSheet(id: string) {
    return apiClient<
      ApiSuccess<{
        tripId: string;
        tripNo: string;
        loadingSheetNo?: string | null;
        status: string;
        items: DispatchTripItem[];
      }>
    >(`/dispatch-trips/${id}/loading-sheet`);
  },
  generateLoadingSheet(id: string) {
    return apiClient<ApiSuccess<{ tripId: string; tripNo: string; loadingSheetNo?: string | null; status: string; items: DispatchTripItem[] }>>(
      `/dispatch-trips/${id}/loading-sheet/generate`,
      { method: 'POST' },
    );
  },
  generateChallan(id: string) {
    return apiClient<ApiSuccess<{ challan: NonNullable<DispatchTripDetail['challan']>; trip: DispatchTripDetail }>>(
      `/dispatch-trips/${id}/challan/generate`,
      { method: 'POST' },
    );
  },
  getChallan(id: string) {
    return apiClient<ApiSuccess<{ challan: NonNullable<DispatchTripDetail['challan']>; trip: DispatchTripDetail }>>(
      `/dispatch-trips/${id}/challan`,
    );
  },
};
