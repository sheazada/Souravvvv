'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { LookupsApi } from '@/features/lookups/api';
import { RetailersApi } from '@/features/retailers/api';
import { SalesInvoicesApi } from '@/features/sales-invoices/api';
import { formatCurrency } from '@/lib/utils/number';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type InvoiceLine = {
  id: string;
  variantId: string;
  itemName: string;
  sku: string;
  hsnSac: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
};

function amountInWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Zero Rupees only';
  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if ((n = n.toString() as any).length > 9) return 'Overflow';
    const nArr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!nArr) return '';
    let str = '';
    str += Number(nArr[1]) !== 0 ? (a[Number(nArr[1])] || b[nArr[1][0] as any] + ' ' + a[nArr[1][1] as any]) + 'Crore ' : '';
    str += Number(nArr[2]) !== 0 ? (a[Number(nArr[2])] || b[nArr[2][0] as any] + ' ' + a[nArr[2][1] as any]) + 'Lakh ' : '';
    str += Number(nArr[3]) !== 0 ? (a[Number(nArr[3])] || b[nArr[3][0] as any] + ' ' + a[nArr[3][1] as any]) + 'Thousand ' : '';
    str += Number(nArr[4]) !== 0 ? (a[Number(nArr[4])] || b[nArr[4][0] as any] + ' ' + a[nArr[4][1] as any]) + 'Hundred ' : '';
    str +=
      Number(nArr[5]) !== 0
        ? (str !== '' ? 'and ' : '') + (a[Number(nArr[5])] || b[nArr[5][0] as any] + ' ' + a[nArr[5][1] as any])
        : '';
    return str.trim();
  }

  const rupees = Math.floor(num);
  const paisa = Math.round((num - rupees) * 100);
  let result = `${inWords(rupees)} Rupees`;
  if (paisa > 0) {
    result += ` and ${inWords(paisa)} Paisa`;
  }
  return `${result} only`;
}

export function GenerateInvoiceView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  // Printer Theme & Layout State
  const [printerTab, setPrinterTab] = useState<'regular' | 'thermal'>('regular');
  const [layoutTheme, setLayoutTheme] = useState<'tally' | 'landscape1' | 'landscape2' | 'gst'>('tally');
  const [isRegularDefault, setIsRegularDefault] = useState(true);
  const [printRepeatHeader, setPrintRepeatHeader] = useState(true);

  // Company Header State
  const [companyName, setCompanyName] = useState('Sudha Dairy Distributor Patna');
  const [companyAddress, setCompanyNameAddress] = useState('Plot No. 12, Shop No. 4, Boring Road, Patna, Bihar - 800001');
  const [companyPhone, setCompanyPhone] = useState('+91 91234 56789 / info@sudhadairy.com');
  const [companyGstin, setCompanyGstin] = useState('10ABCDE1234F1Z5');

  // Retailer Selection State
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('');
  const [retailerSearch, setRetailerSearch] = useState('');
  const [isRetailerDropdownOpen, setIsRetailerDropdownOpen] = useState(false);

  // Barcode / Product Search
  const [productSearch, setProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  // Line Items State
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      id: 'line-1',
      variantId: '',
      itemName: 'Sudha Gold Full Cream Milk 500ml',
      sku: 'MILK-FC-500',
      hsnSac: '0401',
      qty: 20,
      unit: 'Pouch',
      unitPrice: 28,
      discountAmount: 10,
      taxRate: 0,
    },
  ]);

  // Summary & Payment State
  const [roundOff, setRoundOff] = useState(true);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'credit'>('upi');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [remarks, setRemarks] = useState('Thanks for doing business with us!');
  const [terms, setTerms] = useState('1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. on overdue accounts.');

  // Lookups Queries
  const retailersQuery = useQuery({
    queryKey: ['retailers', 'lookup', retailerSearch],
    queryFn: () => RetailersApi.list({ search: retailerSearch, limit: 30, page: 1 }),
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'lookup', productSearch],
    queryFn: () => LookupsApi.productVariants({ search: productSearch, limit: 25 }),
  });

  const retailerList = retailersQuery.data?.data ?? [];
  const productList = Array.isArray(productsQuery.data) ? productsQuery.data : ((productsQuery.data as any)?.data ?? []);

  const selectedRetailer = useMemo(
    () => retailerList.find((r) => r.id === selectedRetailerId) || null,
    [retailerList, selectedRetailerId],
  );

  // Calculations
  const subtotal = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  const discountTotal = lines.reduce((sum, line) => sum + line.discountAmount, 0);
  const taxableTotal = Math.max(0, subtotal - discountTotal);

  const taxSummary = useMemo(() => {
    const map = new Map<number, { hsn: string; taxable: number; taxRate: number; taxAmount: number }>();
    for (const line of lines) {
      const lineBase = Math.max(0, line.qty * line.unitPrice - line.discountAmount);
      const taxAmt = lineBase * (line.taxRate / 100);
      const existing = map.get(line.taxRate) ?? { hsn: line.hsnSac || '0401', taxable: 0, taxRate: line.taxRate, taxAmount: 0 };
      existing.taxable += lineBase;
      existing.taxAmount += taxAmt;
      map.set(line.taxRate, existing);
    }
    return Array.from(map.values());
  }, [lines]);

  const taxTotal = taxSummary.reduce((sum, row) => sum + row.taxAmount, 0);
  const rawGrandTotal = Math.max(0, taxableTotal + taxTotal);
  const grandTotal = roundOff ? Math.round(rawGrandTotal) : Number(rawGrandTotal.toFixed(2));
  const roundOffDelta = Number((grandTotal - rawGrandTotal).toFixed(2));
  const balance = Math.max(0, grandTotal - (Number(amountReceived) || 0));

  // Auto set amountReceived when payment mode changes
  useEffect(() => {
    if (paymentMode === 'credit') {
      setAmountReceived(0);
    } else if (amountReceived === 0 && grandTotal > 0) {
      setAmountReceived(grandTotal);
    }
  }, [paymentMode, grandTotal]);

  // Mutation
  const generateMutation = useMutation({
    mutationFn: (status: 'draft' | 'posted') =>
      SalesInvoicesApi.generate({
        retailerId: selectedRetailerId || (retailerList[0]?.id ?? '11111111-1111-1111-1111-111111111111'),
        source: 'assisted_billing',
        status,
        paymentMode: paymentMode === 'credit' ? undefined : paymentMode,
        amountReceived: paymentMode === 'credit' ? 0 : Number(amountReceived || 0),
        remarks,
        items: lines
          .filter((l) => l.variantId || l.itemName)
          .map((l) => ({
            variantId: l.variantId || (productList[0]?.id ?? '22222222-2222-2222-2222-222222222222'),
            billedQty: l.qty,
            unitPrice: l.unitPrice,
            discountAmount: l.discountAmount,
            taxRate: l.taxRate,
            remarks: l.itemName,
          })),
      }),
    onSuccess: (res, status) => {
      setMessage(`Tax Invoice ${res.data?.invoiceNo || 'created'} ${status === 'posted' ? 'posted & payment confirmed!' : 'saved as draft.'}`);
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['retailers'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to generate invoice'),
  });

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        id: `line-${Date.now()}`,
        variantId: '',
        itemName: '',
        sku: '',
        hsnSac: '0401',
        qty: 1,
        unit: 'Pouch',
        unitPrice: 0,
        discountAmount: 0,
        taxRate: 0,
      },
    ]);
  };

  const handleSelectProduct = (product: any, index: number) => {
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      variantId: product.id,
      itemName: product.productName || product.variantName || product.sku,
      sku: product.sku,
      hsnSac: product.hsnSac || '0401',
      unitPrice: Number(product.price || product.unitPrice || 25),
      taxRate: Number(product.taxRate || 0),
    };
    setLines(updated);
    setIsProductDropdownOpen(false);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Vyapar/Tally Suite Mode Switcher */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white p-2 shadow-xs">
        <Link
          href="/app/sales-invoices/create"
          className="flex-1 text-center rounded-xl py-2.5 px-4 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-100 transition-colors"
        >
          🛍️ Add Sale Studio (Vyapar POS Billing: Sale #1 | Sale #2)
        </Link>
        <div className="flex-1 text-center rounded-xl bg-cyan-600 py-2.5 px-4 text-xs font-black uppercase tracking-wide text-white shadow-xs">
          🖨️ Print Layout Settings (Tally Theme & Thermal Customizer)
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Tax Invoice Generation (POS & Accounting Suite)</h1>
          <p className="mt-1 text-sm text-slate-600">
            Professional Tally & Vyapar layout engine. Search retailers, scan barcodes, and allocate payments instantly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => generateMutation.mutate('draft')}
            disabled={generateMutation.isPending || !selectedRetailerId}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Saving...' : '💾 Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => generateMutation.mutate('posted')}
            disabled={generateMutation.isPending || !selectedRetailerId}
            className="rounded-xl border border-cyan-600 bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Posting...' : '⚡ Generate & Post Invoice'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-slate-300 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900"
          >
            🖨️ Print Invoice
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 flex items-center justify-between shadow-sm">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Printer & Theme Settings Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPrinterTab('regular')}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase transition ${
                printerTab === 'regular' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Regular Printer (A4 / Tally)
            </button>
            <button
              type="button"
              onClick={() => setPrinterTab('thermal')}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase transition ${
                printerTab === 'thermal' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Thermal Printer (POS 3-Inch)
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isRegularDefault}
                onChange={(e) => setIsRegularDefault(e.target.checked)}
                className="h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500"
              />
              Make Regular Printer Default
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={printRepeatHeader}
                onChange={(e) => setPrintRepeatHeader(e.target.checked)}
                className="h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500"
              />
              Print repeat header in all pages
            </label>
          </div>
        </div>

        {printerTab === 'regular' && (
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { id: 'tally', label: 'Tally Theme', icon: '📄' },
              { id: 'landscape1', label: 'Landscape Theme 1', icon: '📃' },
              { id: 'landscape2', label: 'Landscape Theme 2', icon: '📋' },
              { id: 'gst', label: 'GST Theme Professional', icon: '📑' },
            ].map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setLayoutTheme(theme.id as any)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  layoutTheme === theme.id
                    ? 'border-cyan-600 bg-cyan-50 text-cyan-900 ring-1 ring-cyan-600'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{theme.icon}</span>
                <span>{theme.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Split Grid: Left Header/Party & Right Live Invoice Preview */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Configuration Controls */}
        <div className="space-y-6 lg:col-span-5">
          {/* Company Info / Header Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Print Company Info / Header</h2>
            <div className="mt-3 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Address</label>
                <input
                  value={companyAddress}
                  onChange={(e) => setCompanyNameAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact / Email</label>
                  <input
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    value={companyGstin}
                    onChange={(e) => setCompanyGstin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Party / Retailer Selection Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Bill To: Party / Retailer Shop *</h2>
            <div className="mt-3">
              <input
                type="text"
                placeholder="Search Retailer by Shop Name or Phone No..."
                value={retailerSearch}
                onFocus={() => setIsRetailerDropdownOpen(true)}
                onChange={(e) => {
                  setRetailerSearch(e.target.value);
                  setIsRetailerDropdownOpen(true);
                }}
                className="w-full rounded-xl border border-cyan-300 bg-cyan-50/30 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
              />
              {isRetailerDropdownOpen && (
                <div className="absolute left-5 right-5 z-40 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">
                  <div className="flex justify-between border-b border-slate-100 pb-1 px-2 text-[10px] uppercase font-bold text-slate-400">
                    <span>Matching Retailer Accounts</span>
                    <button type="button" onClick={() => setIsRetailerDropdownOpen(false)} className="text-rose-600">Close</button>
                  </div>
                  {retailerList.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500">No retailers found. Click + Add Retailer to create.</div>
                  ) : (
                    retailerList.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSelectedRetailerId(r.id);
                          setRetailerSearch(r.shopName);
                          setIsRetailerDropdownOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-cyan-50"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{r.shopName}</div>
                          <div className="text-slate-500">{r.locality ?? r.city} • {r.mobile}</div>
                        </div>
                        <div className="text-right">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                            {r.retailerCode}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedRetailer ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="flex justify-between font-bold text-slate-950">
                    <span>{selectedRetailer.shopName}</span>
                    <span className="font-mono text-cyan-700">{selectedRetailer.retailerCode}</span>
                  </div>
                  <div className="mt-1 text-slate-600">Mobile: {selectedRetailer.mobile}</div>
                  <div className="mt-0.5 text-slate-600">
                    Locality: {[selectedRetailer.locality, selectedRetailer.city].filter(Boolean).join(', ')}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-rose-600 font-semibold flex items-center gap-1">
                  <span>⚠️ Please search and select a bill-to retailer shop above.</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment & Settlement Controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Payment Direction & Collection Mode</h2>
            <div className="mt-3 space-y-3 text-xs">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'upi', label: 'UPI (Instant Scan & Pay)' },
                  { id: 'cash', label: 'Cash Collection' },
                  { id: 'card', label: 'Card / POS Terminal' },
                  { id: 'credit', label: 'Credit (On Account)' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id as any)}
                    className={`rounded-xl border px-3 py-2 font-bold uppercase transition ${
                      paymentMode === mode.id
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {paymentMode !== 'credit' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <label className="block font-bold text-emerald-950 mb-1">Amount Received Immediately (₹)</label>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(Number(e.target.value))}
                    className="w-full rounded-xl border border-emerald-300 px-3 py-2 text-base font-black text-emerald-900 outline-none focus:border-emerald-600"
                  />
                  <div className="mt-1 flex justify-between text-xs font-semibold text-emerald-800">
                    <span>Grand Total: {formatCurrency(grandTotal)}</span>
                    <span>Balance Remaining: {formatCurrency(balance)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Item Table & Live Tax Invoice Preview */}
        <div className="lg:col-span-7 space-y-6">
          {/* Barcode & Search Product Input Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-base font-bold text-slate-900">Add Items to Invoice *</h2>
              <button
                type="button"
                onClick={handleAddLine}
                className="rounded-xl border border-cyan-600 bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm"
              >
                + ADD ROW
              </button>
            </div>

            <div className="mt-3 relative">
              <input
                type="text"
                placeholder="🔍 Search Product by Name, SKU, or Scan Barcode..."
                value={productSearch}
                onFocus={() => setIsProductDropdownOpen(true)}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setIsProductDropdownOpen(true);
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-cyan-500"
              />
              {isProductDropdownOpen && (
                <div className="absolute left-0 right-0 z-40 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">
                  <div className="flex justify-between border-b border-slate-100 pb-1 px-2 text-[10px] uppercase font-bold text-slate-400">
                    <span>Product Variants Master</span>
                    <button type="button" onClick={() => setIsProductDropdownOpen(false)} className="text-rose-600">Close</button>
                  </div>
                  {productList.map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProduct(p, lines.length - 1)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-cyan-50"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{p.productName || p.variantName || p.sku}</div>
                        <div className="text-slate-500">HSN: {p.hsnSac || '0401'} • SKU: {p.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700">₹{Number(p.price || p.unitPrice || 25).toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400">GST: {p.taxRate || 0}%</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Editable Invoice Line Items Grid */}
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-2 py-2.5 text-center w-8">#</th>
                    <th className="px-3 py-2.5 text-left">ITEM NAME & SKU</th>
                    <th className="px-2 py-2.5 text-center w-16">HSN/SAC</th>
                    <th className="px-2 py-2.5 text-right w-16">QTY</th>
                    <th className="px-2 py-2.5 text-center w-16">UNIT</th>
                    <th className="px-2 py-2.5 text-right w-20">PRICE</th>
                    <th className="px-2 py-2.5 text-right w-20">DISC (₹)</th>
                    <th className="px-2 py-2.5 text-center w-16">GST %</th>
                    <th className="px-3 py-2.5 text-right w-24">AMOUNT (₹)</th>
                    <th className="px-2 py-2.5 text-center w-8">✕</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {lines.map((line, idx) => {
                    const lineBase = Math.max(0, line.qty * line.unitPrice - line.discountAmount);
                    const taxAmt = lineBase * (line.taxRate / 100);
                    const amt = lineBase + taxAmt;
                    return (
                      <tr key={line.id} className="hover:bg-slate-50/60">
                        <td className="px-2 py-2 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={line.itemName}
                            onChange={(e) => {
                              const updated = [...lines];
                              updated[idx].itemName = e.target.value;
                              setLines(updated);
                            }}
                            className="w-full rounded border border-slate-200 px-2 py-1 font-semibold text-slate-900 outline-none focus:border-cyan-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={line.hsnSac}
                            onChange={(e) => {
                              const updated = [...lines];
                              updated[idx].hsnSac = e.target.value;
                              setLines(updated);
                            }}
                            className="w-full rounded border border-slate-200 px-1 py-1 text-center font-mono outline-none focus:border-cyan-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={1}
                            value={line.qty}
                            onChange={(e) => {
                              const updated = [...lines];
                              updated[idx].qty = Number(e.target.value);
                              setLines(updated);
                            }}
                            className="w-full rounded border border-slate-200 px-1.5 py-1 text-right font-bold text-slate-950 outline-none focus:border-cyan-500"
                          />
                        </td>
                        <td className="px-2 py-2 text-center font-medium text-slate-700">{line.unit}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={line.unitPrice}
                            onChange={(e) => {
                              const updated = [...lines];
                              updated[idx].unitPrice = Number(e.target.value);
                              setLines(updated);
                            }}
                            className="w-full rounded border border-slate-200 px-1.5 py-1 text-right font-semibold outline-none focus:border-cyan-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={line.discountAmount}
                            onChange={(e) => {
                              const updated = [...lines];
                              updated[idx].discountAmount = Number(e.target.value);
                              setLines(updated);
                            }}
                            className="w-full rounded border border-slate-200 px-1.5 py-1 text-right font-semibold outline-none focus:border-cyan-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={line.taxRate}
                            onChange={(e) => {
                              const updated = [...lines];
                              updated[idx].taxRate = Number(e.target.value);
                              setLines(updated);
                            }}
                            className="w-full rounded border border-slate-200 px-1 py-1 text-center font-bold text-slate-800 outline-none focus:border-cyan-500"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-950">{formatCurrency(amt)}</td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="text-rose-500 hover:text-rose-700 font-bold"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Live Tally Accounting Tax Summary Table */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="font-bold text-slate-900 mb-2">Tax Summary Breakdown (CGST + SGST Breakdown):</div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
                  <thead className="bg-slate-100 font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-1.5 text-left">HSN / SAC</th>
                      <th className="px-3 py-1.5 text-right">Taxable Amount (₹)</th>
                      <th className="px-3 py-1.5 text-center">CGST Rate % / Amt</th>
                      <th className="px-3 py-1.5 text-center">SGST Rate % / Amt</th>
                      <th className="px-3 py-1.5 text-right">Total Tax Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {taxSummary.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-1.5 font-mono font-semibold">{row.hsn}</td>
                        <td className="px-3 py-1.5 text-right font-medium">{formatCurrency(row.taxable)}</td>
                        <td className="px-3 py-1.5 text-center">
                          {row.taxRate / 2}% (₹{(row.taxAmount / 2).toFixed(2)})
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {row.taxRate / 2}% (₹{(row.taxAmount / 2).toFixed(2)})
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold text-slate-900">{formatCurrency(row.taxAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Calculations Card */}
            <div className="mt-4 flex flex-col items-end gap-1 border-t border-slate-200 pt-3 text-sm">
              <div className="flex w-64 justify-between text-slate-600">
                <span>Sub Total:</span>
                <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex w-64 justify-between text-slate-600">
                <span>Discount Total:</span>
                <span className="font-bold text-emerald-700">- {formatCurrency(discountTotal)}</span>
              </div>
              <div className="flex w-64 justify-between text-slate-600">
                <span>Total Tax Amount:</span>
                <span className="font-bold text-slate-900">{formatCurrency(taxTotal)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs my-1">
                <input
                  type="checkbox"
                  checked={roundOff}
                  onChange={(e) => setRoundOff(e.target.checked)}
                  id="roundOffCheck"
                  className="h-4 w-4 rounded text-cyan-600"
                />
                <label htmlFor="roundOffCheck" className="font-medium text-slate-700 cursor-pointer">
                  Round Off ({roundOffDelta >= 0 ? `+${roundOffDelta}` : roundOffDelta})
                </label>
              </div>
              <div className="flex w-64 justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-950">
                <span>Grand Total:</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
              <div className="mt-1 rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-900 w-full text-right">
                In Words: {amountInWords(grandTotal)}
              </div>
            </div>
          </div>

          {/* Additional Terms & Bank Details Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
              <label className="block font-bold text-slate-900 mb-1">Terms & Conditions</label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 outline-none focus:border-cyan-500"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs flex flex-col justify-between">
              <div>
                <label className="block font-bold text-slate-900 mb-1">Internal Remarks / Sale Description</label>
                <input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                <span>Authorized Signatory: Sudha Dairy</span>
                <span className="font-bold text-slate-900">For: {companyName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
