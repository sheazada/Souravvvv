'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { EmployeesApi, type EmployeeRow } from '@/features/employees/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function EmployeeListView() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<EmployeeRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    employeeCode: `EMP-${Math.floor(100 + Math.random() * 900)}`,
    fullName: '',
    designation: 'driver',
    mobile: '',
    email: '',
    drivingLicenseNo: '',
  });

  const query = useQuery({
    queryKey: ['employees', 'list', searchQuery],
    queryFn: () => EmployeesApi.list({ search: searchQuery, limit: 30, page: 1 }),
  });

  const rows = query.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof formState) =>
      EmployeesApi.create({
        employeeCode: data.employeeCode,
        fullName: data.fullName,
        designation: data.designation,
        mobile: data.mobile || undefined,
        email: data.email || undefined,
        drivingLicenseNo: data.drivingLicenseNo || undefined,
      }),
    onSuccess: (res) => {
      setMessage(`Employee '${res.data?.fullName}' onboarded successfully.`);
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to onboard employee'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: Record<string, any> }) =>
      EmployeesApi.update(data.id, data.payload),
    onSuccess: (res) => {
      setMessage(`Employee '${res.data?.fullName}' updated.`);
      setEditingRow(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to update employee'),
  });

  const statusMutation = useMutation({
    mutationFn: (data: { id: string; isActive: boolean }) =>
      EmployeesApi.updateStatus(data.id, data.isActive),
    onSuccess: (res) => {
      setMessage(`Employee status updated.`);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to update status'),
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Employee & Driver HR Directory</h1>
          <p className="mt-1 text-sm text-slate-600">
            Register delivery drivers, field salespersons, warehouse loaders, and driving license records (`drivingLicenseNo`).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm"
        >
          + Onboard New Employee
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
          placeholder="Search staff by name, code, phone, or license..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {query.isLoading ? (
          <div className="text-sm text-slate-500">Loading staff directory...</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No staff members found"
            description="Click '+ Onboard New Employee' above to register drivers and sales reps."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">Code & Full Name</th>
                  <th className="px-4 py-3 text-left">Designation</th>
                  <th className="px-4 py-3 text-left">Contact Info</th>
                  <th className="px-4 py-3 text-left">Driving License / Info</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/75">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-950">{row.fullName}</div>
                      <div className="text-xs font-mono text-cyan-700">{row.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3 capitalize font-semibold text-slate-800">
                      {row.designation ?? 'Staff Member'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{row.mobile ?? '—'}</div>
                      <div className="text-xs text-slate-500">{row.email ?? 'No email'}</div>
                    </td>
                    <td className="px-4 py-3 font-mono uppercase text-xs font-semibold text-slate-800">
                      {row.drivingLicenseNo ?? '—'}
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
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingRow(row)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => statusMutation.mutate({ id: row.id, isActive: !row.isActive })}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm ${
                            row.isActive ? 'border border-amber-300 bg-amber-50 text-amber-900' : 'border border-emerald-300 bg-emerald-50 text-emerald-900'
                          }`}
                        >
                          {row.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
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
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Onboard Staff / Driver Member</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formState);
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Code *</label>
                  <input
                    required
                    value={formState.employeeCode}
                    onChange={(e) => setFormState({ ...formState, employeeCode: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation *</label>
                  <select
                    value={formState.designation}
                    onChange={(e) => setFormState({ ...formState, designation: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="driver">Delivery Driver</option>
                    <option value="salesperson">Field Sales Executive</option>
                    <option value="loader">Warehouse Loader</option>
                    <option value="accountant">Accountant</option>
                    <option value="manager">Operations Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={formState.fullName}
                  onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    placeholder="9876543210"
                    value={formState.mobile}
                    onChange={(e) => setFormState({ ...formState, mobile: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Driving License No (If Driver)</label>
                  <input
                    placeholder="BR-01-20180012345"
                    value={formState.drivingLicenseNo}
                    onChange={(e) => setFormState({ ...formState, drivingLicenseNo: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 uppercase outline-none focus:border-cyan-500"
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
                  {createMutation.isPending ? 'Onboarding...' : 'Confirm Employee Onboarding'}
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
            <h2 className="text-lg font-bold text-slate-900">Edit Employee Details</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editingRow.id,
                  payload: {
                    fullName: editingRow.fullName,
                    designation: editingRow.designation || undefined,
                    mobile: editingRow.mobile || undefined,
                    drivingLicenseNo: editingRow.drivingLicenseNo || undefined,
                  },
                });
              }}
              className="mt-4 space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  value={editingRow.fullName}
                  onChange={(e) => setEditingRow({ ...editingRow, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    value={editingRow.designation ?? ''}
                    onChange={(e) => setEditingRow({ ...editingRow, designation: e.target.value })}
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
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Driving License No</label>
                <input
                  value={editingRow.drivingLicenseNo ?? ''}
                  onChange={(e) => setEditingRow({ ...editingRow, drivingLicenseNo: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 uppercase outline-none focus:border-cyan-500"
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
