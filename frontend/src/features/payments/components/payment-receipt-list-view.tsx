'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { LookupInput } from '@/components/ui/lookup-input';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { PaymentsApi } from '@/features/payments/api';
import { formatCurrency } from '@/lib/utils/number';
import type { CreatePaymentReceiptPayload, PaymentReceiptFilters } from '@/types/payments';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const DEFAULT_FILTERS: PaymentReceiptFilters = {
  page: 1,
  limit: 20,
  search: '',
  partyType: '',
  paymentMode: '',
};

const DEFAULT_FORM: CreatePaymentReceiptPayload = {
  partyType: 'retailer',
  partyId: '',
  paymentDirection: 'inbound',
  paymentMode: 'cash',
  paymentDate: new Date().toISOString().slice(0, 10),
  amount: 0,
  referenceNo: '',
  remarks: '',
};

export function PaymentReceiptListView() {
  const routeMeta = getAdminRouteMeta('payments');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PaymentReceiptFilters>(DEFAULT_FILTERS);
  const [form, setForm] = useState<CreatePaymentReceiptPayload>(DEFAULT_FORM);
  const [message, setMessage] = useState<string | null>(null);

  const queryKey = useMemo(() => ['payment-receipts', filters], [filters]);
  const [receiptsQuery, retailerOutstandingQuery, supplierOutstandingQuery, agingQuery] = useQueries({
    queries: [
      { queryKey, queryFn: () => PaymentsApi.list(filters) },
      { queryKey: ['payments', 'retailer-outstanding'], queryFn: () => PaymentsApi.getRetailerOutstanding() },
      { queryKey: ['payments', 'supplier-outstanding'], queryFn: () => PaymentsApi.getSupplierOutstanding() },
      { queryKey: ['payments', 'aging'], queryFn: () => PaymentsApi.getOutstandingAging() },
    ],
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePaymentReceiptPayload) => PaymentsApi.create(payload),
    onSuccess: () => {
      setMessage('Payment receipt created successfully.');
      setForm(DEFAULT_FORM);
      queryClient.invalidateQueries({ queryKey: ['payment-receipts'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to create payment receipt'),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => PaymentsApi.confirm(id),
    onSuccess: () => {
      setMessage('Payment receipt confirmed successfully.');
      queryClient.invalidateQueries({ queryKey: ['payment-receipts'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to confirm payment receipt'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => PaymentsApi.cancel(id),
    onSuccess: () => {
      setMessage('Payment receipt cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: ['payment-receipts'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to cancel payment receipt'),
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!form.partyId.trim()) {
      setMessage('Party ID is required.');
      return;
    }
    if (!form.amount || form.amount <= 0) {
      setMessage('Amount must be greater than zero.');
      return;
    }

    await createMutation.mutateAsync({
      ...form,
      referenceNo: form.referenceNo?.trim() ? form.referenceNo : undefined,
      remarks: form.remarks?.trim() ? form.remarks : undefined,
      dispatchTripId: form.dispatchTripId?.trim() ? form.dispatchTripId : undefined,
      bankAccountId: form.bankAccountId?.trim() ? form.bankAccountId : undefined,
      cashRegisterId: form.cashRegisterId?.trim() ? form.cashRegisterId : undefined,
    });
  }

  const rows = receiptsQuery.data?.data ?? [];
  const meta = receiptsQuery.data?.meta;
  const retailerOutstanding = retailerOutstandingQuery.data?.data ?? [];
  const supplierOutstanding = supplierOutstandingQuery.data?.data ?? [];
  const agingRows = agingQuery.data?.data ?? [];

  return (
    <div>
      <PageHeader title={routeMeta.pageTitle} description={routeMeta.pageDescription} />

      {message ? <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{message}</div> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Retailer Outstanding" value={formatCurrency(retailerOutstanding.reduce((sum, row) => sum + row.totalOutstanding, 0))} />
        <KpiCard label="Supplier Outstanding" value={formatCurrency(supplierOutstanding.reduce((sum, row) => sum + row.totalOutstanding, 0))} />
        <KpiCard label="Aging Items" value={agingRows.length} />
        <KpiCard label="Receipts Loaded" value={meta?.total ?? rows.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <input value={filters.search ?? ''} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Search receipt no or reference" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <select value={filters.partyType ?? ''} onChange={(event) => setFilters((current) => ({ ...current, partyType: event.target.value, page: 1 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
              <option value="">All parties</option>
              <option value="retailer">Retailer</option>
              <option value="supplier">Supplier</option>
            </select>
            <select value={filters.paymentMode ?? ''} onChange={(event) => setFilters((current) => ({ ...current, paymentMode: event.target.value, page: 1 }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
              <option value="">All modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
              <option value="cheque">Cheque</option>
            </select>
            <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reset Filters</button>
          </div>

          {receiptsQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading payment receipts...</div>
          ) : receiptsQuery.error ? (
            <EmptyState title="Unable to load payment receipts" description={receiptsQuery.error instanceof Error ? receiptsQuery.error.message : 'Unknown payments error'} />
          ) : rows.length === 0 ? (
            <EmptyState title="No payment receipts found" description="Create and confirm receipts to see them here." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Receipt</th>
                      <th className="px-4 py-3 font-medium">Party</th>
                      <th className="px-4 py-3 font-medium">Mode</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3"><div className="font-medium text-slate-950">{row.receiptNo}</div><div className="text-xs text-slate-500">{new Date(row.paymentDate).toLocaleDateString('en-IN')}</div></td>
                        <td className="px-4 py-3 text-slate-700">{row.party?.shopName ?? row.party?.name ?? row.partyId}</td>
                        <td className="px-4 py-3 text-slate-700">{row.paymentMode}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800">{row.status}</span></td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrency(row.amount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/app/payments/${row.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</Link>
                            {row.status === 'draft' ? <button type="button" onClick={() => confirmMutation.mutate(row.id)} className="rounded-lg border border-cyan-300 px-3 py-1.5 text-xs font-medium text-cyan-900 hover:bg-cyan-50">Confirm</button> : null}
                            {row.status !== 'cancelled' ? <button type="button" onClick={() => cancelMutation.mutate(row.id)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Cancel</button> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}</span>
                <span>{meta?.total ?? rows.length} payment receipts</span>
              </div>
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Create Payment Receipt</h2>
            <p className="mt-1 text-sm text-slate-500">Record inbound retailer collections or outbound supplier payments.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select value={form.partyType} onChange={(event) => setForm((current) => ({ ...current, partyType: event.target.value as 'retailer' | 'supplier' }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
              <option value="retailer">Retailer</option>
              <option value="supplier">Supplier</option>
            </select>
            <select value={form.paymentDirection} onChange={(event) => setForm((current) => ({ ...current, paymentDirection: event.target.value as 'inbound' | 'outbound' }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
            <LookupInput
              resource={form.partyType === 'retailer' ? 'retailers' : 'suppliers'}
              value={form.partyId}
              onChange={(value) => setForm((current) => ({ ...current, partyId: value }))}
              placeholder={form.partyType === 'retailer' ? 'Search retailer' : 'Search supplier'}
            />
            <input type="number" min={0.01} step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Amount" />
            <select value={form.paymentMode} onChange={(event) => setForm((current) => ({ ...current, paymentMode: event.target.value as CreatePaymentReceiptPayload['paymentMode'] }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
              <option value="cheque">Cheque</option>
            </select>
            <input type="date" value={form.paymentDate} onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            <LookupInput
              resource="cashRegisters"
              value={form.cashRegisterId ?? ''}
              onChange={(value) => setForm((current) => ({ ...current, cashRegisterId: value }))}
              placeholder="Search cash register"
            />
            <LookupInput
              resource="bankAccounts"
              value={form.bankAccountId ?? ''}
              onChange={(value) => setForm((current) => ({ ...current, bankAccountId: value }))}
              placeholder="Search bank account"
            />
            <LookupInput
              resource="dispatchTrips"
              value={form.dispatchTripId ?? ''}
              onChange={(value) => setForm((current) => ({ ...current, dispatchTripId: value }))}
              placeholder="Optional dispatch trip"
              className="md:col-span-2"
            />
            <input value={form.referenceNo ?? ''} onChange={(event) => setForm((current) => ({ ...current, referenceNo: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2" placeholder="Reference no" />
            <textarea value={form.remarks ?? ''} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} className="min-h-[84px] rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2" placeholder="Remarks" />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">{createMutation.isPending ? 'Creating receipt...' : 'Create Payment Receipt'}</button>
        </form>
      </div>
    </div>
  );
}
