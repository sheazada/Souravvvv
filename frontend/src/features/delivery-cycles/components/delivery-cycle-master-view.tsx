'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { DeliveryCyclesApi } from '@/features/delivery-cycles/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function DeliveryCycleMasterView() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'cycles' | 'rules'>('cycles');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [cycleForm, setCycleForm] = useState({
    cycleCode: `CYC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-M`,
    orderDate: new Date().toISOString().slice(0, 10),
    deliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    deliveryShift: 'morning',
    cutoffAt: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
  });

  const [rulesForm, setRulesForm] = useState({
    morningCutoffHour: 20,
    morningCutoffMinute: 0,
    eveningCutoffHour: 11,
    eveningCutoffMinute: 30,
  });

  const cyclesQuery = useQuery({
    queryKey: ['delivery-cycles', 'list', searchQuery],
    queryFn: () => DeliveryCyclesApi.list({ search: searchQuery, limit: 30, page: 1 }),
  });

  const rulesQuery = useQuery({
    queryKey: ['delivery-cycles', 'rules'],
    queryFn: () => DeliveryCyclesApi.getCutoffRules(),
  });

  const rows = cyclesQuery.data?.data ?? [];
  const cutoffRules = rulesQuery.data?.data ?? rulesForm;

  const createMutation = useMutation({
    mutationFn: (data: typeof cycleForm) => DeliveryCyclesApi.create(data),
    onSuccess: (res) => {
      setMessage(`Delivery cycle '${res.data?.cycleCode}' configured successfully.`);
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['delivery-cycles'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to create cycle'),
  });

  const rulesMutation = useMutation({
    mutationFn: (data: typeof rulesForm) => DeliveryCyclesApi.updateCutoffRules(data),
    onSuccess: () => {
      setMessage('Order cutoff shift rules updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['delivery-cycles', 'rules'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to update rules'),
  });

  const resolveMutation = useMutation({
    mutationFn: () => DeliveryCyclesApi.resolveActiveCycles(),
    onSuccess: (res) => {
      setMessage(`Resolved & auto-closed ${res.data?.resolvedCount || 0} active delivery cycles past cutoff.`);
      queryClient.invalidateQueries({ queryKey: ['delivery-cycles'] });
    },
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Delivery Cycles & Cut-off Management Master</h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure daily dispatch shift windows (`morning`/`evening`), enforce order cutoff times (`cutoffAt`), and resolve shift closures.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => resolveMutation.mutate()}
            disabled={resolveMutation.isPending}
            className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-600 shadow-sm disabled:opacity-50"
          >
            {resolveMutation.isPending ? 'Resolving...' : '⚡ Resolve & Auto-Close Expired Shifts'}
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm"
          >
            + Configure New Cycle Window
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
          onClick={() => setActiveTab('cycles')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'cycles'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Delivery Cycles ({rows.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('rules');
            if (cutoffRules) setRulesForm(cutoffRules);
          }}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'rules'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Order Cut-off Shift Configuration
        </button>
      </div>

      {activeTab === 'cycles' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {cyclesQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading delivery cycles...</div>
          ) : rows.length === 0 ? (
            <EmptyState title="No delivery cycles configured" description="Click '+ Configure New Cycle Window' above to create morning/evening cycles." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Cycle Code & Shift</th>
                    <th className="px-4 py-3 text-left">Order Date</th>
                    <th className="px-4 py-3 text-left">Delivery Date</th>
                    <th className="px-4 py-3 text-left">Cutoff Timestamp</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 font-bold text-slate-950">
                        <div>{row.cycleCode}</div>
                        <div className="text-xs uppercase font-semibold text-cyan-700">{row.deliveryShift}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{new Date(row.orderDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{new Date(row.deliveryDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 font-mono font-bold text-rose-700">{new Date(row.cutoffAt).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          row.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {row.status}
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

      {activeTab === 'rules' && (
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-sm">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Shift Order Cut-off Rules (`SystemSetting`)</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              rulesMutation.mutate(rulesForm);
            }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs">Morning Shift Cutoff (Next Day Delivery)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cutoff Hour (24-Hr format)</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={rulesForm.morningCutoffHour}
                    onChange={(e) => setRulesForm({ ...rulesForm, morningCutoffHour: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cutoff Minute</label>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={rulesForm.morningCutoffMinute}
                    onChange={(e) => setRulesForm({ ...rulesForm, morningCutoffMinute: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs">Evening Shift Cutoff (Same Day Delivery)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cutoff Hour (24-Hr format)</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={rulesForm.eveningCutoffHour}
                    onChange={(e) => setRulesForm({ ...rulesForm, eveningCutoffHour: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cutoff Minute</label>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={rulesForm.eveningCutoffMinute}
                    onChange={(e) => setRulesForm({ ...rulesForm, eveningCutoffMinute: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={rulesMutation.isPending}
                className="rounded-xl border border-cyan-600 bg-cyan-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm disabled:opacity-50"
              >
                {rulesMutation.isPending ? 'Updating Rules...' : '💾 Save Shift Cutoff Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE CYCLE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Configure Delivery Shift Window</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(cycleForm);
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cycle Code *</label>
                <input
                  required
                  value={cycleForm.cycleCode}
                  onChange={(e) => setCycleForm({ ...cycleForm, cycleCode: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Order Date *</label>
                  <input
                    type="date"
                    required
                    value={cycleForm.orderDate}
                    onChange={(e) => setCycleForm({ ...cycleForm, orderDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Date *</label>
                  <input
                    type="date"
                    required
                    value={cycleForm.deliveryDate}
                    onChange={(e) => setCycleForm({ ...cycleForm, deliveryDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Shift *</label>
                <select
                  value={cycleForm.deliveryShift}
                  onChange={(e) => setCycleForm({ ...cycleForm, deliveryShift: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                >
                  <option value="morning">Morning Shift (05:00 AM)</option>
                  <option value="evening">Evening Shift (04:00 PM)</option>
                  <option value="both">Both Shifts</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cutoff Timestamp (ISO) *</label>
                <input
                  type="text"
                  required
                  value={cycleForm.cutoffAt}
                  onChange={(e) => setCycleForm({ ...cycleForm, cutoffAt: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-cyan-500"
                />
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
                  {createMutation.isPending ? 'Configuring...' : 'Confirm Delivery Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
