'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { PortalApi } from '@/features/portal/api';
import { formatCurrency } from '@/lib/utils/number';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
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
  if (query.error || !query.data?.data)
    return (
      <EmptyState
        title="Unable to load order"
        description={query.error instanceof Error ? query.error.message : 'Order not found'}
      />
    );

  const order = query.data.data;
  const isAssisted = order.orderingModeSnapshot === 'assisted' || (order.source !== 'retailer' && order.source !== 'self_service');

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNo}`}
        description="Review line items, delivery details, and attached invoices for this retailer order."
      />
      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900 flex items-center justify-between">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Status" value={order.status} />
        <KpiCard label="Ordering Mode" value={isAssisted ? 'Assisted Order' : 'Self-Service'} />
        <KpiCard label="Total" value={formatCurrency(Number(order.grandTotal ?? 0))} />
        <KpiCard label="Attached Invoices" value={order.invoices?.length ?? 0} />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Source:</span> {order.source.toUpperCase()}{' '}
          {order.deliveryCycle ? (
            <span className="ml-4">
              <span className="font-semibold text-slate-950">Delivery Date:</span>{' '}
              {new Date(order.deliveryCycle.deliveryDate).toLocaleDateString('en-IN')} ({order.deliveryCycle.deliveryShift})
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => repeatMutation.mutate()}
            className="rounded-xl border border-cyan-300 px-4 py-2 text-sm font-medium text-cyan-900 hover:bg-cyan-50"
          >
            Repeat This Order
          </button>
        </div>
      </div>

      {order.invoices && order.invoices.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Attached Invoices & Billing History</h2>
          <div className="space-y-3">
            {order.invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"
              >
                <div>
                  <div className="font-semibold text-slate-950">{inv.invoiceNo}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                    <span className="capitalize">Status: {inv.status}</span>
                    <span>Source: {inv.source ?? 'auto'}</span>
                    <span>Total: {formatCurrency(Number(inv.grandTotal))}</span>
                    <span>Outstanding: {formatCurrency(Number(inv.outstandingAmount))}</span>
                  </div>
                </div>
                <Link
                  href={`/portal/invoices/${inv.id}`}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Inspect Invoice
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Order Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Ordered Qty</th>
                <th className="px-4 py-3 font-medium">Approved / Delivered Qty</th>
                <th className="px-4 py-3 font-medium">Unit Price</th>
                <th className="px-4 py-3 font-medium">Tax</th>
                <th className="px-4 py-3 font-medium">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {order.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/75">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div>
                    <div className="text-xs text-slate-500">
                      {item.variant?.variantName ?? item.variant?.sku ?? item.id}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{String(item.orderedQty)}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {item.approvedQty != null ? String(item.approvedQty) : String(item.orderedQty)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(item.unitPrice ?? 0))}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(item.taxAmount ?? 0))}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {formatCurrency(Number(item.lineTotal ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
