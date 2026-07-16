'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { PortalApi } from '@/features/portal/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export function RetailerDashboardView() {
  const query = useQuery({
    queryKey: ['portal', 'dashboard'],
    queryFn: () => PortalApi.getDashboard(),
  });

  if (query.isLoading) {
    return <div className="text-sm text-slate-500">Loading retailer dashboard...</div>;
  }

  if (query.error || !query.data?.data) {
    return (
      <EmptyState
        title="Unable to load dashboard"
        description={query.error instanceof Error ? query.error.message : 'Retailer dashboard unavailable'}
      />
    );
  }

  const dashboard = query.data.data;

  return (
    <div>
      <PageHeader
        title="Retailer Dashboard"
        description="Review latest order, invoice summaries, and outstanding dues for your account."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard label="Outstanding Dues" value={formatCurrency(dashboard.outstandingAmount)} />
        <KpiCard label="Recent Invoices" value={dashboard.recentInvoices.length} />
        <KpiCard label="Latest Order" value={dashboard.latestOrder?.orderNo ?? '—'} />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-center">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Self-Service Ledger</div>
          <Link
            href="/portal/ledger"
            className="mt-2 inline-flex items-center justify-center rounded-xl border border-cyan-600 bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 shadow-sm"
          >
            Open Finance Ledger
          </Link>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Latest Order</h2>
            <Link href="/portal/orders" className="text-xs font-semibold text-cyan-700 hover:underline">
              View All Orders
            </Link>
          </div>
          {dashboard.latestOrder ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-950">{dashboard.latestOrder.orderNo}</div>
                {dashboard.latestOrder.orderingModeSnapshot === 'assisted' ? (
                  <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200">
                    Assisted Order
                  </span>
                ) : (
                  <span className="rounded bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-800 border border-cyan-200">
                    Self-Service
                  </span>
                )}
              </div>
              <div className="mt-1 text-slate-600 capitalize">Status: {dashboard.latestOrder.status}</div>
              <div className="mt-1 text-slate-600">
                {new Date(dashboard.latestOrder.orderDate).toLocaleString('en-IN')}
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                {formatCurrency(Number(dashboard.latestOrder.grandTotal ?? 0))}
              </div>
              <Link
                href={`/portal/orders/${dashboard.latestOrder.id}`}
                className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Open Order
              </Link>
            </div>
          ) : (
            <EmptyState
              title="No recent order"
              description="Orders created by you or office/admin will appear here."
            />
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Recent Invoices</h2>
            <Link href="/portal/invoices" className="text-xs font-semibold text-cyan-700 hover:underline">
              View All Invoices
            </Link>
          </div>
          <div className="space-y-3">
            {dashboard.recentInvoices.length ? (
              dashboard.recentInvoices.map((invoice) => (
                <div key={invoice.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-950">{invoice.invoiceNo}</div>
                    {invoice.source === 'assisted_billing' ? (
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200">
                        Assisted Billing
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-slate-600 text-xs">
                    <span>Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</span>
                    <span className="capitalize">Status: {invoice.status}</span>
                    <span className="font-semibold text-slate-900">Total: {formatCurrency(invoice.grandTotal)}</span>
                    <span className="font-semibold text-rose-700">Outstanding: {formatCurrency(invoice.outstandingAmount)}</span>
                  </div>
                  <Link
                    href={`/portal/invoices/${invoice.id}`}
                    className="mt-2 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Open Invoice
                  </Link>
                </div>
              ))
            ) : (
              <EmptyState
                title="No invoices found"
                description="Office-generated invoices also appear in this list."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
