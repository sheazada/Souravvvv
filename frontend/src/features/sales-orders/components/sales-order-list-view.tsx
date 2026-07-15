'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { LookupInput } from '@/components/ui/lookup-input';
import { SalesOrdersApi } from '@/features/sales-orders/api';
import { formatCurrency } from '@/lib/utils/number';
import type {
  AssistedSalesOrderPayload,
  SalesOrderListFilters,
} from '@/types/sales-orders';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

const DEFAULT_FILTERS: SalesOrderListFilters = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
  source: '',
};

const DEFAULT_FORM: AssistedSalesOrderPayload = {
  retailerId: '',
  source: 'admin',
  requestedDeliveryDate: new Date().toISOString().slice(0, 10),
  notes: '',
  items: [{ variantId: '', qty: 1, remarks: '' }],
};

export function SalesOrderListView() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<SalesOrderListFilters>(DEFAULT_FILTERS);
  const [form, setForm] = useState<AssistedSalesOrderPayload>(DEFAULT_FORM);
  const [message, setMessage] = useState<string | null>(null);

  const queryKey = useMemo(() => ['sales-orders', filters], [filters]);

  const salesOrdersQuery = useQuery({
    queryKey,
    queryFn: () => SalesOrdersApi.list(filters),
  });


  const createAssistedMutation = useMutation({
    mutationFn: (payload: AssistedSalesOrderPayload) => SalesOrdersApi.createAssisted(payload),
    onSuccess: () => {
      setMessage('Assisted sales order created successfully.');
      setForm(DEFAULT_FORM);
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to create assisted sales order');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => SalesOrdersApi.approve(id, 'Approved from frontend list'),
    onSuccess: () => {
      setMessage('Sales order approved successfully.');
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to approve sales order');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => SalesOrdersApi.cancel(id, 'Cancelled from frontend list'),
    onSuccess: () => {
      setMessage('Sales order cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to cancel sales order');
    },
  });

  function updateItem(index: number, patch: Partial<AssistedSalesOrderPayload['items'][number]>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addItemRow() {
    setForm((current) => ({
      ...current,
      items: [...current.items, { variantId: '', qty: 1, remarks: '' }],
    }));
  }

  function removeItemRow(index: number) {
    setForm((current) => ({
      ...current,
      items:
        current.items.length > 1
          ? current.items.filter((_, itemIndex) => itemIndex !== index)
          : current.items,
    }));
  }

  async function submitAssistedOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const filteredItems = form.items.filter(
      (item) => item.variantId.trim() && Number(item.qty) > 0,
    );

    if (!form.retailerId) {
      setMessage('Please select a retailer.');
      return;
    }

    if (!filteredItems.length) {
      setMessage('Please add at least one valid item.');
      return;
    }

    await createAssistedMutation.mutateAsync({
      ...form,
      items: filteredItems,
    });
  }

  const orderRows = salesOrdersQuery.data?.data ?? [];
  const orderMeta = salesOrdersQuery.data?.meta;

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        description="Review retailer orders and create assisted orders on behalf of shops that order through the office."
      />

      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <input
              value={filters.search ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
              placeholder="Search order no or note"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            />

            <select
              value={filters.status ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="packed">Packed</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="partial">Partial</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filters.source ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value, page: 1 }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            >
              <option value="">All sources</option>
              <option value="retailer">Retailer</option>
              <option value="admin">Admin</option>
              <option value="salesperson">Salesperson</option>
              <option value="import">Import</option>
            </select>

            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset Filters
            </button>
          </div>

          {salesOrdersQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading sales orders...</div>
          ) : salesOrdersQuery.error ? (
            <EmptyState
              title="Unable to load sales orders"
              description={salesOrdersQuery.error instanceof Error ? salesOrdersQuery.error.message : 'Unknown sales order error'}
            />
          ) : orderRows.length === 0 ? (
            <EmptyState title="No sales orders found" description="Create assisted orders or wait for retailer orders to appear here." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Order</th>
                      <th className="px-4 py-3 font-medium">Retailer</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Delivery Cycle</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {orderRows.map((order) => (
                      <tr key={order.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-950">{order.orderNo}</div>
                          <div className="text-xs text-slate-500">{new Date(order.orderDate).toLocaleString('en-IN')}</div>
                          {order.notes ? <div className="mt-1 text-xs text-slate-500">{order.notes}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium">{order.retailer?.shopName ?? order.retailerId}</div>
                          <div className="text-xs text-slate-500">{order.retailer?.retailerCode ?? '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                            {order.source}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{order.deliveryCycle?.cycleCode ?? order.deliveryCycleId}</div>
                          <div className="text-xs text-slate-500">{order.deliveryCycle?.deliveryDate ? new Date(order.deliveryCycle.deliveryDate).toLocaleDateString('en-IN') : '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(order.grandTotal ?? 0))}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {order.status === 'pending' ? (
                              <button
                                type="button"
                                onClick={() => approveMutation.mutate(order.id)}
                                className="rounded-lg border border-cyan-300 px-3 py-1.5 text-xs font-medium text-cyan-900 hover:bg-cyan-50"
                              >
                                Approve
                              </button>
                            ) : null}
                            {!['cancelled', 'delivered', 'dispatched'].includes(order.status) ? (
                              <button
                                type="button"
                                onClick={() => cancelMutation.mutate(order.id)}
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                              >
                                Cancel
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>
                  Page {orderMeta?.page ?? 1} of {orderMeta?.totalPages ?? 1}
                </span>
                <span>{orderMeta?.total ?? orderRows.length} sales orders</span>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Create Assisted Order</h2>
            <p className="mt-1 text-sm text-slate-500">
              Use this for retailers who place orders by phone, WhatsApp, or through your office.
            </p>
          </div>

          <form onSubmit={submitAssistedOrder} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Retailer</span>
              <LookupInput
                resource="retailers"
                value={form.retailerId}
                onChange={(value) => setForm((current) => ({ ...current, retailerId: value }))}
                placeholder="Search retailer"
                searchPlaceholder="Search retailer by shop, code, or mobile"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Entry Source</span>
                <select
                  value={form.source}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      source: event.target.value as 'admin' | 'salesperson',
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                >
                  <option value="admin">Admin</option>
                  <option value="salesperson">Salesperson</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Requested Delivery Date</span>
                <input
                  type="date"
                  value={form.requestedDeliveryDate ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, requestedDeliveryDate: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
              <textarea
                value={form.notes ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-[84px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                placeholder="Phone order, standing order note, or any special instruction"
              />
            </label>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Order Items</span>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Add Item Row
                </button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={`${index}-${item.variantId}`} className="rounded-xl border border-slate-200 p-3">
                    <div className="grid gap-3 md:grid-cols-[1.5fr_0.7fr_1fr_auto]">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Product Variant</span>
                        <LookupInput
                          resource="productVariants"
                          value={item.variantId}
                          onChange={(value) => updateItem(index, { variantId: value })}
                          placeholder="Search product variant"
                          searchPlaceholder="Search by product, SKU, or barcode"
                          className="w-full"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Qty</span>
                        <input
                          type="number"
                          min={1}
                          step="1"
                          value={item.qty}
                          onChange={(event) => updateItem(index, { qty: Number(event.target.value) })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Remarks</span>
                        <input
                          value={item.remarks ?? ''}
                          onChange={(event) => updateItem(index, { remarks: event.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                          placeholder="Optional"
                        />
                      </label>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Search and select a variant from the live product lookup. You can still use a custom value if needed.
              </p>
            </div>

            <button
              type="submit"
              disabled={createAssistedMutation.isPending}
              className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createAssistedMutation.isPending ? 'Creating assisted order...' : 'Create Assisted Order'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
