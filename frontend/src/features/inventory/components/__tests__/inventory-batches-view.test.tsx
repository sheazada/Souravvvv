import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryBatchesView } from '../inventory-batches-view';

const mockGetBatches = vi.fn();

vi.mock('@/features/inventory/api', () => ({
  InventoryApi: {
    getBatches: (...args: any[]) => mockGetBatches(...args),
  },
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

vi.mock('@/components/ui/page-header', () => ({
  PageHeader: ({ title, description }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/components/feedback/empty-state', () => ({
  EmptyState: ({ title, description }: any) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
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

describe('InventoryBatchesView', () => {
  beforeEach(() => {
    mockGetBatches.mockResolvedValue({
      data: [
        {
          id: 'batch-1',
          variantId: 'var-1',
          warehouseId: 'wh-1',
          batchNo: 'BATCH-001',
          availableQty: 90,
          receivedQty: 100,
          expiryDate: '2026-07-20',
          status: 'available',
          variant: { productName: 'Sudha Milk', variantName: '500 ml', sku: 'SKU-001' },
          warehouse: { id: 'wh-1', name: 'Main Warehouse' },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders inventory batch rows with product and warehouse context', async () => {
    render(<InventoryBatchesView />, { wrapper: createWrapper() });

    expect(await screen.findByText('Sudha Milk')).toBeInTheDocument();
    expect(screen.getByText('BATCH-001')).toBeInTheDocument();
    expect(screen.getByText('Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText('available')).toBeInTheDocument();
  });

  it('re-queries batches when search and filters change', async () => {
    render(<InventoryBatchesView />, { wrapper: createWrapper() });

    await screen.findByText('Sudha Milk');

    fireEvent.change(screen.getByPlaceholderText('Search batch no or status'), { target: { value: 'BATCH' } });
    fireEvent.change(screen.getByLabelText('Search variant'), { target: { value: 'var-1' } });
    fireEvent.change(screen.getByLabelText('Search warehouse'), { target: { value: 'wh-1' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'true' } });

    await waitFor(() => {
      expect(mockGetBatches).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          search: 'BATCH',
          variantId: 'var-1',
          warehouseId: 'wh-1',
          nearExpiry: 'true',
        }),
      );
    });
  });

  it('shows empty state when there are no inventory batches', async () => {
    mockGetBatches.mockResolvedValueOnce({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });

    render(<InventoryBatchesView />, { wrapper: createWrapper() });

    expect(await screen.findByText('No inventory batches found')).toBeInTheDocument();
  });
});
