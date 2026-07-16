'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { PortalApi } from '@/features/portal/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export function PortalLedgerView() {
  const [search, setSearch] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const queryKey = useMemo(
    () => ['portal', 'ledger', search, transactionType, fromDate, toDate],
    [search, transactionType, fromDate, toDate]
  );

  const query = useQuery({
    queryKey,
    queryFn: () =>
      PortalApi.getLedger({
        page: 1,
        limit: 50,
        search: search || undefined,
        transactionType: transactionType || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  const currentBalance = rows.length > 0 ? rows[0].runningBalance : 0;
  const totalDebits = rows.reduce((acc, row) => acc + (Number(row.debitAmount) || 0), 0);
  const totalCredits = rows.reduce((acc, row) => acc + (Number(row.creditAmount) || 0), 0);

  const handleExport = async (format: 'pdf' | 'print') => {
    try {
      setExportMessage(`Generating ${format.toUpperCase()} ledger statement...`);
      const response = await PortalApi.exportLedger({
        format,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      if (response.success && response.data) {
        setExportMessage(
          `Ledger statement generated successfully: ${response.data.fileName} (${response.data.ledger.length} transactions included)`
        );
      }
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : 'Failed to export ledger statement');
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'sales_invoice':
        return { label: 'Invoice Debit', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'payment_receipt':
        return { label: 'Payment Credit', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'credit_note':
        return { label: 'Credit Note', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
      case 'debit_note':
        return { label: 'Debit Note', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'invoice_cancellation':
        return { label: 'Invoice Cancel', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      default:
        return { label: type.replace(/_/g, ' ').toUpperCase(), color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div>
      <PageHeader
        title="Ledger & Finance History"
        description="Inspect double-entry ledger running balance, invoice revisions, credit/debit notes, and delivery variances."
      />

      {exportMessage ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 flex items-center justify-between">
          <span>{exportMessage}</span>
          <button
            type="button"
            onClick={() => setExportMessage(null)}
            className="text-xs font-semibold underline hover:text-cyan-950"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Running Balance" value={formatCurrency(currentBalance)} />
        <KpiCard label="Total Entries" value={meta?.total ?? rows.length} />
        <KpiCard label="Period Debits" value={formatCurrency(totalDebits)} />
        <KpiCard label="Period Credits" value={formatCurrency(totalCredits)} />
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entry no or notes"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
        <select
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        >
          <option value="">All Transactions</option>
          <option value="sales_invoice">Invoices</option>
          <option value="payment_receipt">Payments & Collections</option>
          <option value="credit_note">Credit Notes</option>
          <option value="debit_note">Debit Notes</option>
          <option value="invoice_cancellation">Cancellations & Adjustments</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          aria-label="From Date"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          aria-label="To Date"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setTransactionType('');
              setFromDate('');
              setToDate('');
            }}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="rounded-xl border border-cyan-600 bg-cyan-600 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-700 shadow-sm"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => handleExport('print')}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Print
          </button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="text-sm text-slate-500">Loading ledger transactions...</div>
      ) : query.error ? (
        <EmptyState
          title="Unable to load ledger"
          description={query.error instanceof Error ? query.error.message : 'Unknown ledger error'}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No ledger transactions found"
          description="Posted invoices, payment receipts, credit notes, and delivery variances will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Date / Entry No</th>
                  <th className="px-4 py-3 font-medium">Type / Details</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium text-right">Debit (₹)</th>
                  <th className="px-4 py-3 font-medium text-right">Credit (₹)</th>
                  <th className="px-4 py-3 font-medium text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => {
                  const badge = getTransactionLabel(row.transactionType);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-950">
                          {new Date(row.entryDate).toLocaleDateString('en-IN')}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">{row.entryNo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                        {row.remarks ? <div className="mt-1 text-xs text-slate-600">{row.remarks}</div> : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.invoice ? (
                          <div>
                            <Link
                              href={`/portal/invoices/${row.invoice.id}`}
                              className="font-medium text-cyan-700 hover:underline"
                            >
                              {row.invoice.invoiceNo}
                            </Link>
                            <div className="text-xs text-slate-500">
                              Inv Total: {formatCurrency(row.invoice.grandTotal)}
                            </div>
                          </div>
                        ) : row.paymentReceipt ? (
                          <div>
                            <span className="font-medium text-slate-900">{row.paymentReceipt.receiptNo}</span>
                            <div className="text-xs text-slate-500">Mode: {row.paymentReceipt.paymentMode}</div>
                          </div>
                        ) : row.creditNote ? (
                          <div>
                            <span className="font-medium text-slate-900">{row.creditNote.creditNoteNo}</span>
                            <div className="text-xs text-slate-500">Status: {row.creditNote.status}</div>
                          </div>
                        ) : row.debitNote ? (
                          <div>
                            <span className="font-medium text-slate-900">{row.debitNote.debitNoteNo}</span>
                            <div className="text-xs text-slate-500">Status: {row.debitNote.status}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 whitespace-nowrap">
                        {row.debitAmount > 0 ? formatCurrency(row.debitAmount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                        {row.creditAmount > 0 ? formatCurrency(row.creditAmount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-950 whitespace-nowrap">
                        {formatCurrency(row.runningBalance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span>
              Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}
            </span>
            <span>{meta?.total ?? rows.length} ledger transactions</span>
          </div>
        </div>
      )}
    </div>
  );
}
