'use client';

import React, { useEffect, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
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

  // Auto-open Vyapar POS studio modal if launched with ?action=new-invoice
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
    return <div className="text-sm text-slate-500">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <EmptyState
        title="Unable to load dashboard"
        description={error instanceof Error ? error.message : 'Unknown dashboard error'}
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

  return (
    <div>
      <PageHeader title={dashboardMeta.pageTitle} description={dashboardMeta.pageDescription} />

      {/* Success Notification Banner for Newly Generated Invoice */}
      {createdInvoiceSuccess && (
        <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-xs text-lg">
                ✔
              </div>
              <div>
                <div className="font-bold text-base">Sales Invoice Created & Posted Successfully!</div>
                <div className="text-xs text-emerald-800 mt-0.5">
                  Invoice No: <span className="font-mono font-bold">{createdInvoiceSuccess.invoiceNo}</span> • Grand Total:{' '}
                  <span className="font-bold">{formatCurrency(createdInvoiceSuccess.grandTotal)}</span> • Status:{' '}
                  <span className="uppercase font-semibold">{createdInvoiceSuccess.status}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/app/sales-invoices/${createdInvoiceSuccess.id}`}
                className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
              >
                View Invoice Details
              </Link>
              <Link
                href={`/app/retailers/${createdInvoiceSuccess.retailerId}`}
                className="rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 transition-colors"
              >
                Open Retailer Ledger
              </Link>
              <button
                type="button"
                onClick={() => setCreatedInvoiceSuccess(null)}
                className="rounded-xl border border-emerald-200 bg-emerald-100/60 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-200 cursor-pointer"
              >
                ✕ Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Cards Toolbar (Updated with Vyapar POS & Tally Print Suite) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setIsNewInvoiceModalOpen(true)}
          className="group flex items-center gap-3 rounded-2xl border border-cyan-300 bg-gradient-to-br from-cyan-600 to-cyan-700 p-4 text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg text-left cursor-pointer"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 font-bold text-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
            🛍️
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Add Sale (Vyapar POS)</div>
            <div className="text-xs text-cyan-100 mt-0.5">Sale #1 | Sale #2 Studio</div>
          </div>
        </button>

        <Link
          href="/app/sales-invoices/generate"
          className="group flex items-center gap-3 rounded-2xl border border-blue-300 bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 font-bold text-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
            🖨️
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Print Layouts (Tally)</div>
            <div className="text-xs text-blue-100 mt-0.5">Thermal / Regular Print View</div>
          </div>
        </Link>

        <Link
          href="/app/payments?action=new"
          className="group flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 font-bold text-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
            ₹
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Payment Collection</div>
            <div className="text-xs text-emerald-100 mt-0.5">Record Cash / UPI Receipt</div>
          </div>
        </Link>

        <Link
          href="/app/returns?action=new"
          className="group flex items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 font-bold text-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
            ↩
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Add Sale Return</div>
            <div className="text-xs text-amber-100 mt-0.5">Customer / Shop Returns</div>
          </div>
        </Link>

        <Link
          href="/app/retailers?action=new"
          className="group flex items-center gap-3 rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 font-bold text-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
            🏪
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Add Retailer</div>
            <div className="text-xs text-slate-300 mt-0.5">Onboard New Shop Account</div>
          </div>
        </Link>
      </div>

      {/* Interactive Vyapar POS Billing Studio Overlay right on the Dashboard */}
      {isNewInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-6xl rounded-3xl border border-slate-300 bg-white shadow-2xl my-4 overflow-hidden max-h-[92vh] flex flex-col">
            <VyaparPosBillingView isEmbedded={true} onCloseModal={() => setIsNewInvoiceModalOpen(false)} />
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Today's Sales" value={formatCurrency(summaryData?.todaySales ?? 0)} />
        <KpiCard label="Pending Deliveries" value={summaryData?.pendingDeliveries ?? 0} />
        <KpiCard label="Cash Collection" value={formatCurrency(summaryData?.cashCollection ?? 0)} />
        <KpiCard label="Outstanding" value={formatCurrency(summaryData?.outstandingPayments ?? 0)} />
        <KpiCard label="Stock Value" value={formatCurrency(summaryData?.stockValue ?? 0)} />
        <KpiCard label="Low Stock Alerts" value={summaryData?.lowStockCount ?? 0} />
        <KpiCard label="Expiring Products" value={summaryData?.expiringProductsCount ?? 0} />
        <KpiCard label="Dispatch Trips" value={summaryData?.dispatchTripCount ?? 0} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-950">{monthlySalesMeta.pageTitle}</h2>
          <p className="mt-1 text-xs text-slate-500">{monthlySalesMeta.pageDescription}</p>

          <div className="mt-4">
            {monthly.length ? (
              <div className="space-y-4">
                <div className="flex h-36 items-end justify-between gap-2 border-b border-slate-200 pb-2 pt-4 px-1">
                  {monthly.map((point) => {
                    const heightPercent = Math.max(10, Math.round((Number(point.totalSales) / maxMonthlySales) * 100));
                    return (
                      <div key={point.month} className="flex flex-1 flex-col items-center gap-1 group">
                        <div
                          className="w-full max-w-[28px] rounded-t-md bg-cyan-600 group-hover:bg-cyan-500 transition-all duration-300"
                          style={{ height: `${heightPercent}%` }}
                          title={`${point.month}: ${formatCurrency(point.totalSales)}`}
                        />
                        <span className="text-[10px] font-medium text-slate-600">{point.month.slice(0, 3)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {monthly.map((point) => (
                    <div key={point.month} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                      <span className="font-medium text-slate-700">{point.month}</span>
                      <span className="font-semibold text-slate-950">{formatCurrency(point.totalSales)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="No monthly sales data" />
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-950">{topProductsMeta.pageTitle}</h2>
          <p className="mt-1 text-xs text-slate-500">{topProductsMeta.pageDescription}</p>
          <div className="mt-4 space-y-3">
            {products.length ? (
              products.map((item) => {
                const barWidth = Math.max(8, Math.round((Number(item.totalSales) / maxProductSales) * 100));
                return (
                  <div key={item.variantId} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span className="truncate max-w-[180px]">
                        {item.variant?.productName ?? 'Unknown Product'}
                      </span>
                      <span className="text-cyan-800">{formatCurrency(item.totalSales)}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{item.variant?.variantName ?? item.variant?.sku ?? item.variantId}</span>
                      <span>Volume: {Number(item.totalQty || 0).toLocaleString('en-IN')} units</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-cyan-600" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="No product sales found" />
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-950">{topRetailersMeta.pageTitle}</h2>
          <p className="mt-1 text-xs text-slate-500">{topRetailersMeta.pageDescription}</p>
          <div className="mt-4 space-y-3">
            {retailers.length ? (
              retailers.map((item) => (
                <div key={item.retailerId} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span className="truncate max-w-[180px]">
                      {item.retailer?.shopName ?? 'Unknown Retailer'}
                    </span>
                    <span className="text-emerald-800">{formatCurrency(item.totalSales)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-slate-600">
                    <span className="rounded bg-white px-2 py-0.5 border border-slate-200">
                      {item.invoiceCount} invoices
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Code: {item.retailer?.retailerCode ?? '—'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No retailer sales found" />
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{deliveryPerformanceMeta.pageTitle}</h2>
          <p className="mt-1 text-xs text-slate-500">{deliveryPerformanceMeta.pageDescription}</p>
          {delivery ? (
            <div className="mt-4">
              <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Overall Route Success Rate</div>
                  <div className="text-2xl font-bold text-slate-950 mt-0.5">{delivery.successRate}%</div>
                </div>
                <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{ width: `${Math.min(100, Math.max(0, Number(delivery.successRate) || 0))}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <KpiCard label="Delivered Stops" value={delivery.delivered} />
                <KpiCard label="Partial Stops" value={delivery.partial} />
                <KpiCard label="Failed / Refused" value={delivery.failed + delivery.refused} />
                <KpiCard label="Pending Stops" value={delivery.pending} />
                <KpiCard label="Total Stops" value={delivery.totalStops} />
                <KpiCard label="Success Rate" value={`${delivery.successRate}%`} />
              </div>
            </div>
          ) : (
            <EmptyState title="No delivery performance data" />
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{staffPerformanceMeta.pageTitle}</h2>
          <p className="mt-1 text-xs text-slate-500">{staffPerformanceMeta.pageDescription}</p>
          <div className="mt-4 space-y-3">
            {staff.length ? (
              staff.slice(0, 8).map((row) => (
                <div key={row.employeeId} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>{row.employee?.fullName ?? 'Unknown Employee'}</span>
                    <span className="text-cyan-800">{formatCurrency(row.collectionAmount)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-slate-600">
                    <span className="rounded bg-white px-2 py-0.5 border border-slate-200">Trips: {row.tripCount}</span>
                    <span className="rounded bg-white px-2 py-0.5 border border-slate-200">
                      Delivered Stops: {row.deliveredStops}
                    </span>
                    <span className="text-slate-500 font-medium ml-auto">
                      Avg Collection: {formatCurrency(Number(row.tripCount ? row.collectionAmount / row.tripCount : 0))}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No staff performance data" />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
