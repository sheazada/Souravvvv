'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { LookupInput } from '@/components/ui/lookup-input';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { SalesInvoicesApi } from '@/features/sales-invoices/api';
import { formatCurrency } from '@/lib/utils/number';
import type { GenerateSalesInvoicePayload, SalesInvoiceFilters } from '@/types/sales-invoices';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const DEFAULT_FILTERS: SalesInvoiceFilters = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
};

const DEFAULT_AUTO_FORM: GenerateSalesInvoicePayload = {
  retailerId: '',
  salesOrderId: '',
  dispatchTripId: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date().toISOString().slice(0, 10),
  source: 'auto_delivery',
  remarks: '',
};

const DEFAULT_ASSISTED_FORM: GenerateSalesInvoicePayload = {
  retailerId: '',
  salesOrderId: '',
  dispatchTripId: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date().toISOString().slice(0, 10),
  source: 'assisted_billing',
  remarks: '',
};

export function SalesInvoiceListView() {
  const routeMeta = getAdminRouteMeta('salesInvoices');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<SalesInvoiceFilters>(DEFAULT_FILTERS);
  const [autoForm, setAutoForm] = useState<GenerateSalesInvoicePayload>(DEFAULT_AUTO_FORM);
  const [assistedForm, setAssistedForm] = useState<GenerateSalesInvoicePayload>(DEFAULT_ASSISTED_FORM);
  const [message, setMessage] = useState<string | null>(null);

  const queryKey = useMemo(() => ['sales-invoices', filters], [filters]);
  const invoicesQuery = useQuery({ queryKey, queryFn: () => SalesInvoicesApi.list(filters) });

  const generateMutation = useMutation({
    mutationFn: (payload: GenerateSalesInvoicePayload) => SalesInvoicesApi.generate(payload),
    onSuccess: () => {
      setMessage('Sales invoice generated successfully.');
      setAutoForm(DEFAULT_AUTO_FORM);
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to generate sales invoice'),
  });

  const assistedMutation = useMutation({
    mutationFn: (payload: GenerateSalesInvoicePayload) => SalesInvoicesApi.createAssisted(payload),
    onSuccess: () => {
      setMessage('Assisted sales invoice generated successfully.');
      setAssistedForm(DEFAULT_ASSISTED_FORM);
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to generate assisted sales invoice'),
  });

  async function submitAuto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!autoForm.retailerId.trim()) {
      setMessage('Retailer is required for invoice generation.');
      return;
    }
    if (!autoForm.salesOrderId?.trim() && !autoForm.dispatchTripId?.trim()) {
      setMessage('Sales order ID or dispatch trip ID is required.');
      return;
    }
    await generateMutation.mutateAsync({
      ...autoForm,
      salesOrderId: autoForm.salesOrderId?.trim() ? autoForm.salesOrderId : undefined,
      dispatchTripId: autoForm.dispatchTripId?.trim() ? autoForm.dispatchTripId : undefined,
      remarks: autoForm.remarks?.trim() ? autoForm.remarks : undefined,
    });
  }

  async function submitAssisted(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!assistedForm.retailerId.trim()) {
      setMessage('Retailer is required for assisted invoice generation.');
      return;
    }
    await assistedMutation.mutateAsync({
      ...assistedForm,
      salesOrderId: assistedForm.salesOrderId?.trim() ? assistedForm.salesOrderId : undefined,
      dispatchTripId: assistedForm.dispatchTripId?.trim() ? assistedForm.dispatchTripId : undefined,
      remarks: assistedForm.remarks?.trim() ? assistedForm.remarks : undefined,
      source: 'assisted_billing',
    });
  }

  const rows = invoicesQuery.data?.data ?? [];
  const meta = invoicesQuery.data?.meta;

  return (
    <div>
      <PageHeader title={routeMeta.pageTitle} description={routeMeta.pageDescription} />

      {message ? <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <input value={filters.search ?? ''} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Search invoice no or remarks" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <select value={filters.status ?? ''} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
              <option value="partial_paid">Partial Paid</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input type="date" value={filters.fromDate ?? ''} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value, page: 1 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reset Filters</button>
          </div>

          {invoicesQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading sales invoices...</div>
          ) : invoicesQuery.error ? (
            <EmptyState title="Unable to load sales invoices" description={invoicesQuery.error instanceof Error ? invoicesQuery.error.message : 'Unknown sales invoice error'} />
          ) : rows.length === 0 ? (
            <EmptyState title="No sales invoices found" description="Generate invoices from delivered orders or assisted retailer billing flow." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Invoice</th>
                      <th className="px-4 py-3 font-medium">Retailer</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Outstanding</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3"><div className="font-medium text-slate-950">{row.invoiceNo}</div><div className="text-xs text-slate-500">{new Date(row.invoiceDate).toLocaleDateString('en-IN')}</div></td>
                        <td className="px-4 py-3 text-slate-700">{row.retailer?.shopName ?? row.retailerId}</td>
                        <td className="px-4 py-3 text-slate-700">{row.source}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800">{row.status}</span></td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrency(row.outstandingAmount)}</td>
                        <td className="px-4 py-3"><Link href={`/app/sales-invoices/${row.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}</span>
                <span>{meta?.total ?? rows.length} sales invoices</span>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <form onSubmit={submitAuto} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">Generate Delivery Invoice</h2>
              <p className="mt-1 text-sm text-slate-500">Create an invoice from a delivered sales order or completed dispatch trip.</p>
            </div>
            <div className="space-y-3">
              <LookupInput resource="retailers" value={autoForm.retailerId} onChange={(value) => setAutoForm((current) => ({ ...current, retailerId: value }))} placeholder="Search retailer" />
              <LookupInput resource="salesOrders" query={{ status: 'delivered', limit: 100 }} value={autoForm.salesOrderId ?? ''} onChange={(value) => setAutoForm((current) => ({ ...current, salesOrderId: value }))} placeholder="Select delivered sales order (optional)" />
              <LookupInput resource="dispatchTrips" query={{ status: 'completed', limit: 100 }} value={autoForm.dispatchTripId ?? ''} onChange={(value) => setAutoForm((current) => ({ ...current, dispatchTripId: value }))} placeholder="Select completed trip (optional)" />
              <div className="grid gap-3 md:grid-cols-2">
                <input type="date" value={autoForm.invoiceDate ?? ''} onChange={(event) => setAutoForm((current) => ({ ...current, invoiceDate: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
                <input type="date" value={autoForm.dueDate ?? ''} onChange={(event) => setAutoForm((current) => ({ ...current, dueDate: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              </div>
              <textarea value={autoForm.remarks ?? ''} onChange={(event) => setAutoForm((current) => ({ ...current, remarks: event.target.value }))} className="min-h-[84px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Optional invoice note" />
            </div>
            <button type="submit" disabled={generateMutation.isPending} className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">{generateMutation.isPending ? 'Generating invoice...' : 'Generate Invoice'}</button>
          </form>

          <form onSubmit={submitAssisted} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">Generate Assisted Invoice</h2>
              <p className="mt-1 text-sm text-slate-500">Use this for retailers billed by office/admin even when they did not self-manage the order or billing flow.</p>
            </div>
            <div className="space-y-3">
              <LookupInput resource="retailers" value={assistedForm.retailerId} onChange={(value) => setAssistedForm((current) => ({ ...current, retailerId: value }))} placeholder="Search retailer" />
              <LookupInput resource="salesOrders" query={{ limit: 100 }} value={assistedForm.salesOrderId ?? ''} onChange={(value) => setAssistedForm((current) => ({ ...current, salesOrderId: value }))} placeholder="Optional sales order" />
              <LookupInput resource="dispatchTrips" query={{ limit: 100 }} value={assistedForm.dispatchTripId ?? ''} onChange={(value) => setAssistedForm((current) => ({ ...current, dispatchTripId: value }))} placeholder="Optional dispatch trip" />
              <div className="grid gap-3 md:grid-cols-2">
                <input type="date" value={assistedForm.invoiceDate ?? ''} onChange={(event) => setAssistedForm((current) => ({ ...current, invoiceDate: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
                <input type="date" value={assistedForm.dueDate ?? ''} onChange={(event) => setAssistedForm((current) => ({ ...current, dueDate: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              </div>
              <textarea value={assistedForm.remarks ?? ''} onChange={(event) => setAssistedForm((current) => ({ ...current, remarks: event.target.value }))} className="min-h-[84px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Optional office billing note" />
            </div>
            <button type="submit" disabled={assistedMutation.isPending} className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{assistedMutation.isPending ? 'Generating assisted invoice...' : 'Generate Assisted Invoice'}</button>
          </form>
        </section>
      </div>
    </div>
  );
}
