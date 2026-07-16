export type RetailerDashboardData = {
  retailerId: string;
  latestOrder: {
    id: string;
    orderNo: string;
    status: string;
    orderDate: string;
    grandTotal: number | string;
    orderingModeSnapshot?: string | null;
  } | null;
  recentInvoices: Array<{
    id: string;
    invoiceNo: string;
    status: string;
    invoiceDate: string;
    grandTotal: number;
    outstandingAmount: number;
    source?: string;
  }>;
  outstandingAmount: number;
};

export type PortalOrderItem = {
  id: string;
  orderNo: string;
  orderDate: string;
  requestedDeliveryDate?: string | null;
  source: string;
  orderingModeSnapshot?: string | null;
  status: string;
  grandTotal: number | string;
  notes?: string | null;
  deliveryCycle?: {
    id: string;
    cycleCode: string;
    deliveryDate: string;
    deliveryShift: string;
    status?: string;
  } | null;
};

export type PortalOrderDetail = PortalOrderItem & {
  items: Array<{
    id: string;
    orderedQty: number | string;
    approvedQty?: number | string | null;
    unitPrice: number | string;
    taxAmount: number | string;
    lineTotal: number | string;
    remarks?: string | null;
    variant: {
      id: string;
      sku: string;
      variantName: string | null;
      productId: string;
      productName: string;
    } | null;
  }>;
  invoices?: Array<{
    id: string;
    invoiceNo: string;
    status: string;
    grandTotal: number | string;
    outstandingAmount: number | string;
    source?: string;
  }>;
  route?: {
    id: string;
    code: string;
    name: string;
    deliveryShift?: string;
  } | null;
};

export type PortalInvoiceItem = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string | null;
  source: string;
  status: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  outstandingAmount: number;
  pdfUrl?: string | null;
  remarks?: string | null;
};

export type PortalInvoiceDetail = PortalInvoiceItem & {
  items: Array<{
    id: string;
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
  }>;
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

export type PortalDuesData = {
  totalOutstanding: number;
  invoices: Array<{
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    dueDate?: string | null;
    grandTotal: number;
    outstandingAmount: number;
    status: string;
  }>;
  summary?: {
    retailerId: string;
    retailerName?: string;
    currentOutstanding: number;
    totalCreditLimit: number;
    usedCredit: number;
    availableCredit: number;
    overdueAmount: number;
    pendingInvoiceCount: number;
    upcomingDueAmount: number;
    lastPaymentDate?: string | null;
    averagePaymentDays?: number;
    riskLevel: string;
    warningThresholdPercent: number;
    creditUsagePercent: number;
    orderBlocked: boolean;
    dispatchBlocked: boolean;
  };
  wallet?: {
    availableBalance: number;
    lockedBalance: number;
    lastUpdatedAt: string;
  } | null;
};

export type PortalProfileData = {
  user: {
    id: string;
    fullName: string;
    mobile: string;
    userType: string;
    roles: string[];
  };
  retailer: {
    id: string;
    retailerCode: string;
    shopName: string;
    ownerName?: string | null;
    mobile: string;
    email?: string | null;
    locality?: string | null;
    city?: string | null;
    state?: string | null;
    businessStatus: string;
    orderingMode: string;
    retailerCategory?: string | null;
    creditLimit: number | string;
    creditDays: number;
  } | null;
  ledgerSummary?: {
    openingBalance: number;
    totalInvoiced: number;
    totalCollected: number;
    outstandingAmount: number;
    openInvoiceCount: number;
    invoiceCount: number;
    paymentCount: number;
    retailerId?: string;
    retailerName?: string;
    currentOutstanding?: number;
    totalCreditLimit?: number;
    usedCredit?: number;
    availableCredit?: number;
    overdueAmount?: number;
    pendingInvoiceCount?: number;
    upcomingDueAmount?: number;
    lastPaymentDate?: string | null;
    averagePaymentDays?: number;
    riskLevel?: string;
    warningThresholdPercent?: number;
    creditUsagePercent?: number;
    orderBlocked?: boolean;
    dispatchBlocked?: boolean;
  } | null;
};

export type PortalLedgerEntry = {
  id: string;
  organizationId?: string;
  retailerId?: string;
  entryNo: string;
  entryDate: string;
  entryTime: string;
  transactionType: string;
  referenceType: string;
  referenceId?: string | null;
  invoiceId?: string | null;
  paymentReceiptId?: string | null;
  creditNoteId?: string | null;
  debitNoteId?: string | null;
  paymentMethod?: string | null;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  remarks?: string | null;
  createdAt: string;
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

export type PortalLedgerExportPayload = {
  format: string;
  retailerId: string;
  fileName: string;
  ledger: PortalLedgerEntry[];
};
