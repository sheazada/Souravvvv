import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsManagementView } from '../products-management-view';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockGetVariants = vi.fn();
const mockCreateVariant = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateStatus = vi.fn();

vi.mock('@/features/products/api', () => ({
  ProductsApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    getVariants: (...args: any[]) => mockGetVariants(...args),
    createVariant: (...args: any[]) => mockCreateVariant(...args),
    update: (...args: any[]) => mockUpdate(...args),
    updateStatus: (...args: any[]) => mockUpdateStatus(...args),
  },
}));

vi.mock('@/config/admin-route-permissions', () => ({
  getAdminRouteMeta: () => ({
    pageTitle: 'Products',
    pageDescription: 'Manage products',
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/ui/lookup-input', () => ({
  LookupInput: ({ placeholder = 'lookup', value = '', onChange }: any) => (
    <input
      aria-label={placeholder}
      data-testid={`lookup-${placeholder}`}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('ProductsManagementView', () => {
  beforeEach(() => {
    mockList.mockResolvedValue({
      data: [
        {
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
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    mockGetVariants.mockResolvedValue({ data: [] });
    mockCreate.mockResolvedValue({
      success: true,
      message: 'Product created successfully.',
      data: { id: 'prod-2', name: 'New Product' },
    });
    mockCreateVariant.mockResolvedValue({
      success: true,
      message: 'Product variant created successfully.',
      data: { id: 'var-2', sku: 'SKU-NEW-001' },
    });
    mockUpdate.mockResolvedValue({ success: true, message: 'Product updated successfully.' });
    mockUpdateStatus.mockResolvedValue({ success: true, message: 'Product status updated successfully.' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation when create product is submitted without required fields', async () => {
    const user = userEvent.setup();
    render(<ProductsManagementView />, { wrapper: createWrapper() });

    await screen.findByText('Sudha Toned Milk');
    await user.click(screen.getByRole('button', { name: 'Create Product' }));

    expect(await screen.findByText('Product code and product name are required.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('submits normalized create product payload', async () => {
    const user = userEvent.setup();
    render(<ProductsManagementView />, { wrapper: createWrapper() });

    await screen.findByText('Sudha Toned Milk');

    const productCodeInputs = screen.getAllByPlaceholderText('Product code');
    const productNameInputs = screen.getAllByPlaceholderText('Product name');

    await user.type(productCodeInputs[0], '  PROD-NEW-001  ');
    await user.type(productNameInputs[0], '  New Product  ');
    await user.click(screen.getByRole('button', { name: 'Create Product' }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          productCode: 'PROD-NEW-001',
          name: 'New Product',
          status: 'active',
        }),
      );
    });

    expect(await screen.findByText('Product created successfully.')).toBeInTheDocument();
  });

  it('creates a variant for the selected product', async () => {
    const user = userEvent.setup();
    mockGetVariants.mockResolvedValueOnce({ data: [] });
    render(<ProductsManagementView />, { wrapper: createWrapper() });

    await screen.findByText('Sudha Toned Milk');
    await user.click(screen.getByRole('button', { name: 'Quick Variants' }));

    await user.type(screen.getByPlaceholderText('SKU'), '  SKU-NEW-001  ');
    await user.type(screen.getByPlaceholderText('Variant name'), '  1 Litre Pack  ');
    await user.type(screen.getByPlaceholderText('MRP'), '64');
    await user.type(screen.getByPlaceholderText('Distributor price'), '58');
    await user.type(screen.getByPlaceholderText('Default retailer price'), '60');
    await user.click(screen.getByRole('button', { name: 'Create Variant' }));

    await waitFor(() => {
      expect(mockCreateVariant).toHaveBeenCalledWith(
        'prod-1',
        expect.objectContaining({
          productId: 'prod-1',
          sku: 'SKU-NEW-001',
          variantName: '1 Litre Pack',
          mrp: 64,
          distributorPrice: 58,
          defaultRetailerPrice: 60,
        }),
      );
    });

    expect(await screen.findByText('Product variant created successfully.')).toBeInTheDocument();
  });

  it('toggles product status from the list action', async () => {
    const user = userEvent.setup();
    render(<ProductsManagementView />, { wrapper: createWrapper() });

    await screen.findByText('Sudha Toned Milk');
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith('prod-1', 'inactive');
    });
  });
});
