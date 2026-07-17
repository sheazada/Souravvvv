'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { RetailersApi, type UpdateOrderingModePayload } from '@/features/retailers/api';
import type { RetailerListFilters, RetailerListItem } from '@/types/retailers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const DEFAULT_FILTERS: RetailerListFilters = {
  page: 1,
  limit: 20,
  search: '',
  orderingMode: '',
  businessStatus: '',
};

export function RetailerListView() {
  const routeMeta = getAdminRouteMeta('retailers');
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<RetailerListFilters>(DEFAULT_FILTERS);
  const [message, setMessage] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState<RetailerListItem | null>(null);
  const [deactivatingRetailer, setDeactivatingRetailer] = useState<RetailerListItem | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  const [formState, setFormState] = useState({
    retailerCode: `RET-${Math.floor(1000 + Math.random() * 9000)}`,
    shopName: '',
    ownerName: '',
    mobile: '',
    email: '',
    locality: '',
    city: 'Patna',
    state: 'Bihar',
    pincode: '800001',
    creditLimit: '50000',
    creditDays: '7',
    orderingMode: 'self_service',
    gstin: '',
    pan: '',
  });

  const queryKey = useMemo(() => ['retailers', filters], [filters]);
  const retailersQuery = useQuery({
    queryKey,
    queryFn: () => RetailersApi.list(filters),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formState) =>
      RetailersApi.create({
        retailerCode: data.retailerCode,
        shopName: data.shopName,
        ownerName: data.ownerName || undefined,
        mobile: data.mobile,
        email: data.email || undefined,
        locality: data.locality || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        pincode: data.pincode || undefined,
        creditLimit: Number(data.creditLimit || 0),
        creditDays: Number(data.creditDays || 0),
        orderingMode: data.orderingMode,
        gstin: data.gstin || undefined,
        pan: data.pan || undefined,
        businessStatus: 'active',
      }),
    onSuccess: (res) => {
      setMessage(`Retailer '${res.data?.shopName}' onboarded successfully (${res.data?.retailerCode}).`);
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['retailers'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to create retailer'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: Record<string, any> }) =>
      RetailersApi.update(data.id, data.payload),
    onSuccess: (res) => {
      setMessage(`Retailer '${res.data?.shopName}' updated successfully.`);
      setEditingRetailer(null);
      queryClient.invalidateQueries({ queryKey: ['retailers'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to update retailer'),
  });

  const statusMutation = useMutation({
    mutationFn: (data: { id: string; status: string; reason: string }) =>
      RetailersApi.updateStatus(data.id, { businessStatus: data.status, reason: data.reason }),
    onSuccess: (res) => {
      setMessage(`Retailer '${res.data?.shopName}' status updated to ${res.data?.businessStatus}.`);
      setDeactivatingRetailer(null);
      queryClient.invalidateQueries({ queryKey: ['retailers'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to update status'),
  });

  const updateModeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOrderingModePayload }) =>
      RetailersApi.updateOrderingMode(id, payload),
    onSuccess: () => {
      setMessage('Retailer ordering mode updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['retailers'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update ordering mode');
    },
  });

  const data = retailersQuery.data?.data ?? [];
  const meta = retailersQuery.data?.meta;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{routeMeta.pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-600">{routeMeta.pageDescription}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormState({
              retailerCode: `RET-${Math.floor(1000 + Math.random() * 9000)}`,
              shopName: '',
              ownerName: '',
              mobile: '',
              email: '',
              locality: '',
              city: 'Patna',
              state: 'Bihar',
              pincode: '800001',
              creditLimit: '50000',
              creditDays: '7',
              orderingMode: 'self_service',
              gstin: '',
              pan: '',
            });
            setIsCreateModalOpen(true);
          }}
          className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 shadow-sm transition-all hover:shadow"
        >
          + Create New Retailer
        </button>
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input
          value={filters.search ?? ''}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
          placeholder="Search by shop, code, owner, mobile"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />

        <select
          value={filters.orderingMode ?? ''}
          onChange={(event) => setFilters((current) => ({ ...current, orderingMode: event.target.value, page: 1 }))}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        >
          <option value="">All modes</option>
          <option value="self_service">Self Service</option>
          <option value="assisted">Assisted</option>
          <option value="hybrid">Hybrid</option>
        </select>

        <select
          value={filters.businessStatus ?? ''}
          onChange={(event) => setFilters((current) => ({ ...current, businessStatus: event.target.value, page: 1 }))}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
          <option value="seasonal">Seasonal</option>
          <option value="under_review">Under Review</option>
        </select>

        <button
          type="button"
          onClick={() => setFilters(DEFAULT_FILTERS)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Reset Filters
        </button>
      </div>

      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 flex items-center justify-between">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}

      {retailersQuery.isLoading ? (
        <div className="text-sm text-slate-500">Loading retailers...</div>
      ) : retailersQuery.error ? (
        <EmptyState
          title="Unable to load retailers"
          description={retailersQuery.error instanceof Error ? retailersQuery.error.message : 'Unknown retailer error'}
        />
      ) : data.length === 0 ? (
        <EmptyState title="No retailers found" description="Try changing the filters or create a new retailer account right now." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Retailer Shop & Code</th>
                  <th className="px-4 py-3 font-medium">Contact Details</th>
                  <th className="px-4 py-3 font-medium">Category / Credit</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ordering Mode</th>
                  <th className="px-4 py-3 font-medium">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.map((retailer) => (
                  <tr key={retailer.id} className="align-top hover:bg-slate-50/75">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-950">{retailer.shopName}</div>
                      <div className="text-xs font-mono text-cyan-700">{retailer.retailerCode}</div>
                      <div className="text-xs text-slate-500">{retailer.ownerName ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium">{retailer.mobile}</div>
                      <div className="text-xs text-slate-500">{retailer.locality ?? retailer.city ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="capitalize font-medium">{retailer.retailerCategory ?? 'General Shop'}</div>
                      <div className="text-xs text-slate-500">Limit: ₹{Number(retailer.creditLimit || 0).toLocaleString('en-IN')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          retailer.businessStatus === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : retailer.businessStatus === 'blocked'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {retailer.businessStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-800 border border-cyan-200 capitalize">
                        {retailer.orderingMode.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/app/retailers/${retailer.id}`}
                          className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-900 hover:bg-cyan-100 transition-colors"
                        >
                          Profile & History →
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditingRetailer(retailer)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeactivatingRetailer(retailer)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          {retailer.businessStatus === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateModeMutation.mutate({
                              id: retailer.id,
                              payload: {
                                orderingMode: retailer.orderingMode === 'assisted' ? 'self_service' : 'assisted',
                                isOrderingEnabled: retailer.isOrderingEnabled,
                                isBillingEnabled: retailer.isBillingEnabled,
                              },
                            })
                          }
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                        >
                          Toggle Mode
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span>
              Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}
            </span>
            <span>{meta?.total ?? data.length} retailers</span>
          </div>
        </div>
      )}

      {/* CREATE NEW RETAILER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Create New Retailer Shop</h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formState);
              }}
              className="mt-4 space-y-4 text-sm"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Retailer Code *</label>
                  <input
                    required
                    value={formState.retailerCode}
                    onChange={(e) => setFormState({ ...formState, retailerCode: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shop Name *</label>
                  <input
                    required
                    placeholder="e.g. Patna Dairy Centre"
                    value={formState.shopName}
                    onChange={(e) => setFormState({ ...formState, shopName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name</label>
                  <input
                    placeholder="e.g. Ramesh Prasad"
                    value={formState.ownerName}
                    onChange={(e) => setFormState({ ...formState, ownerName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number (10 digits) *</label>
                  <input
                    required
                    placeholder="9876543210"
                    value={formState.mobile}
                    onChange={(e) => setFormState({ ...formState, mobile: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Locality / Area</label>
                  <input
                    placeholder="Boring Road"
                    value={formState.locality}
                    onChange={(e) => setFormState({ ...formState, locality: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    value={formState.city}
                    onChange={(e) => setFormState({ ...formState, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    value={formState.state}
                    onChange={(e) => setFormState({ ...formState, state: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Limit (₹) *</label>
                  <input
                    required
                    type="number"
                    value={formState.creditLimit}
                    onChange={(e) => setFormState({ ...formState, creditLimit: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Days *</label>
                  <input
                    required
                    type="number"
                    value={formState.creditDays}
                    onChange={(e) => setFormState({ ...formState, creditDays: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ordering Mode</label>
                  <select
                    value={formState.orderingMode}
                    onChange={(e) => setFormState({ ...formState, orderingMode: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="self_service">Self Service</option>
                    <option value="assisted">Assisted</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    placeholder="10ABCDE1234F1Z5"
                    value={formState.gstin}
                    onChange={(e) => setFormState({ ...formState, gstin: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number (Optional)</label>
                  <input
                    placeholder="ABCDE1234F"
                    value={formState.pan}
                    onChange={(e) => setFormState({ ...formState, pan: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500 uppercase"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-xl border border-cyan-600 bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50 shadow-sm"
                >
                  {createMutation.isPending ? 'Creating...' : 'Confirm & Onboard Retailer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RETAILER MODAL */}
      {editingRetailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Edit Retailer Shop Details</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editingRetailer.id,
                  payload: {
                    shopName: editingRetailer.shopName,
                    ownerName: editingRetailer.ownerName || undefined,
                    mobile: editingRetailer.mobile,
                    locality: editingRetailer.locality || undefined,
                    creditLimit: Number(editingRetailer.creditLimit || 0),
                    creditDays: Number(editingRetailer.creditDays || 0),
                  },
                });
              }}
              className="mt-4 space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shop Name</label>
                <input
                  value={editingRetailer.shopName}
                  onChange={(e) => setEditingRetailer({ ...editingRetailer, shopName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name</label>
                <input
                  value={editingRetailer.ownerName ?? ''}
                  onChange={(e) => setEditingRetailer({ ...editingRetailer, ownerName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    value={editingRetailer.mobile}
                    onChange={(e) => setEditingRetailer({ ...editingRetailer, mobile: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Locality</label>
                  <input
                    value={editingRetailer.locality ?? ''}
                    onChange={(e) => setEditingRetailer({ ...editingRetailer, locality: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={Number(editingRetailer.creditLimit || 0)}
                    onChange={(e) => setEditingRetailer({ ...editingRetailer, creditLimit: Number(e.target.value) as any })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Days</label>
                  <input
                    type="number"
                    value={Number(editingRetailer.creditDays || 0)}
                    onChange={(e) => setEditingRetailer({ ...editingRetailer, creditDays: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRetailer(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-xl border border-cyan-600 bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEACTIVATE / STATUS CONFIRMATION MODAL */}
      {deactivatingRetailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              {deactivatingRetailer.businessStatus === 'active' ? 'Deactivate Retailer Shop' : 'Activate Retailer Shop'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to change the status of <strong>{deactivatingRetailer.shopName}</strong> ({deactivatingRetailer.retailerCode})?
              {deactivatingRetailer.businessStatus === 'active'
                ? ' Deactivated shops cannot place new orders or generate instant delivery challans.'
                : ' Activated shops will regain ordering and billing capabilities.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeactivatingRetailer(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  statusMutation.mutate({
                    id: deactivatingRetailer.id,
                    status: deactivatingRetailer.businessStatus === 'active' ? 'inactive' : 'active',
                    reason: deactivatingRetailer.businessStatus === 'active' ? 'Deactivated via UI' : 'Activated via UI',
                  })
                }
                disabled={statusMutation.isPending}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm ${
                  deactivatingRetailer.businessStatus === 'active'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {statusMutation.isPending
                  ? 'Updating...'
                  : deactivatingRetailer.businessStatus === 'active'
                  ? 'Confirm Deactivation'
                  : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
