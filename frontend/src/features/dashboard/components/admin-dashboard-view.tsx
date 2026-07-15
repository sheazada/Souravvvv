'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { DashboardApi } from '@/features/dashboard/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQueries } from '@tanstack/react-query';

export function AdminDashboardView() {
  const dashboardMeta = getAdminRouteMeta('dashboard');
  const monthlySalesMeta = getAdminRouteMeta('dashboardMonthlySales');
  const topProductsMeta = getAdminRouteMeta('dashboardTopProducts');
  const topRetailersMeta = getAdminRouteMeta('dashboardTopRetailers');
  const deliveryPerformanceMeta = getAdminRouteMeta('dashboardDeliveryPerformance');
  const staffPerformanceMeta = getAdminRouteMeta('dashboardStaffPerformance');

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
    return <EmptyState title="Unable to load dashboard" description={error instanceof Error ? error.message : 'Unknown dashboard error'} />;
  }

  const summaryData = summary.data?.data;
  const monthly = monthlySales.data?.data ?? [];
  const products = topProducts.data?.data ?? [];
  const retailers = topRetailers.data?.data ?? [];
  const delivery = deliveryPerformance.data?.data;
  const staff = staffPerformance.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title={dashboardMeta.pageTitle}
        description={dashboardMeta.pageDescription}
      />

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
          <p className="mt-1 text-sm text-slate-500">{monthlySalesMeta.pageDescription}</p>
          <div className="mt-4 space-y-3">
            {monthly.length ? monthly.map((point) => (
              <div key={point.month} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">{point.month}</span>
                <span className="text-slate-950">{formatCurrency(point.totalSales)}</span>
              </div>
            )) : <EmptyState title="No monthly sales data" />}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-950">{topProductsMeta.pageTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">{topProductsMeta.pageDescription}</p>
          <div className="mt-4 space-y-3">
            {products.length ? products.map((item) => (
              <div key={item.variantId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div className="font-medium text-slate-900">{item.variant?.productName ?? 'Unknown Product'}</div>
                <div className="mt-1 flex items-center justify-between text-slate-600">
                  <span>{item.variant?.variantName ?? item.variant?.sku ?? item.variantId}</span>
                  <span>{formatCurrency(item.totalSales)}</span>
                </div>
              </div>
            )) : <EmptyState title="No product sales found" />}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-950">{topRetailersMeta.pageTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">{topRetailersMeta.pageDescription}</p>
          <div className="mt-4 space-y-3">
            {retailers.length ? retailers.map((item) => (
              <div key={item.retailerId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div className="font-medium text-slate-900">{item.retailer?.shopName ?? 'Unknown Retailer'}</div>
                <div className="mt-1 flex items-center justify-between text-slate-600">
                  <span>{item.invoiceCount} invoices</span>
                  <span>{formatCurrency(item.totalSales)}</span>
                </div>
              </div>
            )) : <EmptyState title="No retailer sales found" />}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{deliveryPerformanceMeta.pageTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">{deliveryPerformanceMeta.pageDescription}</p>
          {delivery ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard label="Delivered" value={delivery.delivered} />
              <KpiCard label="Partial" value={delivery.partial} />
              <KpiCard label="Failed / Refused" value={delivery.failed + delivery.refused} />
              <KpiCard label="Pending" value={delivery.pending} />
              <KpiCard label="Total Stops" value={delivery.totalStops} />
              <KpiCard label="Success %" value={`${delivery.successRate}%`} />
            </div>
          ) : (
            <EmptyState title="No delivery performance data" />
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{staffPerformanceMeta.pageTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">{staffPerformanceMeta.pageDescription}</p>
          <div className="mt-4 space-y-3">
            {staff.length ? staff.slice(0, 8).map((row) => (
              <div key={row.employeeId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div className="font-medium text-slate-900">{row.employee?.fullName ?? 'Unknown Employee'}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-slate-600">
                  <span>Trips: {row.tripCount}</span>
                  <span>Delivered Stops: {row.deliveredStops}</span>
                  <span>Collections: {formatCurrency(row.collectionAmount)}</span>
                </div>
              </div>
            )) : <EmptyState title="No staff performance data" />}
          </div>
        </section>
      </div>
    </div>
  );
}
