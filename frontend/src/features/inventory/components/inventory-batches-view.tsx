'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { LookupInput } from '@/components/ui/lookup-input';
import { PageHeader } from '@/components/ui/page-header';
import { InventoryApi } from '@/features/inventory/api';
import type { InventoryBatchFilters } from '@/types/inventory';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

const DEFAULT_FILTERS: InventoryBatchFilters = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
  nearExpiry: '',
};

export function InventoryBatchesView() {
  const [filters, setFilters] = useState<InventoryBatchFilters>(DEFAULT_FILTERS);
  const queryKey = useMemo(() => ['inventory', 'batches', filters], [filters]);
  const batchesQuery = useQuery({ queryKey, queryFn: () => InventoryApi.getBatches(filters) });

  const rows = batchesQuery.data?.data ?? [];
  const meta = batchesQuery.data?.meta;

  return (
    <div>
      <PageHeader title="Inventory Batches" description="Inspect stock by batch number, quantity, and expiry date." />
      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input value={filters.search ?? ''} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Search batch no or status" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
        <LookupInput resource="productVariants" value={filters.variantId ?? ''} onChange={(value) => setFilters((current) => ({ ...current, variantId: value, page: 1 }))} placeholder="Search variant" />
        <LookupInput resource="warehouses" value={filters.warehouseId ?? ''} onChange={(value) => setFilters((current) => ({ ...current, warehouseId: value, page: 1 }))} placeholder="Search warehouse" />
        <select value={filters.nearExpiry ?? ''} onChange={(event) => setFilters((current) => ({ ...current, nearExpiry: event.target.value, page: 1 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
          <option value="">All expiry states</option>
          <option value="true">Near expiry only</option>
        </select>
      </div>

      {batchesQuery.isLoading ? (
        <div className="text-sm text-slate-500">Loading batches...</div>
      ) : batchesQuery.error ? (
        <EmptyState title="Unable to load batches" description={batchesQuery.error instanceof Error ? batchesQuery.error.message : 'Unknown batch error'} />
      ) : rows.length === 0 ? (
        <EmptyState title="No inventory batches found" description="Post GRNs to create inventory batches." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Warehouse</th>
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">Available</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 font-medium">Expiry</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3"><div className="font-medium text-slate-950">{row.variant?.productName ?? 'Unknown Product'}</div><div className="text-xs text-slate-500">{row.variant?.variantName ?? row.variant?.sku ?? row.variantId}</div></td>
                    <td className="px-4 py-3 text-slate-700">{row.warehouse?.name ?? row.warehouseId}</td>
                    <td className="px-4 py-3 text-slate-700">{row.batchNo}</td>
                    <td className="px-4 py-3 text-slate-700">{row.availableQty}</td>
                    <td className="px-4 py-3 text-slate-700">{row.receivedQty}</td>
                    <td className="px-4 py-3 text-slate-700">{row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span>Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}</span>
            <span>{meta?.total ?? rows.length} batches</span>
          </div>
        </div>
      )}
    </div>
  );
}
