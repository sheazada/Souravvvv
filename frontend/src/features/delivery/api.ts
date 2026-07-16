import { apiClient } from '@/lib/api/client';
import type { ApiSuccess } from '@/types/api';
import type {
  DeliveryCollectionPayload,
  DeliveryCratePayload,
  DeliveryProofPayload,
  DeliveryStopDetail,
  DriverCollectionSummary,
  DriverTripSummary,
  UpdateDeliveryStopPayload,
} from '@/types/delivery';

export const DeliveryApi = {
  getStop(id: string) {
    return apiClient<ApiSuccess<DeliveryStopDetail>>(`/delivery-stops/${id}`);
  },
  updateStatus(id: string, payload: UpdateDeliveryStopPayload) {
    return apiClient<ApiSuccess<DeliveryStopDetail>>(`/delivery-stops/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  addCollection(id: string, payload: DeliveryCollectionPayload) {
    return apiClient(`/delivery-stops/${id}/collections`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  addCrateTransaction(id: string, payload: DeliveryCratePayload) {
    return apiClient(`/delivery-stops/${id}/crates`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  addProofOfDelivery(id: string, payload: DeliveryProofPayload) {
    return apiClient<ApiSuccess<DeliveryStopDetail>>(`/delivery-stops/${id}/proof-of-delivery`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getMyTripsToday() {
    return apiClient<ApiSuccess<DriverTripSummary[]>>('/my/trips/today');
  },
  getMyTrip(id: string) {
    return apiClient<ApiSuccess<DriverTripSummary>>(`/my/trips/${id}`);
  },
  getMyTripStops(id: string) {
    return apiClient<ApiSuccess<DeliveryStopDetail[]>>(`/my/trips/${id}/stops`);
  },
  updateMyStopStatus(id: string, payload: UpdateDeliveryStopPayload) {
    return apiClient<ApiSuccess<DeliveryStopDetail>>(`/my/delivery-stops/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  addMyCollection(id: string, payload: DeliveryCollectionPayload) {
    return apiClient(`/my/delivery-stops/${id}/collections`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  addMyCrateTransaction(id: string, payload: DeliveryCratePayload) {
    return apiClient(`/my/delivery-stops/${id}/crates`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  addMyProofOfDelivery(id: string, payload: DeliveryProofPayload) {
    return apiClient<ApiSuccess<DeliveryStopDetail>>(`/my/delivery-stops/${id}/proof-of-delivery`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getMyCollectionSummary() {
    return apiClient<ApiSuccess<DriverCollectionSummary>>('/my/collection-summary');
  },
};
