export type DashboardSummary = {
  todaySales: number;
  pendingDeliveries: number;
  ordersAwaitingApproval: number;
  cashCollection: number;
  outstandingPayments: number;
  stockValue: number;
  lowStockCount: number;
  expiringProductsCount: number;
  dispatchTripCount: number;
  completedTripCount: number;
  dailyBusinessSummary: {
    orderCount: number;
    invoiceCount: number;
    dispatchTripCount: number;
    grnCount: number;
    paymentCount: number;
  };
  topRetailerCount: number;
};

export type MonthlySalesPoint = {
  month: string;
  totalSales: number;
};

export type TopProductRow = {
  variantId: string;
  totalQty: number;
  totalSales: number;
  variant: {
    id: string;
    sku: string;
    variantName: string | null;
    productId: string;
    productName: string;
  } | null;
};

export type TopRetailerRow = {
  retailerId: string;
  totalSales: number;
  invoiceCount: number;
  retailer: {
    id: string;
    retailerCode: string;
    shopName: string;
    mobile: string;
  } | null;
};

export type DeliveryPerformance = {
  pending: number;
  delivered: number;
  partial: number;
  failed: number;
  refused: number;
  totalStops: number;
  successRate: number;
};

export type StaffPerformanceRow = {
  employeeId: string;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    designation: string | null;
    mobile: string | null;
  } | null;
  tripCount: number;
  deliveredStops: number;
  partialStops: number;
  pendingStops: number;
  failedStops: number;
  collectionAmount: number;
};
