export type RetailerListItem = {
  id: string;
  retailerCode: string;
  shopName: string;
  ownerName: string | null;
  mobile: string;
  locality: string | null;
  city: string | null;
  retailerCategory: string | null;
  businessStatus: string;
  orderingMode: 'self_service' | 'assisted' | 'hybrid';
  isOrderingEnabled: boolean;
  isBillingEnabled: boolean;
  creditLimit: number | string;
  creditDays: number;
  assignedRouteId: string | null;
  assignedSalespersonId: string | null;
  createdAt: string;
};

export type RetailerDetail = RetailerListItem & {
  alternateMobile?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  state?: string | null;
  pincode?: string | null;
  preferredDeliveryStart?: string | null;
  preferredDeliveryEnd?: string | null;
  openingBalance?: number | string;
  notes?: string | null;
  metrics?: {
    documentsCount: number;
    orderCount: number;
    invoiceCount: number;
  };
};

export type RetailerOutstandingInvoice = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string | null;
  grandTotal: number | string;
  outstandingAmount: number | string;
  status: string;
};

export type RetailerOutstandingData = {
  retailerId: string;
  totalOutstanding: number;
  invoices: RetailerOutstandingInvoice[];
};

export type RetailerOrderRow = {
  id: string;
  orderNo: string;
  orderDate: string;
  status: string;
  source: string;
  grandTotal: number | string;
  items: Array<{
    id: string;
    variantId: string;
    orderedQty: number | string;
    lineTotal: number | string;
  }>;
};

export type RetailerInvoiceRow = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string | null;
  status: string;
  grandTotal: number | string;
  outstandingAmount: number | string;
  items: Array<{
    id: string;
    variantId: string;
    billedQty: number | string;
    lineTotal: number | string;
  }>;
};

export type RetailerPaymentRow = {
  id: string;
  receiptNo: string;
  paymentDate: string;
  paymentMode: string;
  paymentDirection: string;
  amount: number | string;
  status: string;
  referenceNo?: string | null;
  remarks?: string | null;
};

export type RetailerLedgerSummary = {
  openingBalance: number;
  totalInvoiced: number;
  totalCollected: number;
  outstandingAmount: number;
  openInvoiceCount: number;
  invoiceCount: number;
  paymentCount: number;
  retailerId: string;
  retailerName: string;
  currentOutstanding: number;
  totalCreditLimit: number;
  usedCredit: number;
  availableCredit: number;
  overdueAmount: number;
  pendingInvoiceCount: number;
  upcomingDueAmount: number;
  lastPaymentDate?: string | null;
  averagePaymentDays: number;
  riskLevel: string;
  warningThresholdPercent: number;
  creditUsagePercent: number;
  orderBlocked: boolean;
  dispatchBlocked: boolean;
};

export type RetailerLedgerTransaction = {
  id: string;
  entryNo: string;
  entryDate: string;
  entryTime: string;
  transactionType: string;
  referenceType: string;
  referenceId?: string | null;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  remarks?: string | null;
  invoice?: {
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    grandTotal: number;
    outstandingAmount: number;
  } | null;
  paymentReceipt?: {
    id: string;
    receiptNo: string;
    paymentDate: string;
    amount: number;
    paymentMode: string;
    status: string;
  } | null;
  creditNote?: {
    id: string;
    creditNoteNo: string;
    noteDate: string;
    amount: number;
    status: string;
  } | null;
  debitNote?: {
    id: string;
    debitNoteNo: string;
    noteDate: string;
    amount: number;
    status: string;
  } | null;
};

export type RetailerListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  routeId?: string;
  salespersonId?: string;
  retailerCategory?: string;
  businessStatus?: string;
  orderingMode?: string;
  isOrderingEnabled?: string;
};
