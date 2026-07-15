export type PaymentReceiptListItem = {
  id: string;
  receiptNo: string;
  partyType: 'retailer' | 'supplier';
  partyId: string;
  paymentDirection: 'inbound' | 'outbound';
  paymentMode: 'cash' | 'upi' | 'bank' | 'cheque';
  paymentDate: string;
  amount: number;
  referenceNo?: string | null;
  status: 'draft' | 'confirmed' | 'cancelled';
  remarks?: string | null;
  party?: {
    id: string;
    retailerCode?: string;
    shopName?: string;
    supplierCode?: string;
    name?: string;
    mobile?: string;
  } | null;
};

export type PaymentAllocationRow = {
  id: string;
  paymentReceiptId: string;
  salesInvoiceId?: string | null;
  purchaseInvoiceId?: string | null;
  allocatedAmount: number;
  allocationDate: string;
};

export type PaymentReceiptDetail = PaymentReceiptListItem & {
  allocations: PaymentAllocationRow[];
};

export type RetailerOutstandingRow = {
  retailer: {
    id: string;
    retailerCode: string;
    shopName: string;
    mobile: string;
  } | null;
  totalOutstanding: number;
  invoiceCount: number;
  invoices: Array<{
    invoiceNo: string;
    invoiceDate: string;
    dueDate?: string | null;
    grandTotal: number;
    outstandingAmount: number;
  }>;
};

export type SupplierOutstandingRow = {
  supplier: {
    id: string;
    supplierCode: string;
    name: string;
    mobile: string;
  } | null;
  totalOutstanding: number;
  invoiceCount: number;
  invoices: Array<{
    invoiceNo: string;
    invoiceDate: string;
    dueDate?: string | null;
    grandTotal: number;
    outstandingAmount: number;
  }>;
};

export type OutstandingAgingRow = {
  id: string;
  invoiceNo: string;
  retailer: {
    id: string;
    retailerCode: string;
    shopName: string;
  } | null;
  dueDate?: string | null;
  outstandingAmount: number;
  ageBucket: string;
};

export type PaymentReceiptFilters = {
  page?: number;
  limit?: number;
  search?: string;
  partyType?: string;
  partyId?: string;
  paymentMode?: string;
  fromDate?: string;
  toDate?: string;
};

export type CreatePaymentReceiptPayload = {
  partyType: 'retailer' | 'supplier';
  partyId: string;
  paymentDirection: 'inbound' | 'outbound';
  paymentMode: 'cash' | 'upi' | 'bank' | 'cheque';
  paymentDate: string;
  amount: number;
  dispatchTripId?: string;
  bankAccountId?: string;
  cashRegisterId?: string;
  referenceNo?: string;
  remarks?: string;
};

export type CreatePaymentAllocationPayload = {
  salesInvoiceId?: string;
  purchaseInvoiceId?: string;
  allocatedAmount: number;
  allocationDate: string;
};
