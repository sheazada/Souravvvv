'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeliveryApi } from '../api';
import type { DeliveryStopDetail } from '@/types/delivery';
import { Truck, MapPin, Phone, CheckCircle, Clock, AlertTriangle, DollarSign, Package, X } from 'lucide-react';

export function FieldDeliveryStopsView() {
  const queryClient = useQueryClient();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedStopForComplete, setSelectedStopForComplete] = useState<DeliveryStopDetail | null>(null);
  const [selectedStopForPay, setSelectedStopForPay] = useState<DeliveryStopDetail | null>(null);
  const [selectedStopForCrates, setSelectedStopForCrates] = useState<DeliveryStopDetail | null>(null);

  const [deliveredItems, setDeliveredItems] = useState<Record<string, { deliveredQty: number; returnedQty: number; damagedQty: number }>>({});
  const [payForm, setPayForm] = useState({ amount: 500, paymentMode: 'cash', notes: '' });
  const [crateForm, setCrateForm] = useState({ crateTypeId: '', quantity: 5, transactionType: 'return' as const, remarks: '' });

  const { data: tripsResponse, isLoading: loadingTrips } = useQuery({
    queryKey: ['my-trips-today'],
    queryFn: () => DeliveryApi.getMyTripsToday(),
  });

  const trips = tripsResponse?.data ?? [];
  const activeTripId = selectedTripId || (trips[0]?.id ?? null);

  const { data: stopsResponse, isLoading: loadingStops } = useQuery({
    queryKey: ['my-trip-stops', activeTripId],
    queryFn: () => DeliveryApi.getMyTripStops(activeTripId!),
    enabled: Boolean(activeTripId),
  });

  const { data: summaryResponse } = useQuery({
    queryKey: ['my-collection-summary'],
    queryFn: () => DeliveryApi.getMyCollectionSummary(),
  });

  const stops = stopsResponse?.data ?? [];
  const summary = summaryResponse?.data ?? { totalCount: 0, totalAmount: 0, payments: [] };

  const completeMutation = useMutation({
    mutationFn: () => {
      const itemsPayload = Object.entries(deliveredItems).map(([variantId, values]) => ({
        variantId,
        deliveredQty: Number(values.deliveredQty),
        returnedQty: Number(values.returnedQty || 0),
        damagedQty: Number(values.damagedQty || 0),
      }));

      return DeliveryApi.updateMyStopStatus(selectedStopForComplete!.id, {
        status: itemsPayload.some((i) => i.returnedQty > 0 || i.damagedQty > 0) ? 'partial' : 'delivered',
        items: itemsPayload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-trip-stops'] });
      setSelectedStopForComplete(null);
    },
  });

  const payMutation = useMutation({
    mutationFn: () =>
      DeliveryApi.addMyCollection(selectedStopForPay!.id, {
        amount: Number(payForm.amount),
        paymentMode: payForm.paymentMode,
        notes: payForm.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-collection-summary'] });
      setSelectedStopForPay(null);
    },
  });

  const crateMutation = useMutation({
    mutationFn: () =>
      DeliveryApi.addMyCrateTransaction(selectedStopForCrates!.id, {
        crateTypeId: crateForm.crateTypeId || '83000000-0000-4000-8000-000000000001',
        transactionType: crateForm.transactionType,
        quantity: Number(crateForm.quantity),
        remarks: crateForm.remarks,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-trip-stops'] });
      setSelectedStopForCrates(null);
    },
  });

  const openCompleteModal = (stop: DeliveryStopDetail) => {
    const initial: Record<string, { deliveredQty: number; returnedQty: number; damagedQty: number }> = {};
    stop.items.forEach((item) => {
      initial[item.variantId] = {
        deliveredQty: item.loadedQty || item.orderedQty,
        returnedQty: 0,
        damagedQty: 0,
      };
    });
    setDeliveredItems(initial);
    setSelectedStopForComplete(stop);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-6 rounded-xl shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Truck className="w-6 h-6" />
              Driver Field Delivery & Route Execution
            </h2>
            <p className="text-sm text-blue-200 mt-1">
              Active dispatch run stop verification, partial variance entry, and on-spot cash/UPI collection.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/20 flex items-center gap-6">
            <div>
              <div className="text-xs text-blue-200 font-medium">Today&apos;s Collections</div>
              <div className="text-xl font-bold font-mono">₹{summary.totalAmount.toLocaleString()}</div>
            </div>
            <div className="border-l border-white/20 pl-6">
              <div className="text-xs text-blue-200 font-medium">Receipts Logged</div>
              <div className="text-xl font-bold font-mono">{summary.totalCount}</div>
            </div>
          </div>
        </div>

        {trips.length > 1 && (
          <div className="mt-4 flex gap-2">
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTripId(t.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTripId === t.id ? 'bg-white text-blue-900 shadow-sm' : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              >
                {t.tripNo} ({t.route?.name ?? 'Assigned Route'})
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingTrips || loadingStops ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : !activeTripId ? (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Truck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No active delivery trips assigned to you today.</p>
        </div>
      ) : stops.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No route stops found inside this dispatch trip.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stops.map((stop) => (
            <div
              key={stop.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-mono">
                    Stop #{stop.stopSequence}
                  </span>

                  {stop.status === 'delivered' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300">
                      <CheckCircle className="w-3.5 h-3.5" /> Delivered
                    </span>
                  ) : stop.status === 'partial' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" /> Partial / Variance
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 capitalize">
                      <Clock className="w-3.5 h-3.5" /> {stop.status}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {stop.retailer?.shopName ?? 'Retailer Shop'}
                  </h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {stop.retailer?.locality ?? 'Patna Route Zone'} • {stop.retailer?.mobile}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loaded Items</div>
                  <div className="space-y-1">
                    {stop.items.map((i) => (
                      <div key={i.id} className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
                        <span>Variant SKU • {i.loadedQty || i.orderedQty} qty</span>
                        <span className="font-mono text-gray-500">₹{(Number(i.unitPrice) * Number(i.loadedQty || i.orderedQty)).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => setSelectedStopForPay(stop)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 rounded-lg transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Collect Payment
                </button>
                <button
                  onClick={() => setSelectedStopForCrates(stop)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg transition-colors"
                >
                  <Package className="w-3.5 h-3.5" />
                  Collect Empties
                </button>
                {stop.status === 'pending' && (
                  <button
                    onClick={() => openCompleteModal(stop)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Execute Stop
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedStopForComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Verify Delivered & Returned Quantities</h3>
              <button onClick={() => setSelectedStopForComplete(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {selectedStopForComplete.items.map((item) => {
                const current = deliveredItems[item.variantId] || { deliveredQty: item.loadedQty, returnedQty: 0, damagedQty: 0 };
                return (
                  <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      Variant SKU • Loaded: <span className="font-mono">{item.loadedQty || item.orderedQty}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 font-semibold mb-1">Delivered</label>
                        <input
                          type="number"
                          value={current.deliveredQty}
                          onChange={(e) =>
                            setDeliveredItems({
                              ...deliveredItems,
                              [item.variantId]: { ...current, deliveredQty: Number(e.target.value) },
                            })
                          }
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-amber-600 font-semibold mb-1">Returned</label>
                        <input
                          type="number"
                          value={current.returnedQty}
                          onChange={(e) =>
                            setDeliveredItems({
                              ...deliveredItems,
                              [item.variantId]: { ...current, returnedQty: Number(e.target.value) },
                            })
                          }
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-red-600 font-semibold mb-1">Damaged</label>
                        <input
                          type="number"
                          value={current.damagedQty}
                          onChange={(e) =>
                            setDeliveredItems({
                              ...deliveredItems,
                              [item.variantId]: { ...current, damagedQty: Number(e.target.value) },
                            })
                          }
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded font-mono"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setSelectedStopForComplete(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate()}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {completeMutation.isPending ? 'Executing Stop...' : 'Confirm Delivery Execution'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedStopForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Record Payment Collection</h3>
              <button onClick={() => setSelectedStopForPay(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg font-mono text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                <select
                  value={payForm.paymentMode}
                  onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg capitalize font-semibold"
                >
                  <option value="cash">Cash Collection</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="cheque">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Driver Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Collected cash from owner"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setSelectedStopForPay(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button
                disabled={payMutation.isPending}
                onClick={() => payMutation.mutate()}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg"
              >
                {payMutation.isPending ? 'Logging...' : 'Confirm Collection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedStopForCrates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Collect Empty Crates</h3>
              <button onClick={() => setSelectedStopForCrates(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Empty Crates Returned</label>
                <input
                  type="number"
                  min={1}
                  value={crateForm.quantity}
                  onChange={(e) => setCrateForm({ ...crateForm, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg font-mono text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. 5 yellow 24-pouch crates"
                  value={crateForm.remarks}
                  onChange={(e) => setCrateForm({ ...crateForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setSelectedStopForCrates(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button
                disabled={crateMutation.isPending}
                onClick={() => crateMutation.mutate()}
                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
              >
                {crateMutation.isPending ? 'Logging...' : 'Confirm Empties Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
