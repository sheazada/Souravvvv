import { getAdminRoutePermissions } from '@/config/admin-route-permissions';

export type NavigationItem = {
  label: string;
  href: string;
  requiredPermissions?: readonly string[];
};

export const NAVIGATION_BY_AREA: Record<'admin' | 'portal' | 'staff', readonly NavigationItem[]> = {
  admin: [
    {
      label: 'Dashboard',
      href: '/app/dashboard',
      requiredPermissions: getAdminRoutePermissions('dashboard'),
    },
    {
      label: 'Retailers',
      href: '/app/retailers',
      requiredPermissions: getAdminRoutePermissions('retailers'),
    },
    {
      label: 'Products',
      href: '/app/products',
      requiredPermissions: getAdminRoutePermissions('products'),
    },
    {
      label: 'Sales Orders',
      href: '/app/sales-orders',
      requiredPermissions: getAdminRoutePermissions('salesOrders'),
    },
    {
      label: 'Demand Consolidations',
      href: '/app/demand-consolidations',
      requiredPermissions: getAdminRoutePermissions('demandConsolidations'),
    },
    {
      label: 'Purchase Orders',
      href: '/app/purchase-orders',
      requiredPermissions: getAdminRoutePermissions('purchaseOrders'),
    },
    {
      label: 'Goods Receipts',
      href: '/app/goods-receipts',
      requiredPermissions: getAdminRoutePermissions('goodsReceipts'),
    },
    {
      label: 'Inventory',
      href: '/app/inventory/stock',
      requiredPermissions: getAdminRoutePermissions('inventory'),
    },
    {
      label: 'Dispatch Trips',
      href: '/app/dispatch-trips',
      requiredPermissions: getAdminRoutePermissions('dispatchTrips'),
    },
    {
      label: 'Sales Invoices',
      href: '/app/sales-invoices',
      requiredPermissions: getAdminRoutePermissions('salesInvoices'),
    },
    {
      label: 'Payments',
      href: '/app/payments',
      requiredPermissions: getAdminRoutePermissions('payments'),
    },
    {
      label: 'Accounting',
      href: '/app/accounting/accounts',
      requiredPermissions: getAdminRoutePermissions('accounting'),
    },
    {
      label: 'Finance Settings',
      href: '/app/settings/retailer-note-thresholds',
      requiredPermissions: getAdminRoutePermissions('financeSettings'),
    },
    {
      label: 'Reports',
      href: '/app/reports/daily-purchase',
      requiredPermissions: getAdminRoutePermissions('reports'),
    },
    {
      label: 'Notifications',
      href: '/app/notifications',
      requiredPermissions: getAdminRoutePermissions('notifications'),
    },
  ],
  portal: [
    { label: 'Dashboard', href: '/portal/dashboard' },
    { label: 'Orders', href: '/portal/orders' },
    { label: 'Invoices', href: '/portal/invoices' },
    { label: 'Dues', href: '/portal/dues' },
    { label: 'Ledger', href: '/portal/ledger' },
    { label: 'Profile', href: '/portal/profile' },
  ],
  staff: [
    { label: 'Dashboard', href: '/staff/dashboard' },
    { label: 'Today Trips', href: '/staff/trips/today' },
    { label: 'Collections', href: '/staff/collections' },
  ],
};
