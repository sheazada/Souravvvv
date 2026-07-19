'use client';

import type { NavigationItem } from '@/config/navigation';
import { hasAnyPermission } from '@/lib/auth/permissions';
import { tokenStore } from '@/lib/auth/token-store';
import type { CurrentUser } from '@/types/auth';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

function canAccessItem(user: CurrentUser | null, item: NavigationItem) {
  return hasAnyPermission(user, item.requiredPermissions ?? []);
}

type ItemAction = {
  label: string;
  href: string;
};

const ITEM_ACTIONS: Record<string, ItemAction[]> = {
  '/app/dashboard': [
    { label: '+ Add Sale Studio (Vyapar POS)', href: '/app/sales-invoices/create' },
    { label: '+ Print Layouts (Tally Theme)', href: '/app/sales-invoices/generate' },
    { label: '+ Payment Collection', href: '/app/payments?action=new' },
    { label: '+ Add Sale Return', href: '/app/returns?action=new' },
  ],
  '/app/retailers': [
    { label: '+ Create New Retailer', href: '/app/retailers?action=new' },
    { label: 'Outstanding Balance View', href: '/app/retailers?view=outstanding' },
  ],
  '/app/products': [
    { label: '+ Add New Product', href: '/app/products?action=new' },
    { label: 'Live Inventory Stock', href: '/app/inventory/stock' },
  ],
  '/app/sales-orders': [
    { label: '+ New Sales Order', href: '/app/sales-orders?action=new' },
    { label: 'Pending Orders', href: '/app/sales-orders?status=pending' },
  ],
  '/app/purchase-orders': [
    { label: '+ New Purchase Order', href: '/app/purchase-orders?action=new' },
    { label: 'Pending Receipt', href: '/app/purchase-orders?status=approved' },
  ],
  '/app/sales-invoices': [
    { label: '+ Add Sale Studio (POS)', href: '/app/sales-invoices/create' },
    { label: '+ Print Layouts (Tally)', href: '/app/sales-invoices/generate' },
    { label: 'Outstanding Invoices', href: '/app/sales-invoices?status=posted' },
  ],
  '/app/payments': [
    { label: '+ Payment Collection', href: '/app/payments?action=new' },
    { label: 'Unallocated Receipts', href: '/app/payments?status=unallocated' },
  ],
  '/app/settings': [
    { label: 'Dark Mode / Theme Settings', href: '/app/settings' },
    { label: 'Organization GST & Profile', href: '/app/organization' },
    { label: 'Database Disaster Recovery', href: '/app/settings/backups' },
  ],
};

export function Sidebar({
  title,
  items,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}: {
  title: string;
  items: readonly NavigationItem[];
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCollapsed = typeof controlledCollapsed !== 'undefined' ? controlledCollapsed : false;

  useEffect(() => {
    setCurrentUser(tokenStore.getStoredUser());
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleItems = useMemo(
    () => items.filter((item) => canAccessItem(currentUser, item)),
    [currentUser, items],
  );

  const getActionsForItem = (href: string): ItemAction[] => {
    return ITEM_ACTIONS[href] ?? [
      { label: 'Open Workspace Module', href },
      { label: 'Add New Record', href: `${href}?action=new` },
    ];
  };

  const handleActionClick = (href: string, isMobile = false) => {
    setActiveMenuId(null);
    if (isMobile && onCloseMobile) onCloseMobile();
    router.push(href);
  };

  const renderNavList = (isMobile = false) => (
    <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto" ref={isMobile ? undefined : menuRef}>
      {visibleItems.map((item) => {
        const menuKey = `${isMobile ? 'm' : 'd'}_${item.href}`;
        const isMenuOpen = activeMenuId === menuKey;
        const actions = getActionsForItem(item.href);
        const isActiveRoute = pathname === item.href || (item.href !== '/app/dashboard' && pathname.startsWith(item.href));

        return (
          <div key={item.href} className="relative group">
            <div
              className={`flex items-center justify-between rounded-xl px-3 py-2 transition-all duration-150 ${
                isActiveRoute
                  ? 'bg-cyan-600 text-white font-bold shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white font-medium'
              }`}
            >
              <Link
                href={item.href}
                onClick={() => {
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
                className="flex-1 text-sm truncate py-0.5"
              >
                {item.label}
              </Link>

              {/* Three-Dot Menu Trigger */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveMenuId(isMenuOpen ? null : menuKey);
                }}
                title={`Quick Actions for ${item.label}`}
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer ml-1 ${
                  isMenuOpen
                    ? 'bg-white/20 text-white font-extrabold shadow-2xs'
                    : isActiveRoute
                    ? 'text-cyan-100 hover:bg-white/15 hover:text-white'
                    : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                ⋮
              </button>
            </div>

            {/* Three-Dot Dropdown Actions */}
            {isMenuOpen && (
              <div className="absolute right-0 top-10 z-50 w-60 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                <div className="border-b border-slate-100 dark:border-slate-800 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {item.label} Quick Actions
                </div>
                <div className="mt-1 space-y-1">
                  {actions.map((action, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleActionClick(action.href, isMobile)}
                      className="flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:text-cyan-900 dark:hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* System Settings & Theme Switcher Quick Card in Sidebar */}
      <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4 px-1">
        <Link
          href="/app/settings"
          onClick={() => {
            if (isMobile && onCloseMobile) onCloseMobile();
          }}
          className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 p-3 hover:border-cyan-500 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⚙</span>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                System Settings Hub
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Theme, GST & Profile
              </div>
            </div>
          </div>
          <span className="text-xs font-black text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile & Tablet Backdrop & Slide-Over Drawer (< 1024px) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-4">
          <div className="overflow-hidden">
            <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-cyan-600 dark:text-cyan-400">
              Sudha Dairy ERP
            </div>
            <div className="mt-0.5 text-base font-black text-slate-900 dark:text-white truncate">{title}</div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            title="Close Workspace Drawer"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {renderNavList(true)}
      </aside>

      {/* Desktop Minimal Professional Sidebar (>= 1024px) */}
      {/* Notice: When isCollapsed is true, width goes to w-0 border-none overflow-hidden, completely hiding the small sidebar! */}
      <aside
        className={`hidden lg:flex lg:flex-col bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out relative z-30 ${
          isCollapsed ? 'w-0 border-none opacity-0 overflow-hidden pointer-events-none' : 'w-64 border-r border-slate-200 dark:border-slate-800 opacity-100'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-4">
          <div className="overflow-hidden">
            <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-cyan-600 dark:text-cyan-400">
              Sudha Dairy ERP
            </div>
            <div className="mt-0.5 text-base font-black text-slate-900 dark:text-white truncate">{title}</div>
          </div>
        </div>

        {renderNavList(false)}
      </aside>
    </>
  );
}
