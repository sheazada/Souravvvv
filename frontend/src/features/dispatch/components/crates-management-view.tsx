'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CratesApi } from '../api';
import { LookupsApi } from '@/features/lookups/api';
import type { CrateTransactionListItem, CrateBalanceSnapshotListItem } from '@/types/dispatch';
import { Package, Plus, Search, RefreshCw, AlertTriangle, ArrowDownRight, ArrowUpRight, X } from 'lucide-react';

export function CratesManagementView() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'balances' | 'transactions'>('balances');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    crateTypeId: '',
    retailerId: '',
    transactionType: 'issue' as 'issue' | 'return' | 'damage' | 'missing',
    quantity: 10,
    remarks: 'Regular route container movement',
  });

  const { data: balancesResponse, isLoading: loadingBalances } = useQuery({
    queryKey: ['crates-balances', page, searchQuery],
    queryFn: () => CratesApi.listBalances({ page, limit: 20 }),
    enabled: activeTab === 'balances',
  });

  const { data: transactionsResponse, isLoading: loadingTransactions } = useQuery({
    queryKey: ['crates-transactions', page, searchQuery],
    queryFn: () =>
      CratesApi.listTransactions({
        page,
        limit: 20,
        ...(searchQuery ? { search: searchQuery } : {}),
      }),
    enabled: activeTab === 'transactions',
  });

  const { data: retailersResponse } = useQuery({
    queryKey: ['lookups-retailers-all'],
    queryFn: () => LookupsApi.retailers({ limit: 100 }),
  });

  const { data: crateTypesResponse } = useQuery({
    queryKey: ['lookups-cratetypes-all'],
    queryFn: () => LookupsApi.crateTypes({ limit: 100 }),
  });

  const balances = balancesResponse?.data ?? [];
  const transactions = transactionsResponse?.data ?? [];
  const retailers = Array.isArray(retailersResponse) ? retailersResponse : (retailersResponse as any)?.data ?? [];
  const crateTypes = Array.isArray(crateTypesResponse) ? crateTypesResponse : (crateTypesResponse as any)?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      CratesApi.createTransaction({
        crateTypeId: formData.crateTypeId || (crateTypes[0]?.id ?? ''),
        retailerId: formData.retailerId || (retailers[0]?.id ?? ''),
        transactionType: formData.transactionType,
        quantity: Number(formData.quantity),
        remarks: formData.remarks,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crates-balances'] });
      queryClient.invalidateQueries({ queryKey: ['crates-transactions'] });
      setShowCreateModal(false);
    },
  });

  const recalcMutation = useMutation({
    mutationFn: () => CratesApi.recalculateBalances(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crates-balances'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Crate & Container Accounting
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track returnable plastic crate issues, empties collected, and retailer deposit liabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => recalcMutation.mutate()}
            disabled={recalcMutation.isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
            Recompute Balances
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Record Container Transaction
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-6">
        <button
          onClick={() => {
            setActiveTab('balances');
            setPage(1);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'balances'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Retailer Container Balances & Liabilities
        </button>
        <button
          onClick={() => {
            setActiveTab('transactions');
            setPage(1);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'transactions'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Container Movement Logs
        </button>
      </div>

      {activeTab === 'balances' ? (
        loadingBalances ? (
          <div className="flex items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : balances.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No container balance snapshots recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Retailer Shop</th>
                  <th className="py-3.5 px-4">Crate Type</th>
                  <th className="py-3.5 px-4 font-mono">Issued</th>
                  <th className="py-3.5 px-4 font-mono">Returned</th>
                  <th className="py-3.5 px-4 font-mono">Damaged / Missing</th>
                  <th className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">Closing Empties</th>
                  <th className="py-3.5 px-4 font-mono text-right font-bold text-amber-600">Total Liability (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                {balances.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                      {row.retailer?.shopName ?? 'Unknown Retailer'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300 font-medium">
                      {row.crateType?.name ?? 'Standard Crate'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-600 dark:text-gray-400">
                      {row.issuedQty}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-green-600 dark:text-green-400">
                      {row.returnedQty}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-red-600 dark:text-red-400">
                      {row.damagedQty + row.missingQty}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {row.closingQty}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-right text-amber-600 dark:text-amber-400">
                      ₹{Number(row.totalLiability ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : loadingTransactions ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No container movement logs found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Retailer Shop</th>
                <th className="py-3.5 px-4">Crate Type</th>
                <th className="py-3.5 px-4">Movement Type</th>
                <th className="py-3.5 px-4 font-mono font-bold">Quantity</th>
                <th className="py-3.5 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="py-3.5 px-4 text-xs text-gray-500">
                    {new Date(tx.transactionDate).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                    {tx.retailer?.shopName ?? 'Depot Pool'}
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300 font-medium">
                    {tx.crateType?.name ?? 'Standard Crate'}
                  </td>
                  <td className="py-3.5 px-4 capitalize font-semibold">
                    {tx.transactionType === 'issue' ? (
                      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <ArrowUpRight className="w-4 h-4" /> Issue (To Shop)
                      </span>
                    ) : tx.transactionType === 'return' ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <ArrowDownRight className="w-4 h-4" /> Return (To Depot)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-4 h-4" /> {tx.transactionType}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-gray-900 dark:text-white">
                    {tx.quantity} crates
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-500">
                    {tx.remarks ?? 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Record Container Issue / Return</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Retailer Shop</label>
                <select
                  value={formData.retailerId}
                  onChange={(e) => setFormData({ ...formData, retailerId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                >
                  {retailers.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.shopName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Crate Type</label>
                  <select
                    value={formData.crateTypeId}
                    onChange={(e) => setFormData({ ...formData, crateTypeId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                  >
                    {crateTypes.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Movement Type</label>
                  <select
                    value={formData.transactionType}
                    onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg capitalize"
                  >
                    <option value="issue">Issue (To Shop)</option>
                    <option value="return">Return (Empties Collected)</option>
                    <option value="damage">Damaged Empties</option>
                    <option value="missing">Missing / Short Empties</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {createMutation.isPending ? 'Recording...' : 'Record Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
