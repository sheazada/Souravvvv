import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoodsReceiptListView } from '../goods-receipt-list-view';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockApprove = vi.fn();
const mockPost = vi.fn();

vi.mock('@/features/goods-receipts/api', () => ({
  GoodsReceiptsApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    approve: (...args: any[]) => mockApprove(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

vi.mock('@/config/admin-route-permissions', () => ({
  getAdminRouteMeta: () => ({
    pageTitle: 'Goods Receipts',
    pageDescription: 'Manage goods receipts',
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

describe('GoodsReceiptListView', () => {
  beforeEach(() => {
    mockList.mockResolvedValue({
      data: [
        {
          id: 'grn-1',
          grnNo: 'GRN-001',
          supplierId: 'sup-1',
          warehouseId: 'wh-1',
          receiptDate: '2026-07-13',
          status: 'draft',
          supplier: { name: 'Sudha Dairy' },
          warehouse: { name: 'Main Warehouse' },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    mockCreate.mockResolvedValue({ success: true, data: { id: 'grn-2' } });
    mockApprove.mockResolvedValue({ success: true });
    mockPost.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation when GRN create is submitted without required supplier and warehouse', async () => {
    const user = userEvent.setup();
    render(<GoodsReceiptListView />, { wrapper: createWrapper() });

    await screen.findByText('GRN-001');
    await user.click(screen.getByRole('button', { name: 'Create Goods Receipt' }));

    expect(await screen.findByText('Supplier ID and warehouse ID are required.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('submits create goods receipt payload with selected IDs and trimmed optional fields', async () => {
    const user = userEvent.setup();
    render(<GoodsReceiptListView />, { wrapper: createWrapper() });

    await screen.findByText('GRN-001');

    fireEvent.change(screen.getByLabelText('Search supplier'), { target: { value: 'sup-1' } });
    fireEvent.change(screen.getByLabelText('Optional purchase order'), { target: { value: '  po-1  ' } });
    fireEvent.change(screen.getByLabelText('Search warehouse'), { target: { value: 'wh-1' } });
    fireEvent.change(screen.getByPlaceholderText('Supplier challan no'), { target: { value: '  CH-001  ' } });
    fireEvent.change(screen.getByPlaceholderText('Vehicle no'), { target: { value: '  BR01A1234  ' } });
    fireEvent.change(screen.getByLabelText('Search variant'), { target: { value: 'var-1' } });
    fireEvent.change(screen.getByPlaceholderText('Optional GRN remark'), { target: { value: '  Urgent receipt  ' } });

    await user.click(screen.getByRole('button', { name: 'Create Goods Receipt' }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: 'sup-1',
          purchaseOrderId: 'po-1',
          warehouseId: 'wh-1',
          supplierChallanNo: 'CH-001',
          vehicleNo: 'BR01A1234',
          remarks: 'Urgent receipt',
          items: [expect.objectContaining({ variantId: 'var-1', receivedQty: 1 })],
        }),
      );
    });

    expect(await screen.findByText('Goods receipt created successfully.')).toBeInTheDocument();
  });

  it('approves a draft goods receipt from the list action', async () => {
    const user = userEvent.setup();
    render(<GoodsReceiptListView />, { wrapper: createWrapper() });

    await screen.findByText('GRN-001');
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith('grn-1');
    });

    expect(await screen.findByText('Goods receipt approved successfully.')).toBeInTheDocument();
  });
});
