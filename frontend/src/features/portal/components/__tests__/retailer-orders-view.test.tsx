import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortalOrdersView } from '../portal-orders-view';

const mockGetOrders = vi.fn();
const mockRepeatOrder = vi.fn();

vi.mock('../../api', () => ({
  PortalApi: {
    getOrders: (...args: any[]) => mockGetOrders(...args),
    repeatOrder: (...args: any[]) => mockRepeatOrder(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'portal' && queryKey[1] === 'orders') {
        return { data: mockGetOrders(), isLoading: false, error: null };
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

describe('PortalOrdersView (Retailer Self-Service & Assisted Orders)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrders.mockReturnValue({
      success: true,
      data: [
        {
          id: 'order-1',
          orderNo: 'SO-20260716-0001',
          orderDate: '2026-07-16T10:00:00Z',
          source: 'salesperson',
          orderingModeSnapshot: 'assisted',
          status: 'approved',
          grandTotal: 15400,
          deliveryCycle: {
            id: 'cycle-1',
            cycleCode: 'CYC-MORNING',
            deliveryDate: '2026-07-17T00:00:00Z',
            deliveryShift: 'morning',
          },
        },
        {
          id: 'order-2',
          orderNo: 'SO-20260716-0002',
          orderDate: '2026-07-16T11:00:00Z',
          source: 'retailer',
          orderingModeSnapshot: 'self_service',
          status: 'dispatched',
          grandTotal: 8250,
          deliveryCycle: {
            id: 'cycle-2',
            cycleCode: 'CYC-EVENING',
            deliveryDate: '2026-07-17T00:00:00Z',
            deliveryShift: 'evening',
          },
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      },
    });
  });

  it('renders both assisted orders placed by admin/salesperson and self-service orders clearly', () => {
    render(<PortalOrdersView />);
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('SO-20260716-0001')).toBeInTheDocument();
    expect(screen.getByText('SO-20260716-0002')).toBeInTheDocument();

    expect(screen.getByText('Assisted Order')).toBeInTheDocument();
    expect(screen.getByText('Self-Service')).toBeInTheDocument();
    expect(screen.getByText('Source: salesperson')).toBeInTheDocument();
    expect(screen.getByText('Source: retailer')).toBeInTheDocument();
  });

  it('displays delivery shift and formatted grand totals', () => {
    render(<PortalOrdersView />);
    expect(screen.getByText('Shift: morning')).toBeInTheDocument();
    expect(screen.getByText('Shift: evening')).toBeInTheDocument();
    expect(screen.getAllByText(/15,400/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/8,250/)[0]).toBeInTheDocument();
  });

  it('triggers repeat order request on button click', async () => {
    mockRepeatOrder.mockResolvedValue({ success: true });
    render(<PortalOrdersView />);

    const repeatButtons = screen.getAllByText('Repeat');
    fireEvent.click(repeatButtons[0]);

    await waitFor(() => {
      expect(mockRepeatOrder).toHaveBeenCalledWith('order-1');
      expect(screen.getByText('Order repeat request created successfully.')).toBeInTheDocument();
    });
  });
});
