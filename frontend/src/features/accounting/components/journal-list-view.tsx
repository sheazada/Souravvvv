'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { AccountingApi } from '@/features/accounting/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export function JournalListView() {
  const routeMeta = getAdminRouteMeta('journalEntries');
  const [filters, setFilters] = useState({ page: 1, limit: 20, voucherType: '', status: '' });
  const queryKey = useMemo(() => ['journal-entries', filters], [filters]);

  const [journalsQuery, customerLedgerQuery, supplierLedgerQuery] = useQueries({
    queries: [
      { queryKey, queryFn: () => AccountingApi.getJournalEntries(filters) },
      { queryKey: ['ledger', 'customers'], queryFn: () => AccountingApi.getCustomerLedger() },
      { queryKey: ['ledger', 'suppliers'], queryFn: () => AccountingApi.getSupplierLedger() },
    ],
  });

  if (journalsQuery.isLoading || customerLedgerQuery.isLoading || supplierLedgerQuery.isLoading) {
    return <div className="text-sm text-slate-500">Loading journal entries...</div>;
  }

  if (journalsQuery.error || !journalsQuery.data?.data) {
    return <EmptyState title="Unable to load journal entries" description={journalsQuery.error instanceof Error ? journalsQuery.error.message : 'Unknown accounting journal error'} />;
  }

  const journals = journalsQuery.data.data;
  const meta = journalsQuery.data.meta;
  const customerLedger = customerLedgerQuery.data?.data ?? [];
  const supplierLedger = supplierLedgerQuery.data?.data ?? [];

  return (
    <div>
      <PageHeader title={routeMeta.pageTitle} description={routeMeta.pageDescription} />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Journal Entries" value={meta?.total ?? journals.length} />
        <KpiCard label="Customer Outstanding" value={formatCurrency(customerLedger.reduce((sum, row) => sum + row.outstandingAmount, 0))} />
        <KpiCard label="Supplier Outstanding" value={formatCurrency(supplierLedger.reduce((sum, row) => sum + row.outstandingAmount, 0))} />
        <KpiCard label="Customer Accounts" value={customerLedger.length} />
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <input value={filters.voucherType} onChange={(event) => setFilters((current) => ({ ...current, voucherType: event.target.value, page: 1 }))} placeholder="Voucher type" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
        <input value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))} placeholder="Status" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
        <button type="button" onClick={() => setFilters({ page: 1, limit: 20, voucherType: '', status: '' })} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reset Filters</button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Voucher</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Posting Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Narration</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {journals.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 font-medium text-slate-950">{entry.voucherNo}</td>
                  <td className="px-4 py-3 text-slate-700">{entry.voucherType}</td>
                  <td className="px-4 py-3 text-slate-700">{new Date(entry.postingDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-slate-700">{entry.status}</td>
                  <td className="px-4 py-3 text-slate-700">{entry.narration ?? '—'}</td>
                  <td className="px-4 py-3"><Link href={`/app/accounting/journals/${entry.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
