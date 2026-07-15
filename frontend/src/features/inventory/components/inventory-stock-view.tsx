'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { LookupInput } from '@/components/ui/lookup-input';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { InventoryApi } from '@/features/inventory/api';
import type { InventoryStockFilters } from '@/types/inventory';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

const DEFAULT_FILTERS: InventoryStockFilters = {
  lowStock: '',
  nearExpiry: '',
};

export function InventoryStockView() {
  const routeMeta = getAdminRouteMeta('inventory');
  const [filters, setFilters] = useState<InventoryStockFilters>(DEFAULT_FILTERS);
  const queryKey = useMemo(() => ['inventory', 'stock-on-hand', filters], [filters]);
  const stockQuery = useQuery({ queryKey, queryFn: () => InventoryApi.getStockOnHand(filters) });

  const rows = stockQuery.data?.data ?? [];

  return (
    <div>
      <PageHeader title={routeMeta.pageTitle} description={routeMeta.pageDescription} />

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <LookupInput resource="productVariants" value={filters.variantId ?? ''} onChange={(value) => setFilters((current) => ({ ...current, variantId: value }))} placeholder="Search variant" />
        <LookupInput resource="warehouses" value={filters.warehouseId ?? ''} onChange={(value) => setFilters((current) => ({ ...current, warehouseId: value }))} placeholder="Search warehouse" />
        <select value={filters.lowStock ?? ''} onChange={(event) => setFilters((current) => ({ ...current, lowStock: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
          <option value="">All stock levels</option>
          <option value="true">Low stock only</option>
        </select>
        <select value={filters.nearExpiry ?? ''} onChange={(event) => setFilters((current) => ({ ...current, nearExpiry: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
          <option value="">All expiry states</option>
          <option value="true">Near expiry only</option>
        </select>
      </div>

      {stockQuery.isLoading ? (
        <div className="text-sm text-slate-500">Loading stock on hand...</div>
      ) : stockQuery.error ? (
        <EmptyState title="Unable to load stock" description={stockQuery.error instanceof Error ? stockQuery.error.message : 'Unknown stock error'} />
      ) : rows.length === 0 ? (
        <EmptyState title="No stock rows found" description="Post GRNs or relax the filters to see inventory stock data." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Warehouse</th>
                  <th className="px-4 py-3 font-medium">Batch Count</th>
                  <th className="px-4 py-3 font-medium">Available Qty</th>
                  <th className="px-4 py-3 font-medium">Reserved Qty</th>
                  <th className="px-4 py-3 font-medium">Damaged Qty</th>
                  <th className="px-4 py-3 font-medium">Nearest Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={`${row.warehouseId}-${row.variantId}`}>
                    <td className="px-4 py-3"><div className="font-medium text-slate-950">{row.variant?.productName ?? 'Unknown Product'}</div><div className="text-xs text-slate-500">{row.variant?.variantName ?? row.variant?.sku ?? row.variantId}</div></td>
                    <td className="px-4 py-3 text-slate-700">{row.warehouse?.name ?? row.warehouseId}</td>
                    <td className="px-4 py-3 text-slate-700">{row.batchCount}</td>
                    <td className="px-4 py-3 text-slate-700">{row.totalAvailableQty}</td>
                    <td className="px-4 py-3 text-slate-700">{row.totalReservedQty}</td>
                    <td className="px-4 py-3 text-slate-700">{row.totalDamagedQty}</td>
                    <td className="px-4 py-3 text-slate-700">{row.nearestExpiryDate ? new Date(row.nearestExpiryDate).toLocaleDateString('en-IN') : '—'}</td>
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
