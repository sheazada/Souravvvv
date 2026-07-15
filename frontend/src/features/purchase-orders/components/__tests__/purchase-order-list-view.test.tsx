import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrderListView } from '../purchase-order-list-view';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockCreateFromDemand = vi.fn();
const mockGetById = vi.fn();
const mockGetDemandItems = vi.fn();
const mockUpdateDemandExtras = vi.fn();
const mockApprove = vi.fn();
const mockCancel = vi.fn();

vi.mock('@/features/purchase-orders/api', () => ({
  PurchaseOrdersApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    createFromDemand: (...args: any[]) => mockCreateFromDemand(...args),
    getById: (...args: any[]) => mockGetById(...args),
    updateDemandExtras: (...args: any[]) => mockUpdateDemandExtras(...args),
    approve: (...args: any[]) => mockApprove(...args),
    cancel: (...args: any[]) => mockCancel(...args),
  },
}));

vi.mock('@/features/demand-consolidations/api', () => ({
  DemandConsolidationsApi: {
    getItems: (...args: any[]) => mockGetDemandItems(...args),
  },
}));

vi.mock('@/config/admin-route-permissions', () => ({
  getAdminRouteMeta: () => ({
    pageTitle: 'Purchase Orders',
    pageDescription: 'Manage purchase orders',
  }),
}));

vi.mock('@/lib/utils/number', () => ({
  formatCurrency: (value: number) => `₹${value.toFixed(2)}`,
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

describe('PurchaseOrderListView', () => {
  beforeEach(() => {
    mockList.mockResolvedValue({
      data: [
        {
          id: 'po-1',
          poNo: 'PO-001',
          supplierId: 'sup-1',
          poDate: '2026-07-13',
          status: 'draft',
          grandTotal: 1200,
          supplier: { name: 'Sudha Dairy' },
          demandConsolidation: { id: 'dem-1', consolidationNo: 'DCON-001' },
          latestDemandExtraAudit: {
            id: 'audit-1',
            action: 'update_demand_extras',
            changedAt: '2026-07-15T09:30:00.000Z',
            changedBy: { id: 'user-1', fullName: 'Ravi Kumar', userType: 'owner', mobile: '9999999999' },
            changedItemCount: 1,
            totalExtraQtyBefore: 2,
            totalExtraQtyAfter: 5,
            totalOrderedQtyBefore: 22,
            totalOrderedQtyAfter: 25,
          },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    mockCreate.mockResolvedValue({ success: true, data: { id: 'po-2' } });
    mockCreateFromDemand.mockResolvedValue({ success: true, data: { id: 'po-3' } });
    mockGetDemandItems.mockResolvedValue({
      data: [
        {
          id: 'demand-item-1',
          variantId: 'var-1',
          totalOrderQty: 20,
          totalApprovedQty: 20,
          bufferQty: 0,
          finalProcurementQty: 20,
          variant: { id: 'var-1', sku: 'SKU-001', variantName: '500 ml', productId: 'prod-1', productName: 'Sudha Milk' },
        },
      ],
    });
    mockGetById.mockResolvedValue({
      data: {
        id: 'po-1',
        poNo: 'PO-001',
        supplierId: 'sup-1',
        poDate: '2026-07-13',
        expectedReceiptDate: '2026-07-15',
        status: 'draft',
        grandTotal: 1200,
        supplier: { name: 'Sudha Dairy' },
        demandConsolidation: { id: 'dem-1', consolidationNo: 'DCON-001' },
        items: [
          {
            id: 'item-1',
            variantId: 'var-1',
            orderedQty: 22,
            demandQty: 20,
            extraQty: 2,
            unitCost: 20,
            taxRate: 5,
            lineTotal: 462,
            variant: { productName: 'Sudha Milk', variantName: '500 ml', sku: 'SKU-001' },
          },
        ],
        receiptSummary: { receiptCount: 0, totalAcceptedQty: 0 },
      },
    });
    mockUpdateDemandExtras.mockResolvedValue({ success: true, data: { id: 'po-1' } });
    mockApprove.mockResolvedValue({ success: true });
    mockCancel.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation when demand-based PO generation is submitted without required fields', async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderListView />, { wrapper: createWrapper() });

    await screen.findByText('PO-001');
    await user.click(screen.getByRole('button', { name: 'Generate PO from Demand' }));

    expect(
      await screen.findByText('Supplier ID and approved demand consolidation are required.'),
    ).toBeInTheDocument();
    expect(mockCreateFromDemand).not.toHaveBeenCalled();
  });

  it('renders the latest extra procurement change summary on the PO row', async () => {
    render(<PurchaseOrderListView />, { wrapper: createWrapper() });

    await screen.findByText('PO-001');
    expect(screen.getByText('DCON-001')).toBeInTheDocument();
    expect(screen.getByText(/Last extra edit: Ravi Kumar/)).toBeInTheDocument();
    expect(screen.getByText(/1 item\(s\) • extra 2→5/)).toBeInTheDocument();
  });

  it('re-queries purchase orders when extra qty audit filter changes', async () => {
    render(<PurchaseOrderListView />, { wrapper: createWrapper() });

    await screen.findByText('PO-001');
    fireEvent.change(screen.getByLabelText('Extra qty audit filter'), { target: { value: 'recently_changed' } });

    await waitFor(() => {
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          extraQtyAuditState: 'recently_changed',
        }),
      );
    });
  });

  it('submits manual PO creation with selected supplier and variant item', async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderListView />, { wrapper: createWrapper() });

    await screen.findByText('PO-001');

    const supplierInputs = screen.getAllByLabelText('Search supplier');
    await user.type(supplierInputs[1], 'sup-1');
    await user.type(screen.getByLabelText('Search variant'), 'var-1');
    await user.type(screen.getByPlaceholderText('Optional procurement remark'), 'Manual urgent PO');

    await user.click(screen.getByRole('button', { name: 'Create Manual PO' }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: 'sup-1',
          remarks: 'Manual urgent PO',
          items: [expect.objectContaining({ orderedQty: 1, unitCost: 0, taxRate: 0 })],
        }),
      );
    });

    expect(await screen.findByText('Purchase order created successfully.')).toBeInTheDocument();
  });

  it('submits demand-based PO generation with selected supplier, consolidation, and extra procurement qty', async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderListView />, { wrapper: createWrapper() });

    await screen.findByText('PO-001');

    const supplierInputs = screen.getAllByLabelText('Search supplier');
    fireEvent.change(supplierInputs[0], { target: { value: 'sup-1' } });
    fireEvent.change(screen.getByLabelText('Search approved consolidation'), { target: { value: 'dem-1' } });

    expect(await screen.findByText('Extra Procurement Beyond Retailer Demand')).toBeInTheDocument();
    expect(await screen.findByText('Sudha Milk')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Extra qty SKU-001'), { target: { value: '5' } });

    await user.click(screen.getByRole('button', { name: 'Generate PO from Demand' }));

    await waitFor(() => {
      expect(mockCreateFromDemand).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: 'sup-1',
          demandConsolidationId: 'dem-1',
          items: [expect.objectContaining({ variantId: 'var-1', extraQty: 5 })],
        }),
      );
    });

    expect(await screen.findByText('Purchase order generated from demand successfully.')).toBeInTheDocument();
  });

  it('quick-edits extra procurement qty from the list page for a demand-generated draft PO', async () => {
    mockList.mockResolvedValueOnce({
      data: [
        {
          id: 'po-1',
          poNo: 'PO-001',
          supplierId: 'sup-1',
          poDate: '2026-07-13',
          status: 'draft',
          grandTotal: 1200,
          supplier: { name: 'Sudha Dairy' },
          demandConsolidation: { id: 'dem-1', consolidationNo: 'DCON-001' },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const user = userEvent.setup();
    render(<PurchaseOrderListView />, { wrapper: createWrapper() });

    await screen.findByText('PO-001');
    await user.click(screen.getByRole('button', { name: 'Quick Edit Extra Qty' }));

    expect(await screen.findByText('Quick Edit Extra Procurement Qty')).toBeInTheDocument();
    expect(
      await screen.findByText((_, element) => element?.textContent === 'Preview total: ₹462.00'),
    ).toBeInTheDocument();

    const extraQtyInput = await screen.findByLabelText('Quick edit extra qty SKU-001');
    fireEvent.change(extraQtyInput, { target: { value: '5' } });

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Preview total: ₹525.00'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('₹525.00').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Save Quick Edit' }));

    await waitFor(() => {
      expect(mockUpdateDemandExtras).toHaveBeenCalledWith('po-1', {
        items: [{ variantId: 'var-1', extraQty: 5 }],
      });
    });

    expect(await screen.findByText('Extra procurement quantities updated successfully.')).toBeInTheDocument();
  });

  it('approves a draft purchase order from the list action', async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderListView />, { wrapper: createWrapper() });

    await screen.findByText('PO-001');
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith('po-1');
    });

    expect(await screen.findByText('Purchase order approved successfully.')).toBeInTheDocument();
  });
});
