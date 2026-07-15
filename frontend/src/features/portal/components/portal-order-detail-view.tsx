'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { PortalApi } from '@/features/portal/api';
import { formatCurrency } from '@/lib/utils/number';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function PortalOrderDetailView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['portal', 'order', id], queryFn: () => PortalApi.getOrderById(id) });

  const repeatMutation = useMutation({
    mutationFn: () => PortalApi.repeatOrder(id),
    onSuccess: () => {
      setMessage('Order repeated successfully.');
      queryClient.invalidateQueries({ queryKey: ['portal', 'orders'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to repeat order'),
  });

  if (query.isLoading) return <div className="text-sm text-slate-500">Loading order...</div>;
  if (query.error || !query.data?.data) return <EmptyState title="Unable to load order" description={query.error instanceof Error ? query.error.message : 'Order not found'} />;

  const order = query.data.data;

  return (
    <div>
      <PageHeader title={`Order ${order.orderNo}`} description="Review line items, totals, and any invoices attached to this retailer order." />
      {message ? <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{message}</div> : null}
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Status" value={order.status} />
        <KpiCard label="Source" value={order.source} />
        <KpiCard label="Total" value={formatCurrency(Number(order.grandTotal ?? 0))} />
        <KpiCard label="Invoices" value={order.invoices?.length ?? 0} />
      </div>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => repeatMutation.mutate()} className="rounded-xl border border-cyan-300 px-4 py-2 text-sm font-medium text-cyan-900 hover:bg-cyan-50">Repeat This Order</button>
        </div>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Order Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Qty</th><th className="px-4 py-3 font-medium">Unit Price</th><th className="px-4 py-3 font-medium">Tax</th><th className="px-4 py-3 font-medium">Line Total</th></tr></thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {order.items.map((item) => (
                <tr key={item.id}><td className="px-4 py-3"><div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div><div className="text-xs text-slate-500">{item.variant?.variantName ?? item.variant?.sku ?? item.id}</div></td><td className="px-4 py-3 text-slate-700">{String(item.approvedQty ?? item.orderedQty)}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(Number(item.unitPrice ?? 0))}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(Number(item.taxAmount ?? 0))}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(Number(item.lineTotal ?? 0))}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
