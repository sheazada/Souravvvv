import { apiClient } from '@/lib/api/client';
import type { ApiSuccess } from '@/types/api';
import type {
  DeliveryCollectionPayload,
  DeliveryCratePayload,
  DeliveryProofPayload,
  DeliveryStopDetail,
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
};
