import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortalInvoicesView } from '../portal-invoices-view';

const mockGetInvoices = vi.fn();
const mockExportInvoice = vi.fn();

vi.mock('../../api', () => ({
  PortalApi: {
    getInvoices: (...args: any[]) => mockGetInvoices(...args),
    exportInvoice: (...args: any[]) => mockExportInvoice(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'portal' && queryKey[1] === 'invoices') {
        return { data: mockGetInvoices(), isLoading: false, error: null };
      }
      return { data: null, isLoading: false };
    },
  };
});

describe('PortalInvoicesView (Assisted Billing, Revisions & Single-Click Export)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInvoices.mockReturnValue({
      success: true,
      data: [
        {
          id: 'inv-1',
          invoiceNo: 'INV-20260716-0001',
          invoiceDate: '2026-07-16T08:30:00Z',
          source: 'assisted_billing',
          status: 'posted',
          grandTotal: 12500,
          outstandingAmount: 12500,
        },
        {
          id: 'inv-2',
          invoiceNo: 'INV-20260715-0088-R1',
          invoiceDate: '2026-07-15T16:00:00Z',
          source: 'auto',
          status: 'revised',
          grandTotal: 9400,
          outstandingAmount: 4400,
        },
        {
          id: 'inv-3',
          invoiceNo: 'INV-20260710-0012',
          invoiceDate: '2026-07-10T12:00:00Z',
          source: 'manual',
          status: 'paid',
          grandTotal: 5000,
          outstandingAmount: 0,
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      },
    });
  });

  it('renders assisted billing badges alongside route delivery billing invoices', () => {
    render(<PortalInvoicesView />);
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    expect(screen.getByText('INV-20260716-0001')).toBeInTheDocument();
    expect(screen.getByText('Assisted Billing')).toBeInTheDocument();
    expect(screen.getByText('Delivery Billing')).toBeInTheDocument();
  });

  it('highlights revision invoices and displays exact status indicators', () => {
    render(<PortalInvoicesView />);
    expect(screen.getByText('REVISION')).toBeInTheDocument();
    expect(screen.getByText('Partial / Unpaid')).toBeInTheDocument();
    expect(screen.getAllByText('Revised').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0);
  });

  it('triggers single-click PDF export on button click', async () => {
    mockExportInvoice.mockResolvedValue({
      success: true,
      data: {
        format: 'pdf',
        fileName: 'INV-20260716-0001.pdf',
        invoice: {},
      },
    });

    render(<PortalInvoicesView />);
    const pdfButtons = screen.getAllByText('PDF');
    fireEvent.click(pdfButtons[0]);

    await waitFor(() => {
      expect(mockExportInvoice).toHaveBeenCalledWith('inv-1', 'pdf');
      expect(
        screen.getByText('Invoice INV-20260716-0001 exported successfully (INV-20260716-0001.pdf).')
      ).toBeInTheDocument();
    });
  });
});
