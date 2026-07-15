'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { LookupInput } from '@/components/ui/lookup-input';
import { PageHeader } from '@/components/ui/page-header';
import { InventoryApi } from '@/features/inventory/api';
import type { StockMovementFilters } from '@/types/inventory';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

const DEFAULT_FILTERS: StockMovementFilters = {
  page: 1,
  limit: 20,
  search: '',
};

export function InventoryMovementsView() {
  const [filters, setFilters] = useState<StockMovementFilters>(DEFAULT_FILTERS);
  const queryKey = useMemo(() => ['inventory', 'movements', filters], [filters]);
  const movementsQuery = useQuery({ queryKey, queryFn: () => InventoryApi.getMovements(filters) });

  const rows = movementsQuery.data?.data ?? [];
  const meta = movementsQuery.data?.meta;

  return (
    <div>
      <PageHeader title="Stock Movements" description="Review inventory inflow and outflow movements across receipts, loading, and adjustments." />
      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input value={filters.search ?? ''} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Search movement no or reference" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
        <LookupInput resource="productVariants" value={filters.variantId ?? ''} onChange={(value) => setFilters((current) => ({ ...current, variantId: value, page: 1 }))} placeholder="Search variant" />
        <LookupInput resource="warehouses" value={filters.warehouseId ?? ''} onChange={(value) => setFilters((current) => ({ ...current, warehouseId: value, page: 1 }))} placeholder="Search warehouse" />
        <input value={filters.movementType ?? ''} onChange={(event) => setFilters((current) => ({ ...current, movementType: event.target.value, page: 1 }))} placeholder="Movement type" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
      </div>

      {movementsQuery.isLoading ? (
        <div className="text-sm text-slate-500">Loading stock movements...</div>
      ) : movementsQuery.error ? (
        <EmptyState title="Unable to load stock movements" description={movementsQuery.error instanceof Error ? movementsQuery.error.message : 'Unknown stock movement error'} />
      ) : rows.length === 0 ? (
        <EmptyState title="No stock movements found" description="Post GRNs, generate loading sheets, or post adjustments to create stock movements." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Movement</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Warehouse</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">In</th>
                  <th className="px-4 py-3 font-medium">Out</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3"><div className="font-medium text-slate-950">{row.movementNo ?? row.id}</div><div className="text-xs text-slate-500">{row.referenceType ?? '—'} / {row.referenceId ?? '—'}</div></td>
                    <td className="px-4 py-3"><div className="font-medium text-slate-950">{row.variant?.productName ?? 'Unknown Product'}</div><div className="text-xs text-slate-500">{row.variant?.variantName ?? row.variant?.sku ?? row.variantId}</div></td>
                    <td className="px-4 py-3 text-slate-700">{row.warehouse?.name ?? row.warehouseId}</td>
                    <td className="px-4 py-3 text-slate-700">{row.movementType}</td>
                    <td className="px-4 py-3 text-slate-700">{row.qtyIn}</td>
                    <td className="px-4 py-3 text-slate-700">{row.qtyOut}</td>
                    <td className="px-4 py-3 text-slate-700">{new Date(row.movementAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span>Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}</span>
            <span>{meta?.total ?? rows.length} stock movements</span>
          </div>
        </div>
      )}
    </div>
  );
}
