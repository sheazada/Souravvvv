'use client';

import type { NavigationItem } from '@/config/navigation';
import { hasAnyPermission } from '@/lib/auth/permissions';
import { tokenStore } from '@/lib/auth/token-store';
import type { CurrentUser } from '@/types/auth';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

function canAccessItem(user: CurrentUser | null, item: NavigationItem) {
  return hasAnyPermission(user, item.requiredPermissions ?? []);
}

export function Sidebar({ title, items }: { title: string; items: readonly NavigationItem[] }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    setCurrentUser(tokenStore.getStoredUser());
  }, []);

  const visibleItems = useMemo(
    () => items.filter((item) => canAccessItem(currentUser, item)),
    [currentUser, items],
  );

  return (
    <aside className="hidden border-r border-slate-200 bg-white lg:block">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">ERP Area</div>
        <div className="mt-1 text-lg font-semibold text-slate-900">{title}</div>
      </div>
      <nav className="space-y-1 p-3">
        {visibleItems.map((item) => (
          <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-950">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
