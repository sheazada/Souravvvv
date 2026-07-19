import { apiClient } from '@/lib/api/client';
import type { ApiSuccess } from '@/types/api';

export type BackupRow = {
  id: string;
  backupName?: string | null;
  fileName: string;
  sizeBytes?: number | null;
  targetStorage?: string | null;
  status: string;
  createdAt?: string | null;
};

export const BackupsApi = {
  list() {
    return apiClient<ApiSuccess<BackupRow[]>>('/settings/backups');
  },
  create(payload?: { backupName?: string; targetStorage?: string }) {
    return apiClient<ApiSuccess<BackupRow>>('/settings/backups', {
      method: 'POST',
      body: payload ? JSON.stringify(payload) : undefined,
    });
  },
  restore(id: string) {
    return apiClient<ApiSuccess<any>>(`/settings/backups/${id}/restore`, {
      method: 'POST',
    });
  },
};
