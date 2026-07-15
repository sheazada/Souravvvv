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

  return (
    <div>
      <PageHeader
        title="Staff Dashboard"
        description="Track today’s trips, pending stops, delivered stops, and collection progress."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Trips Today" value={data.tripCount} />
        <KpiCard label="Completed Trips" value={data.completedTrips} />
        <KpiCard label="Pending Stops" value={data.pendingStops} />
        <KpiCard label="Delivered Stops" value={data.deliveredStops} />
        <KpiCard label="Partial Stops" value={data.partialStops} />
        <KpiCard label="Failed Stops" value={data.failedStops} />
        <KpiCard label="Collections" value={formatCurrency(data.collectionAmount)} />
        <KpiCard label="Receipt Count" value={data.collectionCount} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Today’s Trips</h2>
        {data.trips.length ? (
          <div className="space-y-3">
            {data.trips.map((trip) => (
              <div key={trip.id} className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">{trip.tripNo}</div>
                    <div className="mt-1 text-slate-600">
                      {new Date(trip.dispatchDate).toLocaleDateString('en-IN')} • {trip.status}
                    </div>
                  </div>
                  <Link
                    href={`/staff/trips/${trip.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Open Trip
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No trips assigned today" description="Today’s assigned delivery trips will appear here." />
        )}
      </section>
    </div>
  );
}
