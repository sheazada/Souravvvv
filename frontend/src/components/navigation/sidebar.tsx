"use client";

import type { NavigationGroup, NavigationItem } from "@/config/navigation";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { tokenStore } from "@/lib/auth/token-store";
import type { CurrentUser } from "@/types/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function canAccessItem(user: CurrentUser | null, item: NavigationItem) {
  return hasAnyPermission(user, item.requiredPermissions ?? []);
}

type ItemAction = {
  label: string;
  href: string;
};

const NAV_GROUP_ORDER: NavigationGroup[] = [
  "Command Center",
  "Sales & Receivables",
  "Procurement",
  "Inventory & Fulfillment",
  "Masters",
  "Finance & Reports",
  "Administration",
  "Retailer Portal",
  "Field Team",
];

const NAV_GROUP_ICONS: Record<NavigationGroup, string> = {
  "Command Center": "⌘",
  "Sales & Receivables": "₹",
  Procurement: "PO",
  "Inventory & Fulfillment": "WH",
  Masters: "DB",
  "Finance & Reports": "FN",
  Administration: "AD",
  "Retailer Portal": "RT",
  "Field Team": "FT",
};

const ITEM_ACTIONS: Record<string, ItemAction[]> = {
  "/app/dashboard": [
    {
      label: "+ Add Sale Studio (Vyapar POS)",
      href: "/app/sales-invoices/create",
    },
    {
      label: "+ Print Layouts (Tally Theme)",
      href: "/app/sales-invoices/generate",
    },
    { label: "+ Payment Collection", href: "/app/payments?action=new" },
    { label: "+ Add Sale Return", href: "/app/returns?action=new" },
  ],
  "/app/retailers": [
    { label: "+ Create New Retailer", href: "/app/retailers?action=new" },
    {
      label: "Outstanding Balance View",
      href: "/app/retailers?view=outstanding",
    },
  ],
  "/app/products": [
    { label: "+ Add New Product", href: "/app/products?action=new" },
    { label: "Live Inventory Stock", href: "/app/inventory/stock" },
  ],
  "/app/sales-orders": [
    { label: "+ New Sales Order", href: "/app/sales-orders?action=new" },
    { label: "Pending Orders", href: "/app/sales-orders?status=pending" },
  ],
  "/app/purchase-orders": [
    { label: "+ New Purchase Order", href: "/app/purchase-orders?action=new" },
    { label: "Pending Receipt", href: "/app/purchase-orders?status=approved" },
  ],
  "/app/sales-invoices": [
    { label: "+ Add Sale Studio (POS)", href: "/app/sales-invoices/create" },
    { label: "+ Print Layouts (Tally)", href: "/app/sales-invoices/generate" },
    {
      label: "Outstanding Invoices",
      href: "/app/sales-invoices?status=posted",
    },
  ],
  "/app/payments": [
    { label: "+ Payment Collection", href: "/app/payments?action=new" },
    { label: "Unallocated Receipts", href: "/app/payments?status=unallocated" },
  ],
  "/app/settings": [
    { label: "Dark Mode / Theme Settings", href: "/app/settings" },
    { label: "Organization GST & Profile", href: "/app/organization" },
    { label: "Database Disaster Recovery", href: "/app/settings/backups" },
  ],
};

export function Sidebar({
  title,
  items,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed: controlledCollapsed,
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
  const isCollapsed =
    typeof controlledCollapsed !== "undefined" ? controlledCollapsed : false;

  useEffect(() => {
    setCurrentUser(tokenStore.getStoredUser());
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleItems = useMemo(
    () => items.filter((item) => canAccessItem(currentUser, item)),
    [currentUser, items],
  );

  const groupedItems = useMemo(() => {
    const grouped = new Map<NavigationGroup | "Workspace", NavigationItem[]>();
    visibleItems.forEach((item) => {
      const group = item.group ?? "Workspace";
      grouped.set(group, [...(grouped.get(group) ?? []), item]);
    });

    return [
      ...NAV_GROUP_ORDER.filter((group) => grouped.has(group)).map(
        (group) => [group, grouped.get(group) ?? []] as const,
      ),
      ...Array.from(grouped.entries()).filter(
        ([group]) => group === "Workspace",
      ),
    ];
  }, [visibleItems]);

  const getActionsForItem = (href: string): ItemAction[] => {
    return (
      ITEM_ACTIONS[href] ?? [
        { label: "Open Workspace Module", href },
        { label: "Add New Record", href: `${href}?action=new` },
      ]
    );
  };

  const handleActionClick = (href: string, isMobile = false) => {
    setActiveMenuId(null);
    if (isMobile && onCloseMobile) onCloseMobile();
    router.push(href);
  };

  const renderNavList = (isMobile = false) => (
    <nav
      className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
      ref={isMobile ? undefined : menuRef}
    >
      {groupedItems.map(([group, groupItems]) => (
        <section
          key={group}
          className="space-y-1.5"
          aria-label={`${group} navigation`}
        >
          <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-slate-100 text-[9px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {group === "Workspace"
                ? "•"
                : NAV_GROUP_ICONS[group as NavigationGroup]}
            </span>
            <span className="truncate">{group}</span>
          </div>

          <div className="space-y-1">
            {groupItems.map((item) => {
              const menuKey = `${isMobile ? "m" : "d"}_${item.href}`;
              const isMenuOpen = activeMenuId === menuKey;
              const actions = getActionsForItem(item.href);
              const isActiveRoute =
                pathname === item.href ||
                (item.href !== "/app/dashboard" &&
                  pathname.startsWith(item.href));

              return (
                <div key={item.href} className="relative group">
                  <div
                    className={`flex items-center justify-between rounded-xl px-3 py-2 transition-all duration-150 ${
                      isActiveRoute
                        ? "bg-slate-950 text-white font-bold shadow-sm dark:bg-cyan-600"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white font-medium"
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : menuKey);
                      }}
                      title={`Quick Actions for ${item.label}`}
                      className={`ml-1 flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                        isMenuOpen
                          ? "bg-white/20 text-white font-extrabold shadow-2xs"
                          : isActiveRoute
                            ? "text-slate-200 hover:bg-white/15 hover:text-white"
                            : "text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      }`}
                    >
                      ⋮
                    </button>
                  </div>

                  {isMenuOpen && (
                    <div className="absolute right-0 top-10 z-50 w-60 animate-in rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 duration-150 fade-in zoom-in-95 dark:border-slate-700 dark:bg-slate-900">
                      <div className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:text-slate-500">
                        {item.label} Quick Actions
                      </div>
                      <div className="mt-1 space-y-1">
                        {actions.map((action) => (
                          <button
                            key={action.href}
                            type="button"
                            onClick={() =>
                              handleActionClick(action.href, isMobile)
                            }
                            className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-cyan-50 hover:text-cyan-900 dark:text-slate-300 dark:hover:bg-cyan-950/40 dark:hover:text-cyan-300"
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
          </div>
        </section>
      ))}

      <div className="mt-6 border-t border-slate-200 px-1 pt-4 dark:border-slate-800">
        <Link
          href="/app/settings"
          onClick={() => {
            if (isMobile && onCloseMobile) onCloseMobile();
          }}
          className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-cyan-500 dark:border-slate-700/80 dark:bg-slate-800/50"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⚙</span>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
                System Settings Hub
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Theme, GST & Profile
              </div>
            </div>
          </div>
          <span className="text-xs font-black text-slate-400 transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 animate-in bg-slate-900/70 backdrop-blur-xs duration-200 fade-in lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white/95 shadow-2xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950/95 lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="overflow-hidden">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
              Dairy Suite
            </div>
            <div className="mt-0.5 truncate text-base font-black text-slate-900 dark:text-white">
              {title}
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            title="Close Workspace Drawer"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>
        {renderNavList(true)}
      </aside>

      <aside
        className={`relative z-30 hidden bg-white/95 transition-all duration-300 ease-in-out dark:bg-slate-950/95 lg:flex lg:flex-col ${
          isCollapsed
            ? "w-0 overflow-hidden border-none opacity-0 pointer-events-none"
            : "w-72 border-r border-slate-200 opacity-100 dark:border-slate-800"
        }`}
      >
        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
            Dairy Suite
          </div>
          <div className="mt-0.5 truncate text-base font-black text-slate-900 dark:text-white">
            {title}
          </div>
          <div className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Operations · Billing · Finance
          </div>
        </div>
        {renderNavList(false)}
      </aside>
    </>
  );
}
