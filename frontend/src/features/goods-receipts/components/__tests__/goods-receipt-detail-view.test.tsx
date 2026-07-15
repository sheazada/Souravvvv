import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invalidateQueries = vi.fn();
const mockGetById = vi.fn();
const mockGetComparison = vi.fn();
const mockApprove = vi.fn();
const mockPost = vi.fn();

let detailQueryResult: any;
let comparisonQueryResult: any;

vi.mock('@/features/goods-receipts/api', () => ({
  GoodsReceiptsApi: {
    getById: (...args: any[]) => mockGetById(...args),
    getComparison: (...args: any[]) => mockGetComparison(...args),
    approve: (...args: any[]) => mockApprove(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: any) => {
    if (queryKey?.[2] === 'comparison') return comparisonQueryResult;
    return detailQueryResult;
  },
  useMutation: ({ mutationFn, onSuccess, onError }: any) => ({
    isPending: false,
    mutate: async (payload?: any) => {
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
    pageTitle: 'Goods Receipts',
    detailTitlePrefix: 'Goods Receipt',
    detailPageDescription: 'Ordered vs received comparison',
  }),
}));

vi.mock('@/lib/utils/title', () => ({
  buildDetailTitle: (_prefix: string, value: string) => `Goods Receipt • ${value}`,
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

import { GoodsReceiptDetailView } from '../goods-receipt-detail-view';

describe('GoodsReceiptDetailView', () => {
  beforeEach(() => {
    detailQueryResult = {
      data: {
        data: {
          id: 'grn-1',
          grnNo: 'GRN-001',
          supplierId: 'sup-1',
          purchaseOrderId: 'po-1',
          warehouseId: 'wh-1',
          receiptDate: '2026-07-13',
          status: 'draft',
          supplier: { name: 'Sudha Dairy' },
          purchaseOrder: { poNo: 'PO-001' },
          warehouse: { name: 'Main Warehouse' },
        },
      },
      isLoading: false,
      error: null,
    };

    comparisonQueryResult = {
      data: {
        data: {
          totals: {
            receivedQty: 100,
            acceptedQty: 95,
            rejectedQty: 5,
            shortQty: 2,
            excessQty: 1,
          },
          items: [
            {
              id: 'cmp-1',
              variantId: 'var-1',
              orderedQty: 100,
              receivedQty: 100,
              acceptedQty: 95,
              rejectedQty: 5,
              shortQty: 2,
              excessQty: 1,
              batchNo: 'BATCH-01',
              expiryDate: '2026-07-20',
              variant: {
                productName: 'Sudha Milk',
                variantName: '500 ml',
                sku: 'SKU-001',
              },
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    };

    mockGetById.mockResolvedValue(detailQueryResult.data);
    mockGetComparison.mockResolvedValue(comparisonQueryResult.data);
    mockApprove.mockResolvedValue({ success: true });
    mockPost.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders goods receipt summary and comparison rows', async () => {
    render(<GoodsReceiptDetailView id="grn-1" />);

    expect(await screen.findByText('Goods Receipt • GRN-001')).toBeInTheDocument();
    expect(screen.getByText('Sudha Dairy')).toBeInTheDocument();
    expect(screen.getByText('PO-001')).toBeInTheDocument();
    expect(screen.getByText('Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Sudha Milk')).toBeInTheDocument();
    expect(screen.getByText('BATCH-01')).toBeInTheDocument();
  });

  it('approves a draft goods receipt and invalidates detail queries', async () => {
    const user = userEvent.setup();
    render(<GoodsReceiptDetailView id="grn-1" />);

    await screen.findByText('Goods Receipt • GRN-001');
    await user.click(screen.getByRole('button', { name: 'Approve GRN' }));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith('grn-1');
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['goods-receipt', 'grn-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['goods-receipt', 'grn-1', 'comparison'] });
  });

  it('posts an approved goods receipt to inventory', async () => {
    detailQueryResult.data.data.status = 'approved';
    const user = userEvent.setup();
    render(<GoodsReceiptDetailView id="grn-1" />);

    await screen.findByText('Goods Receipt • GRN-001');
    await user.click(screen.getByRole('button', { name: 'Post to Inventory' }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('grn-1');
    });
  });
});
