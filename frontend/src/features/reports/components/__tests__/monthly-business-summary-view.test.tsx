import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthlyBusinessSummaryView } from '../monthly-business-summary-view';

const mockGetMonthlyBusinessSummary = vi.fn();

vi.mock('../../api', () => ({
  ReportsApi: {
    getMonthlyBusinessSummary: (...args: any[]) => mockGetMonthlyBusinessSummary(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'reports' && queryKey[1] === 'monthly-business-summary') {
        return { data: mockGetMonthlyBusinessSummary(), isLoading: false, error: null };
      }
      return { data: null, isLoading: false };
    },
  };
});

describe('MonthlyBusinessSummaryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMonthlyBusinessSummary.mockReturnValue({
      success: true,
      data: [
        {
          month: '2026-07',
          orderCount: 150,
          sales: 540000,
          collections: 510000,
          purchases: 320000,
          net: 220000,
        },
      ],
    });
  });

  it('renders monthly business summary header, aggregate totals, and net trends', () => {
    render(<MonthlyBusinessSummaryView />);
    expect(screen.getByText('Monthly Business Summary')).toBeInTheDocument();
    expect(screen.getAllByText(/5,40,000/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/5,10,000/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/2,20,000/)[0]).toBeInTheDocument();
    expect(screen.getByText('2026-07')).toBeInTheDocument();
  });
});
