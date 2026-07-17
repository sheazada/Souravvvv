import { routes } from '@/config/routes';
import { permissions } from '@/config/permissions';

export const ADMIN_ROUTE_REGISTRY = {
  dashboard: {
    permissions: [permissions.dashboardRead],
    title: 'Dashboard',
    pageTitle: 'Admin Dashboard',
    pageDescription:
      'Live KPI view for sales, dispatch, collections, stock, and team performance.',
    loadingDescription:
      'Checking permissions and redirecting if dashboard access is not allowed.',
    unauthorizedDescription:
      'You need dashboard permissions to open admin KPI and operational summary views.',
  },
  dashboardMonthlySales: {
    permissions: [permissions.dashboardRead],
    title: 'Dashboard',
    pageTitle: 'Monthly Sales',
    pageDescription: 'Track month-wise sales movement across the business.',
    loadingDescription:
      'Checking permissions and redirecting if dashboard access is not allowed.',
    unauthorizedDescription:
      'You need dashboard permissions to review monthly sales trends.',
  },
  dashboardTopProducts: {
    permissions: [permissions.dashboardRead],
    title: 'Dashboard',
    pageTitle: 'Top Products',
    pageDescription: 'Review the highest selling products in the current dashboard window.',
    loadingDescription:
      'Checking permissions and redirecting if dashboard access is not allowed.',
    unauthorizedDescription:
      'You need dashboard permissions to review top product performance.',
  },
  dashboardTopRetailers: {
    permissions: [permissions.dashboardRead],
    title: 'Dashboard',
    pageTitle: 'Top Retailers',
    pageDescription: 'Review the strongest retailer contributors by sales and invoice count.',
    loadingDescription:
      'Checking permissions and redirecting if dashboard access is not allowed.',
    unauthorizedDescription:
      'You need dashboard permissions to review top retailer performance.',
  },
  dashboardDeliveryPerformance: {
    permissions: [permissions.dashboardRead],
    title: 'Dashboard',
    pageTitle: 'Delivery Performance',
    pageDescription: 'Monitor delivered, pending, partial, and failed stop execution KPIs.',
    loadingDescription:
      'Checking permissions and redirecting if dashboard access is not allowed.',
    unauthorizedDescription:
      'You need dashboard permissions to review delivery performance.',
  },
  dashboardStaffPerformance: {
    permissions: [permissions.dashboardRead],
    title: 'Dashboard',
    pageTitle: 'Staff Performance',
    pageDescription: 'Compare trip execution and collection productivity across staff.',
    loadingDescription:
      'Checking permissions and redirecting if dashboard access is not allowed.',
    unauthorizedDescription:
      'You need dashboard permissions to review staff performance.',
  },
  retailers: {
    permissions: [permissions.retailersManage],
    title: 'Retailers',
    pageTitle: 'Retailers',
    pageDescription:
      'Search retailers, review assisted/self-service mode, and manage customer records.',
    detailPageTitle: 'Retailer Detail',
    detailPageDescription:
      'Profile, documents, orders, invoices, payments, and ledger.',
    loadingDescription:
      'Checking permissions and redirecting if retailer management access is not allowed.',
    unauthorizedDescription:
      'You need retailer management permissions to open retailer profile, route, credit, and assisted ordering screens.',
  },
  products: {
    permissions: [permissions.productsManage],
    title: 'Products',
    pageTitle: 'Products',
    pageDescription: 'Product master, variants, and pricing management.',
    detailPageTitle: 'Product Detail',
    detailPageDescription:
      'Review product master fields, inspect variants, and update pricing configuration.',
    loadingDescription:
      'Checking permissions and redirecting if product master access is not allowed.',
    unauthorizedDescription:
      'You need product management permissions to open product, variant, and pricing setup screens.',
  },
  salesOrders: {
    permissions: [permissions.ordersManage],
    title: 'Sales Orders',
    pageTitle: 'Sales Orders',
    pageDescription:
      'Review retailer orders and create assisted orders on behalf of shops that order through the office.',
    detailPageTitle: 'Sales Order Detail',
    detailPageDescription:
      'Order totals, status history, and invoice linkage.',
    loadingDescription:
      'Checking permissions and redirecting if sales order access is not allowed.',
    unauthorizedDescription:
      'You need sales order permissions to manage order intake, approvals, and assisted ordering flows.',
  },
  salesInvoices: {
    permissions: [permissions.invoicesManage],
    title: 'Sales Invoices',
    pageTitle: 'Sales Invoices',
    pageDescription:
      'Generate delivery-based invoices, create assisted invoices, and monitor outstanding balances.',
    detailTitlePrefix: 'Sales Invoice',
    detailPageDescription:
      'Review billed lines, outstanding amount, allocations, and assisted billing context.',
    loadingDescription:
      'Checking permissions and redirecting if sales invoice access is not allowed.',
    unauthorizedDescription:
      'You need invoice permissions to review billed lines, allocations, and assisted billing context.',
  },
  returns: {
    permissions: [permissions.invoicesManage],
    title: 'Returns & Claims',
    pageTitle: 'Customer & Retailer Sale Returns & Claims',
    pageDescription:
      'Record damaged, leaked, or excess stock returns from retailers. Auto-restock inventory and issue instant credit notes.',
    detailTitlePrefix: 'Sale Return',
    detailPageDescription:
      'Review return lines, disposition, and credit note settlement context.',
    loadingDescription:
      'Checking permissions and redirecting if returns access is not allowed.',
    unauthorizedDescription:
      'You need returns/invoices permissions to manage customer returns and damage claims.',
  },
  suppliers: {
    permissions: [permissions.procurementManage],
    title: 'Suppliers',
    pageTitle: 'Milk Plant & Packaging Supplier Master',
    pageDescription: 'Manage dairy suppliers, packaging vendors, payment terms, and tax IDs.',
    detailTitlePrefix: 'Supplier',
    detailPageDescription: 'Review supplier contact and ledger summary.',
    loadingDescription: 'Checking permissions for supplier master.',
    unauthorizedDescription: 'You need procurement permissions to manage supplier master.',
  },
  vehicles: {
    permissions: [permissions.dispatchManage],
    title: 'Vehicles',
    pageTitle: 'Fleet & Vehicle Master Directory',
    pageDescription: 'Register delivery vans, insulated trucks, crate capacities, and maintenance availability.',
    detailTitlePrefix: 'Vehicle',
    detailPageDescription: 'Review vehicle fleet details.',
    loadingDescription: 'Checking permissions for vehicle fleet.',
    unauthorizedDescription: 'You need dispatch permissions to manage vehicles.',
  },
  employees: {
    permissions: [permissions.usersManage],
    title: 'Employees',
    pageTitle: 'Employee & Driver HR Directory',
    pageDescription: 'Register delivery drivers, field salespersons, warehouse loaders, and driving license records.',
    detailTitlePrefix: 'Employee',
    detailPageDescription: 'Review staff member details.',
    loadingDescription: 'Checking permissions for employee directory.',
    unauthorizedDescription: 'You need user management permissions to access staff directory.',
  },
  routes: {
    permissions: [permissions.dispatchManage],
    title: 'Routes & Areas',
    pageTitle: 'Delivery Routes & Geographical Zones Master',
    pageDescription: 'Configure delivery shift times, order cutoffs, and geographic dispatch areas.',
    detailTitlePrefix: 'Route',
    detailPageDescription: 'Review delivery route and zone configuration.',
    loadingDescription: 'Checking permissions for route master.',
    unauthorizedDescription: 'You need dispatch permissions to manage delivery routes.',
  },
  financialStatements: {
    permissions: [permissions.accountingManage],
    title: 'Financial Statements',
    pageTitle: 'Statutory Accounting Financial Statements',
    pageDescription: 'Real-time general ledger accounting statements: Trial Balance, Profit & Loss, Balance Sheet, and GST Summary.',
    detailTitlePrefix: 'Financial Statement',
    detailPageDescription: 'Review statutory financial statement data.',
    loadingDescription: 'Checking permissions for financial statements.',
    unauthorizedDescription: 'You need accounting permissions to review financial statements.',
  },
  demandConsolidations: {
    permissions: [permissions.procurementManage],
    title: 'Demand Consolidations',
    pageTitle: 'Demand Consolidations',
    pageDescription:
      'Create daily product-wise demand sheets from approved orders and move them toward procurement.',
    detailTitlePrefix: 'Demand Consolidation',
    detailPageDescription:
      'Review consolidated product demand, update procurement buffer, and prepare the cycle for PO generation.',
    loadingDescription:
      'Checking permissions and redirecting if procurement planning access is not allowed.',
    unauthorizedDescription:
      'You need procurement permissions to open consolidated demand planning and procurement recommendation screens.',
  },
  purchaseOrders: {
    permissions: [permissions.procurementManage],
    title: 'Purchase Orders',
    pageTitle: 'Purchase Orders',
    pageDescription:
      'Create manual supplier orders or generate procurement orders directly from approved demand consolidations.',
    detailTitlePrefix: 'Purchase Order',
    detailPageDescription:
      'Review supplier, item lines, demand source, and receipt summary.',
    loadingDescription:
      'Checking permissions and redirecting if procurement access is not allowed.',
    unauthorizedDescription:
      'You need procurement permissions to manage supplier ordering and PO review screens.',
  },
  goodsReceipts: {
    permissions: [permissions.procurementManage],
    title: 'Goods Receipts',
    pageTitle: 'Goods Receipts',
    pageDescription:
      'Record supplier receipts, compare PO quantities, and prepare stock posting.',
    detailTitlePrefix: 'Goods Receipt',
    detailPageDescription:
      'Compare ordered vs received quantities, validate batches, and post stock into inventory.',
    loadingDescription:
      'Checking permissions and redirecting if receipt access is not allowed.',
    unauthorizedDescription:
      'You need procurement permissions to review inward receipts, shortages, and supplier receipt records.',
  },
  inventory: {
    permissions: [permissions.inventoryManage],
    title: 'Inventory',
    pageTitle: 'Stock on Hand',
    pageDescription:
      'Track current warehouse stock, batch counts, and upcoming expiries.',
    loadingDescription:
      'Checking permissions and redirecting if inventory access is not allowed.',
    unauthorizedDescription:
      'You need inventory permissions to open stock, movement, batch, and adjustment screens.',
  },
  dispatchTrips: {
    permissions: [permissions.dispatchManage],
    title: 'Dispatch',
    pageTitle: 'Dispatch Trips',
    pageDescription:
      'Generate route trips, load stock, and move approved orders into delivery workflow.',
    detailTitlePrefix: 'Dispatch Trip',
    detailPageDescription:
      'Manage route resources, stock loading, stop execution, and challan generation.',
    loadingDescription:
      'Checking permissions and redirecting if dispatch access is not allowed.',
    unauthorizedDescription:
      'You need dispatch permissions to open dispatch trip planning and execution screens.',
  },
  deliveryStops: {
    permissions: [permissions.dispatchManage],
    title: 'Delivery Stops',
    pageTitle: 'Delivery Stops',
    pageDescription:
      'Review and execute route stop delivery details, collections, and proof of delivery updates.',
    detailTitlePrefix: 'Delivery Stop',
    detailPageDescription:
      'Update delivered quantities, capture collections, and attach proof of delivery.',
    loadingDescription:
      'Checking permissions and redirecting if delivery stop access is not allowed.',
    unauthorizedDescription:
      'You need dispatch permissions to view route stop execution and stop-level delivery details.',
  },
  payments: {
    permissions: [permissions.accountingManage],
    title: 'Payments',
    pageTitle: 'Payments',
    pageDescription:
      'Create payment receipts, confirm collections, and monitor outstanding balances.',
    detailTitlePrefix: 'Payment Receipt',
    detailPageDescription:
      'Confirm receipt, review allocations, and manage customer/supplier payment linkage.',
    loadingDescription:
      'Checking permissions and redirecting if payments access is not allowed.',
    unauthorizedDescription:
      'You need accounting permissions to manage receipts, confirmations, and collections.',
  },
  accounting: {
    permissions: [permissions.accountingManage],
    title: 'Accounting',
    pageTitle: 'Accounts',
    pageDescription:
      'Browse the chart of accounts and monitor financial statement summaries.',
    loadingDescription:
      'Checking permissions and redirecting if accounting access is not allowed.',
    unauthorizedDescription:
      'You need accounting permissions to access journals, ledgers, and finance views.',
  },
  journalEntries: {
    permissions: [permissions.accountingManage],
    title: 'Accounting',
    pageTitle: 'Journal Entries',
    pageDescription:
      'Review accounting postings and customer/supplier ledger summaries.',
    detailTitlePrefix: 'Journal Entry',
    detailPageDescription:
      'Inspect line-level debits, credits, and account posting context.',
    loadingDescription:
      'Checking permissions and redirecting if accounting access is not allowed.',
    unauthorizedDescription:
      'You need accounting permissions to access journals, ledgers, and finance views.',
  },
  financeSettings: {
    permissions: [permissions.accountingManage],
    title: 'Retailer Note Threshold Settings',
    pageTitle: 'Retailer Note Threshold Settings',
    pageDescription:
      'Manage organization-level credit note and debit note ceilings used by finance correction workflows.',
    loadingDescription:
      'Checking permissions and redirecting if access is not allowed.',
    unauthorizedDescription:
      'You need accounting permissions to manage retailer note threshold controls.',
  },
  reports: {
    permissions: [permissions.reportsRead],
    title: 'Reports',
    pageTitle: 'Reports',
    pageDescription:
      'Review operational and financial reports across collections, dispatch, purchase, and outstanding balances.',
    loadingDescription:
      'Checking permissions and redirecting if reporting access is not allowed.',
    unauthorizedDescription:
      'You need reporting permissions to open collection, outstanding, and business summary reports.',
  },
  notifications: {
    permissions: [permissions.notificationsManage],
    title: 'Notifications',
    pageTitle: 'Notification Center',
    pageDescription:
      'Monitor notification delivery, review templates, and retry failed messages.',
    loadingDescription:
      'Checking permissions and redirecting if notification access is not allowed.',
    unauthorizedDescription:
      'You need notification permissions to monitor delivery logs, templates, and retries.',
  },
} as const;

export type AdminProtectedRouteKey = keyof typeof ADMIN_ROUTE_REGISTRY;

export const ADMIN_TOPBAR_SHORTCUTS: ReadonlyArray<{
  routeKey: AdminProtectedRouteKey;
  href: string;
  variant: 'primary' | 'default';
}> = [
  {
    href: routes.adminDashboard,
    routeKey: 'dashboard',
    variant: 'default',
  },
  {
    href: routes.adminSalesInvoices,
    routeKey: 'salesInvoices',
    variant: 'default',
  },
  {
    href: routes.adminRetailerNoteThresholds,
    routeKey: 'financeSettings',
    variant: 'primary',
  },
  {
    href: '/app/notifications',
    routeKey: 'notifications',
    variant: 'default',
  },
] as const;

export function getAdminRoutePermissions(routeKey: AdminProtectedRouteKey) {
  return ADMIN_ROUTE_REGISTRY[routeKey].permissions;
}

export function getAdminRouteMeta(routeKey: AdminProtectedRouteKey) {
  const routeMeta = ADMIN_ROUTE_REGISTRY[routeKey];

  return {
    title: routeMeta.title,
    pageTitle: routeMeta.pageTitle,
    pageDescription: routeMeta.pageDescription,
    detailPageTitle: 'detailPageTitle' in routeMeta ? routeMeta.detailPageTitle : undefined,
    detailTitlePrefix: 'detailTitlePrefix' in routeMeta ? routeMeta.detailTitlePrefix : undefined,
    detailPageDescription:
      'detailPageDescription' in routeMeta ? routeMeta.detailPageDescription : undefined,
    loadingDescription: routeMeta.loadingDescription,
    unauthorizedDescription: routeMeta.unauthorizedDescription,
  };
}

export function getAdminTopbarShortcutMeta(shortcut: {
  routeKey: AdminProtectedRouteKey;
  href: string;
  variant: 'primary' | 'default';
}) {
  const routeMeta = getAdminRouteMeta(shortcut.routeKey);
  return {
    label: routeMeta.title,
    href: shortcut.href,
    routeKey: shortcut.routeKey,
    className:
      shortcut.variant === 'primary'
        ? 'rounded-xl border border-cyan-300 px-3 py-2 text-sm font-medium text-cyan-900 hover:bg-cyan-50'
        : 'rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50',
  };
}
