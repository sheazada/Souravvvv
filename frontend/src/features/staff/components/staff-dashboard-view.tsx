'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { StaffApi } from '@/features/staff/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export function StaffDashboardView() {
  const query = useQuery({
    queryKey: ['staff', 'dashboard'],
    queryFn: () => StaffApi.getDashboard(),
  });

  if (query.isLoading) {
    return <div className="text-sm text-slate-500">Loading staff dashboard...</div>;
  }

  if (query.error || !query.data?.data) {
    return (
      <EmptyState
        title="Unable to load staff dashboard"
        description={query.error instanceof Error ? query.error.message : 'Driver dashboard unavailable'}
      />
    );
  }

  const data = query.data.data;
  const totalStops = data.pendingStops + data.deliveredStops + data.partialStops + data.failedStops;
  const stopCompletionPercent = totalStops > 0 ? Math.round(((data.deliveredStops + data.partialStops) / totalStops) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Staff & Driver Operations Dashboard"
        description="Track today’s assigned delivery routes, stop execution progress, and field cash/UPI collections."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Route Execution Progress</div>
              <div className="text-2xl font-bold text-slate-950 mt-1">{stopCompletionPercent}% Completed</div>
            </div>
            <div className="text-right text-xs text-slate-600">
              <span className="font-semibold text-slate-900">{data.deliveredStops + data.partialStops}</span> of {totalStops} stops executed
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-cyan-600 transition-all duration-300" style={{ width: `${stopCompletionPercent}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Delivered: {data.deliveredStops}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Partial: {data.partialStops}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" /> Failed: {data.failedStops}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-400 inline-block" /> Pending: {data.pendingStops}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Collections</div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">{formatCurrency(data.collectionAmount)}</div>
            </div>
            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
              {data.collectionCount} Receipts
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-600 border-t border-slate-100 pt-3">
            <span>Route verification & container balance reconciliations updated live.</span>
            <Link href="/staff/collections" className="font-semibold text-cyan-700 hover:underline">
              Inspect Collections →
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Trips Today" value={data.tripCount} />
        <KpiCard label="Completed Trips" value={data.completedTrips} />
        <KpiCard label="Pending Stops" value={data.pendingStops} />
        <KpiCard label="Delivered Stops" value={data.deliveredStops} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-950">Today’s Assigned Trips</h2>
          <Link href="/staff/trips/today" className="text-xs font-semibold text-cyan-700 hover:underline">
            View All Trips →
          </Link>
        </div>
        {data.trips.length ? (
          <div className="space-y-3">
            {data.trips.map((trip) => (
              <div key={trip.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950 flex items-center gap-2">
                      <span>{trip.tripNo}</span>
                      <span className="rounded bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-800 border border-cyan-200 capitalize">
                        {trip.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Dispatch Date: {new Date(trip.dispatchDate).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <Link
                    href={`/staff/trips/${trip.id}`}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-sm"
                  >
                    Execute Route & Stops
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No trips assigned today" description="Today’s assigned delivery trips will appear here once planned by dispatch." />
        )}
      </section>
    </div>
  );
}
