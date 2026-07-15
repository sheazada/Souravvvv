'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { StaffApi } from '@/features/staff/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';

export function StaffCollectionsView() {
  const query = useQuery({
    queryKey: ['staff', 'collection-summary'],
    queryFn: () => StaffApi.getCollectionSummary(),
  });

  if (query.isLoading) return <div className="text-sm text-slate-500">Loading collection summary...</div>;
  if (query.error || !query.data?.data) return <EmptyState title="Unable to load collections" description={query.error instanceof Error ? query.error.message : 'Collection summary unavailable'} />;

  const data = query.data.data;

  return (
    <div>
      <PageHeader title="Collection Summary" description="Review total collected amount and recent receipts recorded by you." />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <KpiCard label="Receipt Count" value={data.totalCount} />
        <KpiCard label="Collected Amount" value={formatCurrency(data.totalAmount)} />
      </div>
      {data.payments.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3 font-medium">Receipt</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Mode</th><th className="px-4 py-3 font-medium">Amount</th><th className="px-4 py-3 font-medium">Status</th></tr></thead><tbody className="divide-y divide-slate-200 bg-white">{data.payments.map((payment) => <tr key={payment.id}><td className="px-4 py-3 font-medium text-slate-950">{payment.receiptNo}</td><td className="px-4 py-3 text-slate-700">{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td><td className="px-4 py-3 text-slate-700">{payment.paymentMode}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(Number(payment.amount ?? 0))}</td><td className="px-4 py-3 text-slate-700">{payment.status}</td></tr>)}</tbody></table>
          </div>
        </div>
      ) : <EmptyState title="No collections recorded" description="Receipts you record during delivery will appear here." />}
    </div>
  );
}
