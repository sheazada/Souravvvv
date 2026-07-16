'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { PortalApi } from '@/features/portal/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function PortalInvoiceDetailView({ id }: { id: string }) {
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['portal', 'invoice', id], queryFn: () => PortalApi.getInvoiceById(id) });

  if (query.isLoading) return <div className="text-sm text-slate-500">Loading invoice...</div>;
  if (query.error || !query.data?.data)
    return (
      <EmptyState
        title="Unable to load invoice"
        description={query.error instanceof Error ? query.error.message : 'Invoice not found'}
      />
    );

  const invoice = query.data.data;
  const isAssistedBilling = invoice.source === 'assisted_billing';
  const isRevised = invoice.invoiceNo.includes('-R') || invoice.status === 'revised';

  const handleExport = async (format: 'pdf' | 'print') => {
    try {
      setExportMessage(`Generating ${format.toUpperCase()} invoice export...`);
      const response = await PortalApi.exportInvoice(id, format);
      if (response.success && response.data) {
        setExportMessage(`Invoice ${invoice.invoiceNo} exported successfully (${response.data.fileName}).`);
      }
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : 'Failed to export invoice');
    }
  };

  return (
    <div>
      <PageHeader
        title={`Invoice ${invoice.invoiceNo}`}
        description="Review invoice line items, payment allocations, revision details, and outstanding dues."
      />

      {exportMessage ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 flex items-center justify-between">
          <span>{exportMessage}</span>
          <button type="button" onClick={() => setExportMessage(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Grand Total" value={formatCurrency(invoice.grandTotal)} />
        <KpiCard label="Outstanding Dues" value={formatCurrency(invoice.outstandingAmount)} />
        <KpiCard label="Status" value={invoice.status.toUpperCase()} />
        <KpiCard label="Allocations" value={invoice.allocations.length} />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold text-slate-950">Source & Billing Mode:</span>
          {isAssistedBilling ? (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 border border-purple-200">
              Assisted Billing
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 capitalize">
              {invoice.source} Billing
            </span>
          )}
          {isRevised ? (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
              Revision Invoice
            </span>
          ) : null}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 shadow-sm"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => handleExport('print')}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Print Invoice
          </button>
        </div>
      </div>

      {invoice.remarks ? (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Remarks / Revision Notes:</span> {invoice.remarks}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Invoice Lines</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Product & SKU</th>
                <th className="px-4 py-3 font-medium text-right">Billed Qty</th>
                <th className="px-4 py-3 font-medium text-right">Unit Price (₹)</th>
                <th className="px-4 py-3 font-medium text-right">Discount (₹)</th>
                <th className="px-4 py-3 font-medium text-right">Tax (₹)</th>
                <th className="px-4 py-3 font-medium text-right">Line Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {invoice.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/75">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div>
                    <div className="text-xs text-slate-500">{item.variant?.variantName ?? item.variant?.sku ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 font-medium">{item.billedQty}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(item.discountAmount)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatCurrency(item.taxAmount)} <span className="text-[10px] text-slate-400">({item.taxRate}%)</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Payment Allocations & Receipts</h2>
        {invoice.allocations.length ? (
          <div className="space-y-3">
            {invoice.allocations.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold text-slate-950">Receipt: {row.paymentReceipt.receiptNo}</div>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
                    <span>Date: {new Date(row.paymentReceipt.paymentDate).toLocaleDateString('en-IN')}</span>
                    <span>Mode: <strong className="capitalize">{row.paymentReceipt.paymentMode}</strong></span>
                    <span>Receipt Status: {row.paymentReceipt.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Allocated Amount</div>
                  <div className="font-semibold text-emerald-700">{formatCurrency(row.allocatedAmount)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No allocations yet"
            description="Collections allocated against this invoice by the distributor or driver will appear here."
          />
        )}
      </section>
    </div>
  );
}
