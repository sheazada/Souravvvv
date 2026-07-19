'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { LookupsApi } from '@/features/lookups/api';
import { PricingApi, type PriceBookRow, type PromotionRow } from '@/features/pricing/api';
import { RetailersApi } from '@/features/retailers/api';
import { formatCurrency } from '@/lib/utils/number';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function PricingManagementView() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'priceBooks' | 'promotions' | 'preview'>('priceBooks');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const [isPriceBookModalOpen, setIsPriceBookModalOpen] = useState(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);

  const [priceBookForm, setPriceBookForm] = useState({
    code: `PB-${Math.floor(100 + Math.random() * 900)}`,
    name: 'Patna Special Tier 1 Price Book',
    bookType: 'tier_1',
  });

  const [promoForm, setPromoForm] = useState({
    code: `PRM-${Math.floor(100 + Math.random() * 900)}`,
    name: 'Monsoon Volume 5% Discount Scheme',
    discountType: 'percentage_off',
    discountValue: 5,
  });

  const [previewForm, setPreviewForm] = useState({
    retailerId: '',
    variantId: '',
    qty: 50,
  });

  // Queries
  const priceBooksQuery = useQuery({
    queryKey: ['pricing', 'price-books', searchQuery],
    queryFn: () => PricingApi.listPriceBooks({ search: searchQuery, limit: 30, page: 1 }),
  });

  const promotionsQuery = useQuery({
    queryKey: ['pricing', 'promotions', searchQuery],
    queryFn: () => PricingApi.listPromotions({ search: searchQuery, limit: 30, page: 1 }),
  });

  const retailersQuery = useQuery({
    queryKey: ['retailers', 'lookup', ''],
    queryFn: () => RetailersApi.list({ limit: 50, page: 1 }),
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'lookup', ''],
    queryFn: () => LookupsApi.productVariants({ limit: 50 }),
  });

  const priceBookRows = priceBooksQuery.data?.data ?? [];
  const promoRows = promotionsQuery.data?.data ?? [];
  const retailerList = retailersQuery.data?.data ?? [];
  const productList = Array.isArray(productsQuery.data) ? productsQuery.data : ((productsQuery.data as any)?.data ?? []);

  const previewQuery = useQuery({
    queryKey: ['pricing', 'preview', previewForm.retailerId, previewForm.variantId, previewForm.qty],
    queryFn: () =>
      PricingApi.previewPricing({
        retailerId: previewForm.retailerId || (retailerList[0]?.id ?? '11111111-1111-1111-1111-111111111111'),
        variantId: previewForm.variantId || (productList[0]?.id ?? '22222222-2222-2222-2222-222222222222'),
        qty: Number(previewForm.qty || 1),
      }),
    enabled: activeTab === 'preview',
  });

  // Mutations
  const createPBMutation = useMutation({
    mutationFn: (data: typeof priceBookForm) =>
      PricingApi.createPriceBook({
        code: data.code,
        name: data.name,
        bookType: data.bookType,
      }),
    onSuccess: (res) => {
      setMessage(`Price book '${res.data?.name}' created successfully.`);
      setIsPriceBookModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pricing', 'price-books'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to create price book'),
  });

  const createPromoMutation = useMutation({
    mutationFn: (data: typeof promoForm) =>
      PricingApi.createPromotion({
        code: data.code,
        name: data.name,
        discountType: data.discountType,
        discountValue: Number(data.discountValue || 0),
      }),
    onSuccess: (res) => {
      setMessage(`Promotional scheme '${res.data?.name}' created successfully.`);
      setIsPromoModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pricing', 'promotions'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to create promotion'),
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Price Books & Promotional Schemes Engine</h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure tier-based retailer price books (`PriceBook`), volume discount schemes (`Promotion`), and test live pricing rules.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsPriceBookModalOpen(true)}
            className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm"
          >
            + Create Price Book
          </button>
          <button
            type="button"
            onClick={() => setIsPromoModalOpen(true)}
            className="rounded-xl border border-slate-300 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-900 shadow-sm"
          >
            + Create Promo Scheme
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
          onClick={() => setActiveTab('priceBooks')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'priceBooks'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Tier Price Books ({priceBookRows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('promotions')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'promotions'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Promotional Schemes ({promoRows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'preview'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          ⚡ Live Pricing Preview Simulator
        </button>
      </div>

      {activeTab !== 'preview' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            type="text"
            placeholder={`Search ${activeTab === 'priceBooks' ? 'price books' : 'promotions'} by name or code...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-80 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
          />
        </div>
      )}

      {/* PRICE BOOKS TAB */}
      {activeTab === 'priceBooks' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {priceBooksQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading price books...</div>
          ) : priceBookRows.length === 0 ? (
            <EmptyState
              title="No tier price books configured"
              description="Click '+ Create Price Book' above to configure specialized rate cards."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Price Book Code & Name</th>
                    <th className="px-4 py-3 text-center">Scope Type / Tier</th>
                    <th className="px-4 py-3 text-center">Valid From</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {priceBookRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 font-bold text-slate-950">
                        <div>{row.name}</div>
                        <div className="text-xs font-mono text-cyan-700">{row.code}</div>
                      </td>
                      <td className="px-4 py-3 text-center uppercase font-semibold text-slate-800">
                        {row.scopeType}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        {new Date(row.validFrom).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* PROMOTIONS TAB */}
      {activeTab === 'promotions' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {promotionsQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading promotional schemes...</div>
          ) : promoRows.length === 0 ? (
            <EmptyState
              title="No promotional schemes active"
              description="Click '+ Create Promo Scheme' above to configure percentage and volume discounts."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Promotion Code & Scheme Name</th>
                    <th className="px-4 py-3 text-center">Discount Type</th>
                    <th className="px-4 py-3 text-center">Validity Period</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {promoRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/75">
                      <td className="px-4 py-3 font-bold text-slate-950">
                        <div>{row.name}</div>
                        <div className="text-xs font-mono text-cyan-700">{row.code}</div>
                      </td>
                      <td className="px-4 py-3 text-center uppercase font-semibold text-emerald-800">
                        {row.promoType.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700 text-xs font-medium">
                        {new Date(row.validFrom).toLocaleDateString('en-IN')} – {new Date(row.validTo).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                          {row.isActive ? 'Active' : 'Expired'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* LIVE PRICING PREVIEW TAB */}
      {activeTab === 'preview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-sm">
            <h2 className="text-lg font-bold text-slate-950 border-b border-slate-100 pb-2">Simulator Test Parameters</h2>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Retailer Shop Account</label>
              <select
                value={previewForm.retailerId}
                onChange={(e) => setPreviewForm({ ...previewForm, retailerId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
              >
                {retailerList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.shopName} ({r.retailerCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Product Variant</label>
              <select
                value={previewForm.variantId}
                onChange={(e) => setPreviewForm({ ...previewForm, variantId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
              >
                {productList.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.productName || p.variantName || p.sku} (₹{Number(p.offerPrice || 25).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Simulation Order Quantity</label>
              <input
                type="number"
                min={1}
                value={previewForm.qty}
                onChange={(e) => setPreviewForm({ ...previewForm, qty: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-cyan-600 bg-cyan-50/30 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-cyan-950 border-b border-cyan-200 pb-2">Calculated Effective Pricing Output</h2>
              {previewQuery.isLoading ? (
                <div className="mt-4 text-sm text-slate-500">Calculating preview...</div>
              ) : previewQuery.data?.data ? (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-cyan-200/60 pb-2">
                    <span className="text-slate-600">Standard Base Price (MRP):</span>
                    <strong className="text-slate-900">{formatCurrency(previewQuery.data.data.basePrice)} / unit</strong>
                  </div>
                  <div className="flex justify-between border-b border-cyan-200/60 pb-2">
                    <span className="text-slate-600">Applied Pricing Scheme / Book:</span>
                    <strong className="text-cyan-800 font-mono text-xs">{previewQuery.data.data.appliedPromoName}</strong>
                  </div>
                  <div className="flex justify-between border-b border-cyan-200/60 pb-2">
                    <span className="text-slate-600">Total Discount Benefit:</span>
                    <strong className="text-emerald-700">- {formatCurrency(previewQuery.data.data.appliedDiscount)} / unit</strong>
                  </div>
                  <div className="flex justify-between border-b border-cyan-200/60 pb-2 font-bold text-slate-950">
                    <span>Effective Unit Rate:</span>
                    <span className="text-cyan-900">{formatCurrency(previewQuery.data.data.effectivePrice)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-xl font-black text-slate-950">
                    <span>Total Line Amount ({previewForm.qty} units):</span>
                    <span className="text-emerald-800">{formatCurrency(previewQuery.data.data.lineTotal)}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-xs text-rose-600 font-semibold">Select valid parameters to preview pricing rules.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE PRICE BOOK MODAL */}
      {isPriceBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Configure Tier Price Book</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPBMutation.mutate(priceBookForm);
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Price Book Code *</label>
                <input
                  required
                  value={priceBookForm.code}
                  onChange={(e) => setPriceBookForm({ ...priceBookForm, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 uppercase font-mono outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Price Book Name *</label>
                <input
                  required
                  placeholder="Patna Special Tier 1 Price Book"
                  value={priceBookForm.name}
                  onChange={(e) => setPriceBookForm({ ...priceBookForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scope Type / Tier *</label>
                <select
                  value={priceBookForm.bookType}
                  onChange={(e) => setPriceBookForm({ ...priceBookForm, bookType: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                >
                  <option value="default">Default Base Price Book</option>
                  <option value="tier_1">Tier 1 Key Accounts</option>
                  <option value="tier_2">Tier 2 Standard Accounts</option>
                  <option value="seasonal">Seasonal Summer Scheme</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPriceBookModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPBMutation.isPending}
                  className="rounded-xl border border-cyan-600 bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {createPBMutation.isPending ? 'Creating...' : 'Confirm Price Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PROMO MODAL */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Create Promotional Discount Scheme</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPromoMutation.mutate(promoForm);
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Promotion Code *</label>
                <input
                  required
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 uppercase font-mono outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scheme Name *</label>
                <input
                  required
                  placeholder="Monsoon Volume 5% Discount Scheme"
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={promoForm.discountType}
                    onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="percentage_off">Percentage Off (%)</option>
                    <option value="flat_discount">Flat Discount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Value *</label>
                  <input
                    required
                    type="number"
                    value={promoForm.discountValue}
                    onChange={(e) => setPromoForm({ ...promoForm, discountValue: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold text-emerald-700 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPromoMutation.isPending}
                  className="rounded-xl border border-slate-800 bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  {createPromoMutation.isPending ? 'Creating...' : 'Confirm Promo Scheme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
