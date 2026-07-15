'use client';

import { AccessDeniedPanel } from '@/components/auth/access-denied-panel';
import { AdminRouteGuard } from '@/components/auth/admin-route-guard';
import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import {
  getAdminRouteMeta,
  getAdminRoutePermissions,
} from '@/config/admin-route-permissions';
import { SettingsApi } from '@/features/settings/api';
import { formatCurrency } from '@/lib/utils/number';
import type {
  RetailerNoteThresholdField,
  RetailerNoteThresholdPayload,
  UpdateRetailerNoteThresholdsPayload,
} from '@/types/settings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

const FIELD_CONFIG: Array<{
  field: RetailerNoteThresholdField;
  label: string;
  description: string;
}> = [
  {
    field: 'creditNoteMaxAmount',
    label: 'Credit Note Amount Ceiling',
    description: 'Maximum base amount allowed on a retailer credit note.',
  },
  {
    field: 'creditNoteMaxTaxAmount',
    label: 'Credit Note Tax Ceiling',
    description: 'Maximum tax component allowed on a retailer credit note.',
  },
  {
    field: 'creditNoteMaxTotalAmount',
    label: 'Credit Note Total Ceiling',
    description: 'Maximum combined amount plus tax allowed on a retailer credit note.',
  },
  {
    field: 'debitNoteMaxAmount',
    label: 'Debit Note Amount Ceiling',
    description: 'Maximum amount allowed on a retailer debit note.',
  },
];

function toFormState(payload?: RetailerNoteThresholdPayload | null) {
  return {
    creditNoteMaxAmount: payload ? String(payload.overrides.creditNoteMaxAmount ?? payload.effective.creditNoteMaxAmount) : '',
    creditNoteMaxTaxAmount: payload ? String(payload.overrides.creditNoteMaxTaxAmount ?? payload.effective.creditNoteMaxTaxAmount) : '',
    creditNoteMaxTotalAmount: payload ? String(payload.overrides.creditNoteMaxTotalAmount ?? payload.effective.creditNoteMaxTotalAmount) : '',
    debitNoteMaxAmount: payload ? String(payload.overrides.debitNoteMaxAmount ?? payload.effective.debitNoteMaxAmount) : '',
  } satisfies Record<RetailerNoteThresholdField, string>;
}

function RetailerNoteThresholdsContent() {
  const routeMeta = getAdminRouteMeta('financeSettings');
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<Record<RetailerNoteThresholdField, string>>(toFormState(null));

  const thresholdsQuery = useQuery({
    queryKey: ['settings', 'retailer-note-thresholds'],
    queryFn: () => SettingsApi.getRetailerNoteThresholds(),
  });

  const cacheDebugQuery = useQuery({
    queryKey: ['settings', 'retailer-note-thresholds', 'cache-debug'],
    queryFn: () => SettingsApi.getRetailerNoteThresholdCacheDebug(),
  });

  useEffect(() => {
    if (thresholdsQuery.data?.data) {
      setForm(toFormState(thresholdsQuery.data.data));
    }
  }, [thresholdsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateRetailerNoteThresholdsPayload) =>
      SettingsApi.updateRetailerNoteThresholds(payload),
    onSuccess: (response) => {
      setMessage(response.message);
      setForm(toFormState(response.data));
      queryClient.invalidateQueries({ queryKey: ['settings', 'retailer-note-thresholds'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'retailer-note-thresholds', 'cache-debug'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update retailer note thresholds');
    },
  });

  const resetThresholdsMutation = useMutation({
    mutationFn: () => SettingsApi.resetRetailerNoteThresholds(),
    onSuccess: (response) => {
      setMessage(response.message);
      setForm(toFormState(response.data));
      queryClient.invalidateQueries({ queryKey: ['settings', 'retailer-note-thresholds'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'retailer-note-thresholds', 'cache-debug'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to reset retailer note thresholds');
    },
  });

  const resetCacheMutation = useMutation({
    mutationFn: () => SettingsApi.resetRetailerNoteThresholdCache(),
    onSuccess: (response) => {
      setMessage(response.message);
      queryClient.invalidateQueries({ queryKey: ['settings', 'retailer-note-thresholds'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'retailer-note-thresholds', 'cache-debug'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to reset threshold cache');
    },
  });

  const thresholds = thresholdsQuery.data?.data;
  const cacheDebug = cacheDebugQuery.data?.data;

  const orgCache = useMemo(() => {
    if (!cacheDebug) return null;
    const [firstOrgKey] = Object.keys(cacheDebug.organizations);
    return firstOrgKey ? cacheDebug.organizations[firstOrgKey] : null;
  }, [cacheDebug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const payload = Object.fromEntries(
      Object.entries(form)
        .filter(([, value]) => value.trim() !== '')
        .map(([key, value]) => [key, Number(value)]),
    ) as UpdateRetailerNoteThresholdsPayload;

    if (Object.keys(payload).length === 0) {
      setMessage('At least one threshold value is required.');
      return;
    }

    await saveMutation.mutateAsync(payload);
  }

  return (
    <div>
      <PageHeader
        title={routeMeta.pageTitle}
        description={routeMeta.pageDescription}
      />

      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
          {message}
        </div>
      ) : null}

      {thresholdsQuery.isLoading ? (
        <div className="text-sm text-slate-500">Loading retailer note thresholds...</div>
      ) : thresholdsQuery.error ? (
        <EmptyState
          title="Unable to load retailer note thresholds"
          description={thresholdsQuery.error instanceof Error ? thresholdsQuery.error.message : 'Unknown settings error'}
        />
      ) : !thresholds ? (
        <EmptyState
          title="Threshold data unavailable"
          description="The settings API did not return retailer note threshold data."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Credit Note Amount" value={formatCurrency(thresholds.effective.creditNoteMaxAmount)} />
            <KpiCard label="Credit Note Tax" value={formatCurrency(thresholds.effective.creditNoteMaxTaxAmount)} />
            <KpiCard label="Credit Note Total" value={formatCurrency(thresholds.effective.creditNoteMaxTotalAmount)} />
            <KpiCard label="Debit Note Amount" value={formatCurrency(thresholds.effective.debitNoteMaxAmount)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Organization Threshold Overrides</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Save org-specific ceilings in backend settings so finance controls do not rely only on environment defaults.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(toFormState(thresholds))}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Reload Values
                  </button>
                  <button
                    type="button"
                    onClick={() => resetThresholdsMutation.mutate()}
                    className="rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Reset Org Overrides
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {FIELD_CONFIG.map((fieldConfig) => (
                  <label key={fieldConfig.field} className="block rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">{fieldConfig.label}</div>
                        <div className="mt-1 text-xs text-slate-500">{fieldConfig.description}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                            Effective: {formatCurrency(thresholds.effective[fieldConfig.field])}
                          </span>
                          <span className="rounded-full bg-cyan-50 px-2 py-1 text-cyan-800">
                            Source: {thresholds.sources[fieldConfig.field]}
                          </span>
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">
                            Override: {thresholds.overrides[fieldConfig.field] === null ? 'None' : formatCurrency(thresholds.overrides[fieldConfig.field] ?? 0)}
                          </span>
                        </div>
                      </div>
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={form[fieldConfig.field]}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            [fieldConfig.field]: event.target.value,
                          }))
                        }
                        className="w-full max-w-[220px] rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                      />
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saveMutation.isPending ? 'Saving thresholds...' : 'Save Threshold Overrides'}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(toFormState(thresholds))}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Restore From Current Settings
                </button>
              </div>
            </form>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Threshold Cache Debug</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review cache hit/miss counters and force a cache refresh after settings changes or troubleshooting.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetCacheMutation.mutate()}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {resetCacheMutation.isPending ? 'Resetting...' : 'Reset Cache'}
                </button>
              </div>

              {cacheDebugQuery.isLoading ? (
                <div className="text-sm text-slate-500">Loading cache diagnostics...</div>
              ) : cacheDebugQuery.error ? (
                <EmptyState
                  title="Unable to load cache diagnostics"
                  description={cacheDebugQuery.error instanceof Error ? cacheDebugQuery.error.message : 'Unknown cache debug error'}
                />
              ) : !cacheDebug ? (
                <EmptyState
                  title="Cache diagnostics unavailable"
                  description="No cache debug payload was returned by the backend."
                />
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <KpiCard label="TTL (ms)" value={cacheDebug.ttlMs} />
                    <KpiCard label="Cache Size" value={cacheDebug.cacheSize} />
                    <KpiCard label="Total Hits" value={cacheDebug.totals.hits} />
                    <KpiCard label="Total Misses" value={cacheDebug.totals.misses} />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="font-medium text-slate-950">Current Organization Cache</div>
                    {orgCache ? (
                      <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                        <div>Hits: {orgCache.hits}</div>
                        <div>Misses: {orgCache.misses}</div>
                        <div>Invalidations: {orgCache.invalidations}</div>
                        <div>Cached: {orgCache.cached ? 'Yes' : 'No'}</div>
                        <div>Expires At: {orgCache.expiresAt ? new Date(orgCache.expiresAt).toLocaleString('en-IN') : '—'}</div>
                        <div>TTL Remaining: {orgCache.msRemaining} ms</div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-slate-500">No organization cache snapshot available yet.</div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export function RetailerNoteThresholdsView() {
  const routeMeta = getAdminRouteMeta('financeSettings');
  return (
    <AdminRouteGuard
      requiredPermissions={getAdminRoutePermissions('financeSettings')}
      loadingFallback={
        <div>
          <PageHeader
            title={routeMeta.title}
            description={routeMeta.loadingDescription}
          />
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            Redirecting...
          </div>
        </div>
      }
      unauthorizedFallback={
        <div>
          <PageHeader
            title={routeMeta.title}
            description={routeMeta.unauthorizedDescription}
          />
          <AccessDeniedPanel />
        </div>
      }
    >
      <RetailerNoteThresholdsContent />
    </AdminRouteGuard>
  );
}
