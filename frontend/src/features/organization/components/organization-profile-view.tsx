'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { OrganizationApi, type AttachmentRow } from '@/features/organization/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function OrganizationProfileView() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'attachments'>('profile');
  const [message, setMessage] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    name: 'Sudha Dairy Distributor Patna',
    legalName: 'Sudha Dairy Distribution Pvt Ltd',
    gstin: '10ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    phone: '+91 91234 56789',
    email: 'info@sudhadairy.com',
    timezone: 'Asia/Kolkata',
    currencyCode: 'INR',
  });

  const [attachForm, setAttachForm] = useState({
    fileName: 'GST_Registration_Certificate.pdf',
    storagePath: 'https://cdn.example.com/docs/gst_cert_2026.pdf',
    fileType: 'application/pdf',
    sizeBytes: 1048576,
    entityType: 'organization',
  });

  const profileQuery = useQuery({
    queryKey: ['organization', 'profile'],
    queryFn: () => OrganizationApi.getProfile(),
  });

  const attachQuery = useQuery({
    queryKey: ['organization', 'attachments'],
    queryFn: () => OrganizationApi.listAttachments({ limit: 30, page: 1 }),
  });

  const profile = profileQuery.data?.data;
  const attachments = attachQuery.data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: (data: typeof formState) => OrganizationApi.updateProfile(data),
    onSuccess: (res) => {
      setMessage(`Organization '${res.data?.name}' profile updated successfully.`);
      queryClient.invalidateQueries({ queryKey: ['organization', 'profile'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to update profile'),
  });

  const createAttachMutation = useMutation({
    mutationFn: (data: typeof attachForm) => OrganizationApi.createAttachment(data),
    onSuccess: (res) => {
      setMessage(`Attachment '${res.data?.fileName}' uploaded & recorded.`);
      queryClient.invalidateQueries({ queryKey: ['organization', 'attachments'] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Failed to record attachment'),
  });

  const deleteAttachMutation = useMutation({
    mutationFn: (id: string) => OrganizationApi.deleteAttachment(id),
    onSuccess: () => {
      setMessage('Attachment deleted.');
      queryClient.invalidateQueries({ queryKey: ['organization', 'attachments'] });
    },
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Organization Profile & Documents Repository</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage legal distributor registration (`GSTIN / PAN`), operating timezone, currency (`INR`), and official attachments (`FileAttachment`).
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
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'profile'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          🏢 Legal Profile Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('attachments')}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === 'attachments'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          📎 Documents & File Attachments ({attachments.length})
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-sm">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Edit Legal Profile & Settings</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate(formState);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Operating Business Name *</label>
                <input
                  required
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Legal Entity Name</label>
                <input
                  value={formState.legalName}
                  onChange={(e) => setFormState({ ...formState, legalName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    value={formState.gstin}
                    onChange={(e) => setFormState({ ...formState, gstin: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                  <input
                    value={formState.pan}
                    onChange={(e) => setFormState({ ...formState, pan: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Phone / Support</label>
                  <input
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address</label>
                  <input
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Operating Timezone</label>
                  <input
                    disabled
                    value={formState.timezone}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Currency</label>
                  <input
                    disabled
                    value={formState.currencyCode}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500 font-mono"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-xl border border-cyan-600 bg-cyan-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : '💾 Save Profile Updates'}
                </button>
              </div>
            </form>
          </div>

          <div className="md:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-sm">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Live Database Snapshot</h2>
            {profileQuery.isLoading ? (
              <div className="text-slate-500">Loading snapshot...</div>
            ) : profile ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Active Entity</div>
                  <div className="text-xl font-bold text-slate-950">{profile.name}</div>
                  <div className="text-xs text-slate-600 font-mono">{profile.id}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Legal Name:</span>
                    <strong className="text-slate-900">{profile.legalName ?? '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">GSTIN Number:</span>
                    <strong className="font-mono text-cyan-800">{profile.gstin ?? '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">PAN Number:</span>
                    <strong className="font-mono text-cyan-800">{profile.pan ?? '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Support Phone:</span>
                    <strong className="text-slate-900">{profile.phone ?? '—'}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="No profile returned" />
            )}
          </div>
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 text-sm md:col-span-1">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Record New File Attachment</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">File Name *</label>
              <input
                value={attachForm.fileName}
                onChange={(e) => setAttachForm({ ...attachForm, fileName: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">File URL / Storage Path *</label>
              <input
                value={attachForm.storagePath}
                onChange={(e) => setAttachForm({ ...attachForm, storagePath: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">MIME Type</label>
              <select
                value={attachForm.fileType}
                onChange={(e) => setAttachForm({ ...attachForm, fileType: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
              >
                <option value="application/pdf">PDF Document (.pdf)</option>
                <option value="image/png">PNG Image (.png)</option>
                <option value="image/jpeg">JPEG Image (.jpg)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => createAttachMutation.mutate(attachForm)}
              disabled={createAttachMutation.isPending}
              className="w-full rounded-xl border border-cyan-600 bg-cyan-600 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 shadow-sm disabled:opacity-50"
            >
              {createAttachMutation.isPending ? 'Uploading...' : '📎 Upload & Attach Document'}
            </button>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <h2 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Attachment Repository ({attachments.length})</h2>
            {attachQuery.isLoading ? (
              <div className="text-sm text-slate-500">Loading documents...</div>
            ) : attachments.length === 0 ? (
              <EmptyState title="No attachments uploaded" description="Record file attachments using the form on the left." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Document Name & File URL</th>
                      <th className="px-4 py-3 text-left">MIME Type</th>
                      <th className="px-4 py-3 text-left">Uploaded At</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {attachments.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/75">
                        <td className="px-4 py-3 font-bold text-slate-950">
                          <div>{row.fileName}</div>
                          <a href={row.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-mono text-cyan-700 underline">
                            {row.fileUrl}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-600">{row.mimeType ?? 'application/pdf'}</td>
                        <td className="px-4 py-3 text-slate-700 text-xs">{new Date(row.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => deleteAttachMutation.mutate(row.id)}
                            className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
