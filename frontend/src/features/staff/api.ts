import { apiClient } from '@/lib/api/client';
import { executeOrQueue } from '@/lib/offline/queue';
import type { ApiSuccess } from '@/types/api';
import type { DeliveryCollectionPayload, DeliveryCratePayload, DeliveryProofPayload, DeliveryStopDetail, UpdateDeliveryStopPayload } from '@/types/delivery';
import type { DispatchStopSummary, DispatchTripListItem } from '@/types/dispatch';

export type DriverDashboardData = {
  tripCount: number;
  completedTrips: number;
  pendingStops: number;
  deliveredStops: number;
  partialStops: number;
  failedStops: number;
  collectionAmount: number;
  collectionCount: number;
  trips: Array<{
    id: string;
    tripNo: string;
    status: string;
    dispatchDate: string;
  }>;
};

export type StaffCollectionSummary = {
  totalCount: number;
  totalAmount: number;
  payments: Array<{
    id: string;
    receiptNo: string;
    paymentDate: string;
    amount: number | string;
    paymentMode: string;
    status: string;
    referenceNo?: string | null;
  }>;
};

export const StaffApi = {
  getDashboard() {
    return apiClient<ApiSuccess<DriverDashboardData>>('/dashboard/driver');
  },
  getTodayTrips() {
    return apiClient<ApiSuccess<DispatchTripListItem[]>>('/my/trips/today');
  },
  getTrip(id: string) {
    return apiClient<ApiSuccess<DispatchTripListItem>>(`/my/trips/${id}`);
  },
  getTripStops(id: string) {
    return apiClient<ApiSuccess<DispatchStopSummary[]>>(`/my/trips/${id}/stops`);
  },
  getStop(id: string) {
    return apiClient<ApiSuccess<DeliveryStopDetail>>(`/delivery-stops/${id}`);
  },
  async updateStopStatus(id: string, payload: UpdateDeliveryStopPayload) {
    const result = await executeOrQueue<ApiSuccess<DeliveryStopDetail>>({
      path: `/my/delivery-stops/${id}/status`,
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
      label: `Delivery stop ${id} status update`,
    });

    return result.queued
      ? ({
          success: true,
          message: 'Offline: delivery stop update queued for sync',
          data: null,
        } as ApiSuccess<null>)
      : (result.data as ApiSuccess<DeliveryStopDetail>);
  },
  async addCollection(id: string, payload: DeliveryCollectionPayload) {
    const result = await executeOrQueue<ApiSuccess<unknown>>({
      path: `/my/delivery-stops/${id}/collections`,
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
      label: `Collection for stop ${id}`,
    });

    return result.queued
      ? ({ success: true, message: 'Offline: collection queued for sync', data: null } as ApiSuccess<null>)
      : result.data;
  },
  async addCrates(id: string, payload: DeliveryCratePayload) {
    const result = await executeOrQueue<ApiSuccess<unknown>>({
      path: `/my/delivery-stops/${id}/crates`,
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
      label: `Crate update for stop ${id}`,
    });

    return result.queued
      ? ({ success: true, message: 'Offline: crate transaction queued for sync', data: null } as ApiSuccess<null>)
      : result.data;
  },
  async addProofOfDelivery(id: string, payload: DeliveryProofPayload) {
    const result = await executeOrQueue<ApiSuccess<DeliveryStopDetail>>({
      path: `/my/delivery-stops/${id}/proof-of-delivery`,
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
      label: `Proof of delivery for stop ${id}`,
    });

    return result.queued
      ? ({
          success: true,
          message: 'Offline: proof of delivery queued for sync',
          data: null,
        } as ApiSuccess<null>)
      : (result.data as ApiSuccess<DeliveryStopDetail>);
  },
  getCollectionSummary() {
    return apiClient<ApiSuccess<StaffCollectionSummary>>('/my/collection-summary');
  },
};
