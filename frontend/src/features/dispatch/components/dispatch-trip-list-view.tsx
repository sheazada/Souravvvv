'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { LookupInput } from '@/components/ui/lookup-input';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { DispatchApi } from '@/features/dispatch/api';
import type { DispatchTripFilters, GenerateDispatchTripPayload } from '@/types/dispatch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const DEFAULT_FILTERS: DispatchTripFilters = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
};

const DEFAULT_FORM: GenerateDispatchTripPayload = {
  deliveryCycleId: '',
  routeId: '',
  vehicleId: '',
  driverEmployeeId: '',
  helperEmployeeId: '',
  dispatchDate: new Date().toISOString().slice(0, 10),
};

export function DispatchTripListView() {
  const routeMeta = getAdminRouteMeta('dispatchTrips');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<DispatchTripFilters>(DEFAULT_FILTERS);
  const [form, setForm] = useState<GenerateDispatchTripPayload>(DEFAULT_FORM);
  const [message, setMessage] = useState<string | null>(null);

  const queryKey = useMemo(() => ['dispatch-trips', filters], [filters]);
  const tripsQuery = useQuery({ queryKey, queryFn: () => DispatchApi.list(filters) });

  const generateMutation = useMutation({
    mutationFn: (payload: GenerateDispatchTripPayload) => DispatchApi.generate(payload),
    onSuccess: () => {
      setMessage('Dispatch trip generated successfully.');
      setForm(DEFAULT_FORM);
      queryClient.invalidateQueries({ queryKey: ['dispatch-trips'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to generate dispatch trip'),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => DispatchApi.start(id),
    onSuccess: () => {
      setMessage('Dispatch trip started successfully.');
      queryClient.invalidateQueries({ queryKey: ['dispatch-trips'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to start dispatch trip'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => DispatchApi.complete(id),
    onSuccess: () => {
      setMessage('Dispatch trip completed successfully.');
      queryClient.invalidateQueries({ queryKey: ['dispatch-trips'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to complete dispatch trip'),
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!form.deliveryCycleId.trim() || !form.routeId.trim()) {
      setMessage('Delivery cycle ID and route ID are required.');
      return;
    }

    await generateMutation.mutateAsync({
      ...form,
      vehicleId: form.vehicleId?.trim() ? form.vehicleId : undefined,
      driverEmployeeId: form.driverEmployeeId?.trim() ? form.driverEmployeeId : undefined,
      helperEmployeeId: form.helperEmployeeId?.trim() ? form.helperEmployeeId : undefined,
    });
  }

  const rows = tripsQuery.data?.data ?? [];
  const meta = tripsQuery.data?.meta;

  return (
    <div>
      <PageHeader title={routeMeta.pageTitle} description={routeMeta.pageDescription} />

      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{message}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <input value={filters.search ?? ''} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Search trip no, loading, challan" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <select value={filters.status ?? ''} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
              <option value="">All statuses</option>
              <option value="planned">Planned</option>
              <option value="loaded">Loaded</option>
              <option value="dispatched">Dispatched</option>
              <option value="completed">Completed</option>
              <option value="reconciled">Reconciled</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input type="date" value={filters.dispatchDate ?? ''} onChange={(event) => setFilters((current) => ({ ...current, dispatchDate: event.target.value, page: 1 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reset Filters</button>
          </div>

          {tripsQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading dispatch trips...</div>
          ) : tripsQuery.error ? (
            <EmptyState title="Unable to load dispatch trips" description={tripsQuery.error instanceof Error ? tripsQuery.error.message : 'Unknown dispatch trip error'} />
          ) : rows.length === 0 ? (
            <EmptyState title="No dispatch trips found" description="Generate a trip from route and delivery cycle to begin loading and delivery." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Trip</th>
                      <th className="px-4 py-3 font-medium">Route</th>
                      <th className="px-4 py-3 font-medium">Cycle</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Stops</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3"><div className="font-medium text-slate-950">{row.tripNo}</div><div className="text-xs text-slate-500">{new Date(row.dispatchDate).toLocaleDateString('en-IN')}</div></td>
                        <td className="px-4 py-3 text-slate-700">{row.route?.name ?? row.routeId}</td>
                        <td className="px-4 py-3 text-slate-700">{row.deliveryCycle?.cycleCode ?? row.deliveryCycleId}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800">{row.status}</span></td>
                        <td className="px-4 py-3 text-slate-700">{row.totalStops}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/app/dispatch-trips/${row.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</Link>
                            {row.status === 'loaded' ? <button type="button" onClick={() => startMutation.mutate(row.id)} className="rounded-lg border border-cyan-300 px-3 py-1.5 text-xs font-medium text-cyan-900 hover:bg-cyan-50">Start</button> : null}
                            {['dispatched', 'in_transit'].includes(row.status) ? <button type="button" onClick={() => completeMutation.mutate(row.id)} className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50">Complete</button> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}</span>
                <span>{meta?.total ?? rows.length} dispatch trips</span>
              </div>
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Generate Dispatch Trip</h2>
            <p className="mt-1 text-sm text-slate-500">Create a route-based delivery trip from approved orders in a delivery cycle.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <LookupInput
              resource="deliveryCycles"
              value={form.deliveryCycleId}
              onChange={(value) => setForm((current) => ({ ...current, deliveryCycleId: value }))}
              placeholder="Search delivery cycle"
            />
            <LookupInput
              resource="routes"
              value={form.routeId}
              onChange={(value) => setForm((current) => ({ ...current, routeId: value }))}
              placeholder="Search route"
            />
            <LookupInput
              resource="vehicles"
              value={form.vehicleId ?? ''}
              onChange={(value) => setForm((current) => ({ ...current, vehicleId: value }))}
              placeholder="Search vehicle"
            />
            <LookupInput
              resource="employees"
              query={{ designation: 'driver', limit: 100 }}
              value={form.driverEmployeeId ?? ''}
              onChange={(value) => setForm((current) => ({ ...current, driverEmployeeId: value }))}
              placeholder="Search driver"
            />
            <LookupInput
              resource="employees"
              query={{ limit: 100 }}
              value={form.helperEmployeeId ?? ''}
              onChange={(value) => setForm((current) => ({ ...current, helperEmployeeId: value }))}
              placeholder="Search helper / staff"
            />
            <input type="date" value={form.dispatchDate ?? ''} onChange={(event) => setForm((current) => ({ ...current, dispatchDate: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
          </div>
          <button type="submit" disabled={generateMutation.isPending} className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
            {generateMutation.isPending ? 'Generating trip...' : 'Generate Dispatch Trip'}
          </button>
        </form>
      </div>
    </div>
  );
}
