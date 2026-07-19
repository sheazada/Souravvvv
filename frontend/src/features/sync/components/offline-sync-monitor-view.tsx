'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SyncApi, type SyncEventRow } from '@/features/sync/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function OfflineSyncMonitorView() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'events' | 'conflicts' | 'status'>('events');
  const [deviceIdInput, setDeviceIdInput] = useState('DEVICE-MOB-01');
  const [message, setMessage] = useState<string | null>(null);
  const [resolvingRow, setResolvingRow] = useState<SyncEventRow | null>(null);
  const [strategy, setStrategy] = useState('server_wins');
  const [notes, setNotes] = useState('Server record state retained');

  const eventsQuery = useQuery({
    queryKey: ['sync', 'events'],
    queryFn: () => SyncApi.listEvents({ limit: 30, page: 1 }),
  });

  const conflictsQuery = useQuery({
    queryKey: ['sync', 'conflicts'],
    queryFn: () => SyncApi.listConflicts({ limit: 30, page: 1 }),
  });

  const statusQuery = useQuery({
    queryKey: ['sync', 'device-status', deviceIdInput],
    queryFn: () => SyncApi.getDeviceStatus(deviceIdInput),
    enabled: activeTab === 'status' && Boolean(deviceIdInput),
  });

  const eventRows = eventsQuery.data?.data ?? [];
  const conflictRows = conflictsQuery.data?.data ?? [];
  const statusData = statusQuery.data?.data;

  const resolveMutation = useMutation({
    mutationFn: (data: { id: string; resolutionStrategy: string; resolutionNotes: string }) =>
      SyncApi.resolveConflict(data.id, {
        resolutionStrategy: data.resolutionStrategy,
        resolutionNotes: data.resolutionNotes,
      }),
    onSuccess: (res) => {
      setMessage(`Sync conflict resolved successfully using ${strategy}.`);
      setResolvingRow(null);
      queryClient.invalidateQueries({ queryKey: ['sync'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to resolve conflict'),
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Offline Background Synchronization & Conflict Center</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor PWA offline device events (`SyncEvent`), audit background sync telemetry, and resolve field update conflicts (`server_wins` vs `client_wins`).
          </p>
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
          onClick={() => setActiveTab('events')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'events'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          📱 Synchronized Offline Events ({eventRows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('conflicts')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'conflicts'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          ⚠️ Unresolved Sync Conflicts ({conflictRows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'status'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          🛰️ Device Telemetry & Health Check
        </button>
      </div>

      {activeTab === 'events' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {eventsQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading synchronized offline events...</div>
          ) : eventRows.length === 0 ? (
            <EmptyState
              title="No offline sync events recorded"
              description="Events pushed from offline PWA devices will appear here once synchronized."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Device ID & Entity</th>
                    <th className="px-4 py-3 text-center">Action</th>
                    <th className="px-4 py-3 text-left">Payload Snapshot</th>
                    <th className="px-4 py-3 text-center">Client Timestamp</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {eventRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 font-bold text-slate-950">
                        <div className="font-mono text-cyan-800">{row.deviceId}</div>
                        <div className="text-xs uppercase text-slate-500">{row.entityType}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-800">
                          {row.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 max-w-xs truncate">
                        {JSON.stringify(row.payloadJson)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-700">
                        {new Date(row.clientTimestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                          row.syncStatus === 'processed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.syncStatus === 'conflict'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {row.syncStatus}
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

      {activeTab === 'conflicts' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {conflictsQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading sync conflicts...</div>
          ) : conflictRows.length === 0 ? (
            <EmptyState
              title="Zero unresolved offline conflicts"
              description="All background sync events across all field devices are in full equilibrium."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Device ID & Entity</th>
                    <th className="px-4 py-3 text-center">Action</th>
                    <th className="px-4 py-3 text-left">Conflict Notes</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {conflictRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 font-bold text-slate-950">
                        <div className="font-mono text-rose-700">{row.deviceId}</div>
                        <div className="text-xs uppercase text-slate-500">{row.entityType}</div>
                      </td>
                      <td className="px-4 py-3 text-center uppercase font-bold text-slate-800">
                        {row.action}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs">
                        {row.conflictNotes || 'Stale version update collision detected during offline replay'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold uppercase text-rose-800">
                          {row.syncStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setResolvingRow(row)}
                          className="rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-700"
                        >
                          Resolve Conflict
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'status' && (
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-sm">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Device Telemetry Health Check</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={deviceIdInput}
              onChange={(e) => setDeviceIdInput(e.target.value)}
              placeholder="Enter Device ID (e.g. DEVICE-MOB-01)..."
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 font-mono outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={() => statusQuery.refetch()}
              className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2 font-bold text-white hover:bg-cyan-700"
            >
              Check Health
            </button>
          </div>

          {statusQuery.isLoading ? (
            <div className="text-slate-500">Checking device telemetry...</div>
          ) : statusData ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex justify-between border-b border-slate-200/60 pb-2 font-bold text-slate-950">
                <span>Device ID:</span>
                <span className="font-mono text-cyan-800">{statusData.deviceId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2 text-slate-700">
                <span>Last Sync Timestamp:</span>
                <strong className="text-slate-900">
                  {statusData.lastSyncTimestamp ? new Date(statusData.lastSyncTimestamp).toLocaleString('en-IN') : 'Never Synced'}
                </strong>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2 text-slate-700">
                <span>Pending Queue Count:</span>
                <strong className="text-slate-900">{statusData.pendingEvents} events</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2 text-slate-700">
                <span>Unresolved Conflicts:</span>
                <strong className={statusData.unresolvedConflicts > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                  {statusData.unresolvedConflicts} conflicts
                </strong>
              </div>
              <div className="flex justify-between pt-1 font-bold">
                <span>Overall Device Health:</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs uppercase ${
                  statusData.status === 'in_sync' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {statusData.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* RESOLVE CONFLICT MODAL */}
      {resolvingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Resolve Offline Synchronization Conflict</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                resolveMutation.mutate({ id: resolvingRow.id, resolutionStrategy: strategy, resolutionNotes: notes });
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Strategy *</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500 font-semibold"
                >
                  <option value="server_wins">Server Wins (Retain Server Version)</option>
                  <option value="client_wins">Client Wins (Overwrite with Device Payload)</option>
                  <option value="manual_merge">Manual Merge / Ignore</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Audit Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setResolvingRow(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveMutation.isPending}
                  className="rounded-xl border border-cyan-600 bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {resolveMutation.isPending ? 'Resolving...' : 'Confirm Conflict Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
