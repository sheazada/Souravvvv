'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { AccountingApi } from '@/features/accounting/api';
import { formatCurrency } from '@/lib/utils/number';
import { useQueries } from '@tanstack/react-query';
import { useState } from 'react';

export function AccountsListView() {
  const routeMeta = getAdminRouteMeta('accounting');
  const [accountType, setAccountType] = useState('');
  const [isActive, setIsActive] = useState('true');

  const [accountsQuery, trialBalanceQuery, profitLossQuery, balanceSheetQuery] = useQueries({
    queries: [
      { queryKey: ['accounts', accountType, isActive], queryFn: () => AccountingApi.getAccounts({ accountType: accountType || undefined, isActive }) },
      { queryKey: ['trial-balance'], queryFn: () => AccountingApi.getTrialBalance() },
      { queryKey: ['profit-loss'], queryFn: () => AccountingApi.getProfitLoss() },
      { queryKey: ['balance-sheet'], queryFn: () => AccountingApi.getBalanceSheet() },
    ],
  });

  if (accountsQuery.isLoading || trialBalanceQuery.isLoading || profitLossQuery.isLoading || balanceSheetQuery.isLoading) {
    return <div className="text-sm text-slate-500">Loading accounting data...</div>;
  }

  if (accountsQuery.error || !accountsQuery.data?.data) {
    return <EmptyState title="Unable to load accounts" description={accountsQuery.error instanceof Error ? accountsQuery.error.message : 'Unknown accounting error'} />;
  }

  const accounts = accountsQuery.data.data;
  const trialBalance = trialBalanceQuery.data?.data ?? [];
  const profitLoss = profitLossQuery.data?.data;
  const balanceSheet = balanceSheetQuery.data?.data;

  return (
    <div>
      <PageHeader title={routeMeta.pageTitle} description={routeMeta.pageDescription} />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Trial Balance Lines" value={trialBalance.length} />
        <KpiCard label="Net Profit" value={formatCurrency(profitLoss?.netProfit ?? 0)} />
        <KpiCard label="Total Assets" value={formatCurrency(balanceSheet?.totalAssets ?? 0)} />
        <KpiCard label="Total Liabilities" value={formatCurrency(balanceSheet?.totalLiabilities ?? 0)} />
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <select value={accountType} onChange={(event) => setAccountType(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
          <option value="">All account types</option>
          <option value="asset">Asset</option>
          <option value="liability">Liability</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="equity">Equity</option>
        </select>
        <select value={isActive} onChange={(event) => setIsActive(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
        <button type="button" onClick={() => { setAccountType(''); setIsActive('true'); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reset Filters</button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Account Code</th>
                <th className="px-4 py-3 font-medium">Account Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Control</th>
                <th className="px-4 py-3 font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-4 py-3 font-medium text-slate-950">{account.accountCode}</td>
                  <td className="px-4 py-3 text-slate-700">{account.accountName}</td>
                  <td className="px-4 py-3 text-slate-700">{account.accountType}</td>
                  <td className="px-4 py-3 text-slate-700">{account.isControlAccount ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-slate-700">{account.isActive ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
