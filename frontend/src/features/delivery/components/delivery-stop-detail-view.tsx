'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { LookupInput } from '@/components/ui/lookup-input';
import { PageHeader } from '@/components/ui/page-header';
import { DeliveryApi } from '@/features/delivery/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function DeliveryStopDetailView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<'delivered' | 'partial' | 'failed' | 'refused'>('delivered');
  const [failureReason, setFailureReason] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [amount, setAmount] = useState(0);
  const [referenceNo, setReferenceNo] = useState('');
  const [crateTypeId, setCrateTypeId] = useState('');
  const [crateQuantity, setCrateQuantity] = useState(1);
  const [crateAction, setCrateAction] = useState<'issue' | 'return' | 'damage' | 'missing' | 'adjustment'>('return');
  const [recipientName, setRecipientName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  const stopQuery = useQuery({ queryKey: ['delivery-stop', id], queryFn: () => DeliveryApi.getStop(id) });

  const statusMutation = useMutation({
    mutationFn: () =>
      DeliveryApi.updateStatus(id, {
        status,
        failureReason: failureReason || undefined,
        items: stopQuery.data?.data.items.map((item) => ({
          variantId: item.variantId,
          deliveredQty: status === 'delivered' ? item.loadedQty : status === 'partial' ? Math.max(item.loadedQty - item.returnedQty - item.damagedQty, 0) : 0,
          returnedQty: status === 'partial' ? item.returnedQty : undefined,
          damagedQty: status === 'partial' ? item.damagedQty : undefined,
        })),
      }),
    onSuccess: () => {
      setMessage('Delivery stop status updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['delivery-stop', id] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to update delivery stop'),
  });

  const collectionMutation = useMutation({
    mutationFn: () => DeliveryApi.addCollection(id, { amount, paymentMode, referenceNo: referenceNo || undefined }),
    onSuccess: () => {
      setMessage('Collection recorded successfully.');
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to record collection'),
  });

  const crateMutation = useMutation({
    mutationFn: () => DeliveryApi.addCrateTransaction(id, { crateTypeId, quantity: crateQuantity, transactionType: crateAction }),
    onSuccess: () => {
      setMessage('Crate transaction recorded successfully.');
      queryClient.invalidateQueries({ queryKey: ['delivery-stop', id] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to record crate transaction'),
  });

  const proofMutation = useMutation({
    mutationFn: () => DeliveryApi.addProofOfDelivery(id, { recipientName: recipientName || undefined, photoUrl: photoUrl || undefined, signatureUrl: signatureUrl || undefined }),
    onSuccess: () => {
      setMessage('Proof of delivery saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['delivery-stop', id] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to save proof of delivery'),
  });

  if (stopQuery.isLoading) {
    return <div className="text-sm text-slate-500">Loading delivery stop...</div>;
  }

  if (stopQuery.error || !stopQuery.data?.data) {
    return <EmptyState title="Unable to load delivery stop" description={stopQuery.error instanceof Error ? stopQuery.error.message : 'Delivery stop not found'} />;
  }

  const stop = stopQuery.data.data;
  const totalLoaded = stop.items.reduce((sum, item) => sum + item.loadedQty, 0);
  const totalDelivered = stop.items.reduce((sum, item) => sum + item.deliveredQty, 0);

  return (
    <div>
      <PageHeader title={`Delivery Stop ${stop.stopSequence}`} description="Update delivered quantities, capture collections, and attach proof of delivery." />

      {message ? <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{message}</div> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Stop Status" value={stop.status} />
        <KpiCard label="Total Loaded Qty" value={totalLoaded} />
        <KpiCard label="Total Delivered Qty" value={totalDelivered} />
        <KpiCard label="Retailer" value={stop.retailer?.shopName ?? 'Unknown'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Stop Items</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Loaded</th>
                  <th className="px-4 py-3 font-medium">Delivered</th>
                  <th className="px-4 py-3 font-medium">Returned</th>
                  <th className="px-4 py-3 font-medium">Damaged</th>
                  <th className="px-4 py-3 font-medium">Refused</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {stop.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3"><div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div><div className="text-xs text-slate-500">{item.variant?.variantName ?? item.variant?.sku ?? item.variantId}</div></td>
                    <td className="px-4 py-3 text-slate-700">{item.loadedQty}</td>
                    <td className="px-4 py-3 text-slate-700">{item.deliveredQty}</td>
                    <td className="px-4 py-3 text-slate-700">{item.returnedQty}</td>
                    <td className="px-4 py-3 text-slate-700">{item.damagedQty}</td>
                    <td className="px-4 py-3 text-slate-700">{item.refusedQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Update Delivery Status</h2>
            <div className="space-y-3">
              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
                <option value="delivered">Delivered</option>
                <option value="partial">Partial</option>
                <option value="failed">Failed</option>
                <option value="refused">Refused</option>
              </select>
              <input value={failureReason} onChange={(event) => setFailureReason(event.target.value)} placeholder="Failure reason (if needed)" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              <button type="button" onClick={() => statusMutation.mutate()} className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950">Update Stop Status</button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Record Collection</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input type="number" min={0} step="0.01" value={amount} onChange={(event) => setAmount(Number(event.target.value))} placeholder="Amount" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              <input value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)} placeholder="Payment mode" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              <input value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} placeholder="Reference no" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2" />
            </div>
            <button type="button" onClick={() => collectionMutation.mutate()} className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Record Collection</button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Crate Transaction</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <LookupInput
                resource="crateTypes"
                value={crateTypeId}
                onChange={setCrateTypeId}
                placeholder="Search crate type"
              />
              <select value={crateAction} onChange={(event) => setCrateAction(event.target.value as typeof crateAction)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500">
                <option value="issue">Issue</option>
                <option value="return">Return</option>
                <option value="damage">Damage</option>
                <option value="missing">Missing</option>
                <option value="adjustment">Adjustment</option>
              </select>
              <input type="number" min={1} step="1" value={crateQuantity} onChange={(event) => setCrateQuantity(Number(event.target.value))} placeholder="Quantity" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2" />
            </div>
            <button type="button" onClick={() => crateMutation.mutate()} className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Save Crate Transaction</button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Proof of Delivery</h2>
            <div className="space-y-3">
              <input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Recipient name" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              <input value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="Photo URL" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              <input value={signatureUrl} onChange={(event) => setSignatureUrl(event.target.value)} placeholder="Signature URL" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
            </div>
            <button type="button" onClick={() => proofMutation.mutate()} className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Save Proof of Delivery</button>
          </div>
        </section>
      </div>
    </div>
  );
}
