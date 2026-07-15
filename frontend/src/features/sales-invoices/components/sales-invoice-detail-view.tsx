'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { SalesInvoicesApi } from '@/features/sales-invoices/api';
import { formatCurrency } from '@/lib/utils/number';
import { buildDetailTitle } from '@/lib/utils/title';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function SalesInvoiceDetailView({ id }: { id: string }) {
  const routeMeta = getAdminRouteMeta('salesInvoices');
  const queryClient = useQueryClient();
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const invoiceQuery = useQuery({ queryKey: ['sales-invoice', id], queryFn: () => SalesInvoicesApi.getById(id) });

  const postMutation = useMutation({
    mutationFn: () => SalesInvoicesApi.post(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-invoice', id] }),
  });
  const cancelMutation = useMutation({
    mutationFn: () => SalesInvoicesApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-invoice', id] }),
  });
  const shareMutation = useMutation({
    mutationFn: () => SalesInvoicesApi.shareWhatsApp(id),
    onSuccess: (response) => setShareMessage(response.data.messageText),
  });

  if (invoiceQuery.isLoading) {
    return <div className="text-sm text-slate-500">Loading sales invoice...</div>;
  }

  if (invoiceQuery.error || !invoiceQuery.data?.data) {
    return <EmptyState title="Unable to load sales invoice" description={invoiceQuery.error instanceof Error ? invoiceQuery.error.message : 'Sales invoice not found'} />;
  }

  const invoice = invoiceQuery.data.data;

  return (
    <div>
      <PageHeader
        title={buildDetailTitle(routeMeta.detailTitlePrefix ?? routeMeta.pageTitle, invoice.invoiceNo)}
        description={routeMeta.detailPageDescription}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Invoice Total" value={formatCurrency(invoice.grandTotal)} />
        <KpiCard label="Outstanding" value={formatCurrency(invoice.outstandingAmount)} />
        <KpiCard label="Status" value={invoice.status} />
        <KpiCard label="Allocations" value={invoice.allocations.length} />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Retailer</div><div className="mt-1 font-medium text-slate-950">{invoice.retailer?.shopName ?? invoice.retailerId}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Source</div><div className="mt-1 font-medium text-slate-950">{invoice.source}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Sales Order</div><div className="mt-1 font-medium text-slate-950">{invoice.salesOrder?.orderNo ?? invoice.salesOrderId ?? '—'}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Dispatch Trip</div><div className="mt-1 font-medium text-slate-950">{invoice.dispatchTrip?.tripNo ?? invoice.dispatchTripId ?? '—'}</div></div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {invoice.status === 'draft' ? <button type="button" onClick={() => postMutation.mutate()} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Post Invoice</button> : null}
          {!['cancelled', 'paid'].includes(invoice.status) ? <button type="button" onClick={() => cancelMutation.mutate()} className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Cancel Invoice</button> : null}
          <button type="button" onClick={() => shareMutation.mutate()} className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">Generate WhatsApp Text</button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Invoice Lines</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Unit Price</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Tax</th>
                <th className="px-4 py-3 font-medium">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3"><div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div><div className="text-xs text-slate-500">{item.variant?.variantName ?? '—'}</div></td>
                  <td className="px-4 py-3 text-slate-700">{item.variant?.sku ?? item.variantId}</td>
                  <td className="px-4 py-3 text-slate-700">{item.billedQty}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(item.discountAmount)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(item.taxAmount)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Payment Allocations</h2>
        {invoice.allocations.length ? (
          <div className="space-y-3">
            {invoice.allocations.map((allocation) => (
              <div key={allocation.id} className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                <div className="font-medium text-slate-950">{allocation.paymentReceipt.receiptNo}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-slate-600">
                  <span>{allocation.paymentReceipt.paymentMode}</span>
                  <span>{new Date(allocation.paymentReceipt.paymentDate).toLocaleDateString('en-IN')}</span>
                  <span>{formatCurrency(allocation.allocatedAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No allocations yet" description="Collections and allocations will appear here after payments are recorded." />
        )}
      </section>

      {shareMessage ? (
        <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <div className="mb-2 font-semibold">WhatsApp Message Preview</div>
          <pre className="whitespace-pre-wrap font-sans">{shareMessage}</pre>
        </section>
      ) : null}
    </div>
  );
}
