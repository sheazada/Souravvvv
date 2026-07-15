import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invalidateQueries = vi.fn();
const mockGetById = vi.fn();
const mockApprove = vi.fn();
const mockCancel = vi.fn();
const mockUpdateDemandExtras = vi.fn();

let purchaseOrderQueryResult: any;

vi.mock('@/features/purchase-orders/api', () => ({
  PurchaseOrdersApi: {
    getById: (...args: any[]) => mockGetById(...args),
    approve: (...args: any[]) => mockApprove(...args),
    cancel: (...args: any[]) => mockCancel(...args),
    updateDemandExtras: (...args: any[]) => mockUpdateDemandExtras(...args),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => purchaseOrderQueryResult,
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

import { PurchaseOrderDetailView } from '../purchase-order-detail-view';

describe('PurchaseOrderDetailView', () => {
  beforeEach(() => {
    purchaseOrderQueryResult = {
      data: {
        data: {
          id: 'po-1',
          poNo: 'PO-001',
          supplierId: 'sup-1',
          poDate: '2026-07-13',
          expectedReceiptDate: '2026-07-15',
          status: 'draft',
          grandTotal: 1200,
          supplier: { name: 'Sudha Dairy' },
          demandConsolidation: null,
          items: [
            {
              id: 'item-1',
              variantId: 'var-1',
              orderedQty: 50,
              demandQty: 50,
              extraQty: 0,
              unitCost: 20,
              taxRate: 5,
              lineTotal: 1000,
              variant: {
                productName: 'Sudha Milk',
                variantName: '500 ml',
                sku: 'SKU-001',
              },
            },
          ],
          receiptSummary: {
            receiptCount: 1,
            totalAcceptedQty: 48,
          },
        },
      },
      isLoading: false,
      error: null,
    };

    mockGetById.mockResolvedValue(purchaseOrderQueryResult.data);
    mockApprove.mockResolvedValue({ success: true });
    mockCancel.mockResolvedValue({ success: true });
    mockUpdateDemandExtras.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders purchase order summary and line items', async () => {
    render(<PurchaseOrderDetailView id="po-1" />);

    expect(await screen.findByText('Purchase Order PO-001')).toBeInTheDocument();
    expect(screen.getByText('Sudha Dairy')).toBeInTheDocument();
    expect(screen.getByText('Sudha Milk')).toBeInTheDocument();
    expect(screen.getByText('SKU-001')).toBeInTheDocument();
    expect(screen.getByText('₹1200.00')).toBeInTheDocument();
  });

  it('approves a draft purchase order and invalidates detail query', async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderDetailView id="po-1" />);

    await screen.findByText('Purchase Order PO-001');
    await user.click(screen.getByRole('button', { name: 'Approve PO' }));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith('po-1');
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['purchase-order', 'po-1'] });
  });

  it('updates extra procurement qty for a draft demand-generated purchase order', async () => {
    purchaseOrderQueryResult.data.data.demandConsolidation = { id: 'dem-1', consolidationNo: 'DCON-001' };
    purchaseOrderQueryResult.data.data.items[0].demandQty = 50;
    purchaseOrderQueryResult.data.data.items[0].extraQty = 2;
    purchaseOrderQueryResult.data.data.items[0].orderedQty = 52;

    const user = userEvent.setup();
    render(<PurchaseOrderDetailView id="po-1" />);

    await screen.findByText('Purchase Order PO-001');
    const extraQtyInput = screen.getByLabelText('Extra qty SKU-001');
    await user.clear(extraQtyInput);
    await user.type(extraQtyInput, '5');
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getAllByText('₹1155.00').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Update Extra Procurement Qty' }));

    await waitFor(() => {
      expect(mockUpdateDemandExtras).toHaveBeenCalledWith('po-1', {
        items: [{ variantId: 'var-1', extraQty: 5 }],
      });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['purchase-order', 'po-1'] });
  });

  it('renders extra procurement audit trail with user and before/after quantities', async () => {
    purchaseOrderQueryResult.data.data.demandConsolidation = { id: 'dem-1', consolidationNo: 'DCON-001' };
    purchaseOrderQueryResult.data.data.auditTrail = [
      {
        id: 'audit-1',
        action: 'update_demand_extras',
        changedAt: '2026-07-15T09:30:00.000Z',
        changedBy: { id: 'user-1', fullName: 'Ravi Kumar', userType: 'owner', mobile: '9999999999' },
        items: [
          {
            variantId: 'var-1',
            demandQty: 50,
            beforeExtraQty: 2,
            afterExtraQty: 5,
            beforeOrderedQty: 52,
            afterOrderedQty: 55,
            variant: { sku: 'SKU-001', variantName: '500 ml', productName: 'Sudha Milk' },
          },
        ],
      },
    ];

    render(<PurchaseOrderDetailView id="po-1" />);

    expect(await screen.findByText('Extra Procurement Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getAllByText('Sudha Milk').length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('52')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
  });

  it('cancels an active purchase order and invalidates detail query', async () => {
    purchaseOrderQueryResult.data.data.status = 'approved';
    const user = userEvent.setup();
    render(<PurchaseOrderDetailView id="po-1" />);

    await screen.findByText('Purchase Order PO-001');
    await user.click(screen.getByRole('button', { name: 'Cancel PO' }));

    await waitFor(() => {
      expect(mockCancel).toHaveBeenCalledWith('po-1');
    });
  });
});
