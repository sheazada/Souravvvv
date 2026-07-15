import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryMovementsView } from '../inventory-movements-view';

const mockGetMovements = vi.fn();

vi.mock('@/features/inventory/api', () => ({
  InventoryApi: {
    getMovements: (...args: any[]) => mockGetMovements(...args),
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

describe('InventoryMovementsView', () => {
  beforeEach(() => {
    mockGetMovements.mockResolvedValue({
      data: [
        {
          id: 'move-1',
          movementNo: 'MOV-001',
          warehouseId: 'wh-1',
          variantId: 'var-1',
          movementType: 'goods_receipt',
          referenceType: 'goods_receipt',
          referenceId: 'grn-1',
          qtyIn: 100,
          qtyOut: 0,
          movementAt: '2026-07-13T09:30:00.000Z',
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

  it('renders stock movement rows with reference and quantity details', async () => {
    render(<InventoryMovementsView />, { wrapper: createWrapper() });

    expect(await screen.findByText('MOV-001')).toBeInTheDocument();
    expect(screen.getByText('Sudha Milk')).toBeInTheDocument();
    expect(screen.getByText('Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText('goods_receipt')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('re-queries stock movements when search and filters change', async () => {
    render(<InventoryMovementsView />, { wrapper: createWrapper() });

    await screen.findByText('MOV-001');

    fireEvent.change(screen.getByPlaceholderText('Search movement no or reference'), { target: { value: 'MOV' } });
    fireEvent.change(screen.getByLabelText('Search variant'), { target: { value: 'var-1' } });
    fireEvent.change(screen.getByLabelText('Search warehouse'), { target: { value: 'wh-1' } });
    fireEvent.change(screen.getByPlaceholderText('Movement type'), { target: { value: 'goods_receipt' } });

    await waitFor(() => {
      expect(mockGetMovements).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          search: 'MOV',
          variantId: 'var-1',
          warehouseId: 'wh-1',
          movementType: 'goods_receipt',
        }),
      );
    });
  });

  it('shows empty state when there are no stock movements', async () => {
    mockGetMovements.mockResolvedValueOnce({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });

    render(<InventoryMovementsView />, { wrapper: createWrapper() });

    expect(await screen.findByText('No stock movements found')).toBeInTheDocument();
  });
});
