import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyDispatchReportView } from '../daily-dispatch-report-view';

const mockGetDailyDispatch = vi.fn();

vi.mock('../../api', () => ({
  ReportsApi: {
    getDailyDispatch: (...args: any[]) => mockGetDailyDispatch(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'reports' && queryKey[1] === 'daily-dispatch') {
        return { data: mockGetDailyDispatch(), isLoading: false, error: null };
      }
      return { data: null, isLoading: false };
    },
  };
});

describe('DailyDispatchReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDailyDispatch.mockReturnValue({
      success: true,
      data: [
        {
          id: 'trip-1',
          tripNo: 'TRIP-20260716-0001',
          dispatchDate: '2026-07-16T06:00:00Z',
          loadedQty: 250,
          status: 'dispatched',
          route: { id: 'route-1', name: 'Patna North Zone' },
          vehicle: { id: 'veh-1', vehicleNo: 'BR-01-GA-1234' },
          stopSummary: {
            delivered: 8,
            pending: 2,
            totalStops: 10,
          },
        },
      ],
    });
  });

  it('renders daily dispatch report header, route stops summary, and vehicle assignment', () => {
    render(<DailyDispatchReportView />);
    expect(screen.getByText('Daily Dispatch Report')).toBeInTheDocument();
    expect(screen.getByText('TRIP-20260716-0001')).toBeInTheDocument();
    expect(screen.getByText('Patna North Zone')).toBeInTheDocument();
    expect(screen.getByText('BR-01-GA-1234')).toBeInTheDocument();
    expect(screen.getByText('8/10 delivered')).toBeInTheDocument();
  });
});
