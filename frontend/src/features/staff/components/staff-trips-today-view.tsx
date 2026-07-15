'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { StaffApi } from '@/features/staff/api';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export function StaffTripsTodayView() {
  const query = useQuery({
    queryKey: ['staff', 'trips', 'today'],
    queryFn: () => StaffApi.getTodayTrips(),
  });

  const rows = query.data?.data ?? [];

  return (
    <div>
      <PageHeader title="Today’s Trips" description="Review all dispatch trips assigned to you today." />
      {query.isLoading ? (
        <div className="text-sm text-slate-500">Loading trips...</div>
      ) : query.error ? (
        <EmptyState title="Unable to load trips" description={query.error instanceof Error ? query.error.message : 'Unknown staff trip error'} />
      ) : rows.length === 0 ? (
        <EmptyState title="No trips assigned" description="Assigned trips for today will be shown here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Trip</th>
                  <th className="px-4 py-3 font-medium">Dispatch Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-slate-950">{row.tripNo}</td>
                    <td className="px-4 py-3 text-slate-700">{new Date(row.dispatchDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-700">{row.status}</td>
                    <td className="px-4 py-3">
                      <Link href={`/staff/trips/${row.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Open</Link>
                    </td>
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
