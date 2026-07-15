'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { AccountingApi } from '@/features/accounting/api';
import { formatCurrency } from '@/lib/utils/number';
import { buildDetailTitle } from '@/lib/utils/title';
import { useQuery } from '@tanstack/react-query';

export function JournalDetailView({ id }: { id: string }) {
  const routeMeta = getAdminRouteMeta('journalEntries');
  const journalQuery = useQuery({ queryKey: ['journal-entry', id], queryFn: () => AccountingApi.getJournalEntry(id) });

  if (journalQuery.isLoading) {
    return <div className="text-sm text-slate-500">Loading journal entry...</div>;
  }

  if (journalQuery.error || !journalQuery.data?.data) {
    return <EmptyState title="Unable to load journal entry" description={journalQuery.error instanceof Error ? journalQuery.error.message : 'Journal entry not found'} />;
  }

  const entry = journalQuery.data.data;
  const totalDebit = entry.lines.reduce((sum, line) => sum + line.debitAmount, 0);
  const totalCredit = entry.lines.reduce((sum, line) => sum + line.creditAmount, 0);

  return (
    <div>
      <PageHeader
        title={buildDetailTitle(routeMeta.detailTitlePrefix ?? routeMeta.pageTitle, entry.voucherNo)}
        description={routeMeta.detailPageDescription}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Voucher Type" value={entry.voucherType} />
        <KpiCard label="Status" value={entry.status} />
        <KpiCard label="Total Debit" value={formatCurrency(totalDebit)} />
        <KpiCard label="Total Credit" value={formatCurrency(totalCredit)} />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Posting Date</div><div className="mt-1 font-medium text-slate-950">{new Date(entry.postingDate).toLocaleDateString('en-IN')}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Reference Type</div><div className="mt-1 font-medium text-slate-950">{entry.referenceType ?? '—'}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Reference ID</div><div className="mt-1 font-medium text-slate-950">{entry.referenceId ?? '—'}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-slate-500">Narration</div><div className="mt-1 font-medium text-slate-950">{entry.narration ?? '—'}</div></div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Journal Lines</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Debit</th>
                <th className="px-4 py-3 font-medium">Credit</th>
                <th className="px-4 py-3 font-medium">Narration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {entry.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3"><div className="font-medium text-slate-950">{line.account?.accountName ?? 'Unknown Account'}</div><div className="text-xs text-slate-500">{line.account?.accountCode ?? line.account?.id ?? '—'}</div></td>
                  <td className="px-4 py-3 text-slate-700">{line.account?.accountType ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(line.debitAmount)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(line.creditAmount)}</td>
                  <td className="px-4 py-3 text-slate-700">{line.lineNarration ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
