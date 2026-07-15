'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { PortalApi } from '@/features/portal/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';

export function PortalDuesView() {
  const query = useQuery({ queryKey: ['portal', 'dues'], queryFn: () => PortalApi.getDues() });

  if (query.isLoading) return <div className="text-sm text-slate-500">Loading dues...</div>;
  if (query.error || !query.data?.data) return <EmptyState title="Unable to load dues" description={query.error instanceof Error ? query.error.message : 'Dues not found'} />;

  const data = query.data.data;

  return (
    <div>
      <PageHeader title="Dues" description="Track total outstanding dues and unpaid invoices for your retailer account." />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <KpiCard label="Total Outstanding" value={formatCurrency(data.totalOutstanding)} />
        <KpiCard label="Open Invoices" value={data.invoices.length} />
      </div>
      {data.invoices.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3 font-medium">Invoice</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Due Date</th><th className="px-4 py-3 font-medium">Outstanding</th></tr></thead><tbody className="divide-y divide-slate-200 bg-white">{data.invoices.map((invoice) => <tr key={invoice.id}><td className="px-4 py-3"><div className="font-medium text-slate-950">{invoice.invoiceNo}</div><div className="text-xs text-slate-500">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</div></td><td className="px-4 py-3 text-slate-700">{invoice.status}</td><td className="px-4 py-3 text-slate-700">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '—'}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(invoice.outstandingAmount)}</td></tr>)}</tbody></table>
          </div>
        </div>
      ) : <EmptyState title="No dues found" description="When invoices are posted or partially unpaid, they will appear here." />}
    </div>
  );
}
