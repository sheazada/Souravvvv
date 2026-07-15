'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { ReportsApi } from '@/features/reports/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function DailyDispatchReportView() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const query = useQuery({
    queryKey: ['reports', 'daily-dispatch', date],
    queryFn: () => ReportsApi.getDailyDispatch({ date }),
  });

  const rows = query.data?.data ?? [];
  const deliveredStops = rows.reduce((sum, row) => sum + row.stopSummary.delivered, 0);
  const pendingStops = rows.reduce((sum, row) => sum + row.stopSummary.pending, 0);
  const loadedQty = rows.reduce((sum, row) => sum + row.loadedQty, 0);

  return (
    <div>
      <PageHeader title="Daily Dispatch Report" description="Monitor route dispatches, load quantities, and stop completion for the selected date." />
      <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard label="Trips" value={rows.length} />
        <KpiCard label="Loaded Qty" value={loadedQty} />
        <KpiCard label="Delivered Stops" value={deliveredStops} />
        <KpiCard label="Pending Stops" value={pendingStops} />
      </div>
      {query.isLoading ? <div className="text-sm text-slate-500">Loading report...</div> : query.error ? <EmptyState title="Unable to load report" description={query.error instanceof Error ? query.error.message : 'Unknown report error'} /> : rows.length === 0 ? <EmptyState title="No dispatch data" description="No dispatch trips matched the selected date." /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Trip</th>
                  <th className="px-4 py-3 font-medium">Route</th>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Loaded Qty</th>
                  <th className="px-4 py-3 font-medium">Stops</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3"><div className="font-medium text-slate-950">{row.tripNo}</div><div className="text-xs text-slate-500">{new Date(row.dispatchDate).toLocaleDateString('en-IN')}</div></td>
                    <td className="px-4 py-3 text-slate-700">{row.route?.name ?? 'Unknown Route'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.vehicle?.vehicleNo ?? 'Unassigned'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.loadedQty}</td>
                    <td className="px-4 py-3 text-slate-700">{row.stopSummary.delivered}/{row.stopSummary.totalStops} delivered</td>
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
