'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { LookupInput } from '@/components/ui/lookup-input';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { PaymentsApi } from '@/features/payments/api';
import { formatCurrency } from '@/lib/utils/number';
import { buildDetailTitle } from '@/lib/utils/title';
import type { CreatePaymentAllocationPayload } from '@/types/payments';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const DEFAULT_ALLOCATION: CreatePaymentAllocationPayload = {
  salesInvoiceId: '',
  purchaseInvoiceId: '',
  allocatedAmount: 0,
  allocationDate: new Date().toISOString().slice(0, 10),
};

export function PaymentReceiptDetailView({ id }: { id: string }) {
  const routeMeta = getAdminRouteMeta('payments');
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<CreatePaymentAllocationPayload>(DEFAULT_ALLOCATION);

  const receiptQuery = useQuery({ queryKey: ['payment-receipt', id], queryFn: () => PaymentsApi.getById(id) });

  const confirmMutation = useMutation({
    mutationFn: () => PaymentsApi.confirm(id),
    onSuccess: () => {
      setMessage('Payment receipt confirmed successfully.');
      queryClient.invalidateQueries({ queryKey: ['payment-receipt', id] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to confirm receipt'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => PaymentsApi.cancel(id),
    onSuccess: () => {
      setMessage('Payment receipt cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: ['payment-receipt', id] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to cancel receipt'),
  });

  const allocationMutation = useMutation({
    mutationFn: (payload: CreatePaymentAllocationPayload) => PaymentsApi.createAllocation(id, payload),
    onSuccess: () => {
      setMessage('Payment allocation created successfully.');
      setAllocation(DEFAULT_ALLOCATION);
      queryClient.invalidateQueries({ queryKey: ['payment-receipt', id] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to create allocation'),
  });

  async function handleAllocationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!allocation.salesInvoiceId?.trim() && !allocation.purchaseInvoiceId?.trim()) {
      setMessage('Sales invoice ID or purchase invoice ID is required for allocation.');
      return;
    }
    if (!allocation.allocatedAmount || allocation.allocatedAmount <= 0) {
      setMessage('Allocated amount must be greater than zero.');
      return;
    }
    await allocationMutation.mutateAsync({
      ...allocation,
      salesInvoiceId: allocation.salesInvoiceId?.trim() ? allocation.salesInvoiceId : undefined,
      purchaseInvoiceId: allocation.purchaseInvoiceId?.trim() ? allocation.purchaseInvoiceId : undefined,
    });
  }

  if (receiptQuery.isLoading) {
    return <div className="text-sm text-slate-500">Loading payment receipt...</div>;
  }

  if (receiptQuery.error || !receiptQuery.data?.data) {
    return <EmptyState title="Unable to load payment receipt" description={receiptQuery.error instanceof Error ? receiptQuery.error.message : 'Payment receipt not found'} />;
  }

  const receipt = receiptQuery.data.data;
  const allocated = receipt.allocations.reduce((sum, row) => sum + row.allocatedAmount, 0);
  const remaining = Math.max(receipt.amount - allocated, 0);

  return (
    <div>
      <PageHeader
        title={buildDetailTitle(routeMeta.detailTitlePrefix ?? routeMeta.pageTitle, receipt.receiptNo)}
        description={routeMeta.detailPageDescription}
      />

      {message ? <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{message}</div> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Receipt Amount" value={formatCurrency(receipt.amount)} />
        <KpiCard label="Allocated Amount" value={formatCurrency(allocated)} />
        <KpiCard label="Remaining Amount" value={formatCurrency(remaining)} />
        <KpiCard label="Status" value={receipt.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Party</div><div className="mt-1 font-medium text-slate-950">{receipt.party?.shopName ?? receipt.party?.name ?? receipt.partyId}</div></div>
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Payment Mode</div><div className="mt-1 font-medium text-slate-950">{receipt.paymentMode}</div></div>
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Direction</div><div className="mt-1 font-medium text-slate-950">{receipt.paymentDirection}</div></div>
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Reference</div><div className="mt-1 font-medium text-slate-950">{receipt.referenceNo ?? '—'}</div></div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {receipt.status === 'draft' ? <button type="button" onClick={() => confirmMutation.mutate()} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Confirm Receipt</button> : null}
              {receipt.status !== 'cancelled' ? <button type="button" onClick={() => cancelMutation.mutate()} className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Cancel Receipt</button> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Allocations</h2>
            {receipt.allocations.length ? (
              <div className="space-y-3">
                {receipt.allocations.map((row) => (
                  <div key={row.id} className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="font-medium text-slate-950">{row.salesInvoiceId ?? row.purchaseInvoiceId ?? 'Allocation'}</div>
                    <div className="mt-1 flex flex-wrap gap-3 text-slate-600">
                      <span>{new Date(row.allocationDate).toLocaleDateString('en-IN')}</span>
                      <span>{formatCurrency(row.allocatedAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No allocations found" description="Create an allocation to link this receipt to invoice balances." />
            )}
          </div>
        </section>

        <form onSubmit={handleAllocationSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Create Allocation</h2>
            <p className="mt-1 text-sm text-slate-500">Allocate this payment receipt against a sales invoice or purchase invoice.</p>
          </div>
          <div className="space-y-3">
            <LookupInput
              resource="salesInvoices"
              value={allocation.salesInvoiceId ?? ''}
              onChange={(value) => setAllocation((current) => ({ ...current, salesInvoiceId: value }))}
              placeholder="Search sales invoice"
            />
            <LookupInput
              resource="purchaseInvoices"
              value={allocation.purchaseInvoiceId ?? ''}
              onChange={(value) => setAllocation((current) => ({ ...current, purchaseInvoiceId: value }))}
              placeholder="Search purchase invoice"
            />
            <input type="number" min={0.01} step="0.01" value={allocation.allocatedAmount} onChange={(event) => setAllocation((current) => ({ ...current, allocatedAmount: Number(event.target.value) }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Allocated amount" />
            <input type="date" value={allocation.allocationDate} onChange={(event) => setAllocation((current) => ({ ...current, allocationDate: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
          </div>
          <button type="submit" disabled={allocationMutation.isPending} className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{allocationMutation.isPending ? 'Creating allocation...' : 'Create Allocation'}</button>
        </form>
      </div>
    </div>
  );
}
