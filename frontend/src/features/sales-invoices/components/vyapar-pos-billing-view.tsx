'use client';

import React, { useMemo, useState } from 'react';
import { LookupInput } from '@/components/ui/lookup-input';
import { LookupsApi } from '@/features/lookups/api';
import { RetailersApi } from '@/features/retailers/api';
import { SalesInvoicesApi } from '@/features/sales-invoices/api';
import { formatCurrency } from '@/lib/utils/number';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type PosTab = {
  id: string;
  title: string;
  isCreditMode: boolean;
  partyId: string;
  phoneNo: string;
  invoiceNo: string;
  invoiceDate: string;
  stateOfSupply: string;
  priceWithTax: boolean;
  roundOff: boolean;
  items: Array<{
    id: string;
    variantId: string;
    itemName: string;
    qty: number;
    unit: string;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
  }>;
  terms: string;
  description: string;
  showTerms: boolean;
  showDescription: boolean;
  showImage: boolean;
  showDocument: boolean;
};

const DEFAULT_TAB = (tabIndex: number): PosTab => ({
  id: `tab-${Date.now()}-${tabIndex}`,
  title: `Sale #${tabIndex}`,
  isCreditMode: false, // false = Cash by default, true = Credit
  partyId: '',
  phoneNo: '',
  invoiceNo: `${tabIndex}`,
  invoiceDate: new Date().toISOString().slice(0, 10),
  stateOfSupply: '10 - Bihar',
  priceWithTax: false,
  roundOff: true,
  items: [
    {
      id: `item-${Date.now()}-1`,
      variantId: '',
      itemName: '',
      qty: 1,
      unit: 'NONE',
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
    },
    {
      id: `item-${Date.now()}-2`,
      variantId: '',
      itemName: '',
      qty: 1,
      unit: 'NONE',
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
    },
  ],
  terms: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if not paid within credit period.',
  description: 'Thanks for doing business with us!',
  showTerms: false,
  showDescription: false,
  showImage: false,
  showDocument: false,
});

export function VyaparPosBillingView({
  onCloseModal,
  isEmbedded = false,
}: {
  onCloseModal?: () => void;
  isEmbedded?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tabs, setTabs] = useState<PosTab[]>([DEFAULT_TAB(1), DEFAULT_TAB(2)]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [partySearch, setPartySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showPartyNotFoundAlert, setShowPartyNotFoundAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) || tabs[0], [tabs, activeTabId]);

  const updateActiveTab = (updates: Partial<PosTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, ...updates } : t)));
  };

  const updateItemRow = (itemId: string, itemUpdates: Partial<PosTab['items'][number]>) => {
    const updatedItems = activeTab.items.map((item) => {
      if (item.id !== itemId) return item;
      const next = { ...item, ...itemUpdates };
      
      // Recompute discounts and tax dynamically
      const lineBaseBeforeDisc = Math.max(0, next.qty * next.unitPrice);
      if (typeof itemUpdates.discountPercent !== 'undefined') {
        next.discountAmount = Number(((lineBaseBeforeDisc * next.discountPercent) / 100).toFixed(2));
      } else if (typeof itemUpdates.discountAmount !== 'undefined' && lineBaseBeforeDisc > 0) {
        next.discountPercent = Number(((next.discountAmount / lineBaseBeforeDisc) * 100).toFixed(2));
      }
      
      const taxable = Math.max(0, lineBaseBeforeDisc - (next.discountAmount || 0));
      next.taxAmount = Number(((taxable * (next.taxRate || 0)) / 100).toFixed(2));
      return next;
    });
    updateActiveTab({ items: updatedItems });
  };

  const addItemRow = () => {
    updateActiveTab({
      items: [
        ...activeTab.items,
        {
          id: `item-${Date.now()}-${activeTab.items.length + 1}`,
          variantId: '',
          itemName: '',
          qty: 1,
          unit: 'NONE',
          unitPrice: 0,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: 0,
          taxAmount: 0,
        },
      ],
    });
  };

  const removeItemRow = (itemId: string) => {
    if (activeTab.items.length <= 1) return;
    updateActiveTab({ items: activeTab.items.filter((i) => i.id !== itemId) });
  };

  const addNewTab = () => {
    const nextIdx = tabs.length + 1;
    const newTab = DEFAULT_TAB(nextIdx);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  // Queries for Live Party / Retailer Lookup
  const retailersQuery = useQuery({
    queryKey: ['retailers', 'lookup', partySearch],
    queryFn: () => RetailersApi.list({ search: partySearch, limit: 30, page: 1 }),
  });
  const retailerList = retailersQuery.data?.data ?? [];

  // Queries for Live Product Variant Lookup
  const productsQuery = useQuery({
    queryKey: ['products', 'lookup', productSearch],
    queryFn: () => LookupsApi.productVariants({ search: productSearch, limit: 30 }),
  });
  const productList = Array.isArray(productsQuery.data) ? productsQuery.data : ((productsQuery.data as any)?.data ?? []);

  const selectedRetailer = useMemo(
    () => retailerList.find((r) => r.id === activeTab.partyId) || null,
    [retailerList, activeTab.partyId],
  );

  // Computations
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let rawSubtotal = 0;

    for (const item of activeTab.items) {
      if (!item.variantId && !item.itemName && item.unitPrice === 0) continue;
      totalQty += Number(item.qty) || 0;
      totalDiscount += Number(item.discountAmount) || 0;
      totalTax += Number(item.taxAmount) || 0;
      const lineBase = Math.max(0, item.qty * item.unitPrice - (item.discountAmount || 0));
      rawSubtotal += lineBase;
    }

    const rawGrandTotal = Math.max(0, rawSubtotal + totalTax);
    const grandTotal = activeTab.roundOff ? Math.round(rawGrandTotal) : Number(rawGrandTotal.toFixed(2));
    const roundOffDelta = Number((grandTotal - rawGrandTotal).toFixed(2));

    return {
      totalQty,
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      rawSubtotal: Number(rawSubtotal.toFixed(2)),
      rawGrandTotal: Number(rawGrandTotal.toFixed(2)),
      grandTotal,
      roundOffDelta,
    };
  }, [activeTab.items, activeTab.roundOff]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validItems = activeTab.items.filter((i) => (i.variantId || i.itemName) && i.qty > 0);
      const targetPartyId =
        activeTab.partyId || selectedRetailer?.id || (retailerList[0]?.id ?? '11111111-1111-1111-1111-111111111111');

      return SalesInvoicesApi.generate({
        retailerId: targetPartyId,
        source: 'assisted_billing',
        status: 'posted',
        invoiceDate: activeTab.invoiceDate,
        paymentMode: activeTab.isCreditMode ? undefined : 'UPI',
        amountReceived: activeTab.isCreditMode ? 0 : totals.grandTotal,
        remarks: `${activeTab.title}: ${activeTab.description || 'Vyapar POS Billing Studio'}`,
        items: validItems.map((item) => ({
          variantId: item.variantId || (productList[0]?.id ?? '22222222-2222-2222-2222-222222222222'),
          billedQty: item.qty,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          taxRate: item.taxRate,
          remarks: item.itemName,
        })),
      });
    },
    onSuccess: (res) => {
      setSuccessMessage(
        `Sale Invoice #${res.data?.invoiceNo || activeTab.invoiceNo} saved & posted successfully to ${
          activeTab.isCreditMode ? 'Credit Ledger' : 'Cash Receipt'
        }!`,
      );
      if (res.data?.id) {
        setCreatedInvoiceId(res.data.id);
      }
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['retailers'] });
    },
    onError: (err) => {
      setSuccessMessage(`Error: ${err instanceof Error ? err.message : 'Failed to save sale invoice'}`);
    },
  });

  return (
    <div className={`flex flex-col bg-slate-100/90 text-slate-900 ${isEmbedded ? 'rounded-2xl border border-slate-300 overflow-hidden shadow-xl' : 'min-h-[calc(100vh-5rem)]'}`}>
      {/* Top Multi-Tab Bar (Vyapar Style: Sale #1 | Sale #2 | +) */}
      <div className="flex items-center justify-between border-b border-slate-300 bg-white px-4 pt-2 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2.5 rounded-t-xl border-x border-t px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'border-slate-300 bg-slate-50 text-cyan-800 shadow-xs translate-y-[1px]'
                    : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.title}</span>
                {tabs.length > 1 && (
                  <span
                    onClick={(e) => closeTab(tab.id, e)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-700"
                  >
                    ✕
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={addNewTab}
            title="Open New Sale Draft Tab"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-base font-black text-white shadow-sm hover:bg-cyan-700 hover:scale-105 transition-transform ml-1 cursor-pointer"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-3 pb-1">
          <Link
            href="/app/sales-invoices/generate"
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <span>🖨️</span> Print Settings (Tally Layouts)
          </Link>
          {onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Billing Studio Workspace */}
      <div className="flex-1 space-y-4 p-4 md:p-6 bg-slate-50">
        {/* Top Title & Credit/Cash Switch Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <h1 className="text-2xl font-black tracking-tight text-slate-950">Sale</h1>

            {/* Vyapar Credit vs Cash Switch */}
            <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-300 p-1 shadow-2xs">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-xl cursor-pointer transition-colors ${activeTab.isCreditMode ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`} onClick={() => updateActiveTab({ isCreditMode: true })}>
                Credit
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-xl cursor-pointer transition-colors ${!activeTab.isCreditMode ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`} onClick={() => updateActiveTab({ isCreditMode: false })}>
                Cash
              </span>
            </div>
          </div>

          {/* Party Name Alert Pill if not found */}
          {showPartyNotFoundAlert && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-300 bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md animate-in fade-in slide-in-from-top-2">
              <span>⚠ Party name doesn&apos;t exist, please create a new party.</span>
              <Link
                href="/app/retailers?action=new"
                className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-rose-700 hover:bg-rose-50 shadow-xs"
              >
                + Create Party
              </Link>
              <button type="button" onClick={() => setShowPartyNotFoundAlert(false)} className="font-black hover:opacity-80">
                ✕
              </button>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-2.5 text-xs font-bold text-emerald-950 shadow-sm animate-in fade-in">
              <span>✔ {successMessage}</span>
              {createdInvoiceId && (
                <Link
                  href={`/app/sales-invoices/${createdInvoiceId}`}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-white hover:bg-emerald-700 font-extrabold shadow-2xs"
                >
                  View Invoice & Print
                </Link>
              )}
              <button type="button" onClick={() => setSuccessMessage(null)} className="font-extrabold text-emerald-800">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Header Inputs Section (Party Search | Phone | Invoice Info) */}
        <div className="grid gap-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-xs md:grid-cols-12 items-end">
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Search by Name/Phone <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <LookupInput
                resource="retailers"
                value={activeTab.partyId}
                onChange={(val) => {
                  const target = retailerList.find((r) => r.id === val);
                  updateActiveTab({
                    partyId: val,
                    phoneNo: target?.mobile || activeTab.phoneNo,
                  });
                  if (!target && val && val.length > 2) {
                    setShowPartyNotFoundAlert(true);
                  } else {
                    setShowPartyNotFoundAlert(false);
                  }
                }}
                placeholder="Search party by shop or phone..."
                query={{ limit: 30 }}
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">Phone No.</label>
            <input
              type="text"
              value={activeTab.phoneNo || selectedRetailer?.mobile || ''}
              onChange={(e) => updateActiveTab({ phoneNo: e.target.value })}
              placeholder="e.g. +91 98765 43210"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-cyan-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-5 grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Invoice Number</label>
              <input
                type="text"
                value={activeTab.invoiceNo}
                onChange={(e) => updateActiveTab({ invoiceNo: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-900 text-center font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Invoice Date</label>
              <input
                type="date"
                value={activeTab.invoiceDate}
                onChange={(e) => updateActiveTab({ invoiceDate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">State of supply</label>
              <select
                value={activeTab.stateOfSupply}
                onChange={(e) => updateActiveTab({ stateOfSupply: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-900 truncate"
              >
                <option value="10 - Bihar">10 - Bihar</option>
                <option value="09 - Uttar Pradesh">09 - Uttar Pradesh</option>
                <option value="19 - West Bengal">19 - West Bengal</option>
                <option value="29 - Karnataka">29 - Karnataka</option>
                <option value="27 - Maharashtra">27 - Maharashtra</option>
                <option value="07 - Delhi">07 - Delhi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Item Grid Table (Vyapar Style: # | ITEM | QTY | UNIT | PRICE/UNIT | DISCOUNT | TAX | AMOUNT | ⚙) */}
        <div className="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[860px]">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                  <th className="py-3 pl-4 pr-2 w-10 text-center border-r border-slate-200">#</th>
                  <th className="py-3 px-3 min-w-[220px] border-r border-slate-200">ITEM</th>
                  <th className="py-3 px-2.5 w-20 text-center border-r border-slate-200">QTY</th>
                  <th className="py-3 px-2.5 w-24 text-center border-r border-slate-200">UNIT</th>
                  <th className="py-2 px-2.5 w-36 text-center border-r border-slate-200 bg-slate-200/60">
                    <div className="flex items-center justify-between gap-1">
                      <span>PRICE/UNIT</span>
                      <select
                        value={activeTab.priceWithTax ? 'with' : 'without'}
                        onChange={(e) => updateActiveTab({ priceWithTax: e.target.value === 'with' })}
                        className="rounded bg-white px-1 py-0.5 text-[9px] font-extrabold text-cyan-900 border border-slate-300 focus:outline-none"
                      >
                        <option value="without">Without Tax v</option>
                        <option value="with">With Tax v</option>
                      </select>
                    </div>
                  </th>
                  <th className="py-2 px-2 w-44 text-center border-r border-slate-200">
                    <div className="border-b border-slate-300 pb-1 mb-1 font-black">DISCOUNT</div>
                    <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-500">
                      <span>%</span>
                      <span>AMOUNT</span>
                    </div>
                  </th>
                  <th className="py-2 px-2 w-48 text-center border-r border-slate-200">
                    <div className="border-b border-slate-300 pb-1 mb-1 font-black">TAX</div>
                    <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-500">
                      <span>%</span>
                      <span>AMOUNT</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 w-28 text-right font-black">AMOUNT</th>
                  <th className="py-3 pr-4 pl-2 w-10 text-center">⚙</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeTab.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-cyan-50/30 transition-colors group">
                    <td className="py-3 pl-4 pr-2 text-center font-bold text-slate-500 border-r border-slate-100 font-mono">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100">
                      <LookupInput
                        resource="productVariants"
                        value={item.variantId}
                        onChange={(val) => {
                          const product = productList.find((p: any) => p.id === val);
                          updateItemRow(item.id, {
                            variantId: val,
                            itemName: product ? `${product.productName} (${product.variantName || product.sku})` : item.itemName,
                            unitPrice: Number(product?.price || product?.defaultRetailerPrice || product?.unitPrice || 25),
                            taxRate: Number(product?.taxRate || 5),
                            unit: product?.unitName || 'Pouch',
                          });
                        }}
                        placeholder="Type item name or scan barcode..."
                        query={{ limit: 30 }}
                      />
                    </td>
                    <td className="py-2 px-2 border-r border-slate-100">
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => updateItemRow(item.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center font-bold text-slate-900 focus:bg-white focus:border-cyan-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2 border-r border-slate-100">
                      <select
                        value={item.unit}
                        onChange={(e) => updateItemRow(item.id, { unit: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-center font-bold text-slate-700 focus:bg-white focus:border-cyan-500 focus:outline-none text-[11px]"
                      >
                        <option value="NONE">NONE</option>
                        <option value="Pouch">Pouch</option>
                        <option value="Crate">Crate</option>
                        <option value="Box">Box</option>
                        <option value="Ltr">Ltr</option>
                        <option value="Kg">Kg</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 border-r border-slate-100 bg-slate-50/40">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItemRow(item.id, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right font-extrabold text-slate-900 focus:border-cyan-500 focus:outline-none font-mono"
                      />
                    </td>
                    <td className="py-2 px-2 border-r border-slate-100">
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          placeholder="0%"
                          value={item.discountPercent || ''}
                          onChange={(e) => updateItemRow(item.id, { discountPercent: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1 text-center font-bold text-slate-800 focus:bg-white focus:outline-none"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          placeholder="₹0"
                          value={item.discountAmount || ''}
                          onChange={(e) => updateItemRow(item.id, { discountAmount: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1 text-right font-bold text-slate-800 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-2 border-r border-slate-100">
                      <div className="grid grid-cols-2 gap-1.5 items-center">
                        <select
                          value={item.taxRate}
                          onChange={(e) => updateItemRow(item.id, { taxRate: Number(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-1 py-1 font-bold text-slate-800 focus:bg-white focus:outline-none text-[10px]"
                        >
                          <option value={0}>NONE</option>
                          <option value={5}>5% GST</option>
                          <option value={12}>12% GST</option>
                          <option value={18}>18% GST</option>
                          <option value={28}>28% GST</option>
                        </select>
                        <div className="text-right font-extrabold text-cyan-900 font-mono px-1">
                          {formatCurrency(item.taxAmount || 0)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-950 font-mono">
                      {formatCurrency(Math.max(0, item.qty * item.unitPrice - (item.discountAmount || 0) + (item.taxAmount || 0)))}
                    </td>
                    <td className="py-2 pr-4 pl-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(item.id)}
                        disabled={activeTab.items.length <= 1}
                        title="Remove Row"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-20 transition-colors mx-auto cursor-pointer"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Summary Row (`ADD ROW | TOTAL | QTY | DISCOUNT | TAX | AMOUNT`) */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-300 bg-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center gap-2 rounded-xl border border-cyan-500 bg-white px-4 py-2 text-xs font-black text-cyan-700 shadow-2xs hover:bg-cyan-50 hover:text-cyan-900 transition-colors cursor-pointer"
            >
              <span className="text-base font-black leading-none">+</span>
              <span>ADD ROW</span>
            </button>

            <div className="flex flex-wrap items-center gap-6 text-xs font-black uppercase text-slate-800">
              <span className="text-slate-500 tracking-wider">TOTAL</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold">QTY:</span>
                <span className="font-mono text-sm">{totals.totalQty}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold">DISCOUNT:</span>
                <span className="font-mono text-sm text-emerald-700">{formatCurrency(totals.totalDiscount)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold">TAX:</span>
                <span className="font-mono text-sm text-cyan-800">{formatCurrency(totals.totalTax)}</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-300">
                <span className="text-xs text-slate-500 font-bold">AMOUNT:</span>
                <span className="font-mono text-base font-black text-slate-950">{formatCurrency(totals.rawGrandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer & Action Section (`[+ Add Terms] [+ Add Description] [+ Add Image] | Round Off | Total | [Save]`) */}
        <div className="grid gap-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => updateActiveTab({ showTerms: !activeTab.showTerms })}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  activeTab.showTerms ? 'border-cyan-500 bg-cyan-50 text-cyan-900' : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>☰</span>
                <span>{activeTab.showTerms ? 'HIDE TERMS & CONDITIONS' : 'ADD TERMS & CONDITIONS'}</span>
              </button>

              <button
                type="button"
                onClick={() => updateActiveTab({ showDescription: !activeTab.showDescription })}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  activeTab.showDescription ? 'border-cyan-500 bg-cyan-50 text-cyan-900' : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>📄</span>
                <span>{activeTab.showDescription ? 'HIDE DESCRIPTION' : 'ADD DESCRIPTION'}</span>
              </button>

              <button
                type="button"
                onClick={() => updateActiveTab({ showImage: !activeTab.showImage })}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <span>📷</span>
                <span>ADD IMAGE / LOGO</span>
              </button>
            </div>

            {activeTab.showTerms && (
              <div className="space-y-1 animate-in fade-in duration-150">
                <label className="block text-[11px] font-bold uppercase text-slate-600">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={activeTab.terms}
                  onChange={(e) => updateActiveTab({ terms: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            )}

            {activeTab.showDescription && (
              <div className="space-y-1 animate-in fade-in duration-150">
                <label className="block text-[11px] font-bold uppercase text-slate-600">Sale Description / Notes</label>
                <textarea
                  rows={2}
                  value={activeTab.description}
                  onChange={(e) => updateActiveTab({ description: e.target.value })}
                  placeholder="Enter remarks or sale description..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Right Side: Round Off | Total | Share | Save */}
          <div className="lg:col-span-5 flex flex-col items-end gap-4 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0">
            <div className="w-full flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={activeTab.roundOff}
                  onChange={(e) => updateActiveTab({ roundOff: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span>Round Off</span>
              </label>
              <div className="w-24 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-right font-mono text-xs font-bold text-slate-700">
                {totals.roundOffDelta >= 0 ? `+${totals.roundOffDelta}` : totals.roundOffDelta}
              </div>
            </div>

            <div className="w-full flex items-center justify-between gap-4 rounded-2xl border-2 border-slate-800 bg-slate-900 px-5 py-3.5 text-white shadow-md">
              <span className="text-sm font-black uppercase tracking-wider text-slate-300">Total</span>
              <span className="font-mono text-2xl font-black tracking-tight text-cyan-300">
                {formatCurrency(totals.grandTotal)}
              </span>
            </div>

            <div className="w-full flex items-center justify-end gap-3 pt-2">
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  <span>Share</span>
                  <span>v</span>
                </button>
                <div className="absolute right-0 bottom-11 hidden group-hover:block w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50">
                  <Link
                    href="/app/sales-invoices/generate"
                    className="block rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-900"
                  >
                    🖨️ Print Tax Invoice
                  </Link>
                  <button
                    type="button"
                    onClick={() => alert('WhatsApp sharing interface launched!')}
                    className="w-full text-left rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                  >
                    💬 WhatsApp Share
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#007BFF] px-8 py-3 text-sm font-black tracking-wide text-white shadow-lg hover:bg-[#0062cc] active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
