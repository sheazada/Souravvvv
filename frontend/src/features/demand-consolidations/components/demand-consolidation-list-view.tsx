'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { LookupInput } from '@/components/ui/lookup-input';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { DemandConsolidationsApi } from '@/features/demand-consolidations/api';
import type {
  CreateDemandConsolidationPayload,
  DemandConsolidationListFilters,
} from '@/types/demand-consolidations';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const DEFAULT_FILTERS: DemandConsolidationListFilters = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
};

const DEFAULT_FORM: CreateDemandConsolidationPayload = {
  deliveryCycleId: '',
  includeStatuses: ['approved'],
  notes: '',
};

export function DemandConsolidationListView() {
  const routeMeta = getAdminRouteMeta('demandConsolidations');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<DemandConsolidationListFilters>(DEFAULT_FILTERS);
  const [form, setForm] = useState<CreateDemandConsolidationPayload>(DEFAULT_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const queryKey = useMemo(() => ['demand-consolidations', filters], [filters]);
  const listQuery = useQuery({
    queryKey,
    queryFn: () => DemandConsolidationsApi.list(filters),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateDemandConsolidationPayload) =>
      DemandConsolidationsApi.create(payload),
    onSuccess: () => {
      setMessage('Demand consolidation created successfully.');
      setForm(DEFAULT_FORM);
      queryClient.invalidateQueries({ queryKey: ['demand-consolidations'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to create demand consolidation');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => DemandConsolidationsApi.approve(id),
    onSuccess: () => {
      setMessage('Demand consolidation approved successfully.');
      queryClient.invalidateQueries({ queryKey: ['demand-consolidations'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to approve demand consolidation');
    },
  });

  const rebuildMutation = useMutation({
    mutationFn: (id: string) => DemandConsolidationsApi.rebuild(id),
    onSuccess: () => {
      setMessage('Demand consolidation rebuilt successfully.');
      queryClient.invalidateQueries({ queryKey: ['demand-consolidations'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to rebuild demand consolidation');
    },
  });

  const shareMutation = useMutation({
    mutationFn: (id: string) => DemandConsolidationsApi.shareWhatsApp(id),
    onSuccess: (response) => {
      setShareMessage(response.data.messageText);
      setMessage('WhatsApp share text generated successfully.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to generate WhatsApp share text');
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setShareMessage(null);

    if (!form.deliveryCycleId.trim()) {
      setMessage('Delivery cycle ID is required.');
      return;
    }

    await createMutation.mutateAsync({
      ...form,
      includeStatuses: ['approved'],
    });
  }

  const rows = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  return (
    <div>
      <PageHeader
        title={routeMeta.pageTitle}
        description={routeMeta.pageDescription}
      />

      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <input
              value={filters.search ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
              placeholder="Search consolidation no or notes"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            />
            <select
              value={filters.status ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as DemandConsolidationListFilters['status'], page: 1 }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="po_generated">PO Generated</option>
            </select>
            <input
              type="date"
              value={filters.fromDate ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value, page: 1 }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset Filters
            </button>
          </div>

          {listQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading demand consolidations...</div>
          ) : listQuery.error ? (
            <EmptyState
              title="Unable to load demand consolidations"
              description={listQuery.error instanceof Error ? listQuery.error.message : 'Unknown demand consolidation error'}
            />
          ) : rows.length === 0 ? (
            <EmptyState title="No demand consolidations found" description="Create a consolidation from approved orders to begin procurement planning." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Consolidation</th>
                      <th className="px-4 py-3 font-medium">Delivery Cycle</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-950">{row.consolidationNo}</div>
                          <div className="text-xs text-slate-500">{row.notes ?? 'No notes'}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{row.deliveryCycle?.cycleCode ?? row.deliveryCycleId}</div>
                          <div className="text-xs text-slate-500">
                            {row.deliveryCycle?.deliveryDate ? new Date(row.deliveryCycle.deliveryDate).toLocaleDateString('en-IN') : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800">
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {new Date(row.consolidationDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/app/demand-consolidations/${row.id}`}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Open
                            </Link>
                            {row.status === 'reviewed' ? (
                              <button
                                type="button"
                                onClick={() => approveMutation.mutate(row.id)}
                                className="rounded-lg border border-cyan-300 px-3 py-1.5 text-xs font-medium text-cyan-900 hover:bg-cyan-50"
                              >
                                Approve
                              </button>
                            ) : null}
                            {row.status !== 'approved' && row.status !== 'po_generated' ? (
                              <button
                                type="button"
                                onClick={() => rebuildMutation.mutate(row.id)}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Rebuild
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => shareMutation.mutate(row.id)}
                              className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                            >
                              WhatsApp Text
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>
                  Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}
                </span>
                <span>{meta?.total ?? rows.length} demand consolidations</span>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Create Consolidation</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a demand sheet for a delivery cycle using approved sales orders.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Delivery Cycle</span>
              <LookupInput
                resource="deliveryCycles"
                value={form.deliveryCycleId}
                onChange={(value) => setForm((current) => ({ ...current, deliveryCycleId: value }))}
                placeholder="Search delivery cycle"
                searchPlaceholder="Search cycle code or shift"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
              <textarea
                value={form.notes ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-[100px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                placeholder="Optional procurement note, buffer note, or cycle context"
              />
            </label>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creating consolidation...' : 'Create Demand Consolidation'}
            </button>
          </form>

          {shareMessage ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <div className="mb-2 font-semibold">WhatsApp Message Preview</div>
              <pre className="whitespace-pre-wrap font-sans">{shareMessage}</pre>
            </div>
          ) : null}

          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
            Tip: delivery cycles are now available via searchable lookup, so you can choose them without pasting raw UUIDs.
          </div>
        </section>
      </div>
    </div>
  );
}
