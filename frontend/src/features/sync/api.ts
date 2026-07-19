import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';

export type SyncEventRow = {
  id: string;
  deviceId: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  payloadJson: Record<string, any>;
  clientTimestamp: string;
  serverTimestamp?: string | null;
  syncStatus: string;
  conflictNotes?: string | null;
  createdAt: string;
};

export const SyncApi = {
  listEvents(query?: { page?: number; limit?: number; deviceId?: string; syncStatus?: string }) {
    return apiClient<PaginatedApiSuccess<SyncEventRow>>(`/sync/events${buildQueryString(query)}`);
  },
  listConflicts(query?: { page?: number; limit?: number }) {
    return apiClient<PaginatedApiSuccess<SyncEventRow>>(`/sync/conflicts${buildQueryString(query)}`);
  },
  resolveConflict(id: string, payload: { resolutionStrategy: string; resolutionNotes?: string }) {
    return apiClient<ApiSuccess<SyncEventRow>>(`/sync/conflicts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getDeviceStatus(deviceId: string) {
    return apiClient<ApiSuccess<any>>(`/sync/devices/${deviceId}/status`);
  },
};
