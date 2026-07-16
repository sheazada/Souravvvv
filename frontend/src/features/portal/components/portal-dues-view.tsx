'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { PortalApi } from '@/features/portal/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export function PortalDuesView() {
  const query = useQuery({ queryKey: ['portal', 'dues'], queryFn: () => PortalApi.getDues() });

  if (query.isLoading) return <div className="text-sm text-slate-500">Loading dues...</div>;
  if (query.error || !query.data?.data)
    return (
      <EmptyState
        title="Unable to load dues"
        description={query.error instanceof Error ? query.error.message : 'Dues not found'}
      />
    );

  const data = query.data.data;
  const summary = data.summary;

  const getRiskLevelBadge = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
      case 'critical':
        return { label: 'High Risk', className: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'medium':
      case 'warning':
        return { label: 'Medium Risk', className: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'low':
      case 'normal':
      default:
        return { label: 'Good / Normal', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
  };

  const riskBadge = getRiskLevelBadge(summary?.riskLevel);

  return (
    <div>
      <PageHeader
        title="Dues & Outstanding Aging"
        description="Track total outstanding dues, credit limits, overdue amounts, and unpaid invoices for your retailer account."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Outstanding" value={formatCurrency(data.totalOutstanding)} />
        <KpiCard label="Credit Limit" value={summary?.totalCreditLimit ? formatCurrency(summary.totalCreditLimit) : '—'} />
        <KpiCard label="Available Credit" value={summary?.availableCredit ? formatCurrency(summary.availableCredit) : '—'} />
        <KpiCard label="Overdue Amount" value={summary?.overdueAmount ? formatCurrency(summary.overdueAmount) : '₹0.00'} />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="font-semibold text-slate-950">Risk Status: </span>
            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${riskBadge.className}`}>
              {riskBadge.label}
            </span>
          </div>
          {summary ? (
            <div>
              <span className="font-semibold text-slate-950">Credit Usage: </span>
              <span className="text-slate-700 font-medium">{summary.creditUsagePercent ?? 0}%</span>
            </div>
          ) : null}
          {summary?.orderBlocked ? (
            <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
              ORDERING BLOCKED BY CREDIT LIMIT
            </span>
          ) : null}
        </div>
        <div className="flex gap-3">
          <Link
            href="/portal/ledger"
            className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 shadow-sm"
          >
            Inspect Full Ledger History
          </Link>
        </div>
      </div>

      {data.invoices.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-950">Open & Unpaid Invoices ({data.invoices.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice No & Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium text-right">Grand Total (₹)</th>
                  <th className="px-4 py-3 font-medium text-right">Outstanding (₹)</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data.invoices.map((invoice) => {
                  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.outstandingAmount > 0;
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-950">{invoice.invoiceNo}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : invoice.status === 'partial_paid'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {isOverdue ? 'Overdue' : invoice.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {invoice.dueDate ? (
                          <span className={isOverdue ? 'font-semibold text-rose-600' : ''}>
                            {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 font-medium whitespace-nowrap">
                        {formatCurrency(invoice.grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-700 whitespace-nowrap">
                        {formatCurrency(invoice.outstandingAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/portal/invoices/${invoice.id}`}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Open Invoice
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No dues found"
          description="When invoices are posted or partially unpaid, they will appear here."
        />
      )}
    </div>
  );
}
