import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryStockView } from '../inventory-stock-view';

const mockGetStockOnHand = vi.fn();

vi.mock('@/features/inventory/api', () => ({
  InventoryApi: {
    getStockOnHand: (...args: any[]) => mockGetStockOnHand(...args),
  },
}));

vi.mock('@/config/admin-route-permissions', () => ({
  getAdminRouteMeta: () => ({
    pageTitle: 'Inventory',
    pageDescription: 'Stock on hand',
  }),
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

describe('InventoryStockView', () => {
  beforeEach(() => {
    mockGetStockOnHand.mockResolvedValue({
      data: [
        {
          variantId: 'var-1',
          warehouseId: 'wh-1',
          batchCount: 2,
          totalAvailableQty: 120,
          totalReservedQty: 15,
          totalDamagedQty: 3,
          nearestExpiryDate: '2026-07-20',
          variant: { productName: 'Sudha Milk', variantName: '500 ml', sku: 'SKU-001' },
          warehouse: { name: 'Main Warehouse' },
        },
      ],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders stock-on-hand rows with product and warehouse details', async () => {
    render(<InventoryStockView />, { wrapper: createWrapper() });

    expect(await screen.findByText('Sudha Milk')).toBeInTheDocument();
    expect(screen.getByText('Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('shows empty state when there are no stock rows', async () => {
    mockGetStockOnHand.mockResolvedValueOnce({ data: [] });

    render(<InventoryStockView />, { wrapper: createWrapper() });

    expect(await screen.findByText('No stock rows found')).toBeInTheDocument();
  });
});
