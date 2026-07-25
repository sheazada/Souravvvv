export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded border border-dashed border-[var(--zoho-border)] bg-[var(--zoho-bg)] p-8 text-center">
      <h3 className="text-[14px] font-medium text-[var(--zoho-text-primary)]">{title}</h3>
      {description ? <p className="mt-1.5 text-[12px] text-[var(--zoho-text-muted)]">{description}</p> : null}
    </div>
  );
}
