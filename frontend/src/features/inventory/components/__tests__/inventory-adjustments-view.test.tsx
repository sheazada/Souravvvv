import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryAdjustmentsView } from '../inventory-adjustments-view';

const mockGetAdjustments = vi.fn();
const mockCreateAdjustment = vi.fn();
const mockApproveAdjustment = vi.fn();
const mockPostAdjustment = vi.fn();

vi.mock('@/features/inventory/api', () => ({
  InventoryApi: {
    getAdjustments: (...args: any[]) => mockGetAdjustments(...args),
    createAdjustment: (...args: any[]) => mockCreateAdjustment(...args),
    approveAdjustment: (...args: any[]) => mockApproveAdjustment(...args),
    postAdjustment: (...args: any[]) => mockPostAdjustment(...args),
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

describe('InventoryAdjustmentsView', () => {
  beforeEach(() => {
    mockGetAdjustments.mockResolvedValue({
      data: [
        {
          id: 'adj-1',
          adjustmentNo: 'ADJ-001',
          warehouseId: 'wh-1',
          adjustmentDate: '2026-07-13',
          reason: 'physical_count',
          status: 'draft',
          warehouse: { name: 'Main Warehouse' },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    mockCreateAdjustment.mockResolvedValue({ success: true, data: { id: 'adj-2' } });
    mockApproveAdjustment.mockResolvedValue({ success: true });
    mockPostAdjustment.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation when stock adjustment is submitted without warehouse', async () => {
    const user = userEvent.setup();
    render(<InventoryAdjustmentsView />, { wrapper: createWrapper() });

    await screen.findByText('ADJ-001');
    await user.click(screen.getByRole('button', { name: 'Create Stock Adjustment' }));

    expect(await screen.findByText('Warehouse ID is required.')).toBeInTheDocument();
    expect(mockCreateAdjustment).not.toHaveBeenCalled();
  });

  it('submits stock adjustment payload with selected warehouse and variant', async () => {
    const user = userEvent.setup();
    render(<InventoryAdjustmentsView />, { wrapper: createWrapper() });

    await screen.findByText('ADJ-001');

    const warehouseInputs = screen.getAllByLabelText('Search warehouse');
    fireEvent.change(warehouseInputs[1], { target: { value: 'wh-1' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'damage' } });
    fireEvent.change(screen.getByPlaceholderText('Remarks'), { target: { value: '  Count mismatch  ' } });
    fireEvent.change(screen.getByLabelText('Search variant'), { target: { value: 'var-1' } });
    fireEvent.change(screen.getByLabelText('Optional inventory batch'), { target: { value: 'batch-1' } });

    await user.click(screen.getByRole('button', { name: 'Create Stock Adjustment' }));

    await waitFor(() => {
      expect(mockCreateAdjustment).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouseId: 'wh-1',
          reason: 'damage',
          remarks: 'Count mismatch',
          items: [expect.objectContaining({ variantId: 'var-1', inventoryBatchId: 'batch-1' })],
        }),
      );
    });

    expect(await screen.findByText('Stock adjustment created successfully.')).toBeInTheDocument();
  });

  it('approves a draft adjustment from the list action', async () => {
    const user = userEvent.setup();
    render(<InventoryAdjustmentsView />, { wrapper: createWrapper() });

    await screen.findByText('ADJ-001');
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(mockApproveAdjustment).toHaveBeenCalledWith('adj-1');
    });

    expect(await screen.findByText('Stock adjustment approved successfully.')).toBeInTheDocument();
  });
});
