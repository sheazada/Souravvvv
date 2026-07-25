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
    { label: 'New Sale (POS Studio)', href: '/app/sales-invoices/create' },
    { label: 'Print Layouts (Tally)', href: '/app/sales-invoices/generate' },
    { label: 'Record Payment', href: '/app/payments?action=new' },
    { label: 'Sale Return', href: '/app/returns?action=new' },
  ],
  '/app/retailers': [
    { label: 'New Retailer', href: '/app/retailers?action=new' },
    { label: 'Outstanding Balances', href: '/app/retailers?view=outstanding' },
  ],
  '/app/products': [
    { label: 'New Product', href: '/app/products?action=new' },
    { label: 'Stock Overview', href: '/app/inventory/stock' },
  ],
  '/app/sales-orders': [
    { label: 'New Sales Order', href: '/app/sales-orders?action=new' },
    { label: 'Pending Orders', href: '/app/sales-orders?status=pending' },
  ],
  '/app/purchase-orders': [
    { label: 'New Purchase Order', href: '/app/purchase-orders?action=new' },
    { label: 'Pending Receipts', href: '/app/purchase-orders?status=approved' },
  ],
  '/app/sales-invoices': [
    { label: 'New Sale (POS)', href: '/app/sales-invoices/create' },
    { label: 'Print Layouts', href: '/app/sales-invoices/generate' },
    { label: 'Outstanding Invoices', href: '/app/sales-invoices?status=posted' },
  ],
  '/app/payments': [
    { label: 'Record Payment', href: '/app/payments?action=new' },
    { label: 'Unallocated Receipts', href: '/app/payments?status=unallocated' },
  ],
  '/app/settings': [
    { label: 'Theme & Appearance', href: '/app/settings' },
    { label: 'Organization & GST', href: '/app/organization' },
    { label: 'Database Backups', href: '/app/settings/backups' },
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
      { label: 'Open Module', href },
      { label: 'Add New Record', href: `${href}?action=new` },
    ];
  };

  const handleActionClick = (href: string, isMobile = false) => {
    setActiveMenuId(null);
    if (isMobile && onCloseMobile) onCloseMobile();
    router.push(href);
  };

  const renderNavList = (isMobile = false) => (
    <nav className="flex-1 overflow-y-auto py-2" ref={isMobile ? undefined : menuRef}>
      {visibleItems.map((item) => {
        const menuKey = `${isMobile ? 'm' : 'd'}_${item.href}`;
        const isMenuOpen = activeMenuId === menuKey;
        const actions = getActionsForItem(item.href);
        const isActiveRoute = pathname === item.href || (item.href !== '/app/dashboard' && pathname.startsWith(item.href));

        return (
          <div key={item.href} className="relative group mx-2 my-0.5">
            <div
              className={`flex items-center justify-between px-3 py-[7px] transition-all duration-150 ${
                isActiveRoute
                  ? 'bg-[var(--zoho-blue-light)] border-l-[3px] border-l-[var(--zoho-blue)] text-[var(--zoho-blue)] font-semibold'
                  : 'border-l-[3px] border-l-transparent text-[var(--zoho-text-secondary)] hover:bg-[var(--zoho-bg)] hover:text-[var(--zoho-text-primary)] font-medium'
              }`}
            >
              <Link
                href={item.href}
                onClick={() => {
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
                className="flex-1 text-[13px] truncate"
              >
                {item.label}
              </Link>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveMenuId(isMenuOpen ? null : menuKey);
                }}
                title={`Actions for ${item.label}`}
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition-colors cursor-pointer ml-1 text-[10px] ${
                  isMenuOpen
                    ? 'bg-[var(--zoho-blue-light)] text-[var(--zoho-blue)]'
                    : isActiveRoute
                    ? 'text-[var(--zoho-blue)] hover:bg-[var(--zoho-blue-light)]'
                    : 'text-[var(--zoho-text-muted)] hover:bg-[var(--zoho-bg)] hover:text-[var(--zoho-text-secondary)]'
                }`}
              >
                ···
              </button>
            </div>

            {isMenuOpen && (
              <div className="absolute left-full top-0 ml-1 z-50 w-52 rounded-md border border-[var(--zoho-border)] bg-[var(--zoho-card)] p-1 shadow-md animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--zoho-text-muted)]">
                  Quick Actions
                </div>
                {actions.map((action, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleActionClick(action.href, isMobile)}
                    className="flex w-full items-center rounded px-2.5 py-1.5 text-left text-[12px] font-medium text-[var(--zoho-text-secondary)] hover:bg-[var(--zoho-blue-light)] hover:text-[var(--zoho-blue)] transition-colors cursor-pointer"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Settings Link at Bottom */}
      <div className="mt-4 mx-2 pt-3 border-t border-[var(--zoho-border-light)]">
        <Link
          href="/app/settings"
          onClick={() => {
            if (isMobile && onCloseMobile) onCloseMobile();
          }}
          className={`flex items-center gap-2.5 px-3 py-[7px] rounded transition-colors ${
            pathname === '/app/settings'
              ? 'bg-[var(--zoho-blue-light)] text-[var(--zoho-blue)] font-semibold'
              : 'text-[var(--zoho-text-secondary)] hover:bg-[var(--zoho-bg)] hover:text-[var(--zoho-text-primary)] font-medium'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <span className="text-[13px]">Settings</span>
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-[var(--zoho-sidebar)] border-r border-[var(--zoho-border)] shadow-md transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--zoho-border)] px-4 py-3.5">
          <div className="overflow-hidden">
            <div className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--zoho-blue)]">
              Sudha Dairy
            </div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--zoho-text-primary)] truncate">{title}</div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-7 w-7 items-center justify-center rounded border border-[var(--zoho-border)] text-[var(--zoho-text-muted)] hover:bg-[var(--zoho-bg)] cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {renderNavList(true)}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col bg-[var(--zoho-sidebar)] transition-all duration-300 ease-in-out relative z-30 ${
          isCollapsed ? 'w-0 border-none opacity-0 overflow-hidden pointer-events-none' : 'w-[220px] border-r border-[var(--zoho-border)] opacity-100'
        }`}
      >
        <div className="flex items-center border-b border-[var(--zoho-border)] px-4 py-3.5">
          <div className="overflow-hidden">
            <div className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--zoho-blue)]">
              Sudha Dairy
            </div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--zoho-text-primary)] truncate">{title}</div>
          </div>
        </div>
        {renderNavList(false)}
      </aside>
    </>
  );
}
