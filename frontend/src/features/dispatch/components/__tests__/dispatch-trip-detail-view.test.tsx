import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DispatchTripDetailView } from '../dispatch-trip-detail-view';

const mockGetById = vi.fn();
const mockGetLoadingSheet = vi.fn();
const mockGetChallan = vi.fn();
const mockAssignResources = vi.fn();
const mockGenerateLoadingSheet = vi.fn();
const mockGenerateChallan = vi.fn();
const mockStart = vi.fn();
const mockComplete = vi.fn();

vi.mock('@/features/dispatch/api', () => ({
  DispatchApi: {
    getById: (...args: any[]) => mockGetById(...args),
    getLoadingSheet: (...args: any[]) => mockGetLoadingSheet(...args),
    getChallan: (...args: any[]) => mockGetChallan(...args),
    assignResources: (...args: any[]) => mockAssignResources(...args),
    generateLoadingSheet: (...args: any[]) => mockGenerateLoadingSheet(...args),
    generateChallan: (...args: any[]) => mockGenerateChallan(...args),
    start: (...args: any[]) => mockStart(...args),
    complete: (...args: any[]) => mockComplete(...args),
  },
}));

vi.mock('@/config/admin-route-permissions', () => ({
  getAdminRouteMeta: () => ({
    pageTitle: 'Dispatch Trips',
    detailTitlePrefix: 'Dispatch Trip',
    detailPageDescription: 'Review dispatch trip execution.',
  }),
}));

vi.mock('@/lib/utils/title', () => ({
  buildDetailTitle: (prefix: string, code: string) => `${prefix}: ${code}`,
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

vi.mock('@/components/ui/page-header', () => ({
  PageHeader: ({ title, description }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/components/ui/kpi-card', () => ({
  KpiCard: ({ label, value }: any) => (
    <div>
      <span>{label}</span>
      <span>{String(value)}</span>
    </div>
  ),
}));

vi.mock('@/components/feedback/empty-state', () => ({
  EmptyState: ({ title, description }: any) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
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

function createTrip(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trip-1',
    tripNo: 'TRIP-001',
    deliveryCycleId: 'cycle-1',
    routeId: 'route-1',
    dispatchDate: '2026-07-13',
    status: 'planned',
    totalStops: 2,
    totalCratesLoaded: 40,
    route: { id: 'route-1', code: 'R-1', name: 'Main Route', deliveryShift: 'morning' },
    deliveryCycle: { id: 'cycle-1', cycleCode: 'DC-001', deliveryDate: '2026-07-13', deliveryShift: 'morning' },
    vehicleId: null,
    driverEmployeeId: null,
    helperEmployeeId: null,
    vehicle: null,
    driver: null,
    helper: null,
    challan: null,
    items: [],
    stops: [
      {
        id: 'stop-1',
        retailerId: 'ret-1',
        salesOrderId: 'so-1',
        stopSequence: 1,
        status: 'planned',
        cratesIssued: 10,
        emptyCratesReceived: 0,
        retailer: { id: 'ret-1', retailerCode: 'RET-1', shopName: 'Gupta Store', mobile: '9999999999', locality: 'Patna' },
        salesOrder: { id: 'so-1', orderNo: 'SO-001', status: 'confirmed', source: 'admin' },
        items: [],
      },
    ],
    ...overrides,
  };
}

describe('DispatchTripDetailView', () => {
  beforeEach(() => {
    mockGetById.mockResolvedValue({ data: createTrip() });
    mockGetLoadingSheet.mockResolvedValue({
      data: {
        tripId: 'trip-1',
        tripNo: 'TRIP-001',
        loadingSheetNo: 'LS-001',
        status: 'loaded',
        items: [
          {
            id: 'item-1',
            variantId: 'var-1',
            plannedQty: 30,
            loadedQty: 28,
            stockOnHand: 120,
            warehouse: { id: 'wh-1', code: 'WH-1', name: 'Main Warehouse' },
            variant: { id: 'var-1', sku: 'SKU-001', variantName: '500 ml', productId: 'prod-1', productName: 'Sudha Milk' },
          },
        ],
      },
    });
    mockGetChallan.mockResolvedValue({
      data: {
        challan: {
          id: 'chal-1',
          challanNo: 'CH-001',
          issueDate: '2026-07-13T08:00:00.000Z',
          status: 'issued',
        },
        trip: createTrip(),
      },
    });
    mockAssignResources.mockResolvedValue({ success: true, data: createTrip() });
    mockGenerateLoadingSheet.mockResolvedValue({ success: true });
    mockGenerateChallan.mockResolvedValue({ success: true });
    mockStart.mockResolvedValue({ success: true });
    mockComplete.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders trip details, loading sheet rows, challan summary, and stop links', async () => {
    render(<DispatchTripDetailView id="trip-1" />, { wrapper: createWrapper() });

    expect(await screen.findByText('Dispatch Trip: TRIP-001')).toBeInTheDocument();
    expect(screen.getByText('Main Route')).toBeInTheDocument();
    expect(screen.getByText('Sudha Milk')).toBeInTheDocument();
    expect(screen.getByText('Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText('CH-001')).toBeInTheDocument();
    expect(screen.getByText('1. Gupta Store')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Stop' })).toHaveAttribute('href', '/app/delivery-stops/stop-1');
  });

  it('submits assigned vehicle, driver, and helper resources', async () => {
    const user = userEvent.setup();
    mockGetLoadingSheet.mockResolvedValueOnce({ data: null });
    mockGetChallan.mockResolvedValueOnce({ data: { challan: null, trip: createTrip() } });

    render(<DispatchTripDetailView id="trip-1" />, { wrapper: createWrapper() });

    await screen.findByText('Dispatch Trip: TRIP-001');

    fireEvent.change(screen.getByLabelText('Search vehicle'), { target: { value: 'vehicle-1' } });
    fireEvent.change(screen.getByLabelText('Search driver'), { target: { value: 'driver-1' } });
    fireEvent.change(screen.getByLabelText('Search helper / staff'), { target: { value: 'helper-1' } });

    await user.click(screen.getByRole('button', { name: 'Assign Resources' }));

    await waitFor(() => {
      expect(mockAssignResources).toHaveBeenCalledWith('trip-1', {
        vehicleId: 'vehicle-1',
        driverEmployeeId: 'driver-1',
        helperEmployeeId: 'helper-1',
      });
    });

    expect(await screen.findByText('Dispatch resources assigned successfully.')).toBeInTheDocument();
  });

  it('starts a loaded trip from the detail action', async () => {
    const user = userEvent.setup();
    mockGetById.mockResolvedValueOnce({
      data: createTrip({
        status: 'loaded',
        vehicleId: 'vehicle-1',
        driverEmployeeId: 'driver-1',
        helperEmployeeId: 'helper-1',
        vehicle: { id: 'vehicle-1', vehicleNo: 'BR01AB1234', vehicleType: 'van' },
        driver: { id: 'driver-1', employeeCode: 'EMP-1', fullName: 'Ravi Kumar', mobile: '9999999999' },
        helper: { id: 'helper-1', employeeCode: 'EMP-2', fullName: 'Amit Kumar', mobile: '8888888888' },
      }),
    });
    mockGetLoadingSheet.mockResolvedValueOnce({ data: { tripId: 'trip-1', tripNo: 'TRIP-001', status: 'loaded', items: [] } });
    mockGetChallan.mockResolvedValueOnce({ data: { challan: null, trip: createTrip({ status: 'loaded' }) } });

    render(<DispatchTripDetailView id="trip-1" />, { wrapper: createWrapper() });

    await screen.findByText('Dispatch Trip: TRIP-001');
    await user.click(screen.getByRole('button', { name: 'Start Trip' }));

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith('trip-1');
    });

    expect(await screen.findByText('Dispatch trip started successfully.')).toBeInTheDocument();
  });
});
