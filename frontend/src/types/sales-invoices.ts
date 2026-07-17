export type SalesInvoiceListItem = {
  id: string;
  invoiceNo: string;
  retailerId: string;
  salesOrderId?: string | null;
  dispatchTripId?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  source: 'auto_delivery' | 'admin_manual' | 'assisted_billing';
  status: 'draft' | 'posted' | 'partial_paid' | 'paid' | 'cancelled';
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  outstandingAmount: number;
  retailer?: {
    id: string;
    retailerCode: string;
    shopName: string;
    mobile: string;
  } | null;
  salesOrder?: {
    id: string;
    orderNo: string;
    status: string;
    source: string;
  } | null;
  dispatchTrip?: {
    id: string;
    tripNo: string;
    status: string;
    dispatchDate: string;
  } | null;
};

export type SalesInvoiceItem = {
  id: string;
  deliveryStopItemId?: string | null;
  variantId: string;
  billedQty: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  variant: {
    id: string;
    sku: string;
    variantName: string | null;
    productId: string;
    productName: string;
  } | null;
};

export type SalesInvoiceDetail = SalesInvoiceListItem & {
  items: SalesInvoiceItem[];
  retailer?: {
    id: string;
    retailerCode: string;
    shopName: string;
    ownerName?: string | null;
    mobile: string;
    orderingMode?: string | null;
  } | null;
  allocations: Array<{
    id: string;
    allocatedAmount: number;
    allocationDate: string;
    paymentReceipt: {
      id: string;
      receiptNo: string;
      amount: number;
      paymentDate: string;
      paymentMode: string;
      status: string;
    };
  }>;
};

export type SalesInvoiceFilters = {
  page?: number;
  limit?: number;
  search?: string;
  retailerId?: string;
  routeId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
};

export type GenerateSalesInvoicePayload = {
  retailerId: string;
  salesOrderId?: string;
  dispatchTripId?: string;
  invoiceDate?: string;
  dueDate?: string;
  source?: 'auto_delivery' | 'admin_manual' | 'assisted_billing' | string;
  status?: 'draft' | 'posted' | string;
  items?: Array<{
    variantId: string;
    billedQty: number;
    unitPrice: number;
    discountAmount?: number;
    taxRate?: number;
    remarks?: string;
  }>;
  paymentMode?: string;
  amountReceived?: number;
  remarks?: string;
};
