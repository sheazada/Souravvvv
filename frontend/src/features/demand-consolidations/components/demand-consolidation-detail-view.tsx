'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { DemandConsolidationsApi } from '@/features/demand-consolidations/api';
import { formatCurrency } from '@/lib/utils/number';
import { buildDetailTitle } from '@/lib/utils/title';
import type { DemandConsolidationItem } from '@/types/demand-consolidations';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

export function DemandConsolidationDetailView({ id }: { id: string }) {
  const routeMeta = getAdminRouteMeta('demandConsolidations');
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { bufferQty: number; finalProcurementQty: number; remarks: string }>>({});

  const results = useQueries({
    queries: [
      { queryKey: ['demand-consolidation', id], queryFn: () => DemandConsolidationsApi.getById(id) },
      { queryKey: ['demand-consolidation', id, 'source-orders'], queryFn: () => DemandConsolidationsApi.getSourceOrders(id) },
      { queryKey: ['demand-consolidation', id, 'route-summary'], queryFn: () => DemandConsolidationsApi.getRouteWiseSummary(id) },
      { queryKey: ['demand-consolidation', id, 'area-summary'], queryFn: () => DemandConsolidationsApi.getAreaWiseSummary(id) },
    ],
  });

  const [detailQuery, sourceOrdersQuery, routeSummaryQuery, areaSummaryQuery] = results;
  const isLoading = results.some((query) => query.isLoading);
  const error = results.find((query) => query.error)?.error;

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: { bufferQty: number; finalProcurementQty: number; remarks: string } }) =>
      DemandConsolidationsApi.updateItem(id, itemId, payload),
    onSuccess: () => {
      setMessage('Demand item updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['demand-consolidation', id] });
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : 'Failed to update demand item');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => DemandConsolidationsApi.approve(id),
    onSuccess: () => {
      setMessage('Demand consolidation approved successfully.');
      queryClient.invalidateQueries({ queryKey: ['demand-consolidation', id] });
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : 'Failed to approve demand consolidation');
    },
  });

  const rebuildMutation = useMutation({
    mutationFn: () => DemandConsolidationsApi.rebuild(id),
    onSuccess: () => {
      setMessage('Demand consolidation rebuilt successfully.');
      queryClient.invalidateQueries({ queryKey: ['demand-consolidation', id] });
      queryClient.invalidateQueries({ queryKey: ['demand-consolidation', id, 'source-orders'] });
      queryClient.invalidateQueries({ queryKey: ['demand-consolidation', id, 'route-summary'] });
      queryClient.invalidateQueries({ queryKey: ['demand-consolidation', id, 'area-summary'] });
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : 'Failed to rebuild demand consolidation');
    },
  });

  const shareMutation = useMutation({
    mutationFn: () => DemandConsolidationsApi.shareWhatsApp(id),
    onSuccess: (response) => {
      setShareMessage(response.data.messageText);
      setMessage('WhatsApp share text generated successfully.');
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : 'Failed to generate WhatsApp share text');
    },
  });

  const detail = detailQuery.data?.data;
  const items = detail?.items ?? [];
  const sourceOrders = sourceOrdersQuery.data?.data ?? [];
  const routeSummary = routeSummaryQuery.data?.data ?? [];
  const areaSummary = areaSummaryQuery.data?.data ?? [];

  const editable = useMemo(
    () => detail && !['approved', 'po_generated'].includes(detail.status),
    [detail],
  );

  function draftFor(item: DemandConsolidationItem) {
    return drafts[item.id] ?? {
      bufferQty: item.bufferQty,
      finalProcurementQty: item.finalProcurementQty,
      remarks: item.remarks ?? '',
    };
  }

  function updateDraft(item: DemandConsolidationItem, patch: Partial<{ bufferQty: number; finalProcurementQty: number; remarks: string }>) {
    setDrafts((current) => ({
      ...current,
      [item.id]: {
        ...draftFor(item),
        ...patch,
      },
    }));
  }

  async function saveItem(item: DemandConsolidationItem) {
    const draft = draftFor(item);
    await updateItemMutation.mutateAsync({
      itemId: item.id,
      payload: draft,
    });
  }

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading demand consolidation...</div>;
  }

  if (error || !detail) {
    return (
      <EmptyState
        title="Unable to load demand consolidation"
        description={error instanceof Error ? error.message : 'Demand consolidation not found'}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={buildDetailTitle(routeMeta.detailTitlePrefix ?? routeMeta.pageTitle, detail.consolidationNo)}
        description={routeMeta.detailPageDescription}
      />

      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
          {message}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Order Qty" value={detail.totals.totalOrderQty} />
        <KpiCard label="Approved Qty" value={detail.totals.totalApprovedQty} />
        <KpiCard label="Buffer Qty" value={detail.totals.totalBufferQty} />
        <KpiCard label="Final Procurement Qty" value={detail.totals.totalFinalProcurementQty} />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
            <div className="mt-1 font-medium text-slate-950">{detail.status}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Delivery Cycle</div>
            <div className="mt-1 font-medium text-slate-950">{detail.deliveryCycle?.cycleCode ?? detail.deliveryCycleId}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Delivery Date</div>
            <div className="mt-1 font-medium text-slate-950">
              {detail.deliveryCycle?.deliveryDate ? new Date(detail.deliveryCycle.deliveryDate).toLocaleDateString('en-IN') : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Source Orders</div>
            <div className="mt-1 font-medium text-slate-950">{detail.sourceOrderCount}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {editable ? (
            <button
              type="button"
              onClick={() => approveMutation.mutate()}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Approve Consolidation
            </button>
          ) : null}
          {editable ? (
            <button
              type="button"
              onClick={() => rebuildMutation.mutate()}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Rebuild from Orders
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => shareMutation.mutate()}
            className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
          >
            Generate WhatsApp Text
          </button>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Product-wise Demand</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Ordered Qty</th>
                <th className="px-4 py-3 font-medium">Approved Qty</th>
                <th className="px-4 py-3 font-medium">Buffer Qty</th>
                <th className="px-4 py-3 font-medium">Final Qty</th>
                <th className="px-4 py-3 font-medium">Remarks</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.map((item) => {
                const draft = draftFor(item);
                return (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div>
                      <div className="text-xs text-slate-500">{item.variant?.variantName ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.variant?.sku ?? item.variantId}</td>
                    <td className="px-4 py-3 text-slate-700">{item.totalOrderQty}</td>
                    <td className="px-4 py-3 text-slate-700">{item.totalApprovedQty}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.001"
                        disabled={!editable}
                        value={draft.bufferQty}
                        onChange={(event) => updateDraft(item, { bufferQty: Number(event.target.value) })}
                        className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 disabled:bg-slate-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.001"
                        disabled={!editable}
                        value={draft.finalProcurementQty}
                        onChange={(event) => updateDraft(item, { finalProcurementQty: Number(event.target.value) })}
                        className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 disabled:bg-slate-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        disabled={!editable}
                        value={draft.remarks}
                        onChange={(event) => updateDraft(item, { remarks: event.target.value })}
                        className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 disabled:bg-slate-100"
                        placeholder="Optional note"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => saveItem(item)}
                          className="rounded-lg border border-cyan-300 px-3 py-1.5 text-xs font-medium text-cyan-900 hover:bg-cyan-50"
                        >
                          Save
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Locked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Route-wise Summary</h2>
          <div className="space-y-3">
            {routeSummary.length ? routeSummary.map((row) => (
              <div key={row.routeId} className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                <div className="font-medium text-slate-900">{row.routeName ?? 'Unassigned Route'}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-slate-600">
                  <span>Retailers: {row.retailerCount}</span>
                  <span>Orders: {row.orderCount}</span>
                  <span>Ordered Qty: {row.totalOrderedQty}</span>
                  <span>Approved Qty: {row.totalApprovedQty}</span>
                </div>
              </div>
            )) : <EmptyState title="No route summary available" />}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Area-wise Summary</h2>
          <div className="space-y-3">
            {areaSummary.length ? areaSummary.map((row, index) => (
              <div key={`${row.areaId ?? 'unassigned'}-${index}`} className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                <div className="font-medium text-slate-900">{row.areaName}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-slate-600">
                  <span>Routes: {row.routeCount}</span>
                  <span>Retailers: {row.retailerCount}</span>
                  <span>Orders: {row.orderCount}</span>
                  <span>Ordered Qty: {row.totalOrderedQty}</span>
                  <span>Approved Qty: {row.totalApprovedQty}</span>
                </div>
              </div>
            )) : <EmptyState title="No area summary available" />}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Source Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Retailer</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {sourceOrders.length ? sourceOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">{order.orderNo}</div>
                    <div className="text-xs text-slate-500">{new Date(order.orderDate).toLocaleString('en-IN')}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{order.retailer?.shopName ?? order.retailerId}</td>
                  <td className="px-4 py-3 text-slate-700">{order.source}</td>
                  <td className="px-4 py-3 text-slate-700">{order.status}</td>
                  <td className="px-4 py-3 text-slate-700">{order.route?.name ?? 'Unassigned'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(order.grandTotal ?? 0))}</td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-6" colSpan={6}>
                    <EmptyState title="No source orders found" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {shareMessage ? (
        <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <div className="mb-2 font-semibold">WhatsApp Message Preview</div>
          <pre className="whitespace-pre-wrap font-sans">{shareMessage}</pre>
        </section>
      ) : null}
    </div>
  );
}
