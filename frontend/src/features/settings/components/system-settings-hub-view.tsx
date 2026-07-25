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

  useEffect(() => {
    setMounted(true);
  }, []);

  const profileQuery = useQuery({
    queryKey: ['organization', 'profile'],
    queryFn: () => OrganizationApi.getProfile(),
  });

  const profile = profileQuery.data?.data;

  const [form, setForm] = useState({
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
    onSuccess: () => {
      setMessage('Organization profile and GST settings saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['organization', 'profile'] });
    },
    onError: (err) => {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    },
  });

  if (!mounted) {
    return <div className="p-6 text-[13px] text-[var(--zoho-text-muted)]">Loading settings...</div>;
  }

  const activeTheme = theme === 'system' ? systemTheme : theme;

  return (
    <div className="space-y-5 pb-16">
      <PageHeader
        title="Settings"
        description="Manage appearance, company profile, GST configuration, and system modules."
      />

      {message && (
        <div className="flex items-center justify-between rounded border border-[var(--zoho-blue-border)] bg-[var(--zoho-blue-light)] p-3 text-[13px] font-medium text-[var(--zoho-blue)]">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-[12px] underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Appearance */}
      <section className="zoho-card p-5">
        <h2 className="text-[15px] font-semibold text-[var(--zoho-text-primary)] mb-1">Appearance</h2>
        <p className="text-[12px] text-[var(--zoho-text-muted)] mb-4">Choose the interface theme for your current device.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { key: 'light', label: 'Light', desc: 'Clean white background', icon: '☀' },
            { key: 'dark', label: 'Dark', desc: 'Reduced eye strain', icon: '🌙' },
            { key: 'system', label: 'System', desc: `Follows OS (${activeTheme})`, icon: '💻' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTheme(opt.key)}
              className={`flex items-center gap-3 rounded border p-3.5 transition-all cursor-pointer text-left ${
                theme === opt.key
                  ? 'border-[var(--zoho-blue)] bg-[var(--zoho-blue-light)] text-[var(--zoho-blue)]'
                  : 'border-[var(--zoho-border)] bg-[var(--zoho-card)] text-[var(--zoho-text-secondary)] hover:border-[var(--zoho-blue-border)]'
              }`}
            >
              <span className="text-lg">{opt.icon}</span>
              <div>
                <div className="text-[13px] font-semibold">{opt.label}</div>
                <div className="text-[11px] opacity-75">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Company Profile & GST */}
      <section className="zoho-card p-5">
        <h2 className="text-[15px] font-semibold text-[var(--zoho-text-primary)] mb-1">Company Profile & GST</h2>
        <p className="text-[12px] text-[var(--zoho-text-muted)] mb-5">
          These details appear on printable invoices, PDF exports, and POS receipts.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: 'name' as const, label: 'Trade / Brand Name', required: true },
            { key: 'legalName' as const, label: 'Registered Legal Name' },
            { key: 'gstin' as const, label: 'GSTIN', mono: true },
            { key: 'pan' as const, label: 'PAN Number', mono: true },
            { key: 'phone' as const, label: 'Support Phone' },
            { key: 'email' as const, label: 'Official Email' },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--zoho-text-muted)] mb-1.5">
                {field.label} {field.required && <span className="text-[var(--zoho-red)]">*</span>}
              </label>
              <input
                type="text"
                value={form[field.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className={`zoho-input ${field.mono ? 'font-mono' : ''}`}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--zoho-text-muted)] mb-1.5">
              Registered Address
            </label>
            <input
              type="text"
              value={form.addressLine}
              onChange={(e) => setForm((prev) => ({ ...prev, addressLine: e.target.value }))}
              className="zoho-input"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--zoho-border-light)] flex justify-end">
          <button
            type="button"
            onClick={() => saveProfileMutation.mutate()}
            disabled={saveProfileMutation.isPending}
            className="zoho-btn zoho-btn-primary"
          >
            {saveProfileMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </section>

      {/* Advanced Modules */}
      <section className="zoho-card p-5">
        <h2 className="text-[15px] font-semibold text-[var(--zoho-text-primary)] mb-1">Advanced Configuration</h2>
        <p className="text-[12px] text-[var(--zoho-text-muted)] mb-4">Navigate to dedicated administration modules.</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '/app/settings/retailer-note-thresholds', title: 'Note Thresholds', desc: 'Credit/Debit note safety ceilings' },
            { href: '/app/settings/backups', title: 'Database Backups', desc: 'Automated PostgreSQL dumps' },
            { href: '/app/organization', title: 'Documents & Logos', desc: 'Legal licenses and letterhead' },
            { href: '/app/sync', title: 'Offline Sync Center', desc: 'PWA background sync queue' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded border border-[var(--zoho-border-light)] bg-[var(--zoho-bg)] p-3.5 hover:border-[var(--zoho-blue-border)] transition-colors"
            >
              <h3 className="text-[13px] font-semibold text-[var(--zoho-text-primary)] group-hover:text-[var(--zoho-blue)]">
                {item.title}
              </h3>
              <p className="mt-0.5 text-[11px] text-[var(--zoho-text-muted)]">{item.desc}</p>
              <span className="mt-2 inline-block text-[11px] font-medium text-[var(--zoho-blue)] group-hover:underline">
                Manage →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
