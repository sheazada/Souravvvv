'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { ReportsApi } from '@/features/reports/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function DailyPurchaseReportView() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const query = useQuery({
    queryKey: ['reports', 'daily-purchase', date],
    queryFn: () => ReportsApi.getDailyPurchase({ date }),
  });

  const rows = query.data?.data ?? [];
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.grandTotal ?? 0), 0);
  const totalQty = rows.reduce((sum, row) => sum + row.orderedQty, 0);

  return (
    <div>
      <PageHeader title="Daily Purchase Report" description="Track purchase order totals, supplier activity, and receipt counts for a selected date." />
      <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <KpiCard label="Purchase Orders" value={rows.length} />
        <KpiCard label="Ordered Qty" value={totalQty} />
        <KpiCard label="PO Amount" value={formatCurrency(totalAmount)} />
      </div>
      {query.isLoading ? <div className="text-sm text-slate-500">Loading report...</div> : query.error ? <EmptyState title="Unable to load report" description={query.error instanceof Error ? query.error.message : 'Unknown report error'} /> : rows.length === 0 ? <EmptyState title="No purchase data" description="No purchase orders matched the selected date." /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">PO</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">GRNs</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3"><div className="font-medium text-slate-950">{row.poNo}</div><div className="text-xs text-slate-500">{new Date(row.poDate).toLocaleDateString('en-IN')}</div></td>
                    <td className="px-4 py-3 text-slate-700">{row.supplier?.name ?? 'Unknown Supplier'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.orderedQty}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(row.grandTotal ?? 0))}</td>
                    <td className="px-4 py-3 text-slate-700">{row.receiptCount}</td>
                    <td className="px-4 py-3 text-slate-700">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
