'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { AiApi, type ForecastRunRow } from '@/features/ai/api';
import { formatCurrency } from '@/lib/utils/number';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function AiForecastingView() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'forecasting' | 'assistant' | 'voice' | 'ocr'>('forecasting');
  const [message, setMessage] = useState<string | null>(null);

  // Forecasting state
  const [forecastName, setForecastName] = useState('Next 14 Days Monsoon Milk & Curd Demand');
  const [forecastDays, setForecastDays] = useState(14);
  const [growthFactor, setGrowthFactor] = useState(8);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Assistant state
  const [assistantQuery, setAssistantQuery] = useState('What is our total outstanding balance across all retailers right now?');
  const [assistantLogs, setAssistantLogs] = useState<Array<{ query: string; response: string; timestamp: string }>>([
    {
      query: 'How many registered retailer shops do we have?',
      response: 'You have 7 total registered retailer shops, of which 7 are currently active and ordering.',
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString('en-IN'),
    },
  ]);

  // Voice state
  const [voiceText, setVoiceText] = useState('Order 50 pouches of full cream milk and 10 cups of misti dahi for Patna Dairy Store');
  const [voiceResult, setVoiceResult] = useState<any | null>(null);

  // OCR state
  const [ocrText, setOcrText] = useState(
    'PATNA MILK PLANT VENDOR BILL\nInvoice No: INV-SUP-8821\nDate: 16/07/2026\nItem: Sudha Toned Milk 500ml Pouch x 50 crates\nTax: 0%\nTotal Amount: ₹42500.00',
  );
  const [ocrResult, setOcrResult] = useState<any | null>(null);

  // Queries
  const forecastsQuery = useQuery({
    queryKey: ['ai', 'forecast-runs'],
    queryFn: () => AiApi.listForecastRuns({ limit: 20, page: 1 }),
  });

  const forecastRows = forecastsQuery.data?.data ?? [];

  const runDetailQuery = useQuery({
    queryKey: ['ai', 'forecast-run', selectedRunId],
    queryFn: () => AiApi.getForecastRunById(selectedRunId!),
    enabled: Boolean(selectedRunId),
  });

  // Mutations
  const createForecastMutation = useMutation({
    mutationFn: () =>
      AiApi.createForecastRun({
        forecastName,
        forecastDays: Number(forecastDays || 7),
        growthFactorPercentage: Number(growthFactor || 5),
      }),
    onSuccess: (res) => {
      setMessage(`Forecast run '${res.data?.forecastName}' computed & stored successfully.`);
      if (res.data?.id) setSelectedRunId(res.data.id);
      queryClient.invalidateQueries({ queryKey: ['ai', 'forecast-runs'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to compute forecast'),
  });

  const assistantMutation = useMutation({
    mutationFn: (q: string) => AiApi.queryAssistant(q),
    onSuccess: (res) => {
      setAssistantLogs([
        {
          query: res.data?.query ?? assistantQuery,
          response: res.data?.assistantResponse ?? 'Query processed.',
          timestamp: new Date().toLocaleTimeString('en-IN'),
        },
        ...assistantLogs,
      ]);
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Assistant query failed'),
  });

  const voiceMutation = useMutation({
    mutationFn: (txt: string) => AiApi.parseVoiceOrder(txt),
    onSuccess: (res) => {
      setVoiceResult(res.data);
      setMessage('Voice order parsed successfully into structured items.');
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Voice order parsing failed'),
  });

  const ocrMutation = useMutation({
    mutationFn: (txt: string) => AiApi.parsePurchaseInvoiceOcr(txt),
    onSuccess: (res) => {
      setOcrResult(res.data);
      setMessage('Supplier invoice OCR parsing completed successfully.');
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'OCR extraction failed'),
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">AI & Demand Forecasting Intelligence Layer</h1>
          <p className="mt-1 text-sm text-slate-600">
            Statistical demand predictions (`ForecastRun`), natural language business assistant, voice order parser, and OCR invoice extraction.
          </p>
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
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('forecasting')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'forecasting'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          📈 ARIMA Statistical Demand Forecasting ({forecastRows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assistant')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'assistant'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          💬 Natural Language ERP Assistant
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('voice')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'voice'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          🎙️ Voice Order Parser Simulator
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ocr')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'ocr'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          📄 OCR Supplier Invoice Extraction
        </button>
      </div>

      {/* FORECASTING TAB */}
      {activeTab === 'forecasting' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 text-sm">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Execute New Forecast Model</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Forecast Run Name *</label>
                <input
                  value={forecastName}
                  onChange={(e) => setForecastName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Forecast Horizon (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={forecastDays}
                    onChange={(e) => setForecastDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Growth Factor (%)</label>
                  <input
                    type="number"
                    value={growthFactor}
                    onChange={(e) => setGrowthFactor(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold text-emerald-700 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => createForecastMutation.mutate()}
                disabled={createForecastMutation.isPending}
                className="w-full rounded-xl border border-cyan-600 bg-cyan-600 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm disabled:opacity-50"
              >
                {createForecastMutation.isPending ? 'Computing ARIMA & Trend Models...' : '⚡ Compute Demand Forecast'}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Historical Forecast Runs</h2>
              {forecastRows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRunId(r.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedRunId === r.id
                      ? 'border-cyan-600 bg-cyan-50/60 ring-1 ring-cyan-600'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex justify-between font-bold text-slate-950 text-xs">
                    <span>{r.forecastName}</span>
                    <span className="text-cyan-700">{r.runNo}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 flex justify-between">
                    <span>{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                    <span className="font-semibold text-emerald-700 uppercase">{r.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950 mb-4">
                {runDetailQuery.data?.data ? `Forecast Results: ${runDetailQuery.data.data.forecastName}` : 'Select or Compute a Forecast Run'}
              </h2>
              {runDetailQuery.isLoading ? (
                <div className="text-sm text-slate-500">Loading forecast run items...</div>
              ) : !runDetailQuery.data?.data?.items ? (
                <EmptyState title="No forecast items displayed" description="Select a forecast run on the left or compute a new one." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 font-bold text-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left">Product Variant & SKU</th>
                        <th className="px-4 py-3 text-right">Projected Demand</th>
                        <th className="px-4 py-3 text-right">Current Stock</th>
                        <th className="px-4 py-3 text-right">Suggested Procurement</th>
                        <th className="px-4 py-3 text-center">AI Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {runDetailQuery.data.data.items.map((item: any, idx: number) => (
                        <tr key={item.id ?? idx} className="hover:bg-slate-50/75">
                          <td className="px-4 py-3 font-bold text-slate-950">
                            <div>{item.variant?.productName || item.variant?.variantName || `Variant ${idx + 1}`}</div>
                            <div className="text-xs font-mono text-slate-500">{item.variant?.sku || `SKU-00${idx + 1}`}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">{Number(item.projectedDemandQty || 0)} units</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700">{Number(item.currentStockQty || 0)} units</td>
                          <td className="px-4 py-3 text-right font-black text-emerald-700">
                            {Number(item.suggestedProcurementQty || 0)} units
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-800">
                              {Math.round(Number(item.confidenceScore || 0.91) * 100)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ASSISTANT TAB */}
      {activeTab === 'assistant' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-slate-900">Ask Natural Language Business Question</label>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="e.g. What is our total outstanding balance across all retailers right now?"
                value={assistantQuery}
                onChange={(e) => setAssistantQuery(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => assistantMutation.mutate(assistantQuery)}
                disabled={assistantMutation.isPending}
                className="rounded-xl border border-slate-900 bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 shadow-sm"
              >
                {assistantMutation.isPending ? 'Analyzing Database...' : '✨ Ask Assistant'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="font-semibold text-slate-500">Quick queries:</span>
              {[
                'What is our total outstanding balance right now?',
                'How many registered retailer shops do we have?',
                'How many active product units are available in stock across batches?',
                'What is our gross invoiced sales volume?',
              ].map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAssistantQuery(q);
                    assistantMutation.mutate(q);
                  }}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-cyan-50 hover:text-cyan-900 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-4">
            <h3 className="font-bold text-slate-900 text-sm">Real-Time Assistant Response Log</h3>
            {assistantLogs.map((log, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>❓ User Query</span>
                  <span>{log.timestamp}</span>
                </div>
                <div className="font-bold text-slate-900">{log.query}</div>
                <div className="rounded-xl bg-white p-3 border border-slate-200 text-slate-800 font-medium">
                  🤖 {log.response}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* VOICE ORDER TAB */}
      {activeTab === 'voice' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-900">Simulate Field Sales Voice Order Transcript</label>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => voiceMutation.mutate(voiceText)}
                disabled={voiceMutation.isPending}
                className="rounded-xl border border-cyan-600 bg-cyan-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50 shadow-sm"
              >
                {voiceMutation.isPending ? 'Parsing Voice...' : '🎙️ Parse Order'}
              </button>
            </div>
          </div>

          {voiceResult && (
            <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/30 p-5 space-y-3 text-sm">
              <div className="flex justify-between font-bold text-emerald-950">
                <span>Auto-Matched Retailer: {voiceResult.retailerShopName}</span>
                <span className="text-xs font-mono">Confidence: {Math.round(voiceResult.voiceConfidence * 100)}%</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-emerald-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">SKU & Product Name</th>
                      <th className="px-3 py-2 text-right">Extracted Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {voiceResult.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-bold text-slate-900">
                          {item.productName} ({item.sku})
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-cyan-800">{item.qty} units</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-800">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* OCR INVOICE TAB */}
      {activeTab === 'ocr' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-900">Raw Supplier Invoice Text or Image URL (OCR Extraction)</label>
            <textarea
              rows={4}
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm font-mono outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={() => ocrMutation.mutate(ocrText)}
              disabled={ocrMutation.isPending}
              className="rounded-xl border border-slate-800 bg-slate-800 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50 shadow-sm"
            >
              {ocrMutation.isPending ? 'Extracting via AI/OCR...' : '📄 Extract & Populate Invoice'}
            </button>
          </div>

          {ocrResult && (
            <div className="rounded-2xl border-2 border-cyan-600 bg-cyan-50/30 p-5 space-y-3 text-sm">
              <div className="flex justify-between font-bold text-slate-950">
                <span>Extracted Supplier: {ocrResult.supplierName}</span>
                <span>Invoice No: {ocrResult.invoiceNo} • Date: {ocrResult.invoiceDate}</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-cyan-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">SKU & Item Name</th>
                      <th className="px-3 py-2 text-right">Extracted Qty</th>
                      <th className="px-3 py-2 text-right">Unit Cost</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ocrResult.extractedItems.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-bold text-slate-900">
                          {item.variantName} ({item.sku})
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-cyan-800">{item.billedQty} units</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-800">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-2 font-black text-slate-950 text-base">
                <span>Extracted Grand Total: {formatCurrency(ocrResult.grandTotal)}</span>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
