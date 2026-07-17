'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { FinancialStatementsApi } from '@/features/accounting/api-financial-statements';
import { formatCurrency } from '@/lib/utils/number';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function FinancialStatementsView() {
  const [activeTab, setActiveTab] = useState<'trial' | 'pnl' | 'balanceSheet' | 'gst'>('trial');
  const [fromDate, setFromDate] = useState('2026-07-01');
  const [toDate, setToDate] = useState('2026-07-31');

  const trialQuery = useQuery({
    queryKey: ['financial-statements', 'trial-balance', fromDate, toDate],
    queryFn: () => FinancialStatementsApi.getTrialBalance({ fromDate, toDate }),
    enabled: activeTab === 'trial',
  });

  const pnlQuery = useQuery({
    queryKey: ['financial-statements', 'profit-loss', fromDate, toDate],
    queryFn: () => FinancialStatementsApi.getProfitLoss({ fromDate, toDate }),
    enabled: activeTab === 'pnl',
  });

  const balanceSheetQuery = useQuery({
    queryKey: ['financial-statements', 'balance-sheet', toDate],
    queryFn: () => FinancialStatementsApi.getBalanceSheet({ asOfDate: toDate }),
    enabled: activeTab === 'balanceSheet',
  });

  const gstQuery = useQuery({
    queryKey: ['financial-statements', 'gst-summary', fromDate, toDate],
    queryFn: () => FinancialStatementsApi.getGstSummary({ fromDate, toDate }),
    enabled: activeTab === 'gst',
  });

  const trialData = trialQuery.data?.data;
  const pnlData = pnlQuery.data?.data;
  const bsData = balanceSheetQuery.data?.data;
  const gstData = gstQuery.data?.data;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Statutory Accounting Financial Statements</h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time general ledger accounting statements: Trial Balance, Profit & Loss (`P&L`), Balance Sheet, and GST Summary (`CGST + SGST`).
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl border border-slate-300 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 shadow-sm"
        >
          🖨️ Print Financial Statement
        </button>
      </div>

      {/* Tabs Selector & Date Range Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'trial', label: 'Trial Balance' },
            { id: 'pnl', label: 'Profit & Loss (P&L)' },
            { id: 'balanceSheet', label: 'Balance Sheet' },
            { id: 'gst', label: 'GST Summary Report' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span>Period:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 outline-none focus:border-cyan-500"
          />
          <span>to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* TRIAL BALANCE TAB */}
      {activeTab === 'trial' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2">
            General Ledger Trial Balance (as of {new Date(toDate).toLocaleDateString('en-IN')})
          </h2>
          {trialQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading trial balance...</div>
          ) : !trialData ? (
            <EmptyState title="Trial balance unavailable" />
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Account Code & Name</th>
                      <th className="px-4 py-3 text-center">Account Type</th>
                      <th className="px-4 py-3 text-right">Debit Total (₹)</th>
                      <th className="px-4 py-3 text-right">Credit Total (₹)</th>
                      <th className="px-4 py-3 text-right">Net Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {trialData.rows.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/75">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-950">{row.accountName}</div>
                          <div className="text-xs font-mono text-cyan-700">{row.accountCode}</div>
                        </td>
                        <td className="px-4 py-3 text-center uppercase font-semibold text-slate-700">
                          {row.accountType}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(row.debitTotal)}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-700">{formatCurrency(row.creditTotal)}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-950">{formatCurrency(row.netBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold text-slate-950">
                    <tr>
                      <td colSpan={2} className="px-4 py-3.5 text-right uppercase">Trial Balance Grand Totals:</td>
                      <td className="px-4 py-3.5 text-right text-slate-900">{formatCurrency(trialData.summary.totalDebit)}</td>
                      <td className="px-4 py-3.5 text-right text-emerald-800">{formatCurrency(trialData.summary.totalCredit)}</td>
                      <td className="px-4 py-3.5 text-right text-rose-700">
                        {trialData.summary.difference === 0 ? '✓ Balanced (₹0.00)' : `Diff: ${formatCurrency(trialData.summary.difference)}`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* PROFIT & LOSS TAB */}
      {activeTab === 'pnl' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2">
            Profit & Loss Statement ({new Date(fromDate).toLocaleDateString('en-IN')} – {new Date(toDate).toLocaleDateString('en-IN')})
          </h2>
          {pnlQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading P&L statement...</div>
          ) : !pnlData ? (
            <EmptyState title="Profit & Loss unavailable" />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold text-emerald-800 uppercase tracking-wide text-xs mb-3">Operating Revenues (Incomes)</h3>
                <div className="space-y-2 text-sm">
                  {pnlData.revenueRows.map((row: any) => (
                    <div key={row.id} className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="font-medium text-slate-900">{row.accountName} ({row.accountCode})</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(row.creditTotal - row.debitTotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 text-base font-black text-emerald-900 border-t border-slate-300">
                    <span>Total Revenue:</span>
                    <span>{formatCurrency(pnlData.summary.totalRevenue)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold text-rose-800 uppercase tracking-wide text-xs mb-3">Operating Expenses & COGS</h3>
                <div className="space-y-2 text-sm">
                  {pnlData.expenseRows.map((row: any) => (
                    <div key={row.id} className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="font-medium text-slate-900">{row.accountName} ({row.accountCode})</span>
                      <span className="font-bold text-rose-700">{formatCurrency(row.debitTotal - row.creditTotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 text-base font-black text-rose-900 border-t border-slate-300">
                    <span>Total Expenses:</span>
                    <span>{formatCurrency(pnlData.summary.totalExpenses)}</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 rounded-xl border-2 border-cyan-500 bg-cyan-50/40 p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider font-bold text-slate-500">Net Operational Profit / Margin</div>
                  <div className="text-3xl font-black text-slate-950 mt-1">{formatCurrency(pnlData.summary.netProfit)}</div>
                </div>
                <div className="text-right text-xs font-semibold text-slate-600">
                  <span>Margin %: </span>
                  <strong className="text-emerald-700">
                    {pnlData.summary.totalRevenue > 0
                      ? `${Math.round((pnlData.summary.netProfit / pnlData.summary.totalRevenue) * 100)}%`
                      : '0%'}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* BALANCE SHEET TAB */}
      {activeTab === 'balanceSheet' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2">
            Balance Sheet Statement (as of {new Date(toDate).toLocaleDateString('en-IN')})
          </h2>
          {balanceSheetQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading balance sheet...</div>
          ) : !bsData ? (
            <EmptyState title="Balance sheet unavailable" />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold text-cyan-800 uppercase tracking-wide text-xs mb-3">Assets (Current & Fixed)</h3>
                <div className="space-y-2 text-sm">
                  {bsData.assetRows.map((row: any) => (
                    <div key={row.id} className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="font-medium text-slate-900">{row.accountName} ({row.accountCode})</span>
                      <span className="font-bold text-slate-950">{formatCurrency(row.debitTotal - row.creditTotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 text-base font-black text-cyan-900 border-t border-slate-300">
                    <span>Total Assets:</span>
                    <span>{formatCurrency(bsData.summary.totalAssets)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-bold text-amber-800 uppercase tracking-wide text-xs mb-3">Liabilities (Payables & Dues)</h3>
                  <div className="space-y-2 text-sm">
                    {bsData.liabilityRows.map((row: any) => (
                      <div key={row.id} className="flex justify-between border-b border-slate-200/60 pb-1.5">
                        <span className="font-medium text-slate-900">{row.accountName} ({row.accountCode})</span>
                        <span className="font-bold text-amber-900">{formatCurrency(row.creditTotal - row.debitTotal)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 text-base font-black text-amber-950 border-t border-slate-300">
                      <span>Total Liabilities:</span>
                      <span>{formatCurrency(bsData.summary.totalLiabilities)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-bold text-purple-800 uppercase tracking-wide text-xs mb-3">Owner's Equity & Capital</h3>
                  <div className="space-y-2 text-sm">
                    {bsData.equityRows.map((row: any) => (
                      <div key={row.id} className="flex justify-between border-b border-slate-200/60 pb-1.5">
                        <span className="font-medium text-slate-900">{row.accountName} ({row.accountCode})</span>
                        <span className="font-bold text-purple-900">{formatCurrency(row.creditTotal - row.debitTotal)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 text-base font-black text-purple-950 border-t border-slate-300">
                      <span>Total Equity:</span>
                      <span>{formatCurrency(bsData.summary.totalEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* GST SUMMARY TAB */}
      {activeTab === 'gst' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950 mb-4 border-b border-slate-100 pb-2">
            GST Summary Breakdown (CGST + SGST + IGST Net Set-Off)
          </h2>
          {gstQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading GST summary...</div>
          ) : !gstData ? (
            <EmptyState title="GST summary unavailable" />
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs uppercase tracking-wide font-bold text-slate-500">Output GST (Collected on Sales)</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(gstData.outputGst)}</div>
                <div className="mt-1 text-xs text-slate-600">Taxable Sales: {formatCurrency(gstData.salesTaxable)}</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs uppercase tracking-wide font-bold text-slate-500">Input Tax Credit (ITC on Purchases)</div>
                <div className="mt-2 text-2xl font-black text-emerald-700">{formatCurrency(gstData.inputTaxCredit)}</div>
                <div className="mt-1 text-xs text-slate-600">Taxable Purchases: {formatCurrency(gstData.purchaseTaxable)}</div>
              </div>

              <div className="rounded-xl border-2 border-cyan-600 bg-cyan-50/50 p-5 flex flex-col justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide font-bold text-cyan-900">Net GST Payable (Set-Off Liability)</div>
                  <div className="mt-2 text-3xl font-black text-slate-950">{formatCurrency(gstData.netGstPayable)}</div>
                </div>
                <div className="text-right text-[11px] font-semibold text-cyan-800">
                  {gstData.netGstPayable === 0 ? 'Fully Set-Off by ITC Balance' : 'Payable via Challan PMT-06'}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
