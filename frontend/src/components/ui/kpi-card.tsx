export function KpiCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string;
  value: string | number;
  trend?: string;
  icon?: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-4 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        {icon && <span className="text-base opacity-75 group-hover:scale-110 transition-transform">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-slate-950 dark:text-white font-mono">{value}</div>
      {trend && <div className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">{trend}</div>}
    </div>
  );
}
