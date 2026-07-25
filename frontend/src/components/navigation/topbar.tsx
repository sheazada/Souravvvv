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

export function Topbar({
  title,
  area,
  onToggleSidebar,
  onOpenMobileSidebar,
  isCollapsed,
}: {
  title: string;
  area: 'admin' | 'portal' | 'staff';
  onToggleSidebar?: () => void;
  onOpenMobileSidebar?: () => void;
  isCollapsed?: boolean;
}) {
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

  const handleSidebarClick = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--zoho-border)] bg-[var(--zoho-topbar)] px-4 py-0 min-h-[44px] flex items-center md:px-6">
      <div className="flex flex-1 items-center justify-between gap-3">
        {/* Left: Hamburger + Page Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleSidebarClick}
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
            className="flex h-8 w-8 items-center justify-center rounded text-[var(--zoho-text-muted)] hover:bg-[var(--zoho-bg)] hover:text-[var(--zoho-text-primary)] transition-colors flex-shrink-0 cursor-pointer"
          >
            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-[var(--zoho-text-primary)] truncate leading-tight">
              {title}
            </h1>
          </div>
        </div>

        {/* Right: Action Shortcuts */}
        {area === 'admin' && visibleShortcuts.length > 0 ? (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
            {visibleShortcuts.map((shortcut, i) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className={`flex-shrink-0 whitespace-nowrap text-[12px] font-medium px-3 py-1.5 rounded transition-colors ${
                  i === 0
                    ? 'bg-[var(--zoho-blue)] text-white hover:bg-[var(--zoho-blue-hover)]'
                    : 'text-[var(--zoho-text-secondary)] hover:bg-[var(--zoho-bg)] hover:text-[var(--zoho-text-primary)]'
                }`}
              >
                {shortcut.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
