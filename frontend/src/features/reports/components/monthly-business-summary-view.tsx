'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { ReportsApi } from '@/features/reports/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function MonthlyBusinessSummaryView() {
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const query = useQuery({
    queryKey: ['reports', 'monthly-business-summary', fromDate, toDate],
    queryFn: () => ReportsApi.getMonthlyBusinessSummary({ fromDate, toDate }),
  });

  const rows = query.data?.data ?? [];
  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const totalCollections = rows.reduce((sum, row) => sum + row.collections, 0);
  const totalNet = rows.reduce((sum, row) => sum + row.net, 0);

  return (
    <div>
      <PageHeader title="Monthly Business Summary" description="Track order, sales, collections, purchases, and net trend month by month." />
      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <KpiCard label="Sales" value={formatCurrency(totalSales)} />
        <KpiCard label="Collections" value={formatCurrency(totalCollections)} />
        <KpiCard label="Net" value={formatCurrency(totalNet)} />
      </div>
      {query.isLoading ? <div className="text-sm text-slate-500">Loading summary...</div> : query.error ? <EmptyState title="Unable to load summary" description={query.error instanceof Error ? query.error.message : 'Unknown summary error'} /> : rows.length === 0 ? <EmptyState title="No monthly summary data" /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3 font-medium">Month</th><th className="px-4 py-3 font-medium">Orders</th><th className="px-4 py-3 font-medium">Sales</th><th className="px-4 py-3 font-medium">Collections</th><th className="px-4 py-3 font-medium">Purchases</th><th className="px-4 py-3 font-medium">Net</th></tr></thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.month}><td className="px-4 py-3 font-medium text-slate-950">{row.month}</td><td className="px-4 py-3 text-slate-700">{row.orderCount}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(row.sales)}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(row.collections)}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(row.purchases)}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(row.net)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
