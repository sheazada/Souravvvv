import { apiClient } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  AuditLogSummary,
  RetailerNoteThresholdCacheDebug,
  RetailerNoteThresholdPayload,
  RolePermissionSummary,
  RoleSummary,
  UpdateRetailerNoteThresholdsPayload,
  UserSummary,
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
  getUsers(params?: Record<string, string | number>) {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return apiClient<PaginatedApiSuccess<UserSummary>>(`/users${query}`);
  },
  createUser(payload: Record<string, any>) {
    return apiClient<ApiSuccess<UserSummary>>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateUser(id: string, payload: Record<string, any>) {
    return apiClient<ApiSuccess<UserSummary>>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  resetUserPassword(id: string, newPassword: string) {
    return apiClient<ApiSuccess<null>>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },
  deactivateUser(id: string) {
    return apiClient<ApiSuccess<UserSummary>>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
  getRoles(params?: Record<string, string | number>) {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return apiClient<PaginatedApiSuccess<RoleSummary>>(`/roles${query}`);
  },
  createRole(payload: Record<string, any>) {
    return apiClient<ApiSuccess<RoleSummary>>('/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateRole(id: string, payload: Record<string, any>) {
    return apiClient<ApiSuccess<RoleSummary>>(`/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  assignRolePermissions(id: string, permissionCodes: string[]) {
    return apiClient<ApiSuccess<RoleSummary>>(`/roles/${id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissionCodes }),
    });
  },
  deleteRole(id: string) {
    return apiClient<ApiSuccess<RoleSummary>>(`/roles/${id}`, {
      method: 'DELETE',
    });
  },
  getPermissions(module?: string) {
    const query = module ? `?module=${encodeURIComponent(module)}` : '';
    return apiClient<ApiSuccess<RolePermissionSummary[]>>(`/permissions${query}`);
  },
  getAuditLogs(params?: Record<string, string | number>) {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return apiClient<PaginatedApiSuccess<AuditLogSummary>>(`/audit-logs${query}`);
  },
};
