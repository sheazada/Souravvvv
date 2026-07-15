'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { StaffApi } from '@/features/staff/api';
import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';

export function StaffTripDetailView({ id }: { id: string }) {
  const [tripQuery, stopsQuery] = useQueries({
    queries: [
      { queryKey: ['staff', 'trip', id], queryFn: () => StaffApi.getTrip(id) },
      { queryKey: ['staff', 'trip', id, 'stops'], queryFn: () => StaffApi.getTripStops(id) },
    ],
  });

  if (tripQuery.isLoading || stopsQuery.isLoading) {
    return <div className="text-sm text-slate-500">Loading trip details...</div>;
  }

  if (tripQuery.error || stopsQuery.error || !tripQuery.data?.data) {
    return <EmptyState title="Unable to load trip" description={tripQuery.error instanceof Error ? tripQuery.error.message : stopsQuery.error instanceof Error ? stopsQuery.error.message : 'Trip not found'} />;
  }

  const trip = tripQuery.data.data;
  const stops = stopsQuery.data?.data ?? [];
  const deliveredStops = stops.filter((stop) => stop.status === 'delivered').length;
  const pendingStops = stops.filter((stop) => stop.status === 'pending').length;

  return (
    <div>
      <PageHeader title={`Trip ${trip.tripNo}`} description="Review the assigned trip summary and open each delivery stop for execution." />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Trip Status" value={trip.status} />
        <KpiCard label="Dispatch Date" value={new Date(trip.dispatchDate).toLocaleDateString('en-IN')} />
        <KpiCard label="Delivered Stops" value={deliveredStops} />
        <KpiCard label="Pending Stops" value={pendingStops} />
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Trip Stops</h2>
        {stops.length ? (
          <div className="space-y-3">
            {stops.map((stop) => (
              <div key={stop.id} className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">{stop.stopSequence}. {stop.retailer?.shopName ?? stop.retailerId}</div>
                    <div className="mt-1 text-slate-600">{stop.status} • {stop.salesOrder?.orderNo ?? 'No order'}</div>
                  </div>
                  <Link href={`/staff/delivery-stops/${stop.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Open Stop</Link>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState title="No stops found" />}
      </section>
    </div>
  );
}
