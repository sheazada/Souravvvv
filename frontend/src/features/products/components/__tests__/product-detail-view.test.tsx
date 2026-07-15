import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invalidateQueries = vi.fn();
const mockGetById = vi.fn();
const mockGetVariants = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateVariant = vi.fn();
const mockUpdateVariantStatus = vi.fn();

let productQueryResult: any;
let variantsQueryResult: any;

vi.mock('@/features/products/api', () => ({
  ProductsApi: {
    getById: (...args: any[]) => mockGetById(...args),
    getVariants: (...args: any[]) => mockGetVariants(...args),
    update: (...args: any[]) => mockUpdate(...args),
    updateVariant: (...args: any[]) => mockUpdateVariant(...args),
    updateVariantStatus: (...args: any[]) => mockUpdateVariantStatus(...args),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQueries: () => [productQueryResult, variantsQueryResult],
  useMutation: ({ mutationFn, onSuccess, onError }: any) => ({
    isPending: false,
    mutateAsync: async (payload: any) => {
      try {
        const result = await mutationFn(payload);
        onSuccess?.(result, payload);
        return result;
      } catch (error) {
        onError?.(error);
        throw error;
      }
    },
    mutate: async (payload: any) => {
      try {
        const result = await mutationFn(payload);
        onSuccess?.(result, payload);
        return result;
      } catch (error) {
        onError?.(error);
        throw error;
      }
    },
  }),
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock('@/config/admin-route-permissions', () => ({
  getAdminRouteMeta: () => ({
    pageTitle: 'Products',
    detailPageTitle: 'Product Detail',
    detailPageDescription: 'Manage product detail',
  }),
}));

vi.mock('@/lib/utils/title', () => ({
  buildDetailTitle: (_prefix: string, name: string) => `Product Detail • ${name}`,
}));

vi.mock('@/lib/utils/number', () => ({
  formatCurrency: (value: number) => `₹${value.toFixed(2)}`,
}));

vi.mock('@/components/ui/page-header', () => ({
  PageHeader: ({ title, description }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/components/ui/kpi-card', () => ({
  KpiCard: ({ label, value }: any) => (
    <div>
      <span>{label}</span>
      <span>{String(value)}</span>
    </div>
  ),
}));

vi.mock('@/components/feedback/empty-state', () => ({
  EmptyState: ({ title, description }: any) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/components/ui/lookup-input', () => ({
  LookupInput: ({ placeholder = 'lookup', value = '', onChange }: any) => (
    <input
      aria-label={placeholder}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

import { ProductDetailView } from '../product-detail-view';

describe('ProductDetailView', () => {
  beforeEach(() => {
    productQueryResult = {
      data: {
        data: {
          id: 'prod-1',
          productCode: 'PROD-001',
          name: 'Sudha Toned Milk',
          description: 'Milk product',
          status: 'active',
          isBatchTracked: false,
          isExpiryTracked: true,
          isReturnable: true,
          brand: { id: 'brand-1', name: 'Sudha' },
          category: { id: 'cat-1', name: 'Milk' },
          taxCode: { id: 'tax-1', code: 'GST5', gstRate: 5 },
          defaultCrateType: { id: 'crate-1', name: '24 Bottle Crate' },
        },
      },
      isLoading: false,
      error: null,
    };

    variantsQueryResult = {
      data: {
        data: [
          {
            id: 'var-1',
            productId: 'prod-1',
            sku: 'SKU-001',
            variantName: '500 ml',
            sizeValue: 0.5,
            unitId: 'unit-1',
            unit: { id: 'unit-1', code: 'LTR', name: 'Litre', decimalPlaces: 3 },
            barcode: '8900000000012',
            mrp: 32,
            distributorPrice: 28,
            defaultRetailerPrice: 30,
            offerPrice: 27.5,
            status: 'active',
          },
        ],
      },
      isLoading: false,
      error: null,
    };

    mockGetById.mockResolvedValue(productQueryResult.data);
    mockGetVariants.mockResolvedValue(variantsQueryResult.data);
    mockUpdate.mockResolvedValue({ success: true, message: 'Product updated successfully.' });
    mockUpdateVariant.mockResolvedValue({
      success: true,
      message: 'Product variant updated successfully.',
    });
    mockUpdateVariantStatus.mockResolvedValue({
      success: true,
      message: 'Product variant status updated successfully.',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('submits normalized product master updates', async () => {
    const user = userEvent.setup();
    render(<ProductDetailView id="prod-1" />);

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('Product name').length).toBeGreaterThan(0);
    });

    const nameInputs = screen.getAllByPlaceholderText('Product name');
    await user.clear(nameInputs[0]);
    await user.type(nameInputs[0], '  Updated Milk Product  ');
    await user.click(screen.getByRole('button', { name: 'Save Product Changes' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        'prod-1',
        expect.objectContaining({
          name: 'Updated Milk Product',
          productCode: 'PROD-001',
          status: 'active',
        }),
      );
    });

    expect(await screen.findByText('Product updated successfully.')).toBeInTheDocument();
  });

  it('submits normalized variant updates for the selected variant', async () => {
    const user = userEvent.setup();
    render(<ProductDetailView id="prod-1" />);

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('SKU').length).toBeGreaterThan(0);
    });

    const skuInputs = screen.getAllByPlaceholderText('SKU');
    const variantNameInputs = screen.getAllByPlaceholderText('Variant name');

    await user.clear(skuInputs[0]);
    await user.type(skuInputs[0], '  SKU-001-UPDATED  ');
    await user.clear(variantNameInputs[0]);
    await user.type(variantNameInputs[0], '  500 ml Updated  ');
    await user.click(screen.getByRole('button', { name: 'Save Variant Changes' }));

    await waitFor(() => {
      expect(mockUpdateVariant).toHaveBeenCalledWith(
        'var-1',
        expect.objectContaining({
          sku: 'SKU-001-UPDATED',
          variantName: '500 ml Updated',
          status: 'active',
        }),
      );
    });

    expect(await screen.findByText('Product variant updated successfully.')).toBeInTheDocument();
  });

  it('toggles variant status from the variant card actions', async () => {
    const user = userEvent.setup();
    render(<ProductDetailView id="prod-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => {
      expect(mockUpdateVariantStatus).toHaveBeenCalledWith('var-1', 'inactive');
    });
  });
});
