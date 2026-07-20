"use client";

import {
  ADMIN_TOPBAR_SHORTCUTS,
  getAdminTopbarShortcutMeta,
} from "@/config/admin-route-permissions";
import { canAccessAdminRoute } from "@/lib/auth/permissions";
import { tokenStore } from "@/lib/auth/token-store";
import type { CurrentUser } from "@/types/auth";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function Topbar({
  title,
  area,
  onToggleSidebar,
  onOpenMobileSidebar,
  isCollapsed,
}: {
  title: string;
  area: "admin" | "portal" | "staff";
  onToggleSidebar?: () => void;
  onOpenMobileSidebar?: () => void;
  isCollapsed?: boolean;
}) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    setCurrentUser(tokenStore.getStoredUser());
  }, []);

  const visibleShortcuts = useMemo(() => {
    if (area !== "admin") {
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
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-xs backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Three-Dot & Hamburger Sidebar Toggle Trigger */}
          <button
            type="button"
            onClick={handleSidebarClick}
            title="Open / Toggle Workspace Navigation"
            aria-label="Open Workspace Navigation"
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-900 transition-all shadow-2xs group flex-shrink-0 cursor-pointer"
          >
            <span className="text-lg font-black leading-none text-cyan-600 group-hover:scale-110 transition-transform">
              ⋮
            </span>
            <span className="text-xs font-bold tracking-wide">Menu</span>
          </button>

          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-cyan-600">
              Business Command Center
            </div>
            <div className="text-base md:text-lg font-bold text-slate-900 truncate">
              {title}
            </div>
          </div>
        </div>

        {area === "admin" ? (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0 sm:flex-wrap">
            {visibleShortcuts.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className={`${shortcut.className} flex-shrink-0 whitespace-nowrap`}
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
