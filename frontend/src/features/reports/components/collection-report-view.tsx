'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { ReportsApi } from '@/features/reports/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function CollectionReportView() {
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const query = useQuery({
    queryKey: ['reports', 'collection', fromDate, toDate],
    queryFn: () => ReportsApi.getCollection({ fromDate, toDate }),
  });

  const data = query.data?.data;

  return (
    <div>
      <PageHeader title="Collection Report" description="Review payment receipts and collection mix by payment mode." />
      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <KpiCard label="Total Collections" value={formatCurrency(data?.totalAmount ?? 0)} />
        <KpiCard label="Receipts" value={data?.receiptCount ?? 0} />
        <KpiCard label="Payment Modes" value={data?.byMode.length ?? 0} />
      </div>
      {query.isLoading ? <div className="text-sm text-slate-500">Loading report...</div> : query.error ? <EmptyState title="Unable to load report" description={query.error instanceof Error ? query.error.message : 'Unknown report error'} /> : !data ? <EmptyState title="No collection data" /> : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">By Mode</h2>
            <div className="space-y-3">
              {data.byMode.length ? data.byMode.map((row) => (
                <div key={row.paymentMode} className="rounded-xl bg-slate-50 px-3 py-3 text-sm"><div className="font-medium text-slate-950">{row.paymentMode}</div><div className="mt-1 text-slate-600">{formatCurrency(row.amount)}</div></div>
              )) : <EmptyState title="No payment mode data" />}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Receipt Rows</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3 font-medium">Receipt</th><th className="px-4 py-3 font-medium">Party Type</th><th className="px-4 py-3 font-medium">Mode</th><th className="px-4 py-3 font-medium">Amount</th></tr></thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {data.rows.map((row) => (
                    <tr key={row.id}><td className="px-4 py-3"><div className="font-medium text-slate-950">{row.receiptNo}</div><div className="text-xs text-slate-500">{new Date(row.paymentDate).toLocaleDateString('en-IN')}</div></td><td className="px-4 py-3 text-slate-700">{row.partyType}</td><td className="px-4 py-3 text-slate-700">{row.paymentMode}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(row.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
