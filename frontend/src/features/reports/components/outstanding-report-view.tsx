'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { ReportsApi } from '@/features/reports/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function OutstandingReportView() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const query = useQuery({
    queryKey: ['reports', 'outstanding', fromDate, toDate],
    queryFn: () => ReportsApi.getOutstanding({ fromDate: fromDate || undefined, toDate: toDate || undefined }),
  });

  const data = query.data?.data;

  return (
    <div>
      <PageHeader title="Outstanding Report" description="Review unpaid retailer invoices and total receivables." />
      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <KpiCard label="Total Outstanding" value={formatCurrency(data?.totalOutstanding ?? 0)} />
        <KpiCard label="Invoice Rows" value={data?.rows.length ?? 0} />
      </div>
      {query.isLoading ? <div className="text-sm text-slate-500">Loading report...</div> : query.error ? <EmptyState title="Unable to load report" description={query.error instanceof Error ? query.error.message : 'Unknown report error'} /> : !data ? <EmptyState title="No outstanding data" /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3 font-medium">Invoice</th><th className="px-4 py-3 font-medium">Retailer</th><th className="px-4 py-3 font-medium">Due Date</th><th className="px-4 py-3 font-medium">Outstanding</th></tr></thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data.rows.map((row) => (
                  <tr key={row.id}><td className="px-4 py-3"><div className="font-medium text-slate-950">{row.invoiceNo}</div><div className="text-xs text-slate-500">{new Date(row.invoiceDate).toLocaleDateString('en-IN')}</div></td><td className="px-4 py-3 text-slate-700">{row.retailer?.shopName ?? 'Unknown Retailer'}</td><td className="px-4 py-3 text-slate-700">{row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-IN') : '—'}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(row.outstandingAmount)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
