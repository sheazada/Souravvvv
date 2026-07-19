import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';

export type PriceBookRow = {
  id: string;
  code: string;
  name: string;
  scopeType: string;
  priority: number;
  validFrom: string;
  validTo?: string | null;
  isActive: boolean;
};

export type PromotionRow = {
  id: string;
  code: string;
  name: string;
  promoType: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
};

export const PricingApi = {
  listPriceBooks(query?: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    return apiClient<PaginatedApiSuccess<PriceBookRow>>(`/price-books${buildQueryString(query)}`);
  },
  createPriceBook(payload: Record<string, any>) {
    return apiClient<ApiSuccess<PriceBookRow>>('/price-books', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listPromotions(query?: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    return apiClient<PaginatedApiSuccess<PromotionRow>>(`/promotions${buildQueryString(query)}`);
  },
  createPromotion(payload: Record<string, any>) {
    return apiClient<ApiSuccess<PromotionRow>>('/promotions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  previewPricing(payload: { retailerId: string; variantId: string; qty: number }) {
    return apiClient<ApiSuccess<any>>('/pricing/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
