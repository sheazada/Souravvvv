'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { RetailersApi } from '@/features/retailers/api';
import { formatCurrency } from '@/lib/utils/number';
import { buildDetailTitle } from '@/lib/utils/title';
import { useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

type RetailerDetailTab = 'overview' | 'ledger' | 'orders' | 'invoices' | 'payments';

const TAB_CONFIG: Array<{ id: RetailerDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'orders', label: 'Orders' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'payments', label: 'Payments' },
];

export function RetailerDetailView({ id }: { id: string }) {
  const routeMeta = getAdminRouteMeta('retailers');
  const [activeTab, setActiveTab] = useState<RetailerDetailTab>('overview');

  const [
    retailerQuery,
    ledgerSummaryQuery,
    ledgerTransactionsQuery,
    outstandingQuery,
    ordersQuery,
    invoicesQuery,
    paymentsQuery,
  ] = useQueries({
    queries: [
      { queryKey: ['retailer', id], queryFn: () => RetailersApi.getById(id) },
      { queryKey: ['retailer', id, 'ledger-summary'], queryFn: () => RetailersApi.getLedgerSummary(id) },
      { queryKey: ['retailer', id, 'ledger-transactions'], queryFn: () => RetailersApi.getLedgerTransactions(id) },
      { queryKey: ['retailer', id, 'outstanding'], queryFn: () => RetailersApi.getOutstanding(id) },
      { queryKey: ['retailer', id, 'orders'], queryFn: () => RetailersApi.getOrders(id) },
      { queryKey: ['retailer', id, 'invoices'], queryFn: () => RetailersApi.getInvoices(id) },
      { queryKey: ['retailer', id, 'payments'], queryFn: () => RetailersApi.getPayments(id) },
    ],
  });

  const isLoading = [
    retailerQuery,
    ledgerSummaryQuery,
    ledgerTransactionsQuery,
    outstandingQuery,
    ordersQuery,
    invoicesQuery,
    paymentsQuery,
  ].some((query) => query.isLoading);
  const error = [
    retailerQuery,
    ledgerSummaryQuery,
    ledgerTransactionsQuery,
    outstandingQuery,
    ordersQuery,
    invoicesQuery,
    paymentsQuery,
  ].find((query) => query.error)?.error;

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading retailer detail...</div>;
  }

  if (error || !retailerQuery.data?.data) {
    return (
      <EmptyState
        title="Unable to load retailer detail"
        description={error instanceof Error ? error.message : 'Retailer detail unavailable'}
      />
    );
  }

  const retailer = retailerQuery.data.data;
  const ledgerSummary = ledgerSummaryQuery.data?.data;
  const ledgerTransactions = ledgerTransactionsQuery.data?.data ?? [];
  const outstanding = outstandingQuery.data?.data;
  const orders = ordersQuery.data?.data ?? [];
  const invoices = invoicesQuery.data?.data ?? [];
  const payments = paymentsQuery.data?.data ?? [];

  const latestPayment = useMemo(() => payments[0] ?? null, [payments]);
  const tabCounts = useMemo(
    () => ({
      ledger: ledgerTransactions.length,
      orders: orders.length,
      invoices: invoices.length,
      payments: payments.length,
    }),
    [ledgerTransactions.length, orders.length, invoices.length, payments.length],
  );

  return (
    <div>
      <PageHeader
        title={buildDetailTitle(routeMeta.detailPageTitle ?? routeMeta.pageTitle, retailer.shopName)}
        description={routeMeta.detailPageDescription}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Outstanding" value={formatCurrency(outstanding?.totalOutstanding ?? 0)} />
        <KpiCard label="Orders" value={retailer.metrics?.orderCount ?? orders.length} />
        <KpiCard label="Invoices" value={retailer.metrics?.invoiceCount ?? invoices.length} />
        <KpiCard label="Documents" value={retailer.metrics?.documentsCount ?? 0} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TAB_CONFIG.map((tab) => {
          const extraCount =
            tab.id === 'overview'
              ? null
              : tab.id === 'ledger'
                ? tabCounts.ledger
                : tab.id === 'orders'
                  ? tabCounts.orders
                  : tab.id === 'invoices'
                    ? tabCounts.invoices
                    : tabCounts.payments;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {extraCount !== null ? ` (${extraCount})` : ''}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-950">Retailer Profile</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Retailer Code</div>
                  <div className="mt-1 font-medium text-slate-950">{retailer.retailerCode}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Owner</div>
                  <div className="mt-1 font-medium text-slate-950">{retailer.ownerName ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Mobile</div>
                  <div className="mt-1 font-medium text-slate-950">{retailer.mobile}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
                  <div className="mt-1 font-medium text-slate-950">{retailer.businessStatus}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Ordering Mode</div>
                  <div className="mt-1 font-medium text-slate-950">{retailer.orderingMode}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Credit Terms</div>
                  <div className="mt-1 font-medium text-slate-950">
                    {formatCurrency(Number(retailer.creditLimit ?? 0))} / {retailer.creditDays} days
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Address</div>
                  <div className="mt-1 font-medium text-slate-950">
                    {[retailer.addressLine1, retailer.addressLine2, retailer.locality, retailer.city, retailer.state, retailer.pincode]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Notes</div>
                  <div className="mt-1 text-slate-700">{retailer.notes ?? 'No notes added.'}</div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-950">Finance Snapshot</h2>
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Total Outstanding</div>
                  <div className="mt-1 text-xl font-semibold text-slate-950">
                    {formatCurrency(outstanding?.totalOutstanding ?? 0)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Latest Payment</div>
                  <div className="mt-1 font-medium text-slate-950">
                    {latestPayment ? `${latestPayment.receiptNo} • ${formatCurrency(Number(latestPayment.amount ?? 0))}` : 'No payments yet'}
                  </div>
                  <div className="mt-1 text-slate-600">
                    {latestPayment ? new Date(latestPayment.paymentDate).toLocaleDateString('en-IN') : '—'}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Open Invoices</div>
                  <div className="mt-1 font-medium text-slate-950">{outstanding?.invoices.length ?? 0}</div>
                </div>
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Outstanding Invoices</h2>
            {outstanding?.invoices?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Invoice</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Due Date</th>
                      <th className="px-4 py-3 font-medium">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {outstanding.invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-950">{invoice.invoiceNo}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{invoice.status}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatCurrency(Number(invoice.outstandingAmount ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No outstanding invoices" description="Retailer dues will appear here when invoices remain unpaid." />
            )}
          </section>
        </>
      ) : null}

      {activeTab === 'ledger' ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Ledger Summary</h2>
            {ledgerSummary ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Opening Balance</div>
                  <div className="mt-1 font-semibold text-slate-950">{formatCurrency(ledgerSummary.openingBalance)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Total Invoiced</div>
                  <div className="mt-1 font-semibold text-slate-950">{formatCurrency(ledgerSummary.totalInvoiced)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Total Collected</div>
                  <div className="mt-1 font-semibold text-slate-950">{formatCurrency(ledgerSummary.totalCollected)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Current Outstanding</div>
                  <div className="mt-1 font-semibold text-slate-950">{formatCurrency(ledgerSummary.currentOutstanding)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Available Credit</div>
                  <div className="mt-1 font-semibold text-slate-950">{formatCurrency(ledgerSummary.availableCredit)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Overdue Amount</div>
                  <div className="mt-1 font-semibold text-slate-950">{formatCurrency(ledgerSummary.overdueAmount)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Open Invoice Count</div>
                  <div className="mt-1 font-semibold text-slate-950">{ledgerSummary.openInvoiceCount}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Risk Level</div>
                  <div className="mt-1 font-semibold text-slate-950">{ledgerSummary.riskLevel}</div>
                </div>
              </div>
            ) : (
              <EmptyState title="Ledger summary unavailable" description="Retailer finance summary was not returned." />
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Ledger Transactions</h2>
            {ledgerTransactions.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Entry</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Debit</th>
                      <th className="px-4 py-3 font-medium">Credit</th>
                      <th className="px-4 py-3 font-medium">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {ledgerTransactions.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-950">{entry.entryNo}</div>
                          <div className="text-xs text-slate-500">{new Date(entry.entryDate).toLocaleDateString('en-IN')}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{entry.transactionType}</div>
                          <div className="text-xs text-slate-500">{entry.referenceType}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrency(entry.debitAmount)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrency(entry.creditAmount)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrency(entry.runningBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No ledger transactions found" description="Posted invoice, receipt, and note entries will appear here." />
            )}
          </section>
        </div>
      ) : null}

      {activeTab === 'orders' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Retailer Orders</h2>
          {orders.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3 font-medium text-slate-950">{order.orderNo}</td>
                      <td className="px-4 py-3 text-slate-700">{order.source}</td>
                      <td className="px-4 py-3 text-slate-700">{order.status}</td>
                      <td className="px-4 py-3 text-slate-700">{new Date(order.orderDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(order.grandTotal ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No orders found" description="Retailer orders will appear here once created." />
          )}
        </section>
      ) : null}

      {activeTab === 'invoices' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Retailer Invoices</h2>
          {invoices.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Invoice Date</th>
                    <th className="px-4 py-3 font-medium">Due Date</th>
                    <th className="px-4 py-3 font-medium">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 font-medium text-slate-950">{invoice.invoiceNo}</td>
                      <td className="px-4 py-3 text-slate-700">{invoice.status}</td>
                      <td className="px-4 py-3 text-slate-700">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-slate-700">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(invoice.outstandingAmount ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No invoices found" description="Retailer invoices will appear here once generated." />
          )}
        </section>
      ) : null}

      {activeTab === 'payments' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Retailer Payments</h2>
          {payments.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Receipt</th>
                    <th className="px-4 py-3 font-medium">Mode</th>
                    <th className="px-4 py-3 font-medium">Direction</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-950">{payment.receiptNo}</div>
                        <div className="text-xs text-slate-500">{payment.status}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{payment.paymentMode}</td>
                      <td className="px-4 py-3 text-slate-700">{payment.paymentDirection}</td>
                      <td className="px-4 py-3 text-slate-700">{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(payment.amount ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No payments found" description="Retailer payment receipts will appear here once collected." />
          )}
        </section>
      ) : null}
    </div>
  );
}
