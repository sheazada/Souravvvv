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
