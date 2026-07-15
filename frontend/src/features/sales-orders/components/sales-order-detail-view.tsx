'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { SalesOrdersApi } from '@/features/sales-orders/api';
import { formatCurrency } from '@/lib/utils/number';
import { buildDetailTitle } from '@/lib/utils/title';
import { useQuery } from '@tanstack/react-query';

export function SalesOrderDetailView({ id }: { id: string }) {
  const routeMeta = getAdminRouteMeta('salesOrders');
  const query = useQuery({
    queryKey: ['sales-order', id],
    queryFn: () => SalesOrdersApi.getById(id),
  });

  if (query.isLoading) {
    return <div className="text-sm text-slate-500">Loading sales order...</div>;
  }

  if (query.error || !query.data?.data) {
    return (
      <EmptyState
        title="Unable to load sales order"
        description={query.error instanceof Error ? query.error.message : 'Sales order unavailable'}
      />
    );
  }

  const order = query.data.data;

  return (
    <div>
      <PageHeader
        title={buildDetailTitle(routeMeta.detailPageTitle ?? routeMeta.pageTitle, order.orderNo)}
        description={routeMeta.detailPageDescription}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Grand Total" value={formatCurrency(Number(order.grandTotal ?? 0))} />
        <KpiCard label="Status" value={order.status} />
        <KpiCard label="Items" value={order.items.length} />
        <KpiCard label="Invoices" value={order.invoices.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Order Summary</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Retailer</div>
              <div className="mt-1 font-medium text-slate-950">{order.retailer?.shopName ?? order.retailerId}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Source</div>
              <div className="mt-1 font-medium text-slate-950">{order.source}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Order Date</div>
              <div className="mt-1 font-medium text-slate-950">{new Date(order.orderDate).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Requested Delivery</div>
              <div className="mt-1 font-medium text-slate-950">
                {order.requestedDeliveryDate
                  ? new Date(order.requestedDeliveryDate).toLocaleDateString('en-IN')
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Ordering Mode</div>
              <div className="mt-1 font-medium text-slate-950">{order.orderingModeSnapshot ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Route</div>
              <div className="mt-1 font-medium text-slate-950">{order.route?.name ?? 'Unassigned'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">Notes</div>
              <div className="mt-1 text-slate-700">{order.notes ?? 'No notes added.'}</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Cycle and Consolidation</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Delivery Cycle</div>
              <div className="mt-1 font-medium text-slate-950">{order.deliveryCycle?.cycleCode ?? order.deliveryCycleId}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Cycle Status</div>
              <div className="mt-1 font-medium text-slate-950">{order.deliveryCycle?.status ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Delivery Date</div>
              <div className="mt-1 font-medium text-slate-950">
                {order.deliveryCycle?.deliveryDate
                  ? new Date(order.deliveryCycle.deliveryDate).toLocaleDateString('en-IN')
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Locked Consolidation</div>
              <div className="mt-1 font-medium text-slate-950">
                {order.lockedConsolidation?.consolidationNo ?? 'No locked consolidation'}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Order Items</h2>
        {order.items.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Ordered Qty</th>
                  <th className="px-4 py-3 font-medium">Approved Qty</th>
                  <th className="px-4 py-3 font-medium">Unit Price</th>
                  <th className="px-4 py-3 font-medium">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{item.variant?.product?.name ?? 'Unknown Product'}</div>
                      <div className="text-xs text-slate-500">{item.variant?.variantName ?? item.variant?.sku ?? item.variantId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.orderedQty}</td>
                    <td className="px-4 py-3 text-slate-700">{item.approvedQty ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(item.unitPrice ?? 0))}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(item.lineTotal ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No items found" description="Sales order item rows will appear here." />
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Linked Invoices</h2>
        {order.invoices.length ? (
          <div className="space-y-3">
            {order.invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                <div className="font-medium text-slate-950">{invoice.invoiceNo}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-slate-600">
                  <span>{invoice.status}</span>
                  <span>{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</span>
                  <span>{formatCurrency(Number(invoice.grandTotal ?? 0))}</span>
                  <span>Outstanding: {formatCurrency(Number(invoice.outstandingAmount ?? 0))}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No linked invoices" description="Invoices generated from this order will appear here." />
        )}
      </section>
    </div>
  );
}
