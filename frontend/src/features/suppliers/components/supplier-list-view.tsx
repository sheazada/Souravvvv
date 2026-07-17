'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SuppliersApi, type SupplierRow } from '@/features/suppliers/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function SupplierListView() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SupplierRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    supplierCode: `SUP-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    contactPerson: '',
    mobile: '',
    email: '',
    gstin: '',
    pan: '',
    paymentTermsDays: '15',
  });

  const query = useQuery({
    queryKey: ['suppliers', 'list', searchQuery],
    queryFn: () => SuppliersApi.list({ search: searchQuery, limit: 30, page: 1 }),
  });

  const rows = query.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof formState) =>
      SuppliersApi.create({
        supplierCode: data.supplierCode,
        name: data.name,
        contactPerson: data.contactPerson || undefined,
        mobile: data.mobile || undefined,
        email: data.email || undefined,
        gstin: data.gstin || undefined,
        pan: data.pan || undefined,
        paymentTermsDays: Number(data.paymentTermsDays || 15),
      }),
    onSuccess: (res) => {
      setMessage(`Supplier '${res.data?.name}' onboarded successfully.`);
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to onboard supplier'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: Record<string, any> }) =>
      SuppliersApi.update(data.id, data.payload),
    onSuccess: (res) => {
      setMessage(`Supplier '${res.data?.name}' updated.`);
      setEditingRow(null);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to update supplier'),
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Milk Plant & Packaging Supplier Master</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage dairy suppliers, packaging vendors, payment terms (`paymentTermsDays`), and tax IDs (`GSTIN / PAN`).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm"
        >
          + Onboard New Supplier
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 flex items-center justify-between shadow-sm">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search suppliers by name, code, GSTIN, or contact..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Clear Search
          </button>
        )}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {query.isLoading ? (
          <div className="text-sm text-slate-500">Loading suppliers...</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No suppliers found"
            description="Click '+ Onboard New Supplier' above to register milk plants and vendors."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">Supplier Code & Name</th>
                  <th className="px-4 py-3 text-left">Contact details</th>
                  <th className="px-4 py-3 text-left">Tax Details (GSTIN/PAN)</th>
                  <th className="px-4 py-3 text-center">Payment Terms</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/75">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-950">{row.name}</div>
                      <div className="text-xs font-mono text-cyan-700">{row.supplierCode}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{row.contactPerson ?? '—'}</div>
                      <div className="text-xs text-slate-500">{row.mobile ?? row.email ?? 'No phone added'}</div>
                    </td>
                    <td className="px-4 py-3 font-mono uppercase text-xs font-semibold text-slate-800">
                      <div>GST: {row.gstin ?? 'Not Registered'}</div>
                      <div className="text-[11px] text-slate-500">PAN: {row.pan ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-900">
                      {row.paymentTermsDays ?? 15} days
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          row.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setEditingRow(row)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Edit Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Onboard Milk Plant / Vendor Supplier</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formState);
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Code *</label>
                  <input
                    required
                    value={formState.supplierCode}
                    onChange={(e) => setFormState({ ...formState, supplierCode: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name *</label>
                  <input
                    required
                    placeholder="e.g. Patna Milk Plant"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    value={formState.contactPerson}
                    onChange={(e) => setFormState({ ...formState, contactPerson: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile No</label>
                  <input
                    value={formState.mobile}
                    onChange={(e) => setFormState({ ...formState, mobile: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    placeholder="10ABCDE1234F1Z5"
                    value={formState.gstin}
                    onChange={(e) => setFormState({ ...formState, gstin: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 uppercase outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Terms (Days)</label>
                  <input
                    type="number"
                    value={formState.paymentTermsDays}
                    onChange={(e) => setFormState({ ...formState, paymentTermsDays: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-xl border border-cyan-600 bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Onboarding...' : 'Confirm Supplier Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Edit Supplier Details</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editingRow.id,
                  payload: {
                    name: editingRow.name,
                    contactPerson: editingRow.contactPerson || undefined,
                    mobile: editingRow.mobile || undefined,
                    paymentTermsDays: Number(editingRow.paymentTermsDays || 15),
                  },
                });
              }}
              className="mt-4 space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name</label>
                <input
                  value={editingRow.name}
                  onChange={(e) => setEditingRow({ ...editingRow, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                <input
                  value={editingRow.contactPerson ?? ''}
                  onChange={(e) => setEditingRow({ ...editingRow, contactPerson: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile No</label>
                <input
                  value={editingRow.mobile ?? ''}
                  onChange={(e) => setEditingRow({ ...editingRow, mobile: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-xl border border-cyan-600 bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
