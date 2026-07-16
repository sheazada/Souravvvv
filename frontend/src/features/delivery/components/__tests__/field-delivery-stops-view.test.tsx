import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FieldDeliveryStopsView } from '../field-delivery-stops-view';

const mockGetMyTripsToday = vi.fn();
const mockGetMyTripStops = vi.fn();
const mockGetMyCollectionSummary = vi.fn();
const mockUpdateMyStopStatus = vi.fn();
const mockAddMyCollection = vi.fn();
const mockAddMyCrateTransaction = vi.fn();

vi.mock('../../api', () => ({
  DeliveryApi: {
    getMyTripsToday: (...args: any[]) => mockGetMyTripsToday(...args),
    getMyTripStops: (...args: any[]) => mockGetMyTripStops(...args),
    getMyCollectionSummary: (...args: any[]) => mockGetMyCollectionSummary(...args),
    updateMyStopStatus: (...args: any[]) => mockUpdateMyStopStatus(...args),
    addMyCollection: (...args: any[]) => mockAddMyCollection(...args),
    addMyCrateTransaction: (...args: any[]) => mockAddMyCrateTransaction(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
      if (enabled === false) return { data: null, isLoading: false };
      if (queryKey[0] === 'my-trips-today') {
        return { data: mockGetMyTripsToday(), isLoading: false };
      }
      if (queryKey[0] === 'my-trip-stops') {
        return { data: mockGetMyTripStops(), isLoading: false };
      }
      if (queryKey[0] === 'my-collection-summary') {
        return { data: mockGetMyCollectionSummary(), isLoading: false };
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

describe('FieldDeliveryStopsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMyTripsToday.mockReturnValue({
      success: true,
      data: [
        {
          id: 'trip-1',
          tripNo: 'TRIP-DEL-001',
          status: 'dispatched',
          totalStops: 1,
          route: { id: 'route-1', name: 'Patna Route Zone' },
        },
      ],
    });
    mockGetMyTripStops.mockReturnValue({
      success: true,
      data: [
        {
          id: 'stop-1',
          stopSequence: 1,
          status: 'pending',
          retailer: { id: 'ret-1', shopName: 'Patna Dairy Shop', mobile: '9999999999', locality: 'Boring Road' },
          items: [
            {
              id: 'item-1',
              variantId: 'var-1',
              orderedQty: 25,
              loadedQty: 25,
              deliveredQty: 0,
              unitPrice: 50,
            },
          ],
        },
      ],
    });
    mockGetMyCollectionSummary.mockReturnValue({
      success: true,
      data: {
        totalCount: 1,
        totalAmount: 1250,
        payments: [],
      },
    });
  });

  it('renders driver active trip header, collection summary, and stop sequence cards', () => {
    render(<FieldDeliveryStopsView />);
    expect(screen.getByText('Driver Field Delivery & Route Execution')).toBeInTheDocument();
    expect(screen.getAllByText('₹1,250')[0]).toBeInTheDocument();
    expect(screen.getByText('Patna Dairy Shop')).toBeInTheDocument();
    expect(screen.getByText('Stop #1')).toBeInTheDocument();
  });

  it('opens payment collection modal and submits cash entry', async () => {
    mockAddMyCollection.mockResolvedValue({ success: true });

    render(<FieldDeliveryStopsView />);
    fireEvent.click(screen.getByText('Collect Payment'));

    expect(screen.getByText('Record Payment Collection')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm Collection'));

    await waitFor(() => {
      expect(mockAddMyCollection).toHaveBeenCalledWith('stop-1', expect.objectContaining({ amount: 500, paymentMode: 'cash' }));
    });
  });

  it('opens delivery execution modal and confirms delivered items', async () => {
    mockUpdateMyStopStatus.mockResolvedValue({ success: true });

    render(<FieldDeliveryStopsView />);
    fireEvent.click(screen.getByText('Execute Stop'));

    expect(screen.getByText('Verify Delivered & Returned Quantities')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm Delivery Execution'));

    await waitFor(() => {
      expect(mockUpdateMyStopStatus).toHaveBeenCalledWith('stop-1', expect.objectContaining({ status: 'delivered' }));
    });
  });
});
