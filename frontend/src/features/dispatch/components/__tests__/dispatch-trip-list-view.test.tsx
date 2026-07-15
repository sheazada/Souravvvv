import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DispatchTripListView } from '../dispatch-trip-list-view';

const mockList = vi.fn();
const mockGenerate = vi.fn();
const mockStart = vi.fn();
const mockComplete = vi.fn();

vi.mock('@/features/dispatch/api', () => ({
  DispatchApi: {
    list: (...args: any[]) => mockList(...args),
    generate: (...args: any[]) => mockGenerate(...args),
    start: (...args: any[]) => mockStart(...args),
    complete: (...args: any[]) => mockComplete(...args),
  },
}));

vi.mock('@/config/admin-route-permissions', () => ({
  getAdminRouteMeta: () => ({
    pageTitle: 'Dispatch Trips',
    pageDescription: 'Manage dispatch trips',
  }),
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

describe('DispatchTripListView', () => {
  beforeEach(() => {
    mockList.mockResolvedValue({
      data: [
        {
          id: 'trip-1',
          tripNo: 'TRIP-001',
          routeId: 'route-1',
          deliveryCycleId: 'cycle-1',
          dispatchDate: '2026-07-13',
          status: 'loaded',
          totalStops: 5,
          totalCratesLoaded: 40,
          route: { name: 'Main Route' },
          deliveryCycle: { cycleCode: 'DC-001' },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    mockGenerate.mockResolvedValue({ success: true, data: { id: 'trip-2' } });
    mockStart.mockResolvedValue({ success: true });
    mockComplete.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation when dispatch trip generation is submitted without cycle and route', async () => {
    const user = userEvent.setup();
    render(<DispatchTripListView />, { wrapper: createWrapper() });

    await screen.findByText('TRIP-001');
    await user.click(screen.getByRole('button', { name: 'Generate Dispatch Trip' }));

    expect(await screen.findByText('Delivery cycle ID and route ID are required.')).toBeInTheDocument();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('submits dispatch trip generation with selected resources', async () => {
    const user = userEvent.setup();
    render(<DispatchTripListView />, { wrapper: createWrapper() });

    await screen.findByText('TRIP-001');

    fireEvent.change(screen.getByLabelText('Search delivery cycle'), { target: { value: 'cycle-1' } });
    fireEvent.change(screen.getByLabelText('Search route'), { target: { value: 'route-1' } });
    fireEvent.change(screen.getByLabelText('Search vehicle'), { target: { value: 'vehicle-1' } });
    fireEvent.change(screen.getByLabelText('Search driver'), { target: { value: 'driver-1' } });
    fireEvent.change(screen.getByLabelText('Search helper / staff'), { target: { value: 'helper-1' } });

    await user.click(screen.getByRole('button', { name: 'Generate Dispatch Trip' }));

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryCycleId: 'cycle-1',
          routeId: 'route-1',
          vehicleId: 'vehicle-1',
          driverEmployeeId: 'driver-1',
          helperEmployeeId: 'helper-1',
        }),
      );
    });

    expect(await screen.findByText('Dispatch trip generated successfully.')).toBeInTheDocument();
  });

  it('starts a loaded dispatch trip from the list action', async () => {
    const user = userEvent.setup();
    render(<DispatchTripListView />, { wrapper: createWrapper() });

    await screen.findByText('TRIP-001');
    await user.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith('trip-1');
    });

    expect(await screen.findByText('Dispatch trip started successfully.')).toBeInTheDocument();
  });
});
