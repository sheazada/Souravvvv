import { getAdminRoutePermissions } from "@/config/admin-route-permissions";

export type NavigationGroup =
  | "Command Center"
  | "Sales & Receivables"
  | "Procurement"
  | "Inventory & Fulfillment"
  | "Masters"
  | "Finance & Reports"
  | "Administration"
  | "Retailer Portal"
  | "Field Team";

export type NavigationItem = {
  label: string;
  href: string;
  group?: NavigationGroup;
  requiredPermissions?: readonly string[];
};

export const NAVIGATION_BY_AREA: Record<
  "admin" | "portal" | "staff",
  readonly NavigationItem[]
> = {
  admin: [
    {
      label: "Dashboard",
      href: "/app/dashboard",
      group: "Command Center",
      requiredPermissions: getAdminRoutePermissions("dashboard"),
    },
    {
      label: "Retailers",
      href: "/app/retailers",
      group: "Masters",
      requiredPermissions: getAdminRoutePermissions("retailers"),
    },
    {
      label: "Products",
      href: "/app/products",
      group: "Masters",
      requiredPermissions: getAdminRoutePermissions("products"),
    },
    {
      label: "Sales Orders",
      href: "/app/sales-orders",
      group: "Sales & Receivables",
      requiredPermissions: getAdminRoutePermissions("salesOrders"),
    },
    {
      label: "Demand Consolidations",
      href: "/app/demand-consolidations",
      group: "Sales & Receivables",
      requiredPermissions: getAdminRoutePermissions("demandConsolidations"),
    },
    {
      label: "Purchase Orders",
      href: "/app/purchase-orders",
      group: "Procurement",
      requiredPermissions: getAdminRoutePermissions("purchaseOrders"),
    },
    {
      label: "Suppliers",
      href: "/app/suppliers",
      group: "Procurement",
      requiredPermissions: getAdminRoutePermissions("suppliers"),
    },
    {
      label: "Vehicles",
      href: "/app/vehicles",
      group: "Masters",
      requiredPermissions: getAdminRoutePermissions("vehicles"),
    },
    {
      label: "Employees",
      href: "/app/employees",
      group: "Administration",
      requiredPermissions: getAdminRoutePermissions("employees"),
    },
    {
      label: "Routes & Areas",
      href: "/app/routes",
      group: "Masters",
      requiredPermissions: getAdminRoutePermissions("routes"),
    },
    {
      label: "Goods Receipts",
      href: "/app/goods-receipts",
      group: "Inventory & Fulfillment",
      requiredPermissions: getAdminRoutePermissions("goodsReceipts"),
    },
    {
      label: "Inventory",
      href: "/app/inventory/stock",
      group: "Inventory & Fulfillment",
      requiredPermissions: getAdminRoutePermissions("inventory"),
    },
    {
      label: "Dispatch Trips",
      href: "/app/dispatch-trips",
      group: "Inventory & Fulfillment",
      requiredPermissions: getAdminRoutePermissions("dispatchTrips"),
    },
    {
      label: "Sales Invoices",
      href: "/app/sales-invoices",
      group: "Sales & Receivables",
      requiredPermissions: getAdminRoutePermissions("salesInvoices"),
    },
    {
      label: "Returns & Claims",
      href: "/app/returns",
      group: "Sales & Receivables",
      requiredPermissions: getAdminRoutePermissions("returns"),
    },
    {
      label: "Payments",
      href: "/app/payments",
      group: "Sales & Receivables",
      requiredPermissions: getAdminRoutePermissions("payments"),
    },
    {
      label: "Accounting",
      href: "/app/accounting/accounts",
      group: "Finance & Reports",
      requiredPermissions: getAdminRoutePermissions("accounting"),
    },
    {
      label: "Financial Statements",
      href: "/app/reports/financial-statements",
      group: "Finance & Reports",
      requiredPermissions: getAdminRoutePermissions("financialStatements"),
    },
    {
      label: "Pricing & Promos",
      href: "/app/pricing",
      group: "Sales & Receivables",
      requiredPermissions: getAdminRoutePermissions("pricing"),
    },
    {
      label: "AI & Forecasting",
      href: "/app/forecasting",
      group: "Command Center",
      requiredPermissions: getAdminRoutePermissions("forecasting"),
    },
    {
      label: "Finance Settings",
      href: "/app/settings/retailer-note-thresholds",
      group: "Finance & Reports",
      requiredPermissions: getAdminRoutePermissions("financeSettings"),
    },
    {
      label: "Database Backups",
      href: "/app/settings/backups",
      group: "Administration",
      requiredPermissions: getAdminRoutePermissions("backups"),
    },
    {
      label: "Organization Profile",
      href: "/app/organization",
      group: "Administration",
      requiredPermissions: getAdminRoutePermissions("organization"),
    },
    {
      label: "Delivery Cycles & Cut-offs",
      href: "/app/delivery-cycles",
      group: "Inventory & Fulfillment",
      requiredPermissions: getAdminRoutePermissions("deliveryCycles"),
    },
    {
      label: "Offline Sync Center",
      href: "/app/sync",
      group: "Administration",
      requiredPermissions: getAdminRoutePermissions("sync"),
    },
    {
      label: "Reports",
      href: "/app/reports/daily-purchase",
      group: "Finance & Reports",
      requiredPermissions: getAdminRoutePermissions("reports"),
    },
    {
      label: "Notifications",
      href: "/app/notifications",
      group: "Command Center",
      requiredPermissions: getAdminRoutePermissions("notifications"),
    },
  ],
  portal: [
    { label: "Dashboard", href: "/portal/dashboard", group: "Retailer Portal" },
    { label: "Orders", href: "/portal/orders", group: "Retailer Portal" },
    { label: "Invoices", href: "/portal/invoices", group: "Retailer Portal" },
    { label: "Dues", href: "/portal/dues", group: "Retailer Portal" },
    { label: "Ledger", href: "/portal/ledger", group: "Retailer Portal" },
    { label: "Profile", href: "/portal/profile", group: "Retailer Portal" },
  ],
  staff: [
    { label: "Dashboard", href: "/staff/dashboard", group: "Field Team" },
    { label: "Today Trips", href: "/staff/trips/today", group: "Field Team" },
    { label: "Collections", href: "/staff/collections", group: "Field Team" },
  ],
};
