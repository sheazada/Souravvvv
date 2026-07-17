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

type RetailerDetailTab = 'overview' | 'ledger' | 'invoices' | 'orders' | 'payments' | 'returns' | 'outstanding';

const TAB_CONFIG: Array<{ id: RetailerDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview & Profile' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'orders', label: 'Orders' },
  { id: 'payments', label: 'Payments' },
  { id: 'returns', label: 'Returns History' },
  { id: 'outstanding', label: 'Outstanding Payments' },
];

export function RetailerDetailView({ id }: { id: string }) {
  const routeMeta = getAdminRouteMeta('retailers');
  const [activeTab, setActiveTab] = useState<RetailerDetailTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const [
    retailerQuery,
    ledgerSummaryQuery,
    ledgerTransactionsQuery,
    outstandingQuery,
    ordersQuery,
    invoicesQuery,
    paymentsQuery,
    returnsQuery,
  ] = useQueries({
    queries: [
      { queryKey: ['retailer', id], queryFn: () => RetailersApi.getById(id) },
      { queryKey: ['retailer', id, 'ledger-summary'], queryFn: () => RetailersApi.getLedgerSummary(id) },
      { queryKey: ['retailer', id, 'ledger-transactions'], queryFn: () => RetailersApi.getLedgerTransactions(id) },
      { queryKey: ['retailer', id, 'outstanding'], queryFn: () => RetailersApi.getOutstanding(id) },
      { queryKey: ['retailer', id, 'orders'], queryFn: () => RetailersApi.getOrders(id) },
      { queryKey: ['retailer', id, 'invoices'], queryFn: () => RetailersApi.getInvoices(id) },
      { queryKey: ['retailer', id, 'payments'], queryFn: () => RetailersApi.getPayments(id) },
      { queryKey: ['retailer', id, 'returns'], queryFn: () => RetailersApi.getReturns(id) },
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
    returnsQuery,
  ].some((query) => query.isLoading);

  const error = [
    retailerQuery,
    ledgerSummaryQuery,
    ledgerTransactionsQuery,
    outstandingQuery,
    ordersQuery,
    invoicesQuery,
    paymentsQuery,
    returnsQuery,
  ].find((query) => query.error)?.error;

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading retailer profile & history...</div>;
  }

  if (error || !retailerQuery.data?.data) {
    return (
      <EmptyState
        title="Unable to load retailer profile"
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
  const returnsList = returnsQuery.data?.data ?? [];

  const filteredLedger = useMemo(
    () =>
      ledgerTransactions.filter(
        (t) =>
          t.entryNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.transactionType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.referenceType ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [ledgerTransactions, searchQuery],
  );

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.status.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [invoices, searchQuery],
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (ord) =>
          ord.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ord.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ord.source.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [orders, searchQuery],
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter(
        (pay) =>
          pay.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pay.paymentMode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pay.status.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [payments, searchQuery],
  );

  const filteredReturns = useMemo(
    () =>
      returnsList.filter(
        (ret: any) =>
          (ret.supplierReturnNo ?? ret.returnNo ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (ret.status ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (ret.reason ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [returnsList, searchQuery],
  );

  const filteredOutstanding = useMemo(
    () =>
      (outstanding?.invoices ?? []).filter(
        (inv) =>
          inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.status.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [outstanding, searchQuery],
  );

  const latestPayment = useMemo(() => payments[0] ?? null, [payments]);
  const tabCounts = useMemo(
    () => ({
      ledger: ledgerTransactions.length,
      invoices: invoices.length,
      orders: orders.length,
      payments: payments.length,
      returns: returnsList.length,
      outstanding: outstanding?.invoices?.length ?? 0,
    }),
    [ledgerTransactions.length, invoices.length, orders.length, payments.length, returnsList.length, outstanding],
  );

  const handleExport = (tabName: string) => {
    alert(`Exporting ${tabName} data as PDF/Excel for ${retailer.shopName}...`);
  };

  return (
    <div>
      <PageHeader
        title={buildDetailTitle(routeMeta.detailPageTitle ?? routeMeta.pageTitle, retailer.shopName)}
        description={routeMeta.detailPageDescription}
      />

      {/* KPI Overview Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Outstanding" value={formatCurrency(outstanding?.totalOutstanding ?? 0)} />
        <KpiCard label="Credit Limit" value={`₹${Number(retailer.creditLimit || 0).toLocaleString('en-IN')}`} />
        <KpiCard label="Total Invoices" value={tabCounts.invoices} />
        <KpiCard label="Payment Receipts" value={tabCounts.payments} />
      </div>

      {/* Tabs Selector */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TAB_CONFIG.map((tab) => {
          const extraCount =
            tab.id === 'overview'
              ? null
              : tab.id === 'ledger'
              ? tabCounts.ledger
              : tab.id === 'invoices'
              ? tabCounts.invoices
              : tab.id === 'orders'
              ? tabCounts.orders
              : tab.id === 'payments'
              ? tabCounts.payments
              : tab.id === 'returns'
              ? tabCounts.returns
              : tabCounts.outstanding;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
              className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {extraCount !== null ? ` (${extraCount})` : ''}
            </button>
          );
        })}
      </div>

      {/* Search & Export Toolbar for List Tabs */}
      {activeTab !== 'overview' && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            type="text"
            placeholder={`Search ${activeTab.toUpperCase()} records by no, status, mode...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-80 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
          />
          <div className="flex gap-2">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Clear Search
              </button>
            )}
            <button
              type="button"
              onClick={() => handleExport(activeTab)}
              className="rounded-xl border border-cyan-600 bg-cyan-50 px-3.5 py-1.5 text-xs font-semibold text-cyan-900 hover:bg-cyan-100"
            >
              📥 Export {activeTab.toUpperCase()} Report
            </button>
          </div>
        </div>
      )}

      {/* OVERVIEW & PROFILE TAB */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-950 border-b border-slate-100 pb-3">Complete Shop Profile</h2>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Retailer Code</div>
                <div className="mt-1 font-mono font-bold text-cyan-700">{retailer.retailerCode}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Shop Name</div>
                <div className="mt-1 font-bold text-slate-950">{retailer.shopName}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Owner Name</div>
                <div className="mt-1 font-medium text-slate-900">{retailer.ownerName ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Primary Mobile</div>
                <div className="mt-1 font-medium text-slate-900">{retailer.mobile}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Alternate Mobile</div>
                <div className="mt-1 font-medium text-slate-900">{retailer.alternateMobile ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Email Address</div>
                <div className="mt-1 font-medium text-slate-900">{retailer.email ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Business Status</div>
                <div className="mt-1">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                    {retailer.businessStatus}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Ordering Mode</div>
                <div className="mt-1">
                  <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-800 capitalize">
                    {retailer.orderingMode.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Credit Limit</div>
                <div className="mt-1 font-bold text-emerald-700">₹{Number(retailer.creditLimit || 0).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Credit Days</div>
                <div className="mt-1 font-medium text-slate-900">{retailer.creditDays} days</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">GSTIN / Tax ID</div>
                <div className="mt-1 font-mono uppercase font-semibold text-slate-800">{retailer.gstin ?? 'Not Registered'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">PAN Number</div>
                <div className="mt-1 font-mono uppercase font-semibold text-slate-800">{retailer.pan ?? '—'}</div>
              </div>
              <div className="md:col-span-2 border-t border-slate-100 pt-3">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Shop Complete Address</div>
                <div className="mt-1 font-medium text-slate-900">
                  {[retailer.addressLine1, retailer.addressLine2, retailer.locality, retailer.city, retailer.state, retailer.pincode]
                    .filter(Boolean)
                    .join(', ') || 'Address details not populated'}
                </div>
              </div>
              <div className="md:col-span-2 border-t border-slate-100 pt-3">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Internal Notes</div>
                <div className="mt-1 text-slate-700">{retailer.notes ?? 'No internal notes recorded.'}</div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="mb-4 text-lg font-bold text-slate-950 border-b border-slate-100 pb-3">Finance & Credit Summary</h2>
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div className="text-xs uppercase tracking-wide font-bold text-slate-500">Current Outstanding Dues</div>
                  <div className="mt-1 text-2xl font-black text-rose-700">
                    {formatCurrency(outstanding?.totalOutstanding ?? 0)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {outstanding?.invoices.length ?? 0} unpaid / partial invoices currently open.
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div className="text-xs uppercase tracking-wide font-bold text-slate-500">Available Credit Balance</div>
                  <div className="mt-1 text-xl font-bold text-emerald-700">
                    ₹{Math.max(0, Number(retailer.creditLimit || 0) - Number(outstanding?.totalOutstanding || 0)).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div className="text-xs uppercase tracking-wide font-bold text-slate-500">Latest Payment Receipt</div>
                  <div className="mt-1 font-bold text-slate-950">
                    {latestPayment ? `${latestPayment.receiptNo} • ${formatCurrency(Number(latestPayment.amount ?? 0))}` : 'No payments collected yet'}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {latestPayment ? `Collected on ${new Date(latestPayment.paymentDate).toLocaleDateString('en-IN')} (${latestPayment.paymentMode})` : '—'}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* LEDGER TAB */}
      {activeTab === 'ledger' && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Ledger Summary Metrics</h2>
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
                  <div className="mt-1 font-semibold text-rose-700">{formatCurrency(ledgerSummary.currentOutstanding)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Available Credit</div>
                  <div className="mt-1 font-semibold text-emerald-700">{formatCurrency(ledgerSummary.availableCredit)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Overdue Amount</div>
                  <div className="mt-1 font-semibold text-rose-700">{formatCurrency(ledgerSummary.overdueAmount)}</div>
                </div>
              </div>
            ) : (
              <EmptyState title="Ledger summary unavailable" description="Retailer finance summary was not returned." />
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Double-Entry Ledger Transactions ({filteredLedger.length})</h2>
            {filteredLedger.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Entry No & Date</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium text-right">Debit (₹)</th>
                      <th className="px-4 py-3 font-medium text-right">Credit (₹)</th>
                      <th className="px-4 py-3 font-medium text-right">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredLedger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/75">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-950">{entry.entryNo}</div>
                          <div className="text-xs text-slate-500">{new Date(entry.entryDate).toLocaleDateString('en-IN')}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 capitalize">
                            {entry.transactionType.replace('_', ' ')}
                          </span>
                          <div className="text-xs text-slate-500 mt-0.5">{entry.referenceType}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{Number(entry.debitAmount) > 0 ? formatCurrency(entry.debitAmount) : '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-700">{Number(entry.creditAmount) > 0 ? formatCurrency(entry.creditAmount) : '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-950">{formatCurrency(entry.runningBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No ledger entries found" description="Transactions matching your search query will appear here." />
            )}
          </section>
        </div>
      )}

      {/* INVOICES TAB */}
      {activeTab === 'invoices' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Sales Invoices ({filteredInvoices.length})</h2>
          {filteredInvoices.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Invoice No</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Invoice Date</th>
                    <th className="px-4 py-3 font-medium">Due Date</th>
                    <th className="px-4 py-3 font-medium text-right">Grand Total (₹)</th>
                    <th className="px-4 py-3 font-medium text-right">Outstanding (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 font-bold text-slate-950">{invoice.invoiceNo}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {invoice.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-slate-700">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(Number(invoice.grandTotal ?? 0))}</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-700">{formatCurrency(Number(invoice.outstandingAmount ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No invoices found" description="Invoices matching your query will appear here." />
          )}
        </section>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Sales Orders ({filteredOrders.length})</h2>
          {filteredOrders.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order No</th>
                    <th className="px-4 py-3 font-medium">Source / Mode</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Order Date</th>
                    <th className="px-4 py-3 font-medium text-right">Grand Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 font-bold text-slate-950">{order.orderNo}</td>
                      <td className="px-4 py-3 text-slate-700 capitalize">{order.source}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-800 uppercase">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{new Date(order.orderDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(Number(order.grandTotal ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No orders found" description="Orders matching your query will appear here." />
          )}
        </section>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Payment Receipts ({filteredPayments.length})</h2>
          {filteredPayments.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Receipt No</th>
                    <th className="px-4 py-3 font-medium">Mode</th>
                    <th className="px-4 py-3 font-medium">Direction</th>
                    <th className="px-4 py-3 font-medium">Payment Date</th>
                    <th className="px-4 py-3 font-medium text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-950">{payment.receiptNo}</div>
                        <div className="text-xs text-emerald-700 font-semibold">{payment.status.toUpperCase()}</div>
                      </td>
                      <td className="px-4 py-3 uppercase font-semibold text-slate-800">{payment.paymentMode}</td>
                      <td className="px-4 py-3 text-slate-700 capitalize">{payment.paymentDirection}</td>
                      <td className="px-4 py-3 text-slate-700">{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-700">{formatCurrency(Number(payment.amount ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No payments found" description="Payment receipts will appear here once recorded." />
          )}
        </section>
      )}

      {/* RETURNS TAB */}
      {activeTab === 'returns' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Sale Returns History ({filteredReturns.length})</h2>
          {filteredReturns.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Return No</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Reason / Remarks</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Return Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredReturns.map((ret: any, idx: number) => (
                    <tr key={ret.id ?? idx} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 font-bold text-slate-950">{ret.supplierReturnNo ?? ret.returnNo ?? `RET-SL-00${idx+1}`}</td>
                      <td className="px-4 py-3 text-slate-700">{ret.createdAt ? new Date(ret.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{ret.reason ?? ret.remarks ?? 'Stock return adjustment'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 uppercase">
                          {ret.status ?? 'POSTED'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-rose-700">{formatCurrency(Number(ret.totalAmount ?? ret.amount ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No sale returns recorded" description="Returns from this retailer will appear here." />
          )}
        </section>
      )}

      {/* OUTSTANDING PAYMENTS TAB */}
      {activeTab === 'outstanding' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Open & Overdue Outstanding Invoices ({filteredOutstanding.length})</h2>
          {filteredOutstanding.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Invoice No</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Invoice Date</th>
                    <th className="px-4 py-3 font-medium">Due Date</th>
                    <th className="px-4 py-3 font-medium text-right">Grand Total (₹)</th>
                    <th className="px-4 py-3 font-medium text-right">Outstanding (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredOutstanding.map((invoice) => {
                    const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && Number(invoice.outstandingAmount) > 0;
                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50/75">
                        <td className="px-4 py-3 font-bold text-slate-950">{invoice.invoiceNo}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isOverdue ? 'OVERDUE' : invoice.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(Number(invoice.grandTotal ?? 0))}</td>
                        <td className="px-4 py-3 text-right font-black text-rose-700">{formatCurrency(Number(invoice.outstandingAmount ?? 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Zero outstanding dues" description="This retailer has no open or overdue unpaid invoices." />
          )}
        </section>
      )}
    </div>
  );
}
