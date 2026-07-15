import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  NotificationLogFilters,
  NotificationLogRow,
  NotificationTemplateFilters,
  NotificationTemplateRow,
} from '@/types/notifications';

export const NotificationsApi = {
  getLogs(filters?: NotificationLogFilters) {
    return apiClient<PaginatedApiSuccess<NotificationLogRow>>(
      `/notification-logs${buildQueryString(filters)}`,
    );
  },
  getLogById(id: string) {
    return apiClient<ApiSuccess<NotificationLogRow>>(`/notification-logs/${id}`);
  },
  retryLog(id: string) {
    return apiClient<ApiSuccess<NotificationLogRow>>(`/notification-logs/${id}/retry`, {
      method: 'POST',
    });
  },
  getTemplates(filters?: NotificationTemplateFilters) {
    return apiClient<PaginatedApiSuccess<NotificationTemplateRow>>(
      `/notification-templates${buildQueryString(filters)}`,
    );
  },
  getTemplateById(id: string) {
    return apiClient<ApiSuccess<NotificationTemplateRow>>(`/notification-templates/${id}`);
  },
};
