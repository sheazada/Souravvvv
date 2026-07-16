import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollectionReportView } from '../collection-report-view';

const mockGetCollection = vi.fn();

vi.mock('../../api', () => ({
  ReportsApi: {
    getCollection: (...args: any[]) => mockGetCollection(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'reports' && queryKey[1] === 'collection') {
        return { data: mockGetCollection(), isLoading: false, error: null };
      }
      return { data: null, isLoading: false };
    },
  };
});

describe('CollectionReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCollection.mockReturnValue({
      success: true,
      data: {
        totalAmount: 18500,
        receiptCount: 4,
        byMode: [
          { paymentMode: 'upi', amount: 12000 },
          { paymentMode: 'cash', amount: 6500 },
        ],
        rows: [
          {
            id: 'rec-1',
            receiptNo: 'REC-20260716-0001',
            paymentDate: '2026-07-16T14:00:00Z',
            partyType: 'retailer',
            paymentMode: 'upi',
            amount: 12000,
          },
        ],
      },
    });
  });

  it('renders collection report header, payment mode breakdown, and receipt list', () => {
    render(<CollectionReportView />);
    expect(screen.getByText('Collection Report')).toBeInTheDocument();
    expect(screen.getAllByText(/18,500/)[0]).toBeInTheDocument();
    expect(screen.getAllByText('upi')[0]).toBeInTheDocument();
    expect(screen.getAllByText('cash')[0]).toBeInTheDocument();
    expect(screen.getByText('REC-20260716-0001')).toBeInTheDocument();
  });
});
