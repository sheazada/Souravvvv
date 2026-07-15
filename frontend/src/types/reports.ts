export type DailyPurchaseReportRow = {
  id: string;
  poNo: string;
  poDate: string;
  status: string;
  supplier: {
    id: string;
    supplierCode: string;
    name: string;
  } | null;
  orderedQty: number;
  subtotal: number | string;
  taxTotal: number | string;
  grandTotal: number | string;
  receiptCount: number;
  remarks?: string | null;
};

export type DailyDispatchReportRow = {
  id: string;
  tripNo: string;
  dispatchDate: string;
  status: string;
  route: {
    id: string;
    code: string;
    name: string;
  } | null;
  vehicle: {
    id: string;
    vehicleNo: string;
    vehicleType?: string | null;
  } | null;
  plannedQty: number;
  loadedQty: number;
  stopSummary: {
    totalStops: number;
    delivered: number;
    partial: number;
    pending: number;
    failed: number;
  };
};

export type ProductWiseSalesReportRow = {
  variantId: string;
  billedQty: number;
  taxAmount: number;
  salesAmount: number;
  variant: {
    id: string;
    sku: string;
    variantName: string | null;
    productId: string;
    productName: string;
  } | null;
};

export type CollectionReportData = {
  totalAmount: number;
  receiptCount: number;
  byMode: Array<{ paymentMode: string; amount: number }>;
  rows: Array<{
    id: string;
    receiptNo: string;
    partyType: string;
    paymentMode: string;
    paymentDate: string;
    amount: number;
    status: string;
    referenceNo?: string | null;
  }>;
};

export type OutstandingReportData = {
  totalOutstanding: number;
  rows: Array<{
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    dueDate?: string | null;
    grandTotal: number;
    outstandingAmount: number;
    retailer: {
      id: string;
      retailerCode: string;
      shopName: string;
      mobile: string;
    } | null;
  }>;
};

export type MonthlyBusinessSummaryRow = {
  month: string;
  orderCount: number;
  sales: number;
  collections: number;
  purchases: number;
  net: number;
};

export type ReportFilters = {
  date?: string;
  fromDate?: string;
  toDate?: string;
  routeId?: string;
  retailerId?: string;
  supplierId?: string;
  variantId?: string;
  productId?: string;
  staffId?: string;
  vehicleId?: string;
  format?: string;
};
