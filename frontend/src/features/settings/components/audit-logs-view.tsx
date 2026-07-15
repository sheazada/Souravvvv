'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SettingsApi } from '../api';
import type { AuditLogSummary } from '@/types/settings';
import { ShieldAlert, Search, RefreshCw, FileText, X } from 'lucide-react';

export function AuditLogsView() {
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLogSummary | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit-logs', page, moduleFilter, searchQuery],
    queryFn: () =>
      SettingsApi.getAuditLogs({
        page,
        limit: 15,
        ...(moduleFilter ? { module: moduleFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      }),
  });

  const logs = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 15, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            System Audit Trail
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Immutable tracking of backoffice, procurement, and financial mutations across modules.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Trail
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search action or target entity ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={(e) => {
            setModuleFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">All Modules</option>
          <option value="procurement">Procurement</option>
          <option value="finance">Finance & Billing</option>
          <option value="delivery">Dispatch & Delivery</option>
          <option value="masters">Master Catalog</option>
          <option value="settings">System Settings</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : isError ? (
        <div className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          Failed to load audit trail: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No audit log records found matching filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Module / Entity</th>
                  <th className="py-3.5 px-4">Target ID</th>
                  <th className="py-3.5 px-4">Performed By</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                      {log.action}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 capitalize">
                        {log.module}
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5">{log.entityType}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[120px] truncate">
                      {log.entityId ?? 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      {log.user ? (
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{log.user.fullName}</div>
                          <div className="text-xs text-gray-400 capitalize">{log.user.userType}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">System / Unknown</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-gray-500">
                      {log.ipAddress ?? '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60 rounded transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing page <span className="font-semibold">{meta.page}</span> of <span className="font-semibold">{meta.totalPages}</span> ({meta.total} records)
            </div>
            <div className="flex gap-2">
              <button
                disabled={meta.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Audit Mutation Details
                  <span className="font-mono text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded">
                    {selectedLog.action}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  ID: <span className="font-mono">{selectedLog.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
                <div>
                  <span className="text-gray-400 block">Module</span>
                  <span className="font-semibold uppercase text-gray-800 dark:text-gray-200">{selectedLog.module}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Entity Type</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedLog.entityType}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Entity ID</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200 truncate block">{selectedLog.entityId ?? 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Timestamp</span>
                  <span className="text-gray-800 dark:text-gray-200">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                    Before Mutation
                  </h4>
                  <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto max-h-64 border border-gray-800">
                    {selectedLog.beforeJson ? JSON.stringify(selectedLog.beforeJson, null, 2) : '// No previous payload recorded'}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
                    After Mutation
                  </h4>
                  <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto max-h-64 border border-gray-800">
                    {selectedLog.afterJson ? JSON.stringify(selectedLog.afterJson, null, 2) : '// No after payload recorded'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
