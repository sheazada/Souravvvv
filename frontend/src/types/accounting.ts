export type AccountRow = {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'income' | 'expense' | 'equity';
  isControlAccount: boolean;
  isActive: boolean;
};

export type JournalEntryRow = {
  id: string;
  voucherNo: string;
  voucherType: string;
  entryDate: string;
  postingDate: string;
  referenceType?: string | null;
  referenceId?: string | null;
  narration?: string | null;
  status: string;
};

export type JournalEntryDetail = JournalEntryRow & {
  lines: Array<{
    id: string;
    debitAmount: number;
    creditAmount: number;
    lineNarration?: string | null;
    retailerId?: string | null;
    supplierId?: string | null;
    routeId?: string | null;
    account: {
      id: string;
      accountCode: string;
      accountName: string;
      accountType: string;
    } | null;
  }>;
};

export type TrialBalanceRow = {
  account: {
    id: string;
    accountCode: string;
    accountName: string;
    accountType: string;
  } | null;
  debit: number;
  credit: number;
  balance: number;
};

export type ProfitLossData = {
  income: Array<{ account: { id: string; accountCode: string; accountName: string; accountType: string }; debit: number; credit: number; balance: number }>;
  expense: Array<{ account: { id: string; accountCode: string; accountName: string; accountType: string }; debit: number; credit: number; balance: number }>;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
};

export type BalanceSheetData = {
  assets: Array<{ account: { id: string; accountCode: string; accountName: string; accountType: string }; debit: number; credit: number; balance: number }>;
  liabilities: Array<{ account: { id: string; accountCode: string; accountName: string; accountType: string }; debit: number; credit: number; balance: number }>;
  equity: Array<{ account: { id: string; accountCode: string; accountName: string; accountType: string }; debit: number; credit: number; balance: number }>;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
};

export type CustomerLedgerSummaryRow = {
  retailer: {
    id: string;
    retailerCode: string;
    shopName: string;
    mobile: string;
  } | null;
  invoiceCount: number;
  totalInvoiced: number;
  outstandingAmount: number;
};

export type SupplierLedgerSummaryRow = {
  supplier: {
    id: string;
    supplierCode: string;
    name: string;
    mobile: string;
  } | null;
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  outstandingAmount: number;
};
