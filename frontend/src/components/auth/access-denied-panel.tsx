import Link from 'next/link';
import { routes } from '@/config/routes';

export function AccessDeniedPanel({
  title = "You don't have access",
  description = 'Your account does not currently have permission to open this admin page.',
  backHref = routes.adminDashboard,
  backLabel = 'Go to Dashboard',
}: {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-amber-950">{title}</h2>
      <p className="mt-2 text-sm text-amber-900/80">{description}</p>
      <div className="mt-4">
        <Link
          href={backHref}
          className="inline-flex rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
