import { AuthApi } from '@/features/auth/api';
import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type { PortalDuesData, PortalInvoiceDetail, PortalInvoiceItem, PortalOrderDetail, PortalOrderItem, PortalProfileData, RetailerDashboardData } from '@/types/portal';

export const PortalApi = {
  getDashboard() {
    return apiClient<ApiSuccess<RetailerDashboardData>>('/dashboard/retailer');
  },
  getOrders(query?: { page?: number; limit?: number; search?: string; status?: string }) {
    return apiClient<PaginatedApiSuccess<PortalOrderItem>>(`/my/orders${buildQueryString(query)}`);
  },
  getOrderById(id: string) {
    return apiClient<ApiSuccess<PortalOrderDetail>>(`/my/orders/${id}`);
  },
  repeatOrder(id: string) {
    return apiClient<ApiSuccess<PortalOrderDetail>>(`/my/orders/${id}/repeat`, {
      method: 'POST',
    });
  },
  getInvoices(query?: { page?: number; limit?: number; search?: string; status?: string }) {
    return apiClient<PaginatedApiSuccess<PortalInvoiceItem>>(`/my/invoices${buildQueryString(query)}`);
  },
  getInvoiceById(id: string) {
    return apiClient<ApiSuccess<PortalInvoiceDetail>>(`/my/invoices/${id}`);
  },
  getDues() {
    return apiClient<ApiSuccess<PortalDuesData>>('/my/dues');
  },
  async getProfile() {
    const me = await AuthApi.me();
    const retailerId = me.data.retailerId;
    if (!retailerId) {
      return {
        success: true as const,
        message: 'Retailer profile unavailable',
        data: {
          user: me.data,
          retailer: null,
          ledgerSummary: null,
        },
      } satisfies ApiSuccess<PortalProfileData>;
    }

    const [retailer, ledgerSummary] = await Promise.all([
      apiClient<ApiSuccess<any>>(`/retailers/${retailerId}`),
      apiClient<ApiSuccess<any>>(`/retailers/${retailerId}/ledger-summary`),
    ]);

    return {
      success: true as const,
      message: 'Retailer profile fetched successfully',
      data: {
        user: {
          id: me.data.id,
          fullName: me.data.fullName,
          mobile: me.data.mobile,
          userType: me.data.userType,
          roles: me.data.roles,
        },
        retailer: retailer.data,
        ledgerSummary: ledgerSummary.data,
      },
    } satisfies ApiSuccess<PortalProfileData>;
  },
};
