export type SalesOrderListItem = {
  id: string;
  orderNo: string;
  retailerId: string;
  routeId: string | null;
  deliveryCycleId: string;
  orderDate: string;
  requestedDeliveryDate: string | null;
  source: 'retailer' | 'admin' | 'salesperson' | 'import';
  orderingModeSnapshot: 'self_service' | 'assisted' | 'hybrid' | null;
  status:
    | 'draft'
    | 'pending'
    | 'approved'
    | 'packed'
    | 'dispatched'
    | 'delivered'
    | 'partial'
    | 'cancelled';
  subtotal: number | string;
  discountTotal: number | string;
  taxTotal: number | string;
  grandTotal: number | string;
  notes?: string | null;
  retailer?: {
    id: string;
    retailerCode: string;
    shopName: string;
    ownerName?: string | null;
    mobile: string;
  } | null;
  route?: {
    id: string;
    code: string;
    name: string;
    deliveryShift?: string | null;
  } | null;
  deliveryCycle?: {
    id: string;
    cycleCode: string;
    deliveryDate: string;
    deliveryShift: string;
    status: string;
  } | null;
};

export type SalesOrderDetail = SalesOrderListItem & {
  items: Array<{
    id: string;
    variantId: string;
    orderedQty: number | string;
    approvedQty?: number | string | null;
    unitPrice: number | string;
    discountAmount: number | string;
    taxAmount: number | string;
    lineTotal: number | string;
    remarks?: string | null;
    variant?: {
      id: string;
      sku: string;
      variantName?: string | null;
      product?: {
        id: string;
        name: string;
      } | null;
    } | null;
  }>;
  invoices: Array<{
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    status: string;
    grandTotal: number | string;
    outstandingAmount: number | string;
    source: string;
  }>;
  lockedConsolidation?: {
    id: string;
    consolidationNo: string;
    status: string;
    consolidationDate: string;
  } | null;
};

export type SalesOrderListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
  retailerId?: string;
  routeId?: string;
  deliveryCycleId?: string;
  fromDate?: string;
  toDate?: string;
};

export type AssistedSalesOrderItemInput = {
  variantId: string;
  qty: number;
  remarks?: string;
};

export type AssistedSalesOrderPayload = {
  retailerId: string;
  routeId?: string;
  requestedDeliveryDate?: string;
  source: 'admin' | 'salesperson';
  notes?: string;
  items: AssistedSalesOrderItemInput[];
};
