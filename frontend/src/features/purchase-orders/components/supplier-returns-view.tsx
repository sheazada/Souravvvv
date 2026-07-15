'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupplierReturnsApi } from '../api';
import { LookupsApi } from '@/features/lookups/api';
import type { SupplierReturnListItem } from '@/types/purchase-orders';
import { RotateCcw, Plus, Search, CheckCircle, AlertCircle, X } from 'lucide-react';

export function SupplierReturnsView() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    supplierReturnNo: '',
    supplierId: '',
    returnDate: new Date().toISOString().slice(0, 10),
    reason: 'Damaged pouches or curd during depot sorting',
    variantId: '',
    returnQty: 5,
    unitCost: 45,
  });

  const { data: returnsResponse, isLoading: loadingReturns } = useQuery({
    queryKey: ['supplier-returns', page, statusFilter, searchQuery],
    queryFn: () =>
      SupplierReturnsApi.list({
        page,
        limit: 15,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      }),
  });

  const { data: suppliersResponse } = useQuery({
    queryKey: ['lookups-suppliers-all'],
    queryFn: () => LookupsApi.suppliers({ limit: 100 }),
  });

  const { data: variantsResponse } = useQuery({
    queryKey: ['lookups-variants-all'],
    queryFn: () => LookupsApi.productVariants({ limit: 100 }),
  });

  const returns = returnsResponse?.data ?? [];
  const meta = returnsResponse?.meta ?? { page: 1, limit: 15, total: 0, totalPages: 1 };
  const suppliers = Array.isArray(suppliersResponse) ? suppliersResponse : (suppliersResponse as any)?.data ?? [];
  const variants = Array.isArray(variantsResponse) ? variantsResponse : (variantsResponse as any)?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      SupplierReturnsApi.create({
        supplierReturnNo: formData.supplierReturnNo,
        supplierId: formData.supplierId || (suppliers[0]?.id ?? ''),
        returnDate: formData.returnDate,
        reason: formData.reason,
        items: [
          {
            variantId: formData.variantId || (variants[0]?.id ?? ''),
            returnQty: Number(formData.returnQty),
            unitCost: Number(formData.unitCost),
          },
        ],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-returns'] });
      setShowCreateModal(false);
      setFormData({
        supplierReturnNo: '',
        supplierId: '',
        returnDate: new Date().toISOString().slice(0, 10),
        reason: 'Damaged pouches or curd during depot sorting',
        variantId: '',
        returnQty: 5,
        unitCost: 45,
      });
    },
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => SupplierReturnsApi.post(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-returns'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Supplier Return Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track damaged or spoiled crates returned to the Sudha plant with automatic inventory batch debiting.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Plant Return
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search return slip # or debit note..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none capitalize"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="posted">Posted to Plant</option>
        </select>
      </div>

      {loadingReturns ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : returns.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <RotateCcw className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No supplier return records found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Return #</th>
                  <th className="py-3.5 px-4">Supplier Plant</th>
                  <th className="py-3.5 px-4">Return Date</th>
                  <th className="py-3.5 px-4">Reason / Discrepancy</th>
                  <th className="py-3.5 px-4">Plant Debit Note #</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                {returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {ret.supplierReturnNo}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">
                      {ret.supplier?.name ?? 'Sudha Dairy Plant'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">
                      {new Date(ret.returnDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                      {ret.reason ?? 'No reason noted'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {ret.debitNoteNo ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded font-semibold">
                          {ret.debitNoteNo}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Pending posting</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {ret.status === 'posted' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300">
                          <CheckCircle className="w-3 h-3" /> Debited Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 capitalize">
                          {ret.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {ret.status !== 'posted' && (
                        <button
                          onClick={() => postMutation.mutate(ret.id)}
                          disabled={postMutation.isPending}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
                        >
                          Post & Debit Batch
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Record Plant Return Slip</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Return No</label>
                  <input
                    type="text"
                    placeholder="SRET-2026-001"
                    value={formData.supplierReturnNo}
                    onChange={(e) => setFormData({ ...formData, supplierReturnNo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Supplier Plant</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                  >
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Return Reason</label>
                <input
                  type="text"
                  placeholder="Damaged pouches or curd during depot sorting"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Return Qty</label>
                  <input
                    type="number"
                    value={formData.returnQty}
                    onChange={(e) => setFormData({ ...formData, returnQty: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button
                disabled={createMutation.isPending || !formData.supplierReturnNo}
                onClick={() => createMutation.mutate()}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {createMutation.isPending ? 'Saving...' : 'Save Return Slip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
