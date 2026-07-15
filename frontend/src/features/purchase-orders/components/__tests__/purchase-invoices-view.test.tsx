import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PurchaseInvoicesView } from '../purchase-invoices-view';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockPost = vi.fn();
const mockGetSuppliers = vi.fn();
const mockGetVariants = vi.fn();

vi.mock('../../api', () => ({
  PurchaseInvoicesApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

vi.mock('@/features/lookups/api', () => ({
  LookupsApi: {
    getSuppliers: (...args: any[]) => mockGetSuppliers(...args),
    getProductVariants: (...args: any[]) => mockGetVariants(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'purchase-invoices') {
        return { data: mockList(), isLoading: false };
      }
      if (queryKey[0] === 'lookups-suppliers-all') {
        return { data: mockGetSuppliers(), isLoading: false };
      }
      if (queryKey[0] === 'lookups-variants-all') {
        return { data: mockGetVariants(), isLoading: false };
      }
      return { data: null, isLoading: false };
    },
    useMutation: ({ mutationFn, onSuccess }: any) => ({
      mutate: async (...args: any[]) => {
        const res = await mutationFn(...args);
        onSuccess?.(res);
      },
      isPending: false,
    }),
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

describe('PurchaseInvoicesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockReturnValue({
      success: true,
      data: [
        {
          id: 'pinv-1',
          invoiceNo: 'PINV-2026-001',
          supplierId: 'sup-1',
          invoiceDate: '2026-07-15T00:00:00.000Z',
          taxableAmount: 2000,
          taxTotal: 100,
          grandTotal: 2100,
          status: 'draft',
          supplier: { id: 'sup-1', name: 'Sudha Dairy Plant' },
        },
      ],
      meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
    });
    mockGetSuppliers.mockReturnValue({
      success: true,
      data: [{ id: 'sup-1', name: 'Sudha Dairy Plant' }],
    });
    mockGetVariants.mockReturnValue({
      success: true,
      data: [{ id: 'var-1', variantName: '500ml Pouch' }],
    });
  });

  it('renders purchase invoices list showing supplier and totals', () => {
    render(<PurchaseInvoicesView />);
    expect(screen.getByText('Supplier Purchase Invoices')).toBeInTheDocument();
    expect(screen.getByText('PINV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Sudha Dairy Plant')).toBeInTheDocument();
    expect(screen.getByText('₹2,100')).toBeInTheDocument();
  });

  it('opens new purchase invoice modal and saves entry', async () => {
    mockCreate.mockResolvedValue({ success: true });

    render(<PurchaseInvoicesView />);
    fireEvent.click(screen.getByText('New Purchase Invoice'));

    expect(screen.getByText('New Purchase Invoice Entry')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('PINV-2026-001'), { target: { value: 'PINV-2026-002' } });

    fireEvent.click(screen.getByText('Save Invoice Entry'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceNo: 'PINV-2026-002',
        }),
      );
    });
  });
});
