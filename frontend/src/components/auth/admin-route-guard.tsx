'use client';

import { AccessDeniedPanel } from '@/components/auth/access-denied-panel';
import { routes } from '@/config/routes';
import { hasAnyPermission } from '@/lib/auth/permissions';
import { tokenStore } from '@/lib/auth/token-store';
import type { CurrentUser } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export function AdminRouteGuard({
  requiredPermissions = [],
  redirectUnauthenticatedTo = routes.login,
  redirectUnauthorizedTo,
  loadingFallback = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
      Redirecting...
    </div>
  ),
  unauthorizedFallback = <AccessDeniedPanel />,
  children,
}: {
  requiredPermissions?: readonly string[];
  redirectUnauthenticatedTo?: string;
  redirectUnauthorizedTo?: string;
  loadingFallback?: React.ReactNode;
  unauthorizedFallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');

  const hasAccess = useMemo(
    () => hasAnyPermission(currentUser, requiredPermissions),
    [currentUser, requiredPermissions],
  );

  useEffect(() => {
    const user = tokenStore.getStoredUser();
    setCurrentUser(user);

    if (!user) {
      router.replace(redirectUnauthenticatedTo);
      setStatus('checking');
      return;
    }

    if (!hasAnyPermission(user, requiredPermissions)) {
      if (redirectUnauthorizedTo) {
        router.replace(redirectUnauthorizedTo);
        setStatus('checking');
      } else {
        setStatus('unauthorized');
      }
      return;
    }

    setStatus('authorized');
  }, [redirectUnauthenticatedTo, redirectUnauthorizedTo, requiredPermissions, router]);

  if (status === 'checking') {
    return <>{loadingFallback}</>;
  }

  if (!hasAccess || status === 'unauthorized') {
    return <>{unauthorizedFallback}</>;
  }

  return <>{children}</>;
}
