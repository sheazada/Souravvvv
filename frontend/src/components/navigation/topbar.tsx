'use client';

import {
  ADMIN_TOPBAR_SHORTCUTS,
  getAdminTopbarShortcutMeta,
} from '@/config/admin-route-permissions';
import { canAccessAdminRoute } from '@/lib/auth/permissions';
import { tokenStore } from '@/lib/auth/token-store';
import type { CurrentUser } from '@/types/auth';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export function Topbar({ title, area }: { title: string; area: 'admin' | 'portal' | 'staff' }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    setCurrentUser(tokenStore.getStoredUser());
  }, []);

  const visibleShortcuts = useMemo(() => {
    if (area !== 'admin') {
      return [];
    }

    return ADMIN_TOPBAR_SHORTCUTS.filter((shortcut) =>
      canAccessAdminRoute(currentUser, shortcut.routeKey),
    ).map((shortcut) => getAdminTopbarShortcutMeta(shortcut));
  }, [area, currentUser]);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Dairy Distributor ERP</div>
          <div className="text-lg font-semibold text-slate-900">{title}</div>
        </div>
        {area === 'admin' ? (
          <div className="flex flex-wrap items-center gap-2">
            {visibleShortcuts.map((shortcut) => (
              <Link key={shortcut.href} href={shortcut.href} className={shortcut.className}>
                {shortcut.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
