'use client';

import React from 'react';

export function PageHeader({
  title,
  description,
  badge,
  actions,
}: {
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-[var(--zoho-border-light)]">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-lg font-semibold text-[var(--zoho-text-primary)] leading-tight">
            {title}
          </h1>
          {badge && (
            <span className="zoho-tag zoho-tag-blue">{badge}</span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-[13px] text-[var(--zoho-text-secondary)] leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
