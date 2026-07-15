'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { PortalApi } from '@/features/portal/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';

export function PortalInvoiceDetailView({ id }: { id: string }) {
  const query = useQuery({ queryKey: ['portal', 'invoice', id], queryFn: () => PortalApi.getInvoiceById(id) });

  if (query.isLoading) return <div className="text-sm text-slate-500">Loading invoice...</div>;
  if (query.error || !query.data?.data) return <EmptyState title="Unable to load invoice" description={query.error instanceof Error ? query.error.message : 'Invoice not found'} />;

  const invoice = query.data.data;

  return (
    <div>
      <PageHeader title={`Invoice ${invoice.invoiceNo}`} description="Review invoice lines, payment allocations, and outstanding dues." />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total" value={formatCurrency(invoice.grandTotal)} />
        <KpiCard label="Outstanding" value={formatCurrency(invoice.outstandingAmount)} />
        <KpiCard label="Status" value={invoice.status} />
        <KpiCard label="Allocations" value={invoice.allocations.length} />
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Invoice Lines</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Qty</th><th className="px-4 py-3 font-medium">Unit Price</th><th className="px-4 py-3 font-medium">Tax</th><th className="px-4 py-3 font-medium">Line Total</th></tr></thead><tbody className="divide-y divide-slate-200 bg-white">{invoice.items.map((item) => <tr key={item.id}><td className="px-4 py-3"><div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div><div className="text-xs text-slate-500">{item.variant?.variantName ?? '—'}</div></td><td className="px-4 py-3 text-slate-700">{item.billedQty}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(item.unitPrice)}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(item.taxAmount)}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(item.lineTotal)}</td></tr>)}</tbody></table>
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Payment Allocations</h2>
        {invoice.allocations.length ? <div className="space-y-3">{invoice.allocations.map((row) => <div key={row.id} className="rounded-xl bg-slate-50 px-3 py-3 text-sm"><div className="font-medium text-slate-950">{row.paymentReceipt.receiptNo}</div><div className="mt-1 flex flex-wrap gap-3 text-slate-600"><span>{new Date(row.paymentReceipt.paymentDate).toLocaleDateString('en-IN')}</span><span>{row.paymentReceipt.paymentMode}</span><span>{formatCurrency(row.allocatedAmount)}</span></div></div>)}</div> : <EmptyState title="No allocations yet" description="Collections allocated by the distributor will appear here." />}
      </section>
    </div>
  );
}
