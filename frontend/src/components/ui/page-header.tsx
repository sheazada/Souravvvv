export function PageHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description?: string;
  badge?: string;
}) {
  return (
    <div className="mb-6 border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
      {badge && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 dark:border-cyan-800/60 bg-cyan-50 dark:bg-cyan-950/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 mb-2">
          {badge}
        </span>
      )}
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-3xl">{description}</p>
      ) : null}
    </div>
  );
}
