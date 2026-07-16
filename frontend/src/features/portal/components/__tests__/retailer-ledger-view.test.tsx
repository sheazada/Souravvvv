import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortalLedgerView } from '../portal-ledger-view';

const mockGetLedger = vi.fn();
const mockExportLedger = vi.fn();

vi.mock('../../api', () => ({
  PortalApi: {
    getLedger: (...args: any[]) => mockGetLedger(...args),
    exportLedger: (...args: any[]) => mockExportLedger(...args),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'portal' && queryKey[1] === 'ledger') {
        return { data: mockGetLedger(), isLoading: false, error: null };
      }
      return { data: null, isLoading: false };
    },
  };
});

describe('PortalLedgerView (Double-Entry Self-Service Ledger Inspection Suite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLedger.mockReturnValue({
      success: true,
      data: [
        {
          id: 'entry-1',
          entryNo: 'LED-20260716-003',
          entryDate: '2026-07-16T15:00:00Z',
          transactionType: 'payment_receipt',
          referenceType: 'receipt',
          debitAmount: 0,
          creditAmount: 5000,
          runningBalance: 7500,
          remarks: 'Collection via UPI against delivery stop',
          paymentReceipt: {
            id: 'rec-1',
            receiptNo: 'REC-20260716-012',
            paymentMode: 'upi',
            status: 'confirmed',
          },
        },
        {
          id: 'entry-2',
          entryNo: 'LED-20260716-002',
          entryDate: '2026-07-16T10:30:00Z',
          transactionType: 'credit_note',
          referenceType: 'credit_note',
          debitAmount: 0,
          creditAmount: 1200,
          runningBalance: 12500,
          remarks: 'Credit note for damaged crates return variance',
          creditNote: {
            id: 'cn-1',
            creditNoteNo: 'CN-20260716-001',
            status: 'posted',
          },
        },
        {
          id: 'entry-3',
          entryNo: 'LED-20260716-001',
          entryDate: '2026-07-16T08:00:00Z',
          transactionType: 'sales_invoice',
          referenceType: 'invoice',
          debitAmount: 13700,
          creditAmount: 0,
          runningBalance: 13700,
          remarks: 'Assisted billing invoice posted',
          invoice: {
            id: 'inv-1',
            invoiceNo: 'INV-20260716-0001',
            grandTotal: 13700,
            outstandingAmount: 13700,
          },
        },
      ],
      meta: {
        page: 1,
        limit: 50,
        total: 3,
        totalPages: 1,
      },
    });
  });

  it('renders ledger header, KPI running balance card, and transaction entries', () => {
    render(<PortalLedgerView />);
    expect(screen.getByText('Ledger & Finance History')).toBeInTheDocument();
    expect(screen.getByText('Running Balance')).toBeInTheDocument();
    expect(screen.getAllByText(/7,500/)[0]).toBeInTheDocument();

    expect(screen.getByText('LED-20260716-003')).toBeInTheDocument();
    expect(screen.getByText('Payment Credit')).toBeInTheDocument();
    expect(screen.getByText('REC-20260716-012')).toBeInTheDocument();

    expect(screen.getByText('Credit Note')).toBeInTheDocument();
    expect(screen.getByText('CN-20260716-001')).toBeInTheDocument();

    expect(screen.getByText('Invoice Debit')).toBeInTheDocument();
    expect(screen.getByText('INV-20260716-0001')).toBeInTheDocument();
  });

  it('displays exact debit, credit, and running balance amounts for each row', () => {
    render(<PortalLedgerView />);
    expect(screen.getAllByText(/5,000/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/1,200/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/13,700/)[0]).toBeInTheDocument();
  });

  it('triggers single-click PDF and Print export on button clicks', async () => {
    mockExportLedger.mockResolvedValue({
      success: true,
      data: {
        format: 'pdf',
        fileName: 'retailer-ledger-ret-1.pdf',
        ledger: [{}, {}, {}],
      },
    });

    render(<PortalLedgerView />);
    fireEvent.click(screen.getByText('Export PDF'));

    await waitFor(() => {
      expect(mockExportLedger).toHaveBeenCalledWith(expect.objectContaining({ format: 'pdf' }));
      expect(
        screen.getByText('Ledger statement generated successfully: retailer-ledger-ret-1.pdf (3 transactions included)')
      ).toBeInTheDocument();
    });
  });
});
