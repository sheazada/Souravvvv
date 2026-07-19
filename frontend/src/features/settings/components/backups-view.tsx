'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { BackupsApi, type BackupRow } from '@/features/settings/api-backups';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function BackupsView() {
  const queryClient = useQueryClient();
  const [backupName, setBackupName] = useState('Manual Admin Snapshot');
  const [targetStorage, setTargetStorage] = useState('AWS S3 (ap-south-1) Encrypted Bucket');
  const [message, setMessage] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['settings', 'backups'],
    queryFn: () => BackupsApi.list(),
  });

  const rows = query.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => BackupsApi.create({ backupName, targetStorage }),
    onSuccess: (res) => {
      setMessage(`Backup snapshot '${res.data?.backupName}' created successfully (${res.data?.fileName}).`);
      queryClient.invalidateQueries({ queryKey: ['settings', 'backups'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to create backup'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => BackupsApi.restore(id),
    onSuccess: (res) => {
      setMessage(res.message || 'Database restored successfully from snapshot!');
      setRestoringId(null);
      queryClient.invalidateQueries({ queryKey: ['settings', 'backups'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to restore backup'),
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Database Backup & Disaster Recovery Scheduler</h1>
          <p className="mt-1 text-sm text-slate-600">
            Automated PostgreSQL (`pg_dump`) backup snapshots uploaded to cloud storage (`AWS S3 / Cloudflare R2`) with 1-click restore simulation.
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

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 text-sm md:col-span-1">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Generate Manual Snapshot</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Backup Name</label>
            <input
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Cloud Storage</label>
            <select
              value={targetStorage}
              onChange={(e) => setTargetStorage(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
            >
              <option value="AWS S3 (ap-south-1) Encrypted Bucket">AWS S3 (ap-south-1) Encrypted Bucket</option>
              <option value="Cloudflare R2 Object Storage">Cloudflare R2 Object Storage</option>
              <option value="Local Server Disk (/var/backups/sql/)">Local Server Disk (/var/backups/sql/)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="w-full rounded-xl border border-cyan-600 bg-cyan-600 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50 shadow-sm"
          >
            {createMutation.isPending ? 'Compressing & Uploading...' : '💾 Generate Backup Snapshot'}
          </button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Historical Backup Archives</h2>
          {query.isLoading ? (
            <div className="text-sm text-slate-500">Loading archives...</div>
          ) : rows.length === 0 ? (
            <EmptyState title="No backup archives found" description="Click 'Generate Backup Snapshot' to create your first archive." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Snapshot Name & File</th>
                    <th className="px-4 py-3 text-left">Storage Location</th>
                    <th className="px-4 py-3 text-right">Size</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 font-bold text-slate-950">
                        <div>{row.backupName || 'Database Snapshot'}</div>
                        <div className="text-xs font-mono text-cyan-700">{row.fileName}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs font-medium">
                        {row.targetStorage || 'AWS S3 / Cloudflare R2'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                        {row.sizeBytes ? `${(Number(row.sizeBytes) / (1024 * 1024)).toFixed(2)} MB` : '4.6 MB'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setRestoringId(row.id)}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* RESTORE CONFIRMATION MODAL */}
      {restoringId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-rose-700">⚠️ Confirm Database Restore</h2>
            <p className="mt-2 text-sm text-slate-700">
              Are you sure you want to restore the PostgreSQL database using this snapshot? All uncommitted transactions after this snapshot's timestamp will be replaced by the archived state.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRestoringId(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => restoreMutation.mutate(restoringId)}
                disabled={restoreMutation.isPending}
                className="rounded-xl border border-rose-600 bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {restoreMutation.isPending ? 'Restoring Database...' : 'Confirm & Execute Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
