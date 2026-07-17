'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { RoutesApi, type AreaRow, type RouteRow } from '@/features/routes/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function RouteListView() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'routes' | 'areas'>('routes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [routeForm, setRouteForm] = useState({
    code: `RT-${Math.floor(10 + Math.random() * 90)}`,
    name: 'Patna Central Route',
    deliveryShift: 'morning',
    defaultCutoffTime: '20:00',
  });

  const [areaForm, setAreaForm] = useState({
    code: `AR-${Math.floor(10 + Math.random() * 90)}`,
    name: 'Boring Road Zone',
    city: 'Patna',
    state: 'Bihar',
  });

  const routesQuery = useQuery({
    queryKey: ['routes', 'list', searchQuery],
    queryFn: () => RoutesApi.list({ search: searchQuery, limit: 30, page: 1 }),
  });

  const areasQuery = useQuery({
    queryKey: ['areas', 'list', searchQuery],
    queryFn: () => RoutesApi.listAreas({ search: searchQuery, limit: 30, page: 1 }),
  });

  const routeRows = routesQuery.data?.data ?? [];
  const areaRows = areasQuery.data?.data ?? [];

  const createRouteMutation = useMutation({
    mutationFn: (data: typeof routeForm) =>
      RoutesApi.create({
        code: data.code,
        name: data.name,
        deliveryShift: data.deliveryShift,
        defaultCutoffTime: data.defaultCutoffTime,
      }),
    onSuccess: (res) => {
      setMessage(`Route '${res.data?.name}' created successfully.`);
      setIsRouteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to create route'),
  });

  const createAreaMutation = useMutation({
    mutationFn: (data: typeof areaForm) =>
      RoutesApi.createArea({
        code: data.code,
        name: data.name,
        city: data.city,
        state: data.state,
      }),
    onSuccess: (res) => {
      setMessage(`Area zone '${res.data?.name}' created successfully.`);
      setIsAreaModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to create area'),
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Delivery Routes & Geographical Zones Master</h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure delivery shift times (`morning`/`evening`), order cutoffs (`cutoffAt`), and geographic dispatch areas (`Area`).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsRouteModalOpen(true)}
            className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm"
          >
            + Create New Route
          </button>
          <button
            type="button"
            onClick={() => setIsAreaModalOpen(true)}
            className="rounded-xl border border-slate-300 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-900 shadow-sm"
          >
            + Create New Area Zone
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 flex items-center justify-between shadow-sm">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('routes')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'routes'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Delivery Routes ({routeRows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('areas')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'areas'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Geographic Area Zones ({areaRows.length})
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search routes or areas by name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
      </div>

      {activeTab === 'routes' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {routesQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading routes...</div>
          ) : routeRows.length === 0 ? (
            <EmptyState
              title="No delivery routes configured"
              description="Click '+ Create New Route' above to register morning and evening delivery routes."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Route Code & Name</th>
                    <th className="px-4 py-3 text-center">Delivery Shift</th>
                    <th className="px-4 py-3 text-center">Order Cut-off Time</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {routeRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 font-bold text-slate-950">
                        <div>{row.name}</div>
                        <div className="text-xs font-mono text-cyan-700">{row.code}</div>
                      </td>
                      <td className="px-4 py-3 text-center uppercase font-semibold text-slate-800">
                        {row.deliveryShift ?? 'morning'}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-rose-700">
                        {row.defaultCutoffTime ?? '20:00'} hrs
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'areas' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {areasQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading area zones...</div>
          ) : areaRows.length === 0 ? (
            <EmptyState
              title="No geographic zones configured"
              description="Click '+ Create New Area Zone' above to register delivery localities and cities."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Area Code & Zone Name</th>
                    <th className="px-4 py-3 text-left">City & State</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {areaRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 font-bold text-slate-950">
                        <div>{row.name}</div>
                        <div className="text-xs font-mono text-cyan-700">{row.code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {row.city ?? 'Patna'}, {row.state ?? 'Bihar'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* CREATE ROUTE MODAL */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Create New Delivery Route</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createRouteMutation.mutate(routeForm);
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Route Code *</label>
                  <input
                    required
                    value={routeForm.code}
                    onChange={(e) => setRouteForm({ ...routeForm, code: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 uppercase outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Shift *</label>
                  <select
                    value={routeForm.deliveryShift}
                    onChange={(e) => setRouteForm({ ...routeForm, deliveryShift: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="morning">Morning Shift (05:00 AM)</option>
                    <option value="evening">Evening Shift (04:00 PM)</option>
                    <option value="both">Both Shifts</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Route Name *</label>
                <input
                  required
                  value={routeForm.name}
                  onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Order Cut-off Time (HH:MM) *</label>
                <input
                  required
                  placeholder="20:00"
                  value={routeForm.defaultCutoffTime}
                  onChange={(e) => setRouteForm({ ...routeForm, defaultCutoffTime: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono outline-none focus:border-cyan-500"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRouteModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRouteMutation.isPending}
                  className="rounded-xl border border-cyan-600 bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {createRouteMutation.isPending ? 'Creating...' : 'Confirm Route Creation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE AREA MODAL */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Create Geographic Area Zone</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createAreaMutation.mutate(areaForm);
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Area Code *</label>
                  <input
                    required
                    value={areaForm.code}
                    onChange={(e) => setAreaForm({ ...areaForm, code: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 uppercase outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    required
                    value={areaForm.city}
                    onChange={(e) => setAreaForm({ ...areaForm, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Zone / Locality Name *</label>
                <input
                  required
                  value={areaForm.name}
                  onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAreaModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAreaMutation.isPending}
                  className="rounded-xl border border-slate-800 bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  {createAreaMutation.isPending ? 'Creating...' : 'Confirm Area Zone Creation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
