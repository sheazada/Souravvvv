'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { LookupsApi } from '@/features/lookups/api';
import { RetailersApi } from '@/features/retailers/api';
import { ReturnsApi, type ClaimRow, type SalesReturnRow } from '@/features/returns/api';
import { formatCurrency } from '@/lib/utils/number';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function ReturnsManagementView() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'returns' | 'claims'>('returns');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsReturnModalOpen(true);
    }
  }, [searchParams]);

  // Form states
  const [returnForm, setReturnForm] = useState({
    retailerId: '',
    returnType: 'damaged',
    returnDate: new Date().toISOString().slice(0, 10),
    remarks: 'Customer reported pouch leakage during delivery transit',
    variantId: '',
    returnQty: 5,
    disposition: 'restock',
    creditAmount: 140,
  });

  const [claimForm, setClaimForm] = useState({
    partyType: 'retailer',
    claimType: 'breakage_transit',
    claimAmount: 450,
    resolutionNotes: 'Verified against delivery driver report',
  });

  // Queries
  const returnsQuery = useQuery({
    queryKey: ['returns', 'sales-returns', searchQuery, statusFilter],
    queryFn: () => ReturnsApi.listSalesReturns({ search: searchQuery, status: statusFilter, limit: 30, page: 1 }),
  });

  const claimsQuery = useQuery({
    queryKey: ['returns', 'claims', searchQuery, statusFilter],
    queryFn: () => ReturnsApi.listClaims({ search: searchQuery, status: statusFilter, limit: 30, page: 1 }),
  });

  const retailersQuery = useQuery({
    queryKey: ['retailers', 'lookup', ''],
    queryFn: () => RetailersApi.list({ limit: 50, page: 1 }),
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'lookup', ''],
    queryFn: () => LookupsApi.productVariants({ limit: 50 }),
  });

  const returnsList = returnsQuery.data?.data ?? [];
  const claimsList = claimsQuery.data?.data ?? [];
  const retailerList = retailersQuery.data?.data ?? [];
  const productList = Array.isArray(productsQuery.data) ? productsQuery.data : ((productsQuery.data as any)?.data ?? []);

  // Mutations
  const createReturnMutation = useMutation({
    mutationFn: (data: typeof returnForm) =>
      ReturnsApi.createSalesReturn({
        retailerId: data.retailerId || (retailerList[0]?.id ?? '11111111-1111-1111-1111-111111111111'),
        returnType: data.returnType,
        returnDate: data.returnDate,
        remarks: data.remarks,
        items: [
          {
            variantId: data.variantId || (productList[0]?.id ?? '22222222-2222-2222-2222-222222222222'),
            returnQty: Number(data.returnQty || 1),
            reason: data.returnType,
            disposition: data.disposition,
            creditAmount: Number(data.creditAmount || 0),
          },
        ],
      }),
    onSuccess: (res) => {
      setMessage(`Sale return '${res.data?.returnNo}' recorded successfully.`);
      setIsReturnModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to record return'),
  });

  const approveReturnMutation = useMutation({
    mutationFn: (id: string) => ReturnsApi.approveSalesReturn(id),
    onSuccess: (res) => {
      setMessage(`Sale return '${res.data?.returnNo}' approved! Stock credited & credit note posted.`);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to approve return'),
  });

  const createClaimMutation = useMutation({
    mutationFn: (data: typeof claimForm) =>
      ReturnsApi.createClaim({
        partyType: data.partyType,
        claimType: data.claimType,
        claimAmount: Number(data.claimAmount || 0),
        resolutionNotes: data.resolutionNotes,
      }),
    onSuccess: (res) => {
      setMessage(`Damage claim '${res.data?.claimNo}' recorded successfully.`);
      setIsClaimModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to record claim'),
  });

  const approveClaimMutation = useMutation({
    mutationFn: (id: string) => ReturnsApi.approveClaim(id, 'Claim verified and approved for credit settlement'),
    onSuccess: (res) => {
      setMessage(`Damage claim '${res.data?.claimNo}' approved successfully.`);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to approve claim'),
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Customer & Retailer Sale Returns & Claims</h1>
          <p className="mt-1 text-sm text-slate-600">
            Record damaged, leaked, or excess stock returns from retailers. Auto-restock inventory and issue instant credit notes (`CreditNote`).
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsReturnModalOpen(true)}
            className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm"
          >
            + Record Sale Return
          </button>
          <button
            type="button"
            onClick={() => setIsClaimModalOpen(true)}
            className="rounded-xl border border-slate-300 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-900 shadow-sm"
          >
            + Record Damage Claim
          </button>
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

      {/* Tabs Selector */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('returns')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'returns'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Customer / Shop Returns ({returnsList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('claims')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'claims'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Damage & Breakage Claims ({claimsList.length})
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search by Return/Claim No, remarks, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft / Pending</option>
          <option value="approved">Approved & Settle</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* RETURNS TAB CONTENT */}
      {activeTab === 'returns' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {returnsQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading customer returns...</div>
          ) : returnsList.length === 0 ? (
            <EmptyState
              title="No sale returns recorded"
              description="Click '+ Record Sale Return' above to record damaged, expired, or excess stock returns from a retailer."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Return No & Date</th>
                    <th className="px-4 py-3 text-left">Return Type</th>
                    <th className="px-4 py-3 text-left">Remarks & Items</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Credit Amount</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {returnsList.map((row) => {
                    const totalCredit = row.items.reduce((s, i) => s + Number(i.creditAmount || 0), 0);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/75">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-950">{row.returnNo}</div>
                          <div className="text-xs text-slate-500">{new Date(row.returnDate).toLocaleDateString('en-IN')}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 uppercase">
                            {row.returnType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{row.remarks ?? 'Stock return adjustment'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {row.items.length} item(s) • Disposition: {row.items[0]?.disposition ?? 'restock'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                              row.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : row.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-rose-700">
                          {formatCurrency(totalCredit)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.status === 'draft' ? (
                            <button
                              type="button"
                              onClick={() => approveReturnMutation.mutate(row.id)}
                              disabled={approveReturnMutation.isPending}
                              className="rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                            >
                              Approve & Credit Stock
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">Processed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* CLAIMS TAB CONTENT */}
      {activeTab === 'claims' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {claimsQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading claims...</div>
          ) : claimsList.length === 0 ? (
            <EmptyState
              title="No damage claims recorded"
              description="Click '+ Record Damage Claim' above to log transit breakage or spoilage claims."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Claim No & Date</th>
                    <th className="px-4 py-3 text-left">Party Type</th>
                    <th className="px-4 py-3 text-left">Claim Type / Resolution</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Claim Amount</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {claimsList.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 font-bold text-slate-950">
                        <div>{row.claimNo}</div>
                        <div className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString('en-IN')}</div>
                      </td>
                      <td className="px-4 py-3 uppercase font-semibold text-slate-800">{row.partyType}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-semibold capitalize">{row.claimType.replace('_', ' ')}</div>
                        <div className="text-xs text-slate-500">{row.resolutionNotes ?? 'Pending review'}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                            row.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-rose-700">{formatCurrency(row.claimAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        {row.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => approveClaimMutation.mutate(row.id)}
                            disabled={approveClaimMutation.isPending}
                            className="rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-700"
                          >
                            Approve Claim
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Approved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* RECORD SALE RETURN MODAL */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Record Customer / Retailer Sale Return</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createReturnMutation.mutate(returnForm);
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Retailer Shop *</label>
                <select
                  value={returnForm.retailerId}
                  onChange={(e) => setReturnForm({ ...returnForm, retailerId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                >
                  {retailerList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.shopName} ({r.retailerCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Return Type *</label>
                  <select
                    value={returnForm.returnType}
                    onChange={(e) => setReturnForm({ ...returnForm, returnType: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="damaged">Damaged / Breakage</option>
                    <option value="leakage">Pouch Leakage</option>
                    <option value="spoilage">Curd / Milk Spoilage</option>
                    <option value="expired">Date Expired</option>
                    <option value="excess">Excess Supply Return</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Return Date</label>
                  <input
                    type="date"
                    value={returnForm.returnDate}
                    onChange={(e) => setReturnForm({ ...returnForm, returnDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product Variant *</label>
                <select
                  value={returnForm.variantId}
                  onChange={(e) => setReturnForm({ ...returnForm, variantId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                >
                  {productList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.productName || p.variantName || p.sku} (₹{Number(p.price || 25).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Return Qty *</label>
                  <input
                    type="number"
                    min={1}
                    value={returnForm.returnQty}
                    onChange={(e) => setReturnForm({ ...returnForm, returnQty: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-right font-bold outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Disposition</label>
                  <select
                    value={returnForm.disposition}
                    onChange={(e) => setReturnForm({ ...returnForm, disposition: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="restock">Restock to Inventory</option>
                    <option value="damage_writeoff">Damage Write-off</option>
                    <option value="claim">Supplier Claim</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Amount (₹) *</label>
                  <input
                    type="number"
                    value={returnForm.creditAmount}
                    onChange={(e) => setReturnForm({ ...returnForm, creditAmount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-right font-bold text-rose-700 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Driver / Customer Remarks</label>
                <input
                  value={returnForm.remarks}
                  onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReturnMutation.isPending}
                  className="rounded-xl border border-cyan-600 bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {createReturnMutation.isPending ? 'Recording...' : 'Confirm Return & Issue Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD CLAIM MODAL */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Record Damage / Transit Breakage Claim</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createClaimMutation.mutate(claimForm);
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Party Type *</label>
                  <select
                    value={claimForm.partyType}
                    onChange={(e) => setClaimForm({ ...claimForm, partyType: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="retailer">Retailer Shop</option>
                    <option value="supplier">Milk Plant Supplier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Claim Type *</label>
                  <select
                    value={claimForm.claimType}
                    onChange={(e) => setClaimForm({ ...claimForm, claimType: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="breakage_transit">Transit Breakage</option>
                    <option value="plant_spoilage">Plant Curd Spoilage</option>
                    <option value="short_supply">Short Supply Variance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Claim Amount (₹) *</label>
                <input
                  type="number"
                  value={claimForm.claimAmount}
                  onChange={(e) => setClaimForm({ ...claimForm, claimAmount: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-right font-black text-rose-700 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution / Investigation Notes</label>
                <textarea
                  rows={2}
                  value={claimForm.resolutionNotes}
                  onChange={(e) => setClaimForm({ ...claimForm, resolutionNotes: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createClaimMutation.isPending}
                  className="rounded-xl border border-slate-800 bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  {createClaimMutation.isPending ? 'Recording...' : 'Record Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
