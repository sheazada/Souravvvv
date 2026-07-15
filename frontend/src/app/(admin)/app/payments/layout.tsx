'use client';

import { AccessDeniedPanel } from '@/components/auth/access-denied-panel';
import { AdminRouteGuard } from '@/components/auth/admin-route-guard';
import { PageHeader } from '@/components/ui/page-header';
import {
  getAdminRouteMeta,
  getAdminRoutePermissions,
} from '@/config/admin-route-permissions';

export default function PaymentsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const routeMeta = getAdminRouteMeta('payments');
  return (
    <AdminRouteGuard
      requiredPermissions={getAdminRoutePermissions('payments')}
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
      {children}
    </AdminRouteGuard>
  );
}
