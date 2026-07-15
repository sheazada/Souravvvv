'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { LookupInput } from '@/components/ui/lookup-input';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { GoodsReceiptsApi } from '@/features/goods-receipts/api';
import type { CreateGoodsReceiptPayload, GoodsReceiptListFilters } from '@/types/goods-receipts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const DEFAULT_FILTERS: GoodsReceiptListFilters = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
};

const DEFAULT_FORM: CreateGoodsReceiptPayload = {
  supplierId: '',
  purchaseOrderId: '',
  warehouseId: '',
  receiptDate: new Date().toISOString().slice(0, 10),
  supplierChallanNo: '',
  vehicleNo: '',
  remarks: '',
  items: [{ purchaseOrderItemId: '', variantId: '', orderedQty: 1, receivedQty: 1, acceptedQty: 1, rejectedQty: 0, batchNo: '', manufacturingDate: '', expiryDate: '', unitCost: 0, remarks: '' }],
};

export function GoodsReceiptListView() {
  const routeMeta = getAdminRouteMeta('goodsReceipts');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<GoodsReceiptListFilters>(DEFAULT_FILTERS);
  const [form, setForm] = useState<CreateGoodsReceiptPayload>(DEFAULT_FORM);
  const [message, setMessage] = useState<string | null>(null);

  const queryKey = useMemo(() => ['goods-receipts', filters], [filters]);
  const listQuery = useQuery({ queryKey, queryFn: () => GoodsReceiptsApi.list(filters) });

  const createMutation = useMutation({
    mutationFn: (payload: CreateGoodsReceiptPayload) => GoodsReceiptsApi.create(payload),
    onSuccess: () => {
      setMessage('Goods receipt created successfully.');
      setForm(DEFAULT_FORM);
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to create goods receipt'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => GoodsReceiptsApi.approve(id),
    onSuccess: () => {
      setMessage('Goods receipt approved successfully.');
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to approve goods receipt'),
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => GoodsReceiptsApi.post(id),
    onSuccess: () => {
      setMessage('Goods receipt posted successfully.');
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to post goods receipt'),
  });

  function updateItem(index: number, patch: Partial<CreateGoodsReceiptPayload['items'][number]>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, { purchaseOrderItemId: '', variantId: '', orderedQty: 1, receivedQty: 1, acceptedQty: 1, rejectedQty: 0, batchNo: '', manufacturingDate: '', expiryDate: '', unitCost: 0, remarks: '' }],
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
      .filter((item) => item.variantId.trim() && item.receivedQty > 0)
      .map((item) => ({
        ...item,
        purchaseOrderItemId: item.purchaseOrderItemId?.trim() ? item.purchaseOrderItemId : undefined,
        batchNo: item.batchNo?.trim() ? item.batchNo : undefined,
        manufacturingDate: item.manufacturingDate?.trim() ? item.manufacturingDate : undefined,
        expiryDate: item.expiryDate?.trim() ? item.expiryDate : undefined,
        remarks: item.remarks?.trim() ? item.remarks : undefined,
      }));
    if (!form.supplierId.trim() || !form.warehouseId.trim()) {
      setMessage('Supplier ID and warehouse ID are required.');
      return;
    }
    if (!validItems.length) {
      setMessage('Add at least one valid GRN item.');
      return;
    }
    await createMutation.mutateAsync({
      ...form,
      purchaseOrderId: form.purchaseOrderId?.trim() ? form.purchaseOrderId.trim() : undefined,
      supplierChallanNo: form.supplierChallanNo?.trim() ? form.supplierChallanNo.trim() : undefined,
      vehicleNo: form.vehicleNo?.trim() ? form.vehicleNo.trim() : undefined,
      remarks: form.remarks?.trim() ? form.remarks.trim() : undefined,
      items: validItems,
    });
  }

  const rows = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  return (
    <div>
      <PageHeader title={routeMeta.pageTitle} description={routeMeta.pageDescription} />

      {message ? <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <input value={filters.search ?? ''} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Search GRN no, challan, vehicle" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <select value={filters.status ?? ''} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input type="date" value={filters.fromDate ?? ''} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value, page: 1 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reset Filters</button>
          </div>

          {listQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading goods receipts...</div>
          ) : listQuery.error ? (
            <EmptyState title="Unable to load goods receipts" description={listQuery.error instanceof Error ? listQuery.error.message : 'Unknown goods receipt error'} />
          ) : rows.length === 0 ? (
            <EmptyState title="No goods receipts found" description="Create a GRN after supplier delivery to compare and post stock." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">GRN</th>
                      <th className="px-4 py-3 font-medium">Supplier</th>
                      <th className="px-4 py-3 font-medium">Warehouse</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3"><div className="font-medium text-slate-950">{row.grnNo}</div><div className="text-xs text-slate-500">{new Date(row.receiptDate).toLocaleDateString('en-IN')}</div></td>
                        <td className="px-4 py-3 text-slate-700">{row.supplier?.name ?? row.supplierId}</td>
                        <td className="px-4 py-3 text-slate-700">{row.warehouse?.name ?? row.warehouseId}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800">{row.status}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/app/goods-receipts/${row.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</Link>
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
                <span>{meta?.total ?? rows.length} goods receipts</span>
              </div>
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Create Goods Receipt</h2>
              <p className="mt-1 text-sm text-slate-500">Record supplier quantities, batches, MFG dates, and expiry dates before stock posting.</p>
            </div>
            <button type="button" onClick={addItem} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Add Item</button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <LookupInput
              resource="suppliers"
              value={form.supplierId}
              onChange={(value) => setForm((current) => ({ ...current, supplierId: value }))}
              placeholder="Search supplier"
              searchPlaceholder="Search supplier by name, code, or mobile"
            />
            <LookupInput
              resource="purchaseOrders"
              value={form.purchaseOrderId ?? ''}
              onChange={(value) => setForm((current) => ({ ...current, purchaseOrderId: value }))}
              placeholder="Optional purchase order"
              searchPlaceholder="Search PO by number or supplier"
            />
            <LookupInput
              resource="warehouses"
              value={form.warehouseId}
              onChange={(value) => setForm((current) => ({ ...current, warehouseId: value }))}
              placeholder="Search warehouse"
              searchPlaceholder="Search warehouse by name or code"
            />
            <input type="date" value={form.receiptDate} onChange={(event) => setForm((current) => ({ ...current, receiptDate: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <input value={form.supplierChallanNo ?? ''} onChange={(event) => setForm((current) => ({ ...current, supplierChallanNo: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Supplier challan no" />
            <input value={form.vehicleNo ?? ''} onChange={(event) => setForm((current) => ({ ...current, vehicleNo: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Vehicle no" />
          </div>

          <div className="mt-4 space-y-3">
            {form.items.map((item, index) => (
              <div key={`${index}-${item.variantId}`} className="rounded-xl border border-slate-200 p-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <LookupInput
                    resource="productVariants"
                    value={item.variantId}
                    onChange={(value) => updateItem(index, { variantId: value })}
                    placeholder="Search variant"
                    searchPlaceholder="Search by product, SKU, or barcode"
                  />
                  <LookupInput
                    resource="purchaseOrderItems"
                    value={item.purchaseOrderItemId ?? ''}
                    onChange={(value) => updateItem(index, { purchaseOrderItemId: value })}
                    query={form.purchaseOrderId?.trim() ? { purchaseOrderId: form.purchaseOrderId, limit: 100 } : { limit: 100 }}
                    placeholder="Optional PO item"
                    searchPlaceholder="Search PO item by product, SKU, or PO number"
                  />
                  <input type="number" min={0} step="0.001" value={item.orderedQty} onChange={(event) => updateItem(index, { orderedQty: Number(event.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Ordered Qty" />
                  <input type="number" min={0.001} step="0.001" value={item.receivedQty} onChange={(event) => updateItem(index, { receivedQty: Number(event.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Received Qty" />
                  <input type="number" min={0} step="0.001" value={item.acceptedQty} onChange={(event) => updateItem(index, { acceptedQty: Number(event.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Accepted Qty" />
                  <input type="number" min={0} step="0.001" value={item.rejectedQty} onChange={(event) => updateItem(index, { rejectedQty: Number(event.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Rejected Qty" />
                  <input value={item.batchNo ?? ''} onChange={(event) => updateItem(index, { batchNo: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Batch no" />
                  <input type="number" min={0} step="0.01" value={item.unitCost} onChange={(event) => updateItem(index, { unitCost: Number(event.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Unit cost" />
                  <input type="date" value={item.manufacturingDate ?? ''} onChange={(event) => updateItem(index, { manufacturingDate: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
                  <input type="date" value={item.expiryDate ?? ''} onChange={(event) => updateItem(index, { expiryDate: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => removeItem(index)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Remove Item</button>
                </div>
              </div>
            ))}
          </div>

          <textarea value={form.remarks ?? ''} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} className="mt-4 min-h-[84px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Optional GRN remark" />

          <button type="submit" disabled={createMutation.isPending} className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
            {createMutation.isPending ? 'Creating GRN...' : 'Create Goods Receipt'}
          </button>
        </form>
      </div>
    </div>
  );
}
