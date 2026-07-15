'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { GoodsReceiptsApi } from '@/features/goods-receipts/api';
import { buildDetailTitle } from '@/lib/utils/title';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function GoodsReceiptDetailView({ id }: { id: string }) {
  const routeMeta = getAdminRouteMeta('goodsReceipts');
  const queryClient = useQueryClient();
  const detailQuery = useQuery({ queryKey: ['goods-receipt', id], queryFn: () => GoodsReceiptsApi.getById(id) });
  const comparisonQuery = useQuery({ queryKey: ['goods-receipt', id, 'comparison'], queryFn: () => GoodsReceiptsApi.getComparison(id) });

  const approveMutation = useMutation({
    mutationFn: () => GoodsReceiptsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipt', id, 'comparison'] });
    },
  });

  const postMutation = useMutation({
    mutationFn: () => GoodsReceiptsApi.post(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipt', id, 'comparison'] });
    },
  });

  if (detailQuery.isLoading || comparisonQuery.isLoading) {
    return <div className="text-sm text-slate-500">Loading goods receipt...</div>;
  }

  if (detailQuery.error || comparisonQuery.error || !detailQuery.data?.data || !comparisonQuery.data?.data) {
    return <EmptyState title="Unable to load goods receipt" description={detailQuery.error instanceof Error ? detailQuery.error.message : comparisonQuery.error instanceof Error ? comparisonQuery.error.message : 'Goods receipt not found'} />;
  }

  const receipt = detailQuery.data.data;
  const comparison = comparisonQuery.data.data;

  return (
    <div>
      <PageHeader
        title={buildDetailTitle(routeMeta.detailTitlePrefix ?? routeMeta.pageTitle, receipt.grnNo)}
        description={routeMeta.detailPageDescription}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Received Qty" value={comparison.totals.receivedQty} />
        <KpiCard label="Accepted Qty" value={comparison.totals.acceptedQty} />
        <KpiCard label="Rejected Qty" value={comparison.totals.rejectedQty} />
        <KpiCard label="Short / Excess" value={`${comparison.totals.shortQty} / ${comparison.totals.excessQty}`} />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Supplier</div><div className="mt-1 font-medium text-slate-950">{receipt.supplier?.name ?? receipt.supplierId}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Purchase Order</div><div className="mt-1 font-medium text-slate-950">{receipt.purchaseOrder?.poNo ?? receipt.purchaseOrderId ?? 'Manual'}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Warehouse</div><div className="mt-1 font-medium text-slate-950">{receipt.warehouse?.name ?? receipt.warehouseId}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Status</div><div className="mt-1 font-medium text-slate-950">{receipt.status}</div></div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {receipt.status === 'draft' ? <button type="button" onClick={() => approveMutation.mutate()} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Approve GRN</button> : null}
          {receipt.status === 'approved' ? <button type="button" onClick={() => postMutation.mutate()} className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">Post to Inventory</button> : null}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Ordered vs Received Comparison</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Ordered</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium">Accepted</th>
                <th className="px-4 py-3 font-medium">Rejected</th>
                <th className="px-4 py-3 font-medium">Short</th>
                <th className="px-4 py-3 font-medium">Excess</th>
                <th className="px-4 py-3 font-medium">Batch</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {comparison.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3"><div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div><div className="text-xs text-slate-500">{item.variant?.variantName ?? '—'}</div></td>
                  <td className="px-4 py-3 text-slate-700">{item.variant?.sku ?? item.variantId}</td>
                  <td className="px-4 py-3 text-slate-700">{item.orderedQty}</td>
                  <td className="px-4 py-3 text-slate-700">{item.receivedQty}</td>
                  <td className="px-4 py-3 text-slate-700">{item.acceptedQty}</td>
                  <td className="px-4 py-3 text-slate-700">{item.rejectedQty}</td>
                  <td className="px-4 py-3 text-slate-700">{item.shortQty}</td>
                  <td className="px-4 py-3 text-slate-700">{item.excessQty}</td>
                  <td className="px-4 py-3 text-slate-700">{item.batchNo ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
