'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { LookupInput } from '@/components/ui/lookup-input';
import { PageHeader } from '@/components/ui/page-header';
import { StaffApi } from '@/features/staff/api';
import { formatCurrency } from '@/lib/utils/number';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function StaffDeliveryStopView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<'delivered' | 'partial' | 'failed' | 'refused'>('delivered');
  const [failureReason, setFailureReason] = useState('');
  const [amount, setAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [crateTypeId, setCrateTypeId] = useState('');
  const [crateQuantity, setCrateQuantity] = useState(1);
  const [crateAction, setCrateAction] = useState<'issue' | 'return' | 'damage' | 'missing' | 'adjustment'>('return');
  const [recipientName, setRecipientName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  const stopQuery = useQuery({ queryKey: ['staff', 'stop', id], queryFn: () => StaffApi.getStop(id) });

  const statusMutation = useMutation({
    mutationFn: () => StaffApi.updateStopStatus(id, { status, failureReason: failureReason || undefined }),
    onSuccess: () => {
      setMessage('Delivery stop updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['staff', 'stop', id] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to update delivery stop'),
  });

  const collectionMutation = useMutation({
    mutationFn: () => StaffApi.addCollection(id, { amount, paymentMode, referenceNo: referenceNo || undefined }),
    onSuccess: () => setMessage('Collection recorded successfully.'),
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to record collection'),
  });

  const crateMutation = useMutation({
    mutationFn: () => StaffApi.addCrates(id, { crateTypeId, quantity: crateQuantity, transactionType: crateAction }),
    onSuccess: () => setMessage('Crate transaction recorded successfully.'),
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to record crate transaction'),
  });

  const proofMutation = useMutation({
    mutationFn: () => StaffApi.addProofOfDelivery(id, { recipientName: recipientName || undefined, photoUrl: photoUrl || undefined, signatureUrl: signatureUrl || undefined }),
    onSuccess: () => setMessage('Proof of delivery saved successfully.'),
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to save proof of delivery'),
  });

  if (stopQuery.isLoading) return <div className="text-sm text-slate-500">Loading stop...</div>;
  if (stopQuery.error || !stopQuery.data?.data) return <EmptyState title="Unable to load stop" description={stopQuery.error instanceof Error ? stopQuery.error.message : 'Stop not found'} />;

  const stop = stopQuery.data.data;
  const totalLoaded = stop.items.reduce((sum, item) => sum + item.loadedQty, 0);
  const totalDelivered = stop.items.reduce((sum, item) => sum + item.deliveredQty, 0);

  return (
    <div>
      <PageHeader title={`Stop ${stop.stopSequence}`} description="Execute delivery, record collection, and save proof of delivery from the field." />
      {message ? <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{message}</div> : null}
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Retailer" value={stop.retailer?.shopName ?? 'Unknown'} />
        <KpiCard label="Status" value={stop.status} />
        <KpiCard label="Loaded Qty" value={totalLoaded} />
        <KpiCard label="Delivered Qty" value={totalDelivered} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Stop Items</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Loaded</th><th className="px-4 py-3 font-medium">Delivered</th><th className="px-4 py-3 font-medium">Line Total</th></tr></thead><tbody className="divide-y divide-slate-200 bg-white">{stop.items.map((item) => <tr key={item.id}><td className="px-4 py-3"><div className="font-medium text-slate-950">{item.variant?.productName ?? 'Unknown Product'}</div><div className="text-xs text-slate-500">{item.variant?.variantName ?? '—'}</div></td><td className="px-4 py-3 text-slate-700">{item.loadedQty}</td><td className="px-4 py-3 text-slate-700">{item.deliveredQty}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(item.lineTotal)}</td></tr>)}</tbody></table>
          </div>
        </section>
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Update Status</h2>
            <div className="space-y-3">
              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"><option value="delivered">Delivered</option><option value="partial">Partial</option><option value="failed">Failed</option><option value="refused">Refused</option></select>
              <input value={failureReason} onChange={(event) => setFailureReason(event.target.value)} placeholder="Failure reason (optional)" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              <button type="button" onClick={() => statusMutation.mutate()} className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950">Update Status</button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Collection</h2>
            <div className="grid gap-3 md:grid-cols-2"><input type="number" min={0} step="0.01" value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Amount" /><input value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Payment mode" /><input value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2" placeholder="Reference no" /></div>
            <button type="button" onClick={() => collectionMutation.mutate()} className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Record Collection</button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Crates</h2>
            <div className="grid gap-3 md:grid-cols-2"><LookupInput resource="crateTypes" value={crateTypeId} onChange={setCrateTypeId} placeholder="Search crate type" /><select value={crateAction} onChange={(event) => setCrateAction(event.target.value as typeof crateAction)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"><option value="return">Return</option><option value="issue">Issue</option><option value="damage">Damage</option><option value="missing">Missing</option><option value="adjustment">Adjustment</option></select><input type="number" min={1} step="1" value={crateQuantity} onChange={(event) => setCrateQuantity(Number(event.target.value))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2" placeholder="Quantity" /></div>
            <button type="button" onClick={() => crateMutation.mutate()} className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Save Crate Transaction</button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Proof of Delivery</h2>
            <div className="space-y-3"><input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Recipient name" /><input value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Photo URL" /><input value={signatureUrl} onChange={(event) => setSignatureUrl(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500" placeholder="Signature URL" /></div>
            <button type="button" onClick={() => proofMutation.mutate()} className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Save Proof of Delivery</button>
          </div>
        </section>
      </div>
    </div>
  );
}
