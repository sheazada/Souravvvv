'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { PurchaseOrdersApi } from '@/features/purchase-orders/api';
import { formatCurrency } from '@/lib/utils/number';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function PurchaseOrderDetailView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [extraDrafts, setExtraDrafts] = useState<Record<string, number>>({});

  const purchaseOrderQuery = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => PurchaseOrdersApi.getById(id),
  });

  const approveMutation = useMutation({
    mutationFn: () => PurchaseOrdersApi.approve(id),
    onSuccess: () => {
      setMessage('Purchase order approved successfully.');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => PurchaseOrdersApi.cancel(id),
    onSuccess: () => {
      setMessage('Purchase order cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
    },
  });

  const updateDemandExtrasMutation = useMutation({
    mutationFn: (payload: { items: Array<{ variantId: string; extraQty?: number }> }) =>
      PurchaseOrdersApi.updateDemandExtras(id, payload),
    onSuccess: () => {
      setMessage('Extra procurement quantities updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update extra procurement quantities');
    },
  });

  if (purchaseOrderQuery.isLoading) {
    return <div className="text-sm text-slate-500">Loading purchase order...</div>;
  }

  if (purchaseOrderQuery.error || !purchaseOrderQuery.data?.data) {
    return <EmptyState title="Unable to load purchase order" description={purchaseOrderQuery.error instanceof Error ? purchaseOrderQuery.error.message : 'Purchase order not found'} />;
  }

  const po = purchaseOrderQuery.data.data;
  const editableDemandExtras = po.status === 'draft' && Boolean(po.demandConsolidation);

  function getExtraDraft(variantId: string, fallback?: number) {
    return extraDrafts[variantId] ?? fallback ?? 0;
  }

  function updateExtraDraft(variantId: string, extraQty: number) {
    setExtraDrafts((current) => ({ ...current, [variantId]: extraQty }));
  }

  function submitDemandExtraUpdate() {
    setMessage(null);
    updateDemandExtrasMutation.mutate({
      items: po.items.map((item) => ({
        variantId: item.variantId,
        extraQty: getExtraDraft(item.variantId, item.extraQty ?? 0),
      })),
    });
  }

  const previewGrandTotal = po.items.reduce((sum, item) => {
    const draftExtraQty = getExtraDraft(item.variantId, item.extraQty ?? 0);
    const computedPoQty = Number(item.demandQty ?? 0) + Number(draftExtraQty);
    const lineBase = computedPoQty * Number(item.unitCost ?? 0);
    const lineTax = (lineBase * Number(item.taxRate ?? 0)) / 100;
    return sum + lineBase + lineTax;
  }, 0);

  return (
    <div>
      <PageHeader title={`Purchase Order ${po.poNo}`} description="Review supplier, item lines, demand source, and receipt summary." />

      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{message}</div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="PO Total" value={formatCurrency(editableDemandExtras ? previewGrandTotal : Number(po.grandTotal ?? 0))} />
        <KpiCard label="Item Count" value={po.items.length} />
        <KpiCard label="GRN Count" value={po.receiptSummary.receiptCount} />
        <KpiCard label="Accepted Qty" value={po.receiptSummary.totalAcceptedQty} />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Supplier</div><div className="mt-1 font-medium text-slate-950">{po.supplier?.name ?? po.supplierId}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Status</div><div className="mt-1 font-medium text-slate-950">{po.status}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Demand Source</div><div className="mt-1 font-medium text-slate-950">{po.demandConsolidation?.consolidationNo ?? 'Manual'}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Expected Receipt</div><div className="mt-1 font-medium text-slate-950">{po.expectedReceiptDate ? new Date(po.expectedReceiptDate).toLocaleDateString('en-IN') : '—'}</div></div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {po.status === 'draft' ? <button type="button" onClick={() => approveMutation.mutate()} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Approve PO</button> : null}
          {!['cancelled', 'received', 'closed'].includes(po.status) ? <button type="button" onClick={() => cancelMutation.mutate()} className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Cancel PO</button> : null}
          {editableDemandExtras ? <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">Draft demand-generated PO: extra procurement qty can be adjusted without changing retailer demand.</span> : null}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">PO Items</h2>
          {editableDemandExtras ? (
            <button
              type="button"
              onClick={submitDemandExtraUpdate}
              disabled={updateDemandExtrasMutation.isPending}
              className="rounded-xl border border-cyan-300 px-4 py-2 text-sm font-medium text-cyan-900 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updateDemandExtrasMutation.isPending ? 'Updating Extra Qty...' : 'Update Extra Procurement Qty'}
            </button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Demand Qty</th>
                <th className="px-4 py-3 font-medium">Extra Qty</th>
                <th className="px-4 py-3 font-medium">PO Qty</th>
                <th className="px-4 py-3 font-medium">Unit Cost</th>
                <th className="px-4 py-3 font-medium">Tax</th>
                <th className="px-4 py-3 font-medium">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {po.items.map((item) => {
                const draftExtraQty = getExtraDraft(item.variantId, item.extraQty ?? 0);
                const computedPoQty = Number(item.demandQty ?? 0) + Number(draftExtraQty);
                const previewLineBase = computedPoQty * Number(item.unitCost ?? 0);
                const previewLineTax = (previewLineBase * Number(item.taxRate ?? 0)) / 100;
                const previewLineTotal = previewLineBase + previewLineTax;

                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3"><div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div><div className="text-xs text-slate-500">{item.variant?.variantName ?? '—'}</div></td>
                    <td className="px-4 py-3 text-slate-700">{item.variant?.sku ?? item.variantId}</td>
                    <td className="px-4 py-3 text-slate-700">{item.demandQty ?? 0}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {editableDemandExtras ? (
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          aria-label={`Extra qty ${item.variant?.sku ?? item.variantId}`}
                          value={draftExtraQty}
                          onChange={(event) => updateExtraDraft(item.variantId, Number(event.target.value))}
                          className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                        />
                      ) : (
                        item.extraQty ?? 0
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{editableDemandExtras ? computedPoQty : item.orderedQty}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(item.unitCost)}</td>
                    <td className="px-4 py-3 text-slate-700">{item.taxRate}%</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(editableDemandExtras ? previewLineTotal : item.lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {po.demandConsolidation ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Extra Procurement Audit Trail</h2>
            <p className="mt-1 text-sm text-slate-500">Track who changed supplier-side extra procurement quantity and when, without changing retailer demand.</p>
          </div>

          {po.auditTrail?.length ? (
            <div className="space-y-4">
              {po.auditTrail.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div>
                      <span className="font-medium text-slate-950">{entry.changedBy?.fullName ?? 'Unknown User'}</span>
                      <span className="ml-2 text-slate-500">{entry.changedBy?.userType ?? 'user'}</span>
                    </div>
                    <div className="text-slate-500">{new Date(entry.changedAt).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-white text-left text-slate-600">
                        <tr>
                          <th className="px-3 py-2 font-medium">Product</th>
                          <th className="px-3 py-2 font-medium">Demand Qty</th>
                          <th className="px-3 py-2 font-medium">Extra Qty Before</th>
                          <th className="px-3 py-2 font-medium">Extra Qty After</th>
                          <th className="px-3 py-2 font-medium">PO Qty Before</th>
                          <th className="px-3 py-2 font-medium">PO Qty After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {entry.items.map((item) => (
                          <tr key={`${entry.id}-${item.variantId}`}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div>
                              <div className="text-xs text-slate-500">{item.variant?.variantName ?? item.variant?.sku ?? item.variantId}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">{item.demandQty}</td>
                            <td className="px-3 py-2 text-slate-700">{item.beforeExtraQty}</td>
                            <td className="px-3 py-2 text-slate-700">{item.afterExtraQty}</td>
                            <td className="px-3 py-2 text-slate-700">{item.beforeOrderedQty}</td>
                            <td className="px-3 py-2 text-slate-700">{item.afterOrderedQty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No extra procurement edits recorded yet" description="Once draft demand-generated PO extra quantities are changed, the audit trail will appear here." />
          )}
        </section>
      ) : null}
    </div>
  );
}
