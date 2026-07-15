import { apiClient } from '@/lib/api/client';
import type { ApiSuccess } from '@/types/api';
import type {
  RetailerNoteThresholdCacheDebug,
  RetailerNoteThresholdPayload,
  UpdateRetailerNoteThresholdsPayload,
} from '@/types/settings';

export const SettingsApi = {
  getRetailerNoteThresholds() {
    return apiClient<ApiSuccess<RetailerNoteThresholdPayload>>(
      '/settings/retailer-note-thresholds',
    );
  },
  updateRetailerNoteThresholds(payload: UpdateRetailerNoteThresholdsPayload) {
    return apiClient<ApiSuccess<RetailerNoteThresholdPayload>>(
      '/settings/retailer-note-thresholds',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },
  resetRetailerNoteThresholds() {
    return apiClient<ApiSuccess<RetailerNoteThresholdPayload>>(
      '/settings/retailer-note-thresholds',
      {
        method: 'DELETE',
      },
    );
  },
  getRetailerNoteThresholdCacheDebug() {
    return apiClient<ApiSuccess<RetailerNoteThresholdCacheDebug>>(
      '/settings/retailer-note-thresholds/cache-debug',
    );
  },
  resetRetailerNoteThresholdCache() {
    return apiClient<ApiSuccess<RetailerNoteThresholdCacheDebug>>(
      '/settings/retailer-note-thresholds/cache-reset',
      {
        method: 'POST',
      },
    );
  },
};
