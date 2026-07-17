'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { VehiclesApi, type VehicleRow } from '@/features/vehicles/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function VehicleListView() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    vehicleNo: `BR-01-GA-${Math.floor(1000 + Math.random() * 9000)}`,
    vehicleType: 'Insulated Van',
    capacityCrates: '150',
    capacityWeightKg: '1500',
    fuelType: 'Diesel',
    ownershipType: 'Owned',
  });

  const query = useQuery({
    queryKey: ['vehicles', 'list', searchQuery],
    queryFn: () => VehiclesApi.list({ search: searchQuery, limit: 30, page: 1 }),
  });

  const rows = query.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof formState) =>
      VehiclesApi.create({
        vehicleNo: data.vehicleNo,
        vehicleType: data.vehicleType,
        capacityCrates: Number(data.capacityCrates || 150),
        capacityWeightKg: Number(data.capacityWeightKg || 1500),
        fuelType: data.fuelType,
        ownershipType: data.ownershipType,
      }),
    onSuccess: (res) => {
      setMessage(`Vehicle '${res.data?.vehicleNo}' registered successfully.`);
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to register vehicle'),
  });

  const statusMutation = useMutation({
    mutationFn: (data: { id: string; isActive: boolean }) =>
      VehiclesApi.updateStatus(data.id, data.isActive),
    onSuccess: (res) => {
      setMessage(`Vehicle '${res.data?.vehicleNo}' status updated to ${res.data?.isActive ? 'Active' : 'Maintenance/Inactive'}.`);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to update status'),
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Fleet & Vehicle Master Directory</h1>
          <p className="mt-1 text-sm text-slate-600">
            Register delivery vans, insulated trucks, crate capacities (`capacityCrates`), and maintenance availability.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm"
        >
          + Register New Vehicle
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
          placeholder="Search vehicles by number or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {query.isLoading ? (
          <div className="text-sm text-slate-500">Loading fleet...</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No delivery vehicles registered"
            description="Click '+ Register New Vehicle' above to add delivery vans and trucks."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">Registration / Vehicle No</th>
                  <th className="px-4 py-3 text-left">Type & Ownership</th>
                  <th className="px-4 py-3 text-center">Crate Capacity</th>
                  <th className="px-4 py-3 text-center">Weight Limit (Kg)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/75">
                    <td className="px-4 py-3 font-bold font-mono text-slate-950">{row.vehicleNo}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-semibold">{row.vehicleType ?? 'Insulated Van'}</div>
                      <div className="text-xs text-slate-500">{row.ownershipType ?? 'Owned'} • {row.fuelType ?? 'Diesel'}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-cyan-800">{row.capacityCrates ?? 150} crates</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-800">{row.capacityWeightKg ?? 1500} kg</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          row.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {row.isActive ? 'Active' : 'Maintenance'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => statusMutation.mutate({ id: row.id, isActive: !row.isActive })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm ${
                          row.isActive ? 'border border-amber-300 bg-amber-50 text-amber-900' : 'border border-emerald-300 bg-emerald-50 text-emerald-900'
                        }`}
                      >
                        {row.isActive ? 'Send to Maintenance' : 'Mark Active'}
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
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Register Delivery Vehicle</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formState);
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registration / Vehicle No *</label>
                <input
                  required
                  placeholder="BR-01-GA-1234"
                  value={formState.vehicleNo}
                  onChange={(e) => setFormState({ ...formState, vehicleNo: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Type</label>
                  <select
                    value={formState.vehicleType}
                    onChange={(e) => setFormState({ ...formState, vehicleType: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="Insulated Van">Insulated Van</option>
                    <option value="Mini Truck">Mini Truck</option>
                    <option value="Refrigerated Truck">Refrigerated Truck</option>
                    <option value="3-Wheeler Loader">3-Wheeler Loader</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ownership</label>
                  <select
                    value={formState.ownershipType}
                    onChange={(e) => setFormState({ ...formState, ownershipType: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="Owned">Company Owned</option>
                    <option value="Leased">Leased / Contract</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Crate Capacity *</label>
                  <input
                    required
                    type="number"
                    value={formState.capacityCrates}
                    onChange={(e) => setFormState({ ...formState, capacityCrates: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payload Weight (Kg) *</label>
                  <input
                    required
                    type="number"
                    value={formState.capacityWeightKg}
                    onChange={(e) => setFormState({ ...formState, capacityWeightKg: e.target.value })}
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
                  {createMutation.isPending ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
