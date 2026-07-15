'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { RetailersApi, type UpdateOrderingModePayload } from '@/features/retailers/api';
import type { RetailerListFilters } from '@/types/retailers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

const DEFAULT_FILTERS: RetailerListFilters = {
  page: 1,
  limit: 20,
  search: '',
  orderingMode: '',
  businessStatus: '',
};

export function RetailerListView() {
  const routeMeta = getAdminRouteMeta('retailers');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<RetailerListFilters>(DEFAULT_FILTERS);
  const [message, setMessage] = useState<string | null>(null);

  const queryKey = useMemo(() => ['retailers', filters], [filters]);
  const retailersQuery = useQuery({
    queryKey,
    queryFn: () => RetailersApi.list(filters),
  });

  const updateModeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOrderingModePayload }) =>
      RetailersApi.updateOrderingMode(id, payload),
    onSuccess: () => {
      setMessage('Retailer ordering mode updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['retailers'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update ordering mode');
    },
  });

  const data = retailersQuery.data?.data ?? [];
  const meta = retailersQuery.data?.meta;

  return (
    <div>
      <PageHeader
        title={routeMeta.pageTitle}
        description={routeMeta.pageDescription}
      />

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input
          value={filters.search ?? ''}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
          placeholder="Search by shop, code, owner, mobile"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />

        <select
          value={filters.orderingMode ?? ''}
          onChange={(event) => setFilters((current) => ({ ...current, orderingMode: event.target.value, page: 1 }))}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        >
          <option value="">All modes</option>
          <option value="self_service">Self Service</option>
          <option value="assisted">Assisted</option>
          <option value="hybrid">Hybrid</option>
        </select>

        <select
          value={filters.businessStatus ?? ''}
          onChange={(event) => setFilters((current) => ({ ...current, businessStatus: event.target.value, page: 1 }))}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
          <option value="seasonal">Seasonal</option>
          <option value="under_review">Under Review</option>
        </select>

        <button
          type="button"
          onClick={() => setFilters(DEFAULT_FILTERS)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Reset Filters
        </button>
      </div>

      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
          {message}
        </div>
      ) : null}

      {retailersQuery.isLoading ? (
        <div className="text-sm text-slate-500">Loading retailers...</div>
      ) : retailersQuery.error ? (
        <EmptyState
          title="Unable to load retailers"
          description={retailersQuery.error instanceof Error ? retailersQuery.error.message : 'Unknown retailer error'}
        />
      ) : data.length === 0 ? (
        <EmptyState title="No retailers found" description="Try changing the filters or add retailer data from the backend." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Retailer</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Order Mode</th>
                  <th className="px-4 py-3 font-medium">Ordering</th>
                  <th className="px-4 py-3 font-medium">Billing</th>
                  <th className="px-4 py-3 font-medium">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.map((retailer) => (
                  <tr key={retailer.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{retailer.shopName}</div>
                      <div className="text-xs text-slate-500">{retailer.retailerCode}</div>
                      <div className="text-xs text-slate-500">{retailer.ownerName ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{retailer.mobile}</div>
                      <div className="text-xs text-slate-500">{retailer.locality ?? retailer.city ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{retailer.retailerCategory ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {retailer.businessStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800">
                        {retailer.orderingMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{retailer.isOrderingEnabled ? 'Enabled' : 'Disabled'}</td>
                    <td className="px-4 py-3 text-slate-700">{retailer.isBillingEnabled ? 'Enabled' : 'Disabled'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateModeMutation.mutate({
                              id: retailer.id,
                              payload: {
                                orderingMode:
                                  retailer.orderingMode === 'assisted' ? 'self_service' : 'assisted',
                                isOrderingEnabled: retailer.isOrderingEnabled,
                                isBillingEnabled: retailer.isBillingEnabled,
                              },
                            })
                          }
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {retailer.orderingMode === 'assisted' ? 'Make Self Service' : 'Make Assisted'}
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
            <span>{meta?.total ?? data.length} retailers</span>
          </div>
        </div>
      )}
    </div>
  );
}
