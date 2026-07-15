'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { LookupInput } from '@/components/ui/lookup-input';
import { InventoryApi } from '@/features/inventory/api';
import type { CreateStockAdjustmentPayload, StockAdjustmentFilters } from '@/types/inventory';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

const DEFAULT_FILTERS: StockAdjustmentFilters = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
};

const DEFAULT_FORM: CreateStockAdjustmentPayload = {
  warehouseId: '',
  adjustmentDate: new Date().toISOString().slice(0, 10),
  reason: 'physical_count',
  remarks: '',
  items: [{ variantId: '', inventoryBatchId: '', physicalQty: 0, remarks: '' }],
};

export function InventoryAdjustmentsView() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<StockAdjustmentFilters>(DEFAULT_FILTERS);
  const [form, setForm] = useState<CreateStockAdjustmentPayload>(DEFAULT_FORM);
  const [message, setMessage] = useState<string | null>(null);

  const queryKey = useMemo(() => ['inventory', 'adjustments', filters], [filters]);
  const adjustmentsQuery = useQuery({ queryKey, queryFn: () => InventoryApi.getAdjustments(filters) });

  const createMutation = useMutation({
    mutationFn: (payload: CreateStockAdjustmentPayload) => InventoryApi.createAdjustment(payload),
    onSuccess: () => {
      setMessage('Stock adjustment created successfully.');
      setForm(DEFAULT_FORM);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'adjustments'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to create stock adjustment'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => InventoryApi.approveAdjustment(id),
    onSuccess: () => {
      setMessage('Stock adjustment approved successfully.');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'adjustments'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to approve stock adjustment'),
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => InventoryApi.postAdjustment(id),
    onSuccess: () => {
      setMessage('Stock adjustment posted successfully.');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'adjustments'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to post stock adjustment'),
  });

  function updateItem(index: number, patch: Partial<CreateStockAdjustmentPayload['items'][number]>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, { variantId: '', inventoryBatchId: '', physicalQty: 0, remarks: '' }],
    }));
  }

  function removeItem(index: number) {
    setForm((current) => ({
      ...current,
      items: current.items.length > 1 ? current.items.filter((_, itemIndex) => itemIndex !== index) : current.items,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const validItems = form.items
      .filter((item) => item.variantId.trim())
      .map((item) => ({
        ...item,
        inventoryBatchId: item.inventoryBatchId?.trim() ? item.inventoryBatchId : undefined,
        remarks: item.remarks?.trim() ? item.remarks : undefined,
      }));
    if (!form.warehouseId.trim()) {
      setMessage('Warehouse ID is required.');
      return;
    }
    if (!validItems.length) {
      setMessage('Add at least one valid adjustment item.');
      return;
    }
    await createMutation.mutateAsync({
      ...form,
      remarks: form.remarks?.trim() ? form.remarks.trim() : undefined,
      items: validItems,
    });
  }

  const rows = adjustmentsQuery.data?.data ?? [];
  const meta = adjustmentsQuery.data?.meta;

  return (
    <div>
      <PageHeader title="Stock Adjustments" description="Create physical stock adjustments and post inventory corrections into stock movements." />

      {message ? <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <input value={filters.search ?? ''} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Search adjustment no or reason" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <LookupInput resource="warehouses" value={filters.warehouseId ?? ''} onChange={(value) => setFilters((current) => ({ ...current, warehouseId: value, page: 1 }))} placeholder="Search warehouse" />
            <select value={filters.status ?? ''} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
            </select>
            <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reset Filters</button>
          </div>

          {adjustmentsQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading stock adjustments...</div>
          ) : adjustmentsQuery.error ? (
            <EmptyState title="Unable to load stock adjustments" description={adjustmentsQuery.error instanceof Error ? adjustmentsQuery.error.message : 'Unknown stock adjustment error'} />
          ) : rows.length === 0 ? (
            <EmptyState title="No stock adjustments found" description="Create a physical stock correction adjustment from the form." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Adjustment</th>
                      <th className="px-4 py-3 font-medium">Warehouse</th>
                      <th className="px-4 py-3 font-medium">Reason</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3"><div className="font-medium text-slate-950">{row.adjustmentNo}</div><div className="text-xs text-slate-500">{new Date(row.adjustmentDate).toLocaleDateString('en-IN')}</div></td>
                        <td className="px-4 py-3 text-slate-700">{row.warehouse?.name ?? row.warehouseId}</td>
                        <td className="px-4 py-3 text-slate-700">{row.reason ?? '—'}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800">{row.status}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {row.status === 'draft' ? <button type="button" onClick={() => approveMutation.mutate(row.id)} className="rounded-lg border border-cyan-300 px-3 py-1.5 text-xs font-medium text-cyan-900 hover:bg-cyan-50">Approve</button> : null}
                            {row.status === 'approved' ? <button type="button" onClick={() => postMutation.mutate(row.id)} className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50">Post</button> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}</span>
                <span>{meta?.total ?? rows.length} stock adjustments</span>
              </div>
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Create Stock Adjustment</h2>
              <p className="mt-1 text-sm text-slate-500">Post physical stock corrections into inventory when quantities differ from the system.</p>
            </div>
            <button type="button" onClick={addItem} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Add Item</button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <LookupInput
              resource="warehouses"
              value={form.warehouseId}
              onChange={(value) => setForm((current) => ({ ...current, warehouseId: value }))}
              placeholder="Search warehouse"
              searchPlaceholder="Search warehouse by name or code"
            />
            <input type="date" value={form.adjustmentDate} onChange={(event) => setForm((current) => ({ ...current, adjustmentDate: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Reason" />
            <textarea value={form.remarks ?? ''} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} className="min-h-[84px] rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Remarks" />
          </div>

          <div className="mt-4 space-y-3">
            {form.items.map((item, index) => (
              <div key={`${index}-${item.variantId}`} className="rounded-xl border border-slate-200 p-3">
                <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_0.8fr_auto]">
                  <LookupInput
                    resource="productVariants"
                    value={item.variantId}
                    onChange={(value) => updateItem(index, { variantId: value })}
                    placeholder="Search variant"
                    searchPlaceholder="Search by product, SKU, or barcode"
                  />
                  <LookupInput
                    resource="inventoryBatches"
                    value={item.inventoryBatchId ?? ''}
                    onChange={(value) => updateItem(index, { inventoryBatchId: value })}
                    placeholder="Optional inventory batch"
                    searchPlaceholder="Search batch number or product"
                  />
                  <input type="number" step="0.001" value={item.physicalQty} onChange={(event) => updateItem(index, { physicalQty: Number(event.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Physical Qty" />
                  <button type="button" onClick={() => removeItem(index)} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50">Remove</button>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={createMutation.isPending} className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {createMutation.isPending ? 'Creating adjustment...' : 'Create Stock Adjustment'}
          </button>
        </form>
      </div>
    </div>
  );
}
