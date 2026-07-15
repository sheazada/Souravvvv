import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  CreateProductPayload,
  CreateProductVariantPayload,
  ProductDetail,
  ProductFilters,
  ProductListItem,
  ProductVariantRow,
  UpdateProductPayload,
  UpdateProductVariantPayload,
} from '@/types/products';

export const ProductsApi = {
  list(filters?: ProductFilters) {
    return apiClient<PaginatedApiSuccess<ProductListItem>>(
      `/products${buildQueryString(filters)}`,
    );
  },
  create(payload: CreateProductPayload) {
    return apiClient<ApiSuccess<ProductDetail>>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getById(id: string) {
    return apiClient<ApiSuccess<ProductDetail>>(`/products/${id}`);
  },
  update(id: string, payload: UpdateProductPayload) {
    return apiClient<ApiSuccess<ProductDetail>>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  updateStatus(id: string, status: 'active' | 'inactive') {
    return apiClient<ApiSuccess<ProductDetail>>(`/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  getVariants(productId: string) {
    return apiClient<ApiSuccess<ProductVariantRow[]>>(`/products/${productId}/variants`);
  },
  createVariant(productId: string, payload: CreateProductVariantPayload) {
    return apiClient<ApiSuccess<ProductVariantRow>>(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateVariant(variantId: string, payload: UpdateProductVariantPayload) {
    return apiClient<ApiSuccess<ProductVariantRow>>(`/product-variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  updateVariantStatus(variantId: string, status: 'active' | 'inactive') {
    return apiClient<ApiSuccess<ProductVariantRow>>(`/product-variants/${variantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
