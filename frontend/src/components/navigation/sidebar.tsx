'use client';

import type { NavigationItem } from '@/config/navigation';
import { hasAnyPermission } from '@/lib/auth/permissions';
import { tokenStore } from '@/lib/auth/token-store';
import type { CurrentUser } from '@/types/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

function canAccessItem(user: CurrentUser | null, item: NavigationItem) {
  return hasAnyPermission(user, item.requiredPermissions ?? []);
}

type ItemAction = {
  label: string;
  href: string;
  icon?: string;
};

const ITEM_ACTIONS: Record<string, ItemAction[]> = {
  '/app/dashboard': [
    { label: '+ Generate Invoice', href: '/app/sales-invoices/generate' },
    { label: '+ Payment Collection', href: '/app/payments' },
    { label: '+ Add Sale Return', href: '/app/returns' },
    { label: 'System Overview', href: '/app/dashboard' },
  ],
  '/app/retailers': [
    { label: '+ Create New Retailer', href: '/app/retailers?action=new' },
    { label: 'Outstanding Balance', href: '/app/retailers?view=outstanding' },
    { label: 'Retailer Directory', href: '/app/retailers' },
  ],
  '/app/products': [
    { label: '+ Add New Product', href: '/app/products?action=new' },
    { label: 'Inventory Stock', href: '/app/inventory/stock' },
    { label: 'Variant Catalog', href: '/app/products' },
  ],
  '/app/sales-orders': [
    { label: '+ New Sales Order', href: '/app/sales-orders?action=new' },
    { label: 'Pending Approval', href: '/app/sales-orders?status=pending' },
    { label: 'All Sales Orders', href: '/app/sales-orders' },
  ],
  '/app/demand-consolidations': [
    { label: '+ Consolidate Demands', href: '/app/demand-consolidations?action=new' },
    { label: 'Generate Purchase Orders', href: '/app/demand-consolidations?status=approved' },
    { label: 'All Consolidations', href: '/app/demand-consolidations' },
  ],
  '/app/purchase-orders': [
    { label: '+ New Purchase Order', href: '/app/purchase-orders?action=new' },
    { label: 'Pending Receipt', href: '/app/purchase-orders?status=approved' },
    { label: 'All Purchase Orders', href: '/app/purchase-orders' },
  ],
  '/app/goods-receipts': [
    { label: '+ Record GRN', href: '/app/goods-receipts?action=new' },
    { label: 'Inspection Review', href: '/app/goods-receipts?status=draft' },
    { label: 'All Goods Receipts', href: '/app/goods-receipts' },
  ],
  '/app/purchase-invoices': [
    { label: '+ Supplier Invoice', href: '/app/purchase-invoices?action=new' },
    { label: 'Pending Payment', href: '/app/purchase-invoices?status=posted' },
    { label: 'All Purchase Invoices', href: '/app/purchase-invoices' },
  ],
  '/app/sales-invoices': [
    { label: '+ Generate Invoice (POS)', href: '/app/sales-invoices/generate' },
    { label: 'Outstanding Unpaid', href: '/app/sales-invoices?status=posted' },
    { label: 'Invoice Revision List', href: '/app/sales-invoices?status=revised' },
    { label: 'All Sales Invoices', href: '/app/sales-invoices' },
  ],
  '/app/dispatch-trips': [
    { label: '+ Plan Dispatch Trip', href: '/app/dispatch-trips?action=new' },
    { label: 'Active Driver Trips', href: '/app/dispatch-trips?status=dispatched' },
    { label: 'All Dispatch Trips', href: '/app/dispatch-trips' },
  ],
  '/app/delivery-stops': [
    { label: 'Pending Discrepancies', href: '/app/delivery-stops?status=partial' },
    { label: 'All Delivery Stops', href: '/app/delivery-stops' },
  ],
  '/app/inventory/stock': [
    { label: 'Warehouse Overview', href: '/app/inventory/stock' },
    { label: 'Stock Batches', href: '/app/inventory/batches' },
    { label: 'Stock Adjustments', href: '/app/inventory/adjustments' },
    { label: 'Stock Movements', href: '/app/inventory/movements' },
  ],
  '/app/payments': [
    { label: '+ Payment Collection', href: '/app/payments?action=new' },
    { label: 'Unallocated Receipts', href: '/app/payments?status=unallocated' },
    { label: 'All Payment Receipts', href: '/app/payments' },
  ],
  '/app/accounting/accounts': [
    { label: '+ New Journal Entry', href: '/app/accounting/journals?action=new' },
    { label: 'Chart of Accounts', href: '/app/accounting/accounts' },
    { label: 'All Journal Entries', href: '/app/accounting/journals' },
  ],
  '/app/reports/daily-dispatch': [
    { label: 'Daily Dispatch Report', href: '/app/reports/daily-dispatch' },
    { label: 'Daily Purchase Report', href: '/app/reports/daily-purchase' },
    { label: 'Collection Report', href: '/app/reports/collection' },
    { label: 'Outstanding Aging Report', href: '/app/reports/outstanding' },
    { label: 'Monthly Business Summary', href: '/app/reports/monthly-business-summary' },
  ],
  '/app/notifications': [
    { label: 'Trigger Alert Dispatch', href: '/app/notifications?action=dispatch' },
    { label: 'Failed Notification Logs', href: '/app/notifications?status=failed' },
    { label: 'All Notification Logs', href: '/app/notifications' },
  ],
  '/app/settings/retailer-note-thresholds': [
    { label: 'Note Thresholds', href: '/app/settings/retailer-note-thresholds' },
    { label: 'System Capabilities', href: '/app/settings/retailer-note-thresholds' },
  ],
};

export function Sidebar({ title, items }: { title: string; items: readonly NavigationItem[] }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
      { label: 'Generate / Add New', href: `${href}?action=new` },
    ];
  };

  const handleActionClick = (href: string) => {
    setActiveMenuId(null);
    router.push(href);
  };

  return (
    <aside
      className={`hidden border-r border-slate-200 bg-white transition-all duration-300 ease-in-out lg:flex lg:flex-col ${
        isCollapsed ? 'w-18' : 'w-64'
      } relative z-30`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
        {!isCollapsed ? (
          <div className="overflow-hidden">
            <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-cyan-600">ERP Workspace</div>
            <div className="mt-0.5 text-base font-bold text-slate-900 truncate">{title}</div>
          </div>
        ) : (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 font-bold text-white shadow-sm">
            {title.slice(0, 2).toUpperCase()}
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          {isCollapsed ? '»' : '«'}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto" ref={menuRef}>
        {visibleItems.map((item) => {
          const isMenuOpen = activeMenuId === item.href;
          const actions = getActionsForItem(item.href);

          return (
            <div key={item.href} className="relative group">
              <div
                className={`flex items-center justify-between rounded-xl transition-all duration-150 ${
                  isCollapsed ? 'justify-center py-2.5 px-2' : 'px-3 py-2'
                } hover:bg-slate-100 text-slate-700 hover:text-slate-950`}
              >
                <Link
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex-1 text-sm font-medium truncate ${isCollapsed ? 'text-center' : ''}`}
                >
                  {isCollapsed ? item.label.slice(0, 2).toUpperCase() : item.label}
                </Link>

                {/* Three-Dot Menu Trigger */}
                {!isCollapsed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveMenuId(isMenuOpen ? null : item.href);
                    }}
                    title={`Actions for ${item.label}`}
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isMenuOpen
                        ? 'bg-cyan-100 text-cyan-900 font-bold'
                        : 'text-slate-400 hover:bg-slate-200/80 hover:text-slate-700'
                    }`}
                  >
                    ⋮
                  </button>
                )}
              </div>

              {/* Three-Dot Dropdown Actions */}
              {isMenuOpen && !isCollapsed && (
                <div className="absolute right-0 top-10 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="border-b border-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {item.label} Quick Actions
                  </div>
                  <div className="mt-1 space-y-1">
                    {actions.map((action, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleActionClick(action.href)}
                        className="flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-900 transition-colors"
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
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-slate-200 p-3 text-center">
        {!isCollapsed ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span>«</span> Collapse Workspace
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            title="Expand Workspace"
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            »
          </button>
        )}
      </div>
    </aside>
  );
}
