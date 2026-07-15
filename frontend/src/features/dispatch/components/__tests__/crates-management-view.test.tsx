import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CratesManagementView } from '../crates-management-view';

const mockListBalances = vi.fn();
const mockListTransactions = vi.fn();
const mockCreateTransaction = vi.fn();
const mockRecalculateBalances = vi.fn();
const mockRetailers = vi.fn();
const mockCrateTypes = vi.fn();

vi.mock('../../api', () => ({
  CratesApi: {
    listBalances: (...args: any[]) => mockListBalances(...args),
    listTransactions: (...args: any[]) => mockListTransactions(...args),
    createTransaction: (...args: any[]) => mockCreateTransaction(...args),
    recalculateBalances: (...args: any[]) => mockRecalculateBalances(...args),
  },
}));

vi.mock('@/features/lookups/api', () => ({
  LookupsApi: {
    retailers: (...args: any[]) => mockRetailers(...args),
    crateTypes: (...args: any[]) => mockCrateTypes(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
      if (enabled === false) return { data: null, isLoading: false };
      if (queryKey[0] === 'crates-balances') {
        return { data: mockListBalances(), isLoading: false };
      }
      if (queryKey[0] === 'crates-transactions') {
        return { data: mockListTransactions(), isLoading: false };
      }
      if (queryKey[0] === 'lookups-retailers-all') {
        return { data: mockRetailers(), isLoading: false };
      }
      if (queryKey[0] === 'lookups-cratetypes-all') {
        return { data: mockCrateTypes(), isLoading: false };
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

describe('CratesManagementView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListBalances.mockReturnValue({
      success: true,
      data: [
        {
          id: 'snap-1',
          retailerId: 'ret-1',
          crateTypeId: 'ct-1',
          issuedQty: 30,
          returnedQty: 10,
          damagedQty: 0,
          missingQty: 0,
          closingQty: 20,
          totalLiability: 3000,
          retailer: { id: 'ret-1', shopName: 'Patna Dairy Shop' },
          crateType: { id: 'ct-1', name: '24 Bottle Crate', depositValue: 150 },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    mockListTransactions.mockReturnValue({
      success: true,
      data: [
        {
          id: 'tx-1',
          crateTypeId: 'ct-1',
          retailerId: 'ret-1',
          transactionType: 'issue',
          quantity: 30,
          transactionDate: '2026-07-15T08:00:00.000Z',
          remarks: 'Morning dispatch issue',
          retailer: { id: 'ret-1', shopName: 'Patna Dairy Shop' },
          crateType: { id: 'ct-1', name: '24 Bottle Crate' },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    mockRetailers.mockReturnValue({
      success: true,
      data: [{ id: 'ret-1', shopName: 'Patna Dairy Shop' }],
    });
    mockCrateTypes.mockReturnValue({
      success: true,
      data: [{ id: 'ct-1', name: '24 Bottle Crate', depositValue: 150 }],
    });
  });

  it('renders balances tab by default with calculated deposit liabilities', () => {
    render(<CratesManagementView />);
    expect(screen.getByText('Crate & Container Accounting')).toBeInTheDocument();
    expect(screen.getByText('Patna Dairy Shop')).toBeInTheDocument();
    expect(screen.getByText('24 Bottle Crate')).toBeInTheDocument();
    expect(screen.getByText('₹3,000')).toBeInTheDocument(); // 20 * 150 = 3000
  });

  it('switches to transactions log tab and renders movement history', () => {
    render(<CratesManagementView />);
    fireEvent.click(screen.getByText('Container Movement Logs'));

    expect(screen.getByText('Issue (To Shop)')).toBeInTheDocument();
    expect(screen.getByText('Morning dispatch issue')).toBeInTheDocument();
  });

  it('opens record container modal and submits new issue transaction', async () => {
    mockCreateTransaction.mockResolvedValue({ success: true });

    render(<CratesManagementView />);
    fireEvent.click(screen.getByText('Record Container Transaction'));

    expect(screen.getByText('Record Container Issue / Return')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Record Transaction'));

    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: 'issue',
          quantity: 10,
        }),
      );
    });
  });
});
