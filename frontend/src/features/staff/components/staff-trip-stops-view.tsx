'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { StaffApi } from '@/features/staff/api';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export function StaffTripStopsView({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ['staff', 'trip', id, 'stops'],
    queryFn: () => StaffApi.getTripStops(id),
  });

  const rows = query.data?.data ?? [];

  return (
    <div>
      <PageHeader title="Trip Stops" description="Open each stop to update delivery status, collections, crate returns, and proof of delivery." />
      {query.isLoading ? (
        <div className="text-sm text-slate-500">Loading trip stops...</div>
      ) : query.error ? (
        <EmptyState title="Unable to load trip stops" description={query.error instanceof Error ? query.error.message : 'Unknown trip stop error'} />
      ) : rows.length === 0 ? (
        <EmptyState title="No stops found" />
      ) : (
        <div className="space-y-3">
          {rows.map((stop) => (
            <div key={stop.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-950">{stop.stopSequence}. {stop.retailer?.shopName ?? stop.retailerId}</div>
                  <div className="mt-1 text-sm text-slate-600">{stop.status} • Loaded items: {stop.items.length}</div>
                </div>
                <Link href={`/staff/delivery-stops/${stop.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Open Stop</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
