'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PortalApi } from '@/features/portal/api';
import { formatCurrency } from '@/lib/utils/number';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export function PortalOrdersView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const queryKey = useMemo(() => ['portal', 'orders', search, status], [search, status]);
  const query = useQuery({
    queryKey,
    queryFn: () =>
      PortalApi.getOrders({
        page: 1,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
      }),
  });

  const repeatMutation = useMutation({
    mutationFn: (id: string) => PortalApi.repeatOrder(id),
    onSuccess: () => {
      setMessage('Order repeat request created successfully.');
      queryClient.invalidateQueries({ queryKey: ['portal', 'orders'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to repeat order'),
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  const getOrderingModeBadge = (row: typeof rows[0]) => {
    if (row.orderingModeSnapshot === 'assisted' || (row.source !== 'retailer' && row.source !== 'self_service')) {
      return {
        label: 'Assisted Order',
        className: 'bg-purple-100 text-purple-800 border-purple-200',
        title: `Created via assisted ordering by ${row.source}`,
      };
    }
    return {
      label: 'Self-Service',
      className: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      title: 'Created directly by retailer',
    };
  };

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Review self-service orders placed by you or assisted orders created by the office/sales team on your behalf."
      />
      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900 flex items-center justify-between">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}
      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search order no or notes"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="packed">Packed</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
          <option value="partial">Partial / Discrepancy</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setSearch('');
            setStatus('');
          }}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Reset Filters
        </button>
      </div>
      {query.isLoading ? (
        <div className="text-sm text-slate-500">Loading orders...</div>
      ) : query.error ? (
        <EmptyState
          title="Unable to load orders"
          description={query.error instanceof Error ? query.error.message : 'Unknown order error'}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Orders created by you or by office/admin will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Mode & Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Delivery Cycle</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => {
                  const modeBadge = getOrderingModeBadge(row);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-950">{row.orderNo}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(row.orderDate).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${modeBadge.className}`}
                          title={modeBadge.title}
                        >
                          {modeBadge.label}
                        </span>
                        <div className="mt-1 text-xs text-slate-500 capitalize">Source: {row.source}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="font-medium capitalize">{row.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.deliveryCycle?.deliveryDate ? (
                          <div>
                            <div className="font-medium">
                              {new Date(row.deliveryCycle.deliveryDate).toLocaleDateString('en-IN')}
                            </div>
                            <div className="text-xs text-slate-500 capitalize">
                              Shift: {row.deliveryCycle.deliveryShift}
                            </div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatCurrency(Number(row.grandTotal ?? 0))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/portal/orders/${row.id}`}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Open
                          </Link>
                          <button
                            type="button"
                            onClick={() => repeatMutation.mutate(row.id)}
                            className="rounded-lg border border-cyan-300 px-3 py-1.5 text-xs font-medium text-cyan-900 hover:bg-cyan-50"
                          >
                            Repeat
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span>
              Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}
            </span>
            <span>{meta?.total ?? rows.length} orders</span>
          </div>
        </div>
      )}
    </div>
  );
}
