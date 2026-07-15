import { apiClient, buildQueryString } from '@/lib/api/client';
import type { ApiSuccess, PaginatedApiSuccess } from '@/types/api';
import type {
  AccountRow,
  BalanceSheetData,
  CustomerLedgerSummaryRow,
  JournalEntryDetail,
  JournalEntryRow,
  ProfitLossData,
  SupplierLedgerSummaryRow,
  TrialBalanceRow,
} from '@/types/accounting';

export const AccountingApi = {
  getAccounts(query?: { accountType?: string; isActive?: string }) {
    return apiClient<ApiSuccess<AccountRow[]>>(`/accounts${buildQueryString(query)}`);
  },
  getJournalEntries(query?: { page?: number; limit?: number; voucherType?: string; status?: string; fromDate?: string; toDate?: string }) {
    return apiClient<PaginatedApiSuccess<JournalEntryRow>>(`/journal-entries${buildQueryString(query)}`);
  },
  getJournalEntry(id: string) {
    return apiClient<ApiSuccess<JournalEntryDetail>>(`/journal-entries/${id}`);
  },
  getCustomerLedger() {
    return apiClient<ApiSuccess<CustomerLedgerSummaryRow[]>>('/ledger/customers');
  },
  getSupplierLedger() {
    return apiClient<ApiSuccess<SupplierLedgerSummaryRow[]>>('/ledger/suppliers');
  },
  getTrialBalance(asOfDate?: string) {
    return apiClient<ApiSuccess<TrialBalanceRow[]>>(`/finance/trial-balance${buildQueryString({ asOfDate })}`);
  },
  getProfitLoss(query?: { fromDate?: string; toDate?: string }) {
    return apiClient<ApiSuccess<ProfitLossData>>(`/finance/profit-loss${buildQueryString(query)}`);
  },
  getBalanceSheet(asOfDate?: string) {
    return apiClient<ApiSuccess<BalanceSheetData>>(`/finance/balance-sheet${buildQueryString({ asOfDate })}`);
  },
};
