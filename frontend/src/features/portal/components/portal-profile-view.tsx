'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { PortalApi } from '@/features/portal/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export function PortalProfileView() {
  const query = useQuery({ queryKey: ['portal', 'profile'], queryFn: () => PortalApi.getProfile() });

  if (query.isLoading) return <div className="text-sm text-slate-500">Loading profile...</div>;
  if (query.error || !query.data?.data)
    return (
      <EmptyState
        title="Unable to load profile"
        description={query.error instanceof Error ? query.error.message : 'Profile unavailable'}
      />
    );

  const data = query.data.data;

  return (
    <div>
      <PageHeader
        title="Profile & Financial Overview"
        description="View retailer business profile, account summary, and double-entry ledger totals."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Outstanding" value={formatCurrency(data.ledgerSummary?.outstandingAmount ?? 0)} />
        <KpiCard label="Total Invoiced" value={formatCurrency(data.ledgerSummary?.totalInvoiced ?? 0)} />
        <KpiCard label="Total Collected" value={formatCurrency(data.ledgerSummary?.totalCollected ?? 0)} />
        <KpiCard label="Open Invoices" value={data.ledgerSummary?.openInvoiceCount ?? 0} />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
        <div className="text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Self-Service Ledger Inspection:</span> Inspect double-entry running balance, credit notes, and delivery stop variances.
        </div>
        <Link
          href="/portal/ledger"
          className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 shadow-sm"
        >
          Open Ledger View
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">User Profile</h2>
          <div className="space-y-3 text-sm text-slate-700">
            <div>
              <span className="font-medium text-slate-950">Name:</span> {data.user.fullName}
            </div>
            <div>
              <span className="font-medium text-slate-950">Mobile:</span> {data.user.mobile}
            </div>
            <div>
              <span className="font-medium text-slate-950">User Type:</span> {data.user.userType}
            </div>
            <div>
              <span className="font-medium text-slate-950">Roles:</span> {data.user.roles.join(', ')}
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Retailer Business</h2>
          {data.retailer ? (
            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <span className="font-medium text-slate-950">Shop:</span> {data.retailer.shopName}
              </div>
              <div>
                <span className="font-medium text-slate-950">Retailer Code:</span> {data.retailer.retailerCode}
              </div>
              <div>
                <span className="font-medium text-slate-950">Owner:</span> {data.retailer.ownerName ?? '—'}
              </div>
              <div>
                <span className="font-medium text-slate-950">Location:</span>{' '}
                {[data.retailer.locality, data.retailer.city, data.retailer.state].filter(Boolean).join(', ') || '—'}
              </div>
              <div>
                <span className="font-medium text-slate-950">Category:</span> {data.retailer.retailerCategory ?? '—'}
              </div>
              <div>
                <span className="font-medium text-slate-950">Business Status:</span> {data.retailer.businessStatus}
              </div>
              <div>
                <span className="font-medium text-slate-950">Ordering Mode:</span> {data.retailer.orderingMode}
              </div>
              <div>
                <span className="font-medium text-slate-950">Credit Limit:</span> {formatCurrency(Number(data.retailer.creditLimit))}
              </div>
              <div>
                <span className="font-medium text-slate-950">Credit Days:</span> {data.retailer.creditDays}
              </div>
            </div>
          ) : (
            <EmptyState title="Retailer details unavailable" />
          )}
        </section>
      </div>
    </div>
  );
}
