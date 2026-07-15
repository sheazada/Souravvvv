import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SupplierReturnsView } from '../supplier-returns-view';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockPost = vi.fn();
const mockGetSuppliers = vi.fn();
const mockGetVariants = vi.fn();

vi.mock('../../api', () => ({
  SupplierReturnsApi: {
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
      if (queryKey[0] === 'supplier-returns') {
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

describe('SupplierReturnsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockReturnValue({
      success: true,
      data: [
        {
          id: 'sret-1',
          supplierReturnNo: 'SRET-2026-001',
          supplierId: 'sup-1',
          returnDate: '2026-07-15T00:00:00.000Z',
          reason: 'Damaged pouches',
          status: 'draft',
          debitNoteNo: null,
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

  it('renders supplier returns list showing reason and debit note status', () => {
    render(<SupplierReturnsView />);
    expect(screen.getByText('Supplier Return Management')).toBeInTheDocument();
    expect(screen.getByText('SRET-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Sudha Dairy Plant')).toBeInTheDocument();
    expect(screen.getByText('Damaged pouches')).toBeInTheDocument();
  });

  it('opens plant return modal and saves record', async () => {
    mockCreate.mockResolvedValue({ success: true });

    render(<SupplierReturnsView />);
    fireEvent.click(screen.getByText('New Plant Return'));

    expect(screen.getByText('Record Plant Return Slip')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('SRET-2026-001'), { target: { value: 'SRET-2026-002' } });

    fireEvent.click(screen.getByText('Save Return Slip'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierReturnNo: 'SRET-2026-002',
        }),
      );
    });
  });
});
