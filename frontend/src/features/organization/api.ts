import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';

export type OrganizationProfile = {
  id: string;
  name: string;
  legalName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  timezone: string;
  currencyCode: string;
  addressJson?: Record<string, any> | null;
};

export type AttachmentRow = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  createdAt: string;
};

export const OrganizationApi = {
  getProfile() {
    return apiClient<ApiSuccess<OrganizationProfile>>('/organization/profile');
  },
  updateProfile(payload: Record<string, any>) {
    return apiClient<ApiSuccess<OrganizationProfile>>('/organization/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  listAttachments(query?: { page?: number; limit?: number; search?: string; entityType?: string }) {
    return apiClient<PaginatedApiSuccess<AttachmentRow>>(`/attachments${buildQueryString(query)}`);
  },
  createAttachment(payload: Record<string, any>) {
    return apiClient<ApiSuccess<AttachmentRow>>('/attachments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteAttachment(id: string) {
    return apiClient<ApiSuccess<any>>(`/attachments/${id}`, {
      method: 'DELETE',
    });
  },
};
