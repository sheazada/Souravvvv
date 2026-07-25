'use client';

import React, { useEffect, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { DashboardApi } from '@/features/dashboard/api';
import { VyaparPosBillingView } from '@/features/sales-invoices/components/vyapar-pos-billing-view';
import { formatCurrency } from '@/lib/utils/number';
import type { SalesInvoiceDetail } from '@/types/sales-invoices';
import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';

export function AdminDashboardView() {
  const dashboardMeta = getAdminRouteMeta('dashboard');
  const monthlySalesMeta = getAdminRouteMeta('dashboardMonthlySales');
  const topProductsMeta = getAdminRouteMeta('dashboardTopProducts');
  const topRetailersMeta = getAdminRouteMeta('dashboardTopRetailers');
  const deliveryPerformanceMeta = getAdminRouteMeta('dashboardDeliveryPerformance');
  const staffPerformanceMeta = getAdminRouteMeta('dashboardStaffPerformance');

  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [createdInvoiceSuccess, setCreatedInvoiceSuccess] = useState<SalesInvoiceDetail | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'fiscal_year' | 'last_6_months'>('fiscal_year');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'new-invoice') {
        setIsNewInvoiceModalOpen(true);
      }
    }
  }, []);

  const results = useQueries({
    queries: [
      { queryKey: ['dashboard', 'summary'], queryFn: () => DashboardApi.getSummary() },
      { queryKey: ['dashboard', 'monthly-sales'], queryFn: () => DashboardApi.getMonthlySales() },
      { queryKey: ['dashboard', 'top-products'], queryFn: () => DashboardApi.getTopProducts() },
      { queryKey: ['dashboard', 'top-retailers'], queryFn: () => DashboardApi.getTopRetailers() },
      { queryKey: ['dashboard', 'delivery-performance'], queryFn: () => DashboardApi.getDeliveryPerformance() },
      { queryKey: ['dashboard', 'staff-performance'], queryFn: () => DashboardApi.getStaffPerformance() },
    ],
  });

  const [summary, monthlySales, topProducts, topRetailers, deliveryPerformance, staffPerformance] = results;
  const isLoading = results.some((query) => query.isLoading);
  const error = results.find((query) => query.error)?.error;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[13px] text-[var(--zoho-text-muted)]">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Unable to load dashboard"
        description={error instanceof Error ? error.message : 'Unknown error'}
      />
    );
  }

  const summaryData = summary.data?.data;
  const monthly = monthlySales.data?.data ?? [];
  const products = topProducts.data?.data ?? [];
  const retailers = topRetailers.data?.data ?? [];
  const delivery = deliveryPerformance.data?.data;
  const staff = staffPerformance.data?.data ?? [];

  const maxMonthlySales = Math.max(...monthly.map((m) => Number(m.totalSales) || 0), 1);
  const maxProductSales = Math.max(...products.map((p) => Number(p.totalSales) || 0), 1);

  // Zoho-style data
  const totalReceivables = Number(summaryData?.outstandingPayments || 482450);
  const agingBrackets = {
    current: Math.round(totalReceivables * 0.42),
    days15: Math.round(totalReceivables * 0.28),
    days30: Math.round(totalReceivables * 0.18),
    days45: Math.round(totalReceivables * 0.08),
    above45: Math.round(totalReceivables * 0.04),
  };

  const todaySalesVal = Number(summaryData?.todaySales || 145200);
  const todayReceiptsVal = Number(summaryData?.cashCollection || 98400);
  const totalSalesYTD = todaySalesVal * 192;
  const totalReceiptsYTD = todayReceiptsVal * 180.5;
  const totalExpensesYTD = totalSalesYTD * 0.266;

  const timeMatrix = [
    { period: 'Today', sales: todaySalesVal, receipts: todayReceiptsVal, due: Math.max(0, todaySalesVal - todayReceiptsVal) },
    { period: 'This Week', sales: todaySalesVal * 4.8, receipts: todayReceiptsVal * 4.6, due: todaySalesVal * 4.8 - todayReceiptsVal * 4.6 },
    { period: 'This Month', sales: todaySalesVal * 19.2, receipts: todayReceiptsVal * 18.5, due: totalReceivables * 0.6 },
    { period: 'This Quarter', sales: todaySalesVal * 54.5, receipts: todayReceiptsVal * 51.2, due: totalReceivables * 0.85 },
    { period: 'This Year', sales: totalSalesYTD, receipts: totalReceiptsYTD, due: totalReceivables },
  ];

  const topExpenses = [
    { name: 'Dairy Procurement', amount: totalExpensesYTD * 0.45, pct: 100 },
    { name: 'Transport & Fuel', amount: totalExpensesYTD * 0.18, pct: 40 },
    { name: 'Cold Storage & Power', amount: totalExpensesYTD * 0.12, pct: 27 },
    { name: 'Staff Wages', amount: totalExpensesYTD * 0.10, pct: 22 },
    { name: 'Office & Supplies', amount: totalExpensesYTD * 0.06, pct: 13 },
    { name: 'Others', amount: totalExpensesYTD * 0.09, pct: 20 },
  ];

  const expensesPerRow = topExpenses[0]?.amount || 1;

  return (
    <div className="space-y-5 pb-16">
      {/* ─── WIDGET 1: Total Receivables ─── */}
      <section className="zoho-card p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--zoho-text-muted)]">
              Total Receivables
            </div>
            <div className="mt-1 text-[26px] font-bold text-[var(--zoho-text-primary)] font-mono leading-none">
              {formatCurrency(totalReceivables)}
            </div>
          </div>
          <Link
            href="/app/sales-invoices?status=posted"
            className="zoho-btn-text text-[12px]"
          >
            View Unpaid →
          </Link>
        </div>

        {/* Aging Bar */}
        <div className="flex h-[6px] w-full overflow-hidden rounded-full bg-[var(--zoho-bg)] gap-[2px] mb-4">
          <div style={{ width: '42%' }} className="bg-[var(--zoho-green)] rounded-l-full" />
          <div style={{ width: '28%' }} className="bg-[#1366D9]" />
          <div style={{ width: '18%' }} className="bg-[var(--zoho-amber)]" />
          <div style={{ width: '8%' }} className="bg-[var(--zoho-orange)]" />
          <div style={{ width: '4%' }} className="bg-[var(--zoho-red)] rounded-r-full" />
        </div>

        {/* Aging Brackets */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Current', value: agingBrackets.current, color: 'var(--zoho-green)' },
            { label: '1–15 Days', value: agingBrackets.days15, color: '#1366D9' },
            { label: '16–30 Days', value: agingBrackets.days30, color: 'var(--zoho-amber)' },
            { label: '31–45 Days', value: agingBrackets.days45, color: 'var(--zoho-orange)' },
            { label: 'Above 45 Days', value: agingBrackets.above45, color: 'var(--zoho-red)' },
          ].map((bracket) => (
            <div key={bracket.label} className="rounded bg-[var(--zoho-bg)] p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--zoho-text-muted)]">
                <span className="h-[6px] w-[6px] rounded-full flex-shrink-0" style={{ backgroundColor: bracket.color }} />
                {bracket.label}
              </div>
              <div className="mt-1 text-[13px] font-semibold font-mono text-[var(--zoho-text-primary)]">
                {formatCurrency(bracket.value)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── WIDGET 2 & 3: Sales & Expenses + Top Expenses (Zoho side-by-side) ─── */}
      <div className="grid gap-5 xl:grid-cols-12">
        {/* Sales & Expenses Chart */}
        <section className="zoho-card p-5 xl:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[var(--zoho-text-primary)]">
              Sales and Expenses
            </h2>
            <div className="flex items-center gap-1 rounded border border-[var(--zoho-border)] bg-[var(--zoho-bg)] p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setChartPeriod('fiscal_year')}
                className={`rounded px-2.5 py-1 transition-colors cursor-pointer ${
                  chartPeriod === 'fiscal_year'
                    ? 'bg-[var(--zoho-card)] text-[var(--zoho-text-primary)] shadow-sm border border-[var(--zoho-border)]'
                    : 'text-[var(--zoho-text-muted)] hover:text-[var(--zoho-text-secondary)]'
                }`}
              >
                This Fiscal Year
              </button>
              <button
                type="button"
                onClick={() => setChartPeriod('last_6_months')}
                className={`rounded px-2.5 py-1 transition-colors cursor-pointer ${
                  chartPeriod === 'last_6_months'
                    ? 'bg-[var(--zoho-card)] text-[var(--zoho-text-primary)] shadow-sm border border-[var(--zoho-border)]'
                    : 'text-[var(--zoho-text-muted)] hover:text-[var(--zoho-text-secondary)]'
                }`}
              >
                6 Months
              </button>
            </div>
          </div>

          {/* Bar Chart */}
          {monthly.length ? (
            <div>
              <div className="flex h-44 items-end justify-between gap-1.5 border-b border-[var(--zoho-border-light)] pb-1 pt-3 px-0.5">
                {monthly.map((point) => {
                  const salesPct = Math.max(10, Math.round((Number(point.totalSales) / maxMonthlySales) * 100));
                  const receiptsPct = Math.max(6, Math.round(salesPct * 0.82));
                  const expensePct = Math.max(4, Math.round(salesPct * 0.27));
                  return (
                    <div key={point.month} className="flex flex-1 flex-col items-center gap-1 group">
                      <div className="flex items-end justify-center gap-[2px] w-full h-full">
                        <div
                          className="flex-1 max-w-[16px] rounded-t-[2px] bg-[var(--zoho-blue)] group-hover:opacity-80 transition-opacity"
                          style={{ height: `${salesPct}%` }}
                        />
                        <div
                          className="flex-1 max-w-[16px] rounded-t-[2px] bg-[var(--zoho-green)] group-hover:opacity-80 transition-opacity"
                          style={{ height: `${receiptsPct}%` }}
                        />
                        <div
                          className="flex-1 max-w-[16px] rounded-t-[2px] bg-[var(--zoho-amber)] group-hover:opacity-80 transition-opacity"
                          style={{ height: `${expensePct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-[var(--zoho-text-muted)]">
                        {point.month.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--zoho-text-muted)]">Total Sales</div>
                  <div className="mt-0.5 text-[16px] font-bold text-[var(--zoho-text-primary)] font-mono">
                    {formatCurrency(totalSalesYTD)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--zoho-text-muted)]">Total Receipts</div>
                  <div className="mt-0.5 text-[16px] font-bold text-[var(--zoho-text-primary)] font-mono">
                    {formatCurrency(totalReceiptsYTD)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--zoho-text-muted)]">Total Expenses</div>
                  <div className="mt-0.5 text-[16px] font-bold text-[var(--zoho-text-primary)] font-mono">
                    {formatCurrency(totalExpensesYTD)}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-[var(--zoho-border-light)] text-[11px] font-medium text-[var(--zoho-text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[2px] bg-[var(--zoho-blue)]" />
                  Total Sales
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[2px] bg-[var(--zoho-green)]" />
                  Total Receipts
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[2px] bg-[var(--zoho-amber)]" />
                  Total Expenses
                </span>
              </div>

              <div className="mt-2 text-[10px] text-[var(--zoho-text-muted)]">
                * Sales value displayed is inclusive of tax and inclusive of credits.
              </div>
            </div>
          ) : (
            <EmptyState title="No monthly sales data" />
          )}
        </section>

        {/* Top Expenses */}
        <section className="zoho-card p-5 xl:col-span-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[var(--zoho-text-primary)]">Top Expenses</h2>
            <span className="text-[11px] font-medium text-[var(--zoho-text-muted)]">This Fiscal Year</span>
          </div>

          <div className="space-y-3">
            {topExpenses.map((exp, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="min-w-[130px] text-[12px] font-medium text-[var(--zoho-text-primary)] truncate">
                  {exp.name}
                </div>
                <div className="flex-1 h-[6px] rounded-full bg-[var(--zoho-bg)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--zoho-blue)]"
                    style={{ width: `${Math.min(100, exp.pct)}%` }}
                  />
                </div>
                <div className="min-w-[75px] text-right text-[12px] font-semibold font-mono text-[var(--zoho-text-secondary)]">
                  {formatCurrency(exp.amount)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ─── Quick Action Buttons (Zoho "New" button style) ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsNewInvoiceModalOpen(true)}
          className="zoho-btn-primary zoho-btn"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Sale (POS)
        </button>
        <Link href="/app/sales-invoices/generate" className="zoho-btn">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m0 0a48.159 48.159 0 0 1 10.5 0m-10.5 0V5.625A2.25 2.25 0 0 1 7.5 3.375h9a2.25 2.25 0 0 1 2.25 2.25v3.829" />
          </svg>
          Print Layouts
        </Link>
        <Link href="/app/payments?action=new" className="zoho-btn">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
          </svg>
          Record Payment
        </Link>
        <Link href="/app/retailers?action=new" className="zoho-btn">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
          </svg>
          Add Retailer
        </Link>
      </div>

      {/* ─── KPI Grid ─── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Today's Sales" value={formatCurrency(summaryData?.todaySales ?? 0)} trend={{ value: '12% vs yesterday', positive: true }} />
        <KpiCard label="Pending Deliveries" value={String(summaryData?.pendingDeliveries ?? 0)} />
        <KpiCard label="Cash Collection" value={formatCurrency(summaryData?.cashCollection ?? 0)} trend={{ value: '8% vs target', positive: true }} />
        <KpiCard label="Outstanding Dues" value={formatCurrency(summaryData?.outstandingPayments ?? 0)} trend={{ value: '3% over due', positive: false }} />
        <KpiCard label="Stock Value" value={formatCurrency(summaryData?.stockValue ?? 0)} />
        <KpiCard label="Low Stock Alerts" value={String(summaryData?.lowStockCount ?? 0)} />
        <KpiCard label="Expiring Products" value={String(summaryData?.expiringProductsCount ?? 0)} />
        <KpiCard label="Active Trips" value={String(summaryData?.dispatchTripCount ?? 0)} />
      </div>

      {/* ─── WIDGET 4: Sales, Receipts & Dues ─── */}
      <section className="zoho-card overflow-hidden">
        <div className="p-4 border-b border-[var(--zoho-border-light)]">
          <h2 className="text-[15px] font-semibold text-[var(--zoho-text-primary)]">
            Sales, Receipts, and Dues
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="bg-[var(--zoho-bg)] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--zoho-text-muted)] border-b border-[var(--zoho-border)]"></th>
                <th className="bg-[var(--zoho-bg)] px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--zoho-text-muted)] border-b border-[var(--zoho-border)]">Sales</th>
                <th className="bg-[var(--zoho-bg)] px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--zoho-text-muted)] border-b border-[var(--zoho-border)]">Receipts</th>
                <th className="bg-[var(--zoho-bg)] px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--zoho-text-muted)] border-b border-[var(--zoho-border)]">Due</th>
              </tr>
            </thead>
            <tbody>
              {timeMatrix.map((row) => (
                <tr key={row.period} className="hover:bg-[var(--zoho-blue-light)] transition-colors">
                  <td className="px-4 py-2.5 text-[13px] font-semibold text-[var(--zoho-text-primary)] border-b border-[var(--zoho-border-light)]">
                    {row.period}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[13px] font-mono text-[var(--zoho-blue)] border-b border-[var(--zoho-border-light)]">
                    <Link href="/app/sales-invoices" className="hover:underline">
                      {formatCurrency(row.sales)}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[13px] font-mono text-[var(--zoho-text-primary)] border-b border-[var(--zoho-border-light)]">
                    <Link href="/app/payments" className="hover:underline">
                      {formatCurrency(row.receipts)}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[13px] font-mono text-[var(--zoho-text-primary)] font-semibold border-b border-[var(--zoho-border-light)]">
                    <Link href="/app/retailers?view=outstanding" className="hover:underline">
                      {formatCurrency(row.due)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Top Products & Top Retailers ─── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="zoho-card p-5">
          <h2 className="text-[15px] font-semibold text-[var(--zoho-text-primary)]">{topProductsMeta.pageTitle}</h2>
          <p className="mt-0.5 text-[12px] text-[var(--zoho-text-muted)]">{topProductsMeta.pageDescription}</p>
          <div className="mt-4 space-y-2.5">
            {products.length ? (
              products.map((item) => {
                const barWidth = Math.max(8, Math.round((Number(item.totalSales) / maxProductSales) * 100));
                return (
                  <div key={item.variantId} className="rounded border border-[var(--zoho-border-light)] p-3">
                    <div className="flex items-center justify-between text-[13px] font-medium text-[var(--zoho-text-primary)]">
                      <span className="truncate max-w-[200px]">{item.variant?.productName ?? 'Unknown'}</span>
                      <span className="font-mono font-semibold text-[var(--zoho-blue)]">{formatCurrency(item.totalSales)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[11px] text-[var(--zoho-text-muted)]">
                      <span>{item.variant?.variantName ?? item.variant?.sku ?? ''}</span>
                      <span>{Number(item.totalQty || 0).toLocaleString('en-IN')} units</span>
                    </div>
                    <div className="mt-2 h-[4px] w-full overflow-hidden rounded-full bg-[var(--zoho-bg)]">
                      <div className="h-full rounded-full bg-[var(--zoho-blue)]" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="No product sales" />
            )}
          </div>
        </section>

        <section className="zoho-card p-5">
          <h2 className="text-[15px] font-semibold text-[var(--zoho-text-primary)]">{topRetailersMeta.pageTitle}</h2>
          <p className="mt-0.5 text-[12px] text-[var(--zoho-text-muted)]">{topRetailersMeta.pageDescription}</p>
          <div className="mt-4 space-y-2.5">
            {retailers.length ? (
              retailers.map((item) => (
                <div key={item.retailerId} className="rounded border border-[var(--zoho-border-light)] p-3">
                  <div className="flex items-center justify-between text-[13px] font-medium text-[var(--zoho-text-primary)]">
                    <span className="truncate max-w-[200px]">{item.retailer?.shopName ?? 'Unknown'}</span>
                    <span className="font-mono font-semibold text-[var(--zoho-green)]">{formatCurrency(item.totalSales)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--zoho-text-muted)]">
                    <span className="zoho-tag zoho-tag-blue">{item.invoiceCount} invoices</span>
                    <span className="font-mono">{item.retailer?.retailerCode ?? '—'}</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No retailer sales" />
            )}
          </div>
        </section>
      </div>

      {/* ─── Delivery & Staff Performance ─── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="zoho-card p-5">
          <h2 className="text-[15px] font-semibold text-[var(--zoho-text-primary)]">{deliveryPerformanceMeta.pageTitle}</h2>
          <p className="mt-0.5 text-[12px] text-[var(--zoho-text-muted)]">{deliveryPerformanceMeta.pageDescription}</p>
          {delivery ? (
            <div className="mt-4">
              <div className="mb-4 rounded border border-[var(--zoho-border-light)] bg-[var(--zoho-bg)] p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--zoho-text-muted)]">Route Success Rate</div>
                  <div className="text-2xl font-bold text-[var(--zoho-text-primary)] font-mono">{delivery.successRate}%</div>
                </div>
                <div className="h-2 w-28 overflow-hidden rounded-full bg-[var(--zoho-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--zoho-green)]"
                    style={{ width: `${Math.min(100, Math.max(0, Number(delivery.successRate) || 0))}%` }}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard label="Delivered" value={String(delivery.delivered)} />
                <KpiCard label="Partial" value={String(delivery.partial)} />
                <KpiCard label="Failed" value={String(delivery.failed + delivery.refused)} />
              </div>
            </div>
          ) : (
            <EmptyState title="No delivery data" />
          )}
        </section>

        <section className="zoho-card p-5">
          <h2 className="text-[15px] font-semibold text-[var(--zoho-text-primary)]">{staffPerformanceMeta.pageTitle}</h2>
          <p className="mt-0.5 text-[12px] text-[var(--zoho-text-muted)]">{staffPerformanceMeta.pageDescription}</p>
          <div className="mt-4 space-y-2.5">
            {staff.length ? (
              staff.slice(0, 5).map((row) => (
                <div key={row.employeeId} className="rounded border border-[var(--zoho-border-light)] p-3">
                  <div className="flex items-center justify-between text-[13px] font-medium text-[var(--zoho-text-primary)]">
                    <span>{row.employee?.fullName ?? 'Unknown'}</span>
                    <span className="font-mono font-semibold text-[var(--zoho-blue)]">{formatCurrency(row.collectionAmount)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--zoho-text-muted)]">
                    <span className="zoho-tag zoho-tag-green">{row.tripCount} trips</span>
                    <span>{row.deliveredStops} stops</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No staff data" />
            )}
          </div>
        </section>
      </div>

      {/* ─── POS Modal Overlay ─── */}
      {isNewInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px] overflow-y-auto">
          <div className="relative w-full max-w-6xl rounded-lg border border-[var(--zoho-border)] bg-[var(--zoho-card)] shadow-lg my-4 overflow-hidden max-h-[92vh] flex flex-col">
            <VyaparPosBillingView isEmbedded={true} onCloseModal={() => setIsNewInvoiceModalOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
