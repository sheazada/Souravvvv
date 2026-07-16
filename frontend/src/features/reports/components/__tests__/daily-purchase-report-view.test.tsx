import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyPurchaseReportView } from '../daily-purchase-report-view';

const mockGetDailyPurchase = vi.fn();

vi.mock('../../api', () => ({
  ReportsApi: {
    getDailyPurchase: (...args: any[]) => mockGetDailyPurchase(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'reports' && queryKey[1] === 'daily-purchase') {
        return { data: mockGetDailyPurchase(), isLoading: false, error: null };
      }
      return { data: null, isLoading: false };
    },
  };
});

describe('DailyPurchaseReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDailyPurchase.mockReturnValue({
      success: true,
      data: [
        {
          id: 'po-1',
          poNo: 'PO-20260716-0001',
          poDate: '2026-07-16T10:00:00Z',
          orderedQty: 100,
          grandTotal: 45000,
          receiptCount: 1,
          status: 'received',
          supplier: {
            id: 'sup-1',
            name: 'Patna Milk Plant',
          },
        },
      ],
    });
  });

  it('renders daily purchase report header, KPI cards, and table rows', () => {
    render(<DailyPurchaseReportView />);
    expect(screen.getByText('Daily Purchase Report')).toBeInTheDocument();
    expect(screen.getByText('Purchase Orders')).toBeInTheDocument();
    expect(screen.getByText('PO-20260716-0001')).toBeInTheDocument();
    expect(screen.getByText('Patna Milk Plant')).toBeInTheDocument();
    expect(screen.getAllByText(/45,000/)[0]).toBeInTheDocument();
  });
});
