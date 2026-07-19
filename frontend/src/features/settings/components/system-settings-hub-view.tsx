'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { OrganizationApi, type OrganizationProfile } from '@/features/organization/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import Link from 'next/link';

export function SystemSettingsHubView() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  // Ensure next-themes hydration matches cleanly
  useEffect(() => {
    setMounted(true);
  }, []);

  const profileQuery = useQuery({
    queryKey: ['organization', 'profile'],
    queryFn: () => OrganizationApi.getProfile(),
  });

  const profile = profileQuery.data?.data;

  const [form, setForm] = useState<{
    name: string;
    legalName: string;
    gstin: string;
    pan: string;
    phone: string;
    email: string;
    addressLine: string;
  }>({
    name: 'Sudha Dairy Distributor Demo',
    legalName: 'Sudha Dairy Distributor Patna',
    gstin: '10ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    phone: '9123456789',
    email: 'owner@sudhadistributor.local',
    addressLine: 'Plot No. 12, Shop No. 4, Boring Road, Patna, Bihar - 800001',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || 'Sudha Dairy Distributor Demo',
        legalName: profile.legalName || 'Sudha Dairy Distributor Patna',
        gstin: profile.gstin || '10ABCDE1234F1Z5',
        pan: profile.pan || 'ABCDE1234F',
        phone: profile.phone || '9123456789',
        email: profile.email || 'owner@sudhadistributor.local',
        addressLine: (profile.addressJson as any)?.line1 || (profile.addressJson as any)?.address || 'Plot No. 12, Shop No. 4, Boring Road, Patna, Bihar - 800001',
      });
    }
  }, [profile]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      return OrganizationApi.updateProfile({
        name: form.name,
        legalName: form.legalName,
        gstin: form.gstin,
        pan: form.pan,
        phone: form.phone,
        email: form.email,
        addressJson: { line1: form.addressLine },
      });
    },
    onSuccess: (res) => {
      setMessage('✔ Organization profile, GSTIN, and legal settings saved successfully across the system!');
      queryClient.invalidateQueries({ queryKey: ['organization', 'profile'] });
    },
    onError: (err) => {
      setMessage(`Error saving settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    },
  });

  if (!mounted) {
    return <div className="p-6 text-sm text-slate-500">Loading settings hub...</div>;
  }

  const activeTheme = theme === 'system' ? systemTheme : theme;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="System Settings & Configuration Hub"
        description="Manage application appearance (Dark / Light mode), organization legal profile (Names & GSTIN), and global workflow capabilities."
      />

      {message && (
        <div className="flex items-center justify-between rounded-2xl border border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-950/40 p-4 text-sm font-bold text-cyan-900 dark:text-cyan-200 shadow-sm">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Section 1: Appearance & Theme Management (`Dark Mode / Light Mode`) */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">Appearance & Theme Mode</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Choose how the Dairy Distributor ERP interface looks on your current device. Switching mode immediately applies across topbars, sidebars, and invoices.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 p-5 transition-all cursor-pointer ${
              theme === 'light'
                ? 'border-cyan-600 bg-cyan-50/60 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-200 shadow-md font-bold'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <span className="text-3xl mb-2">☀</span>
            <span className="text-sm font-extrabold">Light Mode</span>
            <span className="text-[11px] opacity-75 mt-0.5">Crisp day interface</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 p-5 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'border-cyan-600 bg-cyan-50/60 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-200 shadow-md font-bold'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <span className="text-3xl mb-2">🌙</span>
            <span className="text-sm font-extrabold">Dark Mode</span>
            <span className="text-[11px] opacity-75 mt-0.5">Eye-friendly night mode</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 p-5 transition-all cursor-pointer ${
              theme === 'system'
                ? 'border-cyan-600 bg-cyan-50/60 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-200 shadow-md font-bold'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <span className="text-3xl mb-2">💻</span>
            <span className="text-sm font-extrabold">System Auto</span>
            <span className="text-[11px] opacity-75 mt-0.5">Matches OS setting ({activeTheme})</span>
          </button>
        </div>
      </section>

      {/* Section 2: Organization Legal Profile (`Names, GSTIN, PAN, Phone, Address`) */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">Company Profile & GST Information</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            These details automatically appear on your printable Tally / Vyapar Tax Invoices, PDF exports, and POS receipts.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Trade / Brand Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Sudha Dairy Distributor"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Registered Legal Name
            </label>
            <input
              type="text"
              value={form.legalName}
              onChange={(e) => setForm((prev) => ({ ...prev, legalName: e.target.value }))}
              placeholder="e.g. Sudha Dairy Enterprises Pvt. Ltd."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              GSTIN (Goods & Services Tax No.)
            </label>
            <input
              type="text"
              value={form.gstin}
              onChange={(e) => setForm((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
              placeholder="e.g. 10ABCDE1234F1Z5"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-bold font-mono text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              PAN Number
            </label>
            <input
              type="text"
              value={form.pan}
              onChange={(e) => setForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))}
              placeholder="e.g. ABCDE1234F"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-bold font-mono text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Support / Billing Phone No.
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="e.g. +91 91234 56789"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Official Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="e.g. info@sudhadairy.com"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Complete Registered Address (Printed on Invoice Header)
            </label>
            <input
              type="text"
              value={form.addressLine}
              onChange={(e) => setForm((prev) => ({ ...prev, addressLine: e.target.value }))}
              placeholder="e.g. Plot No. 12, Shop No. 4, Boring Road, Patna, Bihar - 800001"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => saveProfileMutation.mutate()}
            disabled={saveProfileMutation.isPending}
            className="rounded-xl bg-cyan-600 px-8 py-3 text-sm font-black text-white shadow-md hover:bg-cyan-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saveProfileMutation.isPending ? 'Saving...' : '💾 Save Company Profile & GST Info'}
          </button>
        </div>
      </section>

      {/* Section 3: Advanced Module Settings & System Capabilities Shortcuts */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">Advanced System & Module Configuration</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Navigate to dedicated administration modules for financial thresholds, disaster recovery, and offline background synchronization.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/app/settings/retailer-note-thresholds"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 hover:border-cyan-500 transition-colors"
          >
            <div>
              <span className="text-2xl">⚖</span>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                Note Correction Thresholds
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Configure safety ceilings for Credit Notes and Retailer Debit Notes.
              </p>
            </div>
            <span className="mt-4 text-xs font-black text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
              Manage →
            </span>
          </Link>

          <Link
            href="/app/settings/backups"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 hover:border-cyan-500 transition-colors"
          >
            <div>
              <span className="text-2xl">🛡️</span>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                Disaster Recovery Backups
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Schedule automated PostgreSQL dumps and simulate 1-click restore.
              </p>
            </div>
            <span className="mt-4 text-xs font-black text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
              Manage →
            </span>
          </Link>

          <Link
            href="/app/organization"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 hover:border-cyan-500 transition-colors"
          >
            <div>
              <span className="text-2xl">📎</span>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                Legal Documents & Logos
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Upload and store company trade licenses, food safety certs, and letterhead assets.
              </p>
            </div>
            <span className="mt-4 text-xs font-black text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
              Manage →
            </span>
          </Link>

          <Link
            href="/app/sync"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 hover:border-cyan-500 transition-colors"
          >
            <div>
              <span className="text-2xl">🔄</span>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                Offline PWA Sync Center
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Monitor background synchronization queue when field drivers operate offline.
              </p>
            </div>
            <span className="mt-4 text-xs font-black text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
              Manage →
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
