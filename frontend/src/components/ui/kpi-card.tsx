'use client';

import React from 'react';

export function KpiCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string;
  value: string | number;
  trend?: { value: string; positive?: boolean };
  icon?: React.ReactNode;
}) {
  return (
    <div className="zoho-card p-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--zoho-text-muted)]">
          {label}
        </div>
        <div className="mt-1 text-xl font-semibold text-[var(--zoho-text-primary)] font-mono leading-tight">
          {value}
        </div>
        {trend && (
          <div
            className={`mt-1.5 text-[11px] font-medium ${
              trend.positive ? 'text-[var(--zoho-green)]' : 'text-[var(--zoho-red)]'
            }`}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
      {icon && (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-[var(--zoho-bg)] text-[var(--zoho-text-muted)]">
          {icon}
        </div>
      )}
    </div>
  );
}
