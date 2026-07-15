'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { LookupInput } from '@/components/ui/lookup-input';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { DispatchApi } from '@/features/dispatch/api';
import { buildDetailTitle } from '@/lib/utils/title';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

export function DispatchTripDetailView({ id }: { id: string }) {
  const routeMeta = getAdminRouteMeta('dispatchTrips');
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [resourceForm, setResourceForm] = useState({ vehicleId: '', driverEmployeeId: '', helperEmployeeId: '' });

  const tripQuery = useQuery({ queryKey: ['dispatch-trip', id], queryFn: () => DispatchApi.getById(id) });
  const loadingSheetQuery = useQuery({ queryKey: ['dispatch-trip', id, 'loading-sheet'], queryFn: () => DispatchApi.getLoadingSheet(id) });
  const challanQuery = useQuery({ queryKey: ['dispatch-trip', id, 'challan'], queryFn: () => DispatchApi.getChallan(id), retry: false });

  const assignMutation = useMutation({
    mutationFn: () => DispatchApi.assignResources(id, { ...resourceForm }),
    onSuccess: () => {
      setMessage('Dispatch resources assigned successfully.');
      queryClient.invalidateQueries({ queryKey: ['dispatch-trip', id] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to assign resources'),
  });

  const loadingMutation = useMutation({
    mutationFn: () => DispatchApi.generateLoadingSheet(id),
    onSuccess: () => {
      setMessage('Loading sheet generated successfully.');
      queryClient.invalidateQueries({ queryKey: ['dispatch-trip', id] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-trip', id, 'loading-sheet'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to generate loading sheet'),
  });

  const challanMutation = useMutation({
    mutationFn: () => DispatchApi.generateChallan(id),
    onSuccess: () => {
      setMessage('Challan generated successfully.');
      queryClient.invalidateQueries({ queryKey: ['dispatch-trip', id] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-trip', id, 'challan'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to generate challan'),
  });

  const startMutation = useMutation({
    mutationFn: () => DispatchApi.start(id),
    onSuccess: () => {
      setMessage('Dispatch trip started successfully.');
      queryClient.invalidateQueries({ queryKey: ['dispatch-trip', id] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to start trip'),
  });

  const completeMutation = useMutation({
    mutationFn: () => DispatchApi.complete(id),
    onSuccess: () => {
      setMessage('Dispatch trip completed successfully.');
      queryClient.invalidateQueries({ queryKey: ['dispatch-trip', id] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to complete trip'),
  });

  if (tripQuery.isLoading) {
    return <div className="text-sm text-slate-500">Loading dispatch trip...</div>;
  }

  if (tripQuery.error || !tripQuery.data?.data) {
    return <EmptyState title="Unable to load dispatch trip" description={tripQuery.error instanceof Error ? tripQuery.error.message : 'Dispatch trip not found'} />;
  }

  const trip = tripQuery.data.data;
  const loadingSheet = loadingSheetQuery.data?.data;
  const challan = challanQuery.data?.data?.challan;

  return (
    <div>
      <PageHeader
        title={buildDetailTitle(routeMeta.detailTitlePrefix ?? routeMeta.pageTitle, trip.tripNo)}
        description={routeMeta.detailPageDescription}
      />

      {message ? <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{message}</div> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Stops" value={trip.totalStops} />
        <KpiCard label="Crates Loaded" value={trip.totalCratesLoaded} />
        <KpiCard label="Status" value={trip.status} />
        <KpiCard label="Cycle" value={trip.deliveryCycle?.cycleCode ?? trip.deliveryCycleId} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Route</div><div className="mt-1 font-medium text-slate-950">{trip.route?.name ?? trip.routeId}</div></div>
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Vehicle</div><div className="mt-1 font-medium text-slate-950">{trip.vehicle?.vehicleNo ?? trip.vehicleId ?? 'Unassigned'}</div></div>
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Driver</div><div className="mt-1 font-medium text-slate-950">{trip.driver?.fullName ?? trip.driverEmployeeId ?? 'Unassigned'}</div></div>
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Helper</div><div className="mt-1 font-medium text-slate-950">{trip.helper?.fullName ?? trip.helperEmployeeId ?? 'Unassigned'}</div></div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {trip.status === 'planned' ? <button type="button" onClick={() => loadingMutation.mutate()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Generate Loading Sheet</button> : null}
              {!trip.challan ? <button type="button" onClick={() => challanMutation.mutate()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Generate Challan</button> : null}
              {trip.status === 'loaded' ? <button type="button" onClick={() => startMutation.mutate()} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Start Trip</button> : null}
              {['dispatched', 'in_transit'].includes(trip.status) ? <button type="button" onClick={() => completeMutation.mutate()} className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">Complete Trip</button> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Trip Items / Loading Sheet</h2>
            {loadingSheetQuery.isLoading ? (
              <div className="text-sm text-slate-500">Loading loading sheet...</div>
            ) : loadingSheet ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Warehouse</th>
                      <th className="px-4 py-3 font-medium">Planned Qty</th>
                      <th className="px-4 py-3 font-medium">Loaded Qty</th>
                      <th className="px-4 py-3 font-medium">Stock On Hand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {loadingSheet.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3"><div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div><div className="text-xs text-slate-500">{item.variant?.variantName ?? item.variant?.sku ?? item.variantId}</div></td>
                        <td className="px-4 py-3 text-slate-700">{item.warehouse?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{item.plannedQty}</td>
                        <td className="px-4 py-3 text-slate-700">{item.loadedQty}</td>
                        <td className="px-4 py-3 text-slate-700">{item.stockOnHand ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="Loading sheet not available" description="Generate the loading sheet to allocate stock to this trip." />
            )}
          </div>
        </section>

        <section className="space-y-6">
          <form onSubmit={(event) => { event.preventDefault(); assignMutation.mutate(); }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Assign Resources</h2>
            <div className="grid gap-3 md:grid-cols-1">
              <LookupInput
                resource="vehicles"
                value={resourceForm.vehicleId}
                onChange={(value) => setResourceForm((current) => ({ ...current, vehicleId: value }))}
                placeholder="Search vehicle"
              />
              <LookupInput
                resource="employees"
                query={{ designation: 'driver', limit: 100 }}
                value={resourceForm.driverEmployeeId}
                onChange={(value) => setResourceForm((current) => ({ ...current, driverEmployeeId: value }))}
                placeholder="Search driver"
              />
              <LookupInput
                resource="employees"
                query={{ limit: 100 }}
                value={resourceForm.helperEmployeeId}
                onChange={(value) => setResourceForm((current) => ({ ...current, helperEmployeeId: value }))}
                placeholder="Search helper / staff"
              />
            </div>
            <button type="submit" disabled={assignMutation.isPending} className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{assignMutation.isPending ? 'Assigning...' : 'Assign Resources'}</button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Challan</h2>
            {challan ? (
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-medium text-slate-950">{challan.challanNo}</div>
                <div className="mt-1">Issue date: {new Date(challan.issueDate).toLocaleDateString('en-IN')}</div>
                <div className="mt-1">Status: {challan.status}</div>
              </div>
            ) : (
              <EmptyState title="Challan not generated" description="Generate challan after trip planning and stock loading." />
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Trip Stops</h2>
            <div className="space-y-3">
              {trip.stops.length ? trip.stops.map((stop) => (
                <div key={stop.id} className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-950">{stop.stopSequence}. {stop.retailer?.shopName ?? stop.retailerId}</div>
                      <div className="text-xs text-slate-500">{stop.salesOrder?.orderNo ?? 'No order'} • {stop.status}</div>
                    </div>
                    <Link href={`/app/delivery-stops/${stop.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Open Stop</Link>
                  </div>
                </div>
              )) : <EmptyState title="No stops found" />}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
