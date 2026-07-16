'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { NotificationsApi } from '@/features/notifications/api';
import type { NotificationLogFilters, NotificationTemplateFilters } from '@/types/notifications';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

const DEFAULT_LOG_FILTERS: NotificationLogFilters = {
  page: 1,
  limit: 20,
  search: '',
  channel: '',
  status: '',
  eventKey: '',
};

const DEFAULT_TEMPLATE_FILTERS: NotificationTemplateFilters = {
  page: 1,
  limit: 20,
  search: '',
  channel: '',
  eventKey: '',
  isActive: '',
};

export function NotificationCenterView() {
  const routeMeta = getAdminRouteMeta('notifications');
  const queryClient = useQueryClient();
  const [logFilters, setLogFilters] = useState<NotificationLogFilters>(DEFAULT_LOG_FILTERS);
  const [templateFilters, setTemplateFilters] = useState<NotificationTemplateFilters>(DEFAULT_TEMPLATE_FILTERS);
  const [message, setMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    eventKey: 'order.approved',
    channel: 'whatsapp',
    recipientMobile: '9876543210',
    referenceType: 'test_alert',
    orderNo: 'SO-20260716-TEST',
    grandTotal: '15000',
  });

  const [logsQuery, templatesQuery] = useQueries({
    queries: [
      {
        queryKey: ['notification-logs', logFilters],
        queryFn: () => NotificationsApi.getLogs(logFilters),
      },
      {
        queryKey: ['notification-templates', templateFilters],
        queryFn: () => NotificationsApi.getTemplates(templateFilters),
      },
    ],
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => NotificationsApi.retryLog(id),
    onSuccess: () => {
      setMessage('Notification retry simulated successfully.');
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to retry notification');
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: (data: typeof dispatchForm) =>
      NotificationsApi.dispatch({
        eventKey: data.eventKey,
        channel: data.channel,
        recipientMobile: data.recipientMobile,
        referenceType: data.referenceType,
        payload: {
          orderNo: data.orderNo,
          grandTotal: data.grandTotal,
          invoiceNo: data.orderNo.replace('SO-', 'INV-'),
          currentOutstanding: '24500',
          creditLimit: '50000',
        },
      }),
    onSuccess: (res) => {
      setMessage(`Test alert '${dispatchForm.eventKey}' dispatched via ${dispatchForm.channel.toUpperCase()}. Provider ID: ${res.data?.providerMessageId ?? 'sent'}`);
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to dispatch alert');
    },
  });

  const logs = logsQuery.data?.data ?? [];
  const logMeta = logsQuery.data?.meta;
  const templates = templatesQuery.data?.data ?? [];
  const templateMeta = templatesQuery.data?.meta;

  const logStats = useMemo(() => {
    return {
      total: logMeta?.total ?? logs.length,
      sent: logs.filter((log) => log.status === 'sent').length,
      queued: logs.filter((log) => log.status === 'queued').length,
      failed: logs.filter((log) => log.status === 'failed').length,
    };
  }, [logs, logMeta]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{routeMeta.pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-600">{routeMeta.pageDescription}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 shadow-sm"
        >
          Trigger Test Alert / Dispatch
        </button>
      </div>

      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 flex items-center justify-between">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Logs" value={logStats.total} />
        <KpiCard label="Sent" value={logStats.sent} />
        <KpiCard label="Queued" value={logStats.queued} />
        <KpiCard label="Failed" value={logStats.failed} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Notification Logs</h2>
              <p className="text-sm text-slate-500">Track outgoing alerts, WhatsApp messages, reminders, and failures.</p>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <input
              value={logFilters.search ?? ''}
              onChange={(event) => setLogFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
              placeholder="Search event, mobile, provider id"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            />
            <select
              value={logFilters.channel ?? ''}
              onChange={(event) => setLogFilters((current) => ({ ...current, channel: event.target.value, page: 1 }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            >
              <option value="">All channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="in_app">In App</option>
            </select>
            <select
              value={logFilters.status ?? ''}
              onChange={(event) => setLogFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            >
              <option value="">All statuses</option>
              <option value="sent">Sent</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
            </select>
            <button
              type="button"
              onClick={() => setLogFilters(DEFAULT_LOG_FILTERS)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset Filters
            </button>
          </div>

          {logsQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading notification logs...</div>
          ) : logsQuery.error ? (
            <EmptyState
              title="Unable to load notification logs"
              description={logsQuery.error instanceof Error ? logsQuery.error.message : 'Unknown notification log error'}
            />
          ) : logs.length === 0 ? (
            <EmptyState title="No notification logs found" description="Notification delivery history will appear here once events are triggered." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Event</th>
                      <th className="px-4 py-3 font-medium">Channel</th>
                      <th className="px-4 py-3 font-medium">Recipient</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Sent At</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-950">{log.eventKey}</div>
                          <div className="text-xs text-slate-500">{log.template?.languageCode ?? 'n/a'} • {log.providerMessageId ?? 'No provider id'}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{log.channel}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{log.recipientUser?.fullName ?? log.recipientMobile ?? 'Unknown recipient'}</div>
                          <div className="text-xs text-slate-500">{log.recipientMobile ?? log.recipientUser?.mobile ?? '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800 capitalize">
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {log.sentAt ? new Date(log.sentAt).toLocaleString('en-IN') : 'Not sent'}
                        </td>
                        <td className="px-4 py-3">
                          {log.status === 'failed' ? (
                            <button
                              type="button"
                              onClick={() => retryMutation.mutate(log.id)}
                              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-50"
                            >
                              Retry
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>
                  Page {logMeta?.page ?? 1} of {logMeta?.totalPages ?? 1}
                </span>
                <span>{logMeta?.total ?? logs.length} logs</span>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Notification Templates</h2>
            <p className="text-sm text-slate-500">Review the active message templates used for WhatsApp, SMS, and in-app alerts.</p>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <input
              value={templateFilters.search ?? ''}
              onChange={(event) => setTemplateFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
              placeholder="Search template content"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            />
            <select
              value={templateFilters.channel ?? ''}
              onChange={(event) => setTemplateFilters((current) => ({ ...current, channel: event.target.value, page: 1 }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            >
              <option value="">All channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="in_app">In App</option>
            </select>
            <button
              type="button"
              onClick={() => setTemplateFilters(DEFAULT_TEMPLATE_FILTERS)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset Filters
            </button>
          </div>

          {templatesQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading templates...</div>
          ) : templatesQuery.error ? (
            <EmptyState
              title="Unable to load notification templates"
              description={templatesQuery.error instanceof Error ? templatesQuery.error.message : 'Unknown template error'}
            />
          ) : templates.length === 0 ? (
            <EmptyState title="No templates found" description="Notification templates will appear here when configured." />
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-950">{template.eventKey}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {template.channel} • {template.languageCode} • {template.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-700">
                      {template.channel}
                    </span>
                  </div>
                  <div className="mt-3 rounded-lg bg-white p-3 text-slate-700 font-mono text-xs">
                    {template.templateText}
                  </div>
                </div>
              ))}
              <div className="pt-2 text-xs text-slate-500">
                Showing {templates.length} of {templateMeta?.total ?? templates.length} templates.
              </div>
            </div>
          )}
        </section>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-950">Dispatch Test Alert / Manual Event</h2>
            <p className="mt-1 text-xs text-slate-500">Simulate or trigger an outgoing event alert via WhatsApp, SMS, or Email.</p>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Event Key</label>
                <select
                  value={dispatchForm.eventKey}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, eventKey: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                >
                  <option value="order.approved">order.approved (Sales Order Approval)</option>
                  <option value="invoice.posted">invoice.posted (Sales Invoice Posted)</option>
                  <option value="order.blocked_by_credit">order.blocked_by_credit (Credit Limit Block)</option>
                  <option value="delivery.completed">delivery.completed (Delivery Route Completed)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Channel</label>
                  <select
                    value={dispatchForm.channel}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, channel: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Recipient Mobile</label>
                  <input
                    value={dispatchForm.recipientMobile}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, recipientMobile: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Order / Invoice No</label>
                  <input
                    value={dispatchForm.orderNo}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, orderNo: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Grand Total (₹)</label>
                  <input
                    value={dispatchForm.grandTotal}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, grandTotal: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => dispatchMutation.mutate(dispatchForm)}
                disabled={dispatchMutation.isPending}
                className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50 shadow-sm"
              >
                {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch Alert Now'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
