import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OutstandingReportView } from '../outstanding-report-view';

const mockGetOutstanding = vi.fn();

vi.mock('../../api', () => ({
  ReportsApi: {
    getOutstanding: (...args: any[]) => mockGetOutstanding(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'reports' && queryKey[1] === 'outstanding') {
        return { data: mockGetOutstanding(), isLoading: false, error: null };
      }
      return { data: null, isLoading: false };
    },
  };
});

describe('OutstandingReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOutstanding.mockReturnValue({
      success: true,
      data: {
        totalOutstanding: 62500,
        rows: [
          {
            id: 'inv-1',
            invoiceNo: 'INV-20260710-0001',
            invoiceDate: '2026-07-10T09:00:00Z',
            dueDate: '2026-07-15T00:00:00Z',
            outstandingAmount: 25000,
            retailer: {
              id: 'ret-1',
              shopName: 'Patna Dairy Hub',
            },
          },
        ],
      },
    });
  });

  it('renders outstanding report totals and overdue retailer invoices', () => {
    render(<OutstandingReportView />);
    expect(screen.getByText('Outstanding Report')).toBeInTheDocument();
    expect(screen.getAllByText(/62,500/)[0]).toBeInTheDocument();
    expect(screen.getByText('INV-20260710-0001')).toBeInTheDocument();
    expect(screen.getByText('Patna Dairy Hub')).toBeInTheDocument();
  });
});
