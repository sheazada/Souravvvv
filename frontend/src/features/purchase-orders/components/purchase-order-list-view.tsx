'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { LookupInput } from '@/components/ui/lookup-input';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { DemandConsolidationsApi } from '@/features/demand-consolidations/api';
import { PurchaseOrdersApi } from '@/features/purchase-orders/api';
import { formatCurrency } from '@/lib/utils/number';
import type {
  CreatePurchaseOrderFromDemandPayload,
  CreatePurchaseOrderPayload,
  PurchaseOrderDetail,
  PurchaseOrderListFilters,
} from '@/types/purchase-orders';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const DEFAULT_FILTERS: PurchaseOrderListFilters = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
};

const DEFAULT_MANUAL_FORM: CreatePurchaseOrderPayload = {
  supplierId: '',
  poDate: new Date().toISOString().slice(0, 10),
  expectedReceiptDate: new Date().toISOString().slice(0, 10),
  remarks: '',
  items: [{ variantId: '', orderedQty: 1, unitCost: 0, taxRate: 0 }],
};

const DEFAULT_FROM_DEMAND_FORM: CreatePurchaseOrderFromDemandPayload = {
  supplierId: '',
  demandConsolidationId: '',
  remarks: '',
};

export function PurchaseOrderListView() {
  const routeMeta = getAdminRouteMeta('purchaseOrders');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PurchaseOrderListFilters>(DEFAULT_FILTERS);
  const [manualForm, setManualForm] = useState<CreatePurchaseOrderPayload>(DEFAULT_MANUAL_FORM);
  const [fromDemandForm, setFromDemandForm] = useState<CreatePurchaseOrderFromDemandPayload>(DEFAULT_FROM_DEMAND_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [quickEditPoId, setQuickEditPoId] = useState<string | null>(null);
  const [quickEditExtraDrafts, setQuickEditExtraDrafts] = useState<Record<string, number>>({});

  const queryKey = useMemo(() => ['purchase-orders', filters], [filters]);
  const listQuery = useQuery({ queryKey, queryFn: () => PurchaseOrdersApi.list(filters) });
  const demandItemsQuery = useQuery({
    queryKey: ['purchase-orders', 'from-demand', fromDemandForm.demandConsolidationId, 'items'],
    queryFn: () => DemandConsolidationsApi.getItems(fromDemandForm.demandConsolidationId),
    enabled: Boolean(fromDemandForm.demandConsolidationId.trim()),
  });
  const quickEditPoQuery = useQuery({
    queryKey: ['purchase-orders', 'quick-edit', quickEditPoId],
    queryFn: () => PurchaseOrdersApi.getById(quickEditPoId!),
    enabled: Boolean(quickEditPoId),
  });

  const createManualMutation = useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) => PurchaseOrdersApi.create(payload),
    onSuccess: () => {
      setMessage('Purchase order created successfully.');
      setManualForm(DEFAULT_MANUAL_FORM);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to create purchase order'),
  });

  const createFromDemandMutation = useMutation({
    mutationFn: (payload: CreatePurchaseOrderFromDemandPayload) => PurchaseOrdersApi.createFromDemand(payload),
    onSuccess: () => {
      setMessage('Purchase order generated from demand successfully.');
      setFromDemandForm(DEFAULT_FROM_DEMAND_FORM);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to generate purchase order from demand'),
  });

  const updateDemandExtrasMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { items: Array<{ variantId: string; extraQty?: number }> } }) =>
      PurchaseOrdersApi.updateDemandExtras(id, payload),
    onSuccess: (_, variables) => {
      setMessage('Extra procurement quantities updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', 'quick-edit', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.id] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to update extra procurement quantities'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => PurchaseOrdersApi.approve(id),
    onSuccess: () => {
      setMessage('Purchase order approved successfully.');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to approve purchase order'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => PurchaseOrdersApi.cancel(id),
    onSuccess: () => {
      setMessage('Purchase order cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to cancel purchase order'),
  });

  useEffect(() => {
    if (!fromDemandForm.demandConsolidationId.trim()) {
      setFromDemandForm((current) => ({ ...current, items: [] }));
      return;
    }

    const sourceItems = demandItemsQuery.data?.data ?? [];
    if (!sourceItems.length) {
      return;
    }

    setFromDemandForm((current) => {
      const previousExtras = new Map((current.items ?? []).map((item) => [item.variantId, item.extraQty ?? 0]));
      return {
        ...current,
        items: sourceItems.map((item) => ({
          variantId: item.variantId,
          extraQty: previousExtras.get(item.variantId) ?? 0,
        })),
      };
    });
  }, [demandItemsQuery.data, fromDemandForm.demandConsolidationId]);

  useEffect(() => {
    const po = quickEditPoQuery.data?.data;
    if (!po) {
      return;
    }

    setQuickEditExtraDrafts((current) => {
      const next = { ...current };
      for (const item of po.items) {
        if (next[item.variantId] === undefined) {
          next[item.variantId] = item.extraQty ?? 0;
        }
      }
      return next;
    });
  }, [quickEditPoQuery.data]);

  function updateItem(index: number, patch: Partial<CreatePurchaseOrderPayload['items'][number]>) {
    setManualForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addItemRow() {
    setManualForm((current) => ({
      ...current,
      items: [...current.items, { variantId: '', orderedQty: 1, unitCost: 0, taxRate: 0 }],
    }));
  }

  function removeItemRow(index: number) {
    setManualForm((current) => ({
      ...current,
      items: current.items.length > 1 ? current.items.filter((_, itemIndex) => itemIndex !== index) : current.items,
    }));
  }

  async function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const validItems = manualForm.items.filter((item) => item.variantId.trim() && item.orderedQty > 0);
    if (!manualForm.supplierId.trim()) {
      setMessage('Supplier ID is required for manual PO creation.');
      return;
    }
    if (!validItems.length) {
      setMessage('Add at least one valid PO item.');
      return;
    }
    await createManualMutation.mutateAsync({ ...manualForm, items: validItems });
  }

  function updateDemandItemExtra(variantId: string, extraQty: number) {
    setFromDemandForm((current) => ({
      ...current,
      items: (current.items ?? []).map((item) =>
        item.variantId === variantId ? { ...item, extraQty } : item,
      ),
    }));
  }

  function getQuickEditExtraDraft(variantId: string, fallback?: number) {
    return quickEditExtraDrafts[variantId] ?? fallback ?? 0;
  }

  function updateQuickEditExtraDraft(variantId: string, extraQty: number) {
    setQuickEditExtraDrafts((current) => ({ ...current, [variantId]: extraQty }));
  }

  async function submitFromDemand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!fromDemandForm.supplierId.trim() || !fromDemandForm.demandConsolidationId.trim()) {
      setMessage('Supplier ID and approved demand consolidation are required.');
      return;
    }
    await createFromDemandMutation.mutateAsync({
      ...fromDemandForm,
      items: (fromDemandForm.items ?? []).filter((item) => Number(item.extraQty ?? 0) > 0),
    });
  }

  function openQuickEdit(poId: string) {
    setMessage(null);
    setQuickEditPoId((current) => (current === poId ? null : poId));
    setQuickEditExtraDrafts({});
  }

  function submitQuickEdit(po: PurchaseOrderDetail) {
    setMessage(null);
    updateDemandExtrasMutation.mutate({
      id: po.id,
      payload: {
        items: po.items.map((item) => ({
          variantId: item.variantId,
          extraQty: getQuickEditExtraDraft(item.variantId, item.extraQty ?? 0),
        })),
      },
    });
  }

  const rows = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;
  const quickEditPo = quickEditPoQuery.data?.data ?? null;
  const quickEditPreviewGrandTotal = quickEditPo
    ? quickEditPo.items.reduce((sum, item) => {
        const extraQty = getQuickEditExtraDraft(item.variantId, item.extraQty ?? 0);
        const poQty = Number(item.demandQty ?? 0) + Number(extraQty);
        const lineBase = poQty * Number(item.unitCost ?? 0);
        const lineTax = (lineBase * Number(item.taxRate ?? 0)) / 100;
        return sum + lineBase + lineTax;
      }, 0)
    : 0;

  return (
    <div>
      <PageHeader
        title={routeMeta.pageTitle}
        description={routeMeta.pageDescription}
      />

      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{message}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <input
              value={filters.search ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
              placeholder="Search PO no or remarks"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            />
            <select
              value={filters.status ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="partial">Partial</option>
              <option value="received">Received</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              aria-label="Extra qty audit filter"
              value={filters.extraQtyAuditState ?? ''}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  extraQtyAuditState: event.target.value as PurchaseOrderListFilters['extraQtyAuditState'],
                  page: 1,
                }))
              }
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            >
              <option value="">All extra qty edit states</option>
              <option value="recently_changed">Extra qty changed recently (7d)</option>
              <option value="never_changed">Never extra-edited</option>
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

          {quickEditPoId ? (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Quick Edit Extra Procurement Qty</h2>
                  <p className="mt-1 text-sm text-slate-500">Adjust supplier-side extra qty for a draft demand-generated PO without opening the detail page.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickEditPoId(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                >
                  Close Quick Edit
                </button>
              </div>

              {quickEditPoQuery.isLoading ? (
                <div className="text-sm text-slate-500">Loading PO items for quick edit...</div>
              ) : quickEditPoQuery.error ? (
                <EmptyState title="Unable to load quick edit PO" description={quickEditPoQuery.error instanceof Error ? quickEditPoQuery.error.message : 'Unknown quick edit error'} />
              ) : quickEditPo ? (
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-950">{quickEditPo.poNo}</span>
                    <span>Supplier: {quickEditPo.supplier?.name ?? quickEditPo.supplierId}</span>
                    <span>Demand source: {quickEditPo.demandConsolidation?.consolidationNo ?? 'Manual'}</span>
                    <span>Preview total: {formatCurrency(quickEditPreviewGrandTotal)}</span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 font-medium">Demand Qty</th>
                          <th className="px-4 py-3 font-medium">Extra Qty</th>
                          <th className="px-4 py-3 font-medium">PO Qty</th>
                          <th className="px-4 py-3 font-medium">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {quickEditPo.items.map((item) => {
                          const extraQty = getQuickEditExtraDraft(item.variantId, item.extraQty ?? 0);
                          const poQty = Number(item.demandQty ?? 0) + Number(extraQty);
                          const previewLineBase = poQty * Number(item.unitCost ?? 0);
                          const previewLineTax = (previewLineBase * Number(item.taxRate ?? 0)) / 100;
                          const previewLineTotal = previewLineBase + previewLineTax;

                          return (
                            <tr key={item.id}>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div>
                                <div className="text-xs text-slate-500">{item.variant?.variantName ?? item.variant?.sku ?? item.variantId}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{item.demandQty ?? 0}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.001"
                                  aria-label={`Quick edit extra qty ${item.variant?.sku ?? item.variantId}`}
                                  value={extraQty}
                                  onChange={(event) => updateQuickEditExtraDraft(item.variantId, Number(event.target.value))}
                                  className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-slate-700">{poQty}</td>
                              <td className="px-4 py-3 text-slate-700">{formatCurrency(previewLineTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => submitQuickEdit(quickEditPo)}
                      disabled={updateDemandExtrasMutation.isPending}
                      className="rounded-xl border border-cyan-300 px-4 py-2 text-sm font-medium text-cyan-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateDemandExtrasMutation.isPending ? 'Updating Extra Qty...' : 'Save Quick Edit'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {listQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading purchase orders...</div>
          ) : listQuery.error ? (
            <EmptyState title="Unable to load purchase orders" description={listQuery.error instanceof Error ? listQuery.error.message : 'Unknown purchase order error'} />
          ) : rows.length === 0 ? (
            <EmptyState title="No purchase orders found" description="Create a manual PO or generate one from an approved demand consolidation." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">PO</th>
                      <th className="px-4 py-3 font-medium">Supplier</th>
                      <th className="px-4 py-3 font-medium">Demand Source</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.map((row) => {
                      const canQuickEditDemandExtras = row.status === 'draft' && Boolean(row.demandConsolidation);

                      return (
                        <tr key={row.id} className="align-top">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-950">{row.poNo}</div>
                            <div className="text-xs text-slate-500">{new Date(row.poDate).toLocaleDateString('en-IN')}</div>
                            {row.remarks ? <div className="mt-1 text-xs text-slate-500">{row.remarks}</div> : null}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{row.supplier?.name ?? row.supplierId}</td>
                          <td className="px-4 py-3 text-slate-700">
                            <div>{row.demandConsolidation?.consolidationNo ?? 'Manual'}</div>
                            {row.latestDemandExtraAudit ? (
                              <div className="mt-1 text-xs text-slate-500">
                                Last extra edit: {row.latestDemandExtraAudit.changedBy?.fullName ?? 'Unknown User'} •{' '}
                                {new Date(row.latestDemandExtraAudit.changedAt).toLocaleDateString('en-IN')} •{' '}
                                {row.latestDemandExtraAudit.changedItemCount} item(s) • extra{' '}
                                {row.latestDemandExtraAudit.totalExtraQtyBefore}→{row.latestDemandExtraAudit.totalExtraQtyAfter}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3"><span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800">{row.status}</span></td>
                          <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(row.grandTotal ?? 0))}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Link href={`/app/purchase-orders/${row.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</Link>
                              {canQuickEditDemandExtras ? (
                                <button
                                  type="button"
                                  onClick={() => openQuickEdit(row.id)}
                                  className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                                >
                                  {quickEditPoId === row.id ? 'Hide Quick Edit' : 'Quick Edit Extra Qty'}
                                </button>
                              ) : null}
                              {row.status === 'draft' ? (
                                <button type="button" onClick={() => approveMutation.mutate(row.id)} className="rounded-lg border border-cyan-300 px-3 py-1.5 text-xs font-medium text-cyan-900 hover:bg-cyan-50">Approve</button>
                              ) : null}
                              {!['cancelled', 'received', 'closed'].includes(row.status) ? (
                                <button type="button" onClick={() => cancelMutation.mutate(row.id)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Cancel</button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}</span>
                <span>{meta?.total ?? rows.length} purchase orders</span>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <form onSubmit={submitFromDemand} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">Generate PO from Demand</h2>
              <p className="mt-1 text-sm text-slate-500">Use an approved demand consolidation to create a supplier PO automatically.</p>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Supplier</span>
                <LookupInput
                  resource="suppliers"
                  value={fromDemandForm.supplierId}
                  onChange={(value) => setFromDemandForm((current) => ({ ...current, supplierId: value }))}
                  placeholder="Search supplier"
                  searchPlaceholder="Search supplier by name, code, or mobile"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Approved Demand Consolidation</span>
                <LookupInput
                  resource="demandConsolidations"
                  value={fromDemandForm.demandConsolidationId}
                  onChange={(value) => setFromDemandForm((current) => ({ ...current, demandConsolidationId: value }))}
                  query={{ status: 'approved', limit: 100 }}
                  placeholder="Search approved consolidation"
                  searchPlaceholder="Search consolidation number or cycle"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Remarks</span>
                <textarea value={fromDemandForm.remarks ?? ''} onChange={(event) => setFromDemandForm((current) => ({ ...current, remarks: event.target.value }))} className="min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Optional supplier note" />
              </label>
            </div>

            {fromDemandForm.demandConsolidationId.trim() ? (
              <div className="mt-4 rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
                  Extra Procurement Beyond Retailer Demand
                </div>
                {demandItemsQuery.isLoading ? (
                  <div className="px-4 py-4 text-sm text-slate-500">Loading consolidation items...</div>
                ) : demandItemsQuery.error ? (
                  <div className="px-4 py-4 text-sm text-red-700">{demandItemsQuery.error instanceof Error ? demandItemsQuery.error.message : 'Unable to load demand items'}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-white text-left text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 font-medium">Demand Qty</th>
                          <th className="px-4 py-3 font-medium">Extra Qty</th>
                          <th className="px-4 py-3 font-medium">PO Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {(demandItemsQuery.data?.data ?? []).map((item) => {
                          const extraQty = fromDemandForm.items?.find((row) => row.variantId === item.variantId)?.extraQty ?? 0;
                          return (
                            <tr key={item.id}>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div>
                                <div className="text-xs text-slate-500">{item.variant?.variantName ?? item.variant?.sku ?? item.variantId}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{item.finalProcurementQty}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.001"
                                  aria-label={`Extra qty ${item.variant?.sku ?? item.variantId}`}
                                  value={extraQty}
                                  onChange={(event) => updateDemandItemExtra(item.variantId, Number(event.target.value))}
                                  className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-4 py-3 text-slate-700">{Number(item.finalProcurementQty) + Number(extraQty)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                  Use this only for supplier-side buffer or extra procurement beyond approved retailer demand. Retailer demand remains unchanged in the consolidation.
                </div>
              </div>
            ) : null}

            <button type="submit" disabled={createFromDemandMutation.isPending} className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
              {createFromDemandMutation.isPending ? 'Generating PO...' : 'Generate PO from Demand'}
            </button>
          </form>

          <form onSubmit={submitManual} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Create Manual PO</h2>
                <p className="mt-1 text-sm text-slate-500">Use manual purchase order entry when procurement is not directly generated from demand.</p>
              </div>
              <button type="button" onClick={addItemRow} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Add Item</button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <LookupInput
                resource="suppliers"
                value={manualForm.supplierId}
                onChange={(value) => setManualForm((current) => ({ ...current, supplierId: value }))}
                placeholder="Search supplier"
                searchPlaceholder="Search supplier by name, code, or mobile"
              />
              <input type="date" value={manualForm.poDate} onChange={(event) => setManualForm((current) => ({ ...current, poDate: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              <input type="date" value={manualForm.expectedReceiptDate ?? ''} onChange={(event) => setManualForm((current) => ({ ...current, expectedReceiptDate: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              <textarea value={manualForm.remarks ?? ''} onChange={(event) => setManualForm((current) => ({ ...current, remarks: event.target.value }))} className="min-h-[84px] rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2" placeholder="Optional procurement remark" />
            </div>

            <div className="mt-4 space-y-3">
              {manualForm.items.map((item, index) => (
                <div key={`${index}-${item.variantId}`} className="rounded-xl border border-slate-200 p-3">
                  <div className="grid gap-3 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_auto]">
                    <LookupInput
                      resource="productVariants"
                      value={item.variantId}
                      onChange={(value) => updateItem(index, { variantId: value })}
                      placeholder="Search variant"
                      searchPlaceholder="Search by product, SKU, or barcode"
                    />
                    <input type="number" min={1} step="0.001" value={item.orderedQty} onChange={(event) => updateItem(index, { orderedQty: Number(event.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Qty" />
                    <input type="number" min={0} step="0.01" value={item.unitCost} onChange={(event) => updateItem(index, { unitCost: Number(event.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Cost" />
                    <input type="number" min={0} step="0.01" value={item.taxRate} onChange={(event) => updateItem(index, { taxRate: Number(event.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Tax %" />
                    <button type="button" onClick={() => removeItemRow(index)} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" disabled={createManualMutation.isPending} className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {createManualMutation.isPending ? 'Creating manual PO...' : 'Create Manual PO'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
