import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';
import { AdvanceWalletService } from '../src/operations/payments/advance-wallet.service';
import { PaymentIntentsService } from '../src/operations/payments/payment-intents.service';
import { PaymentMetricsService } from '../src/operations/payments/payment-metrics.service';
import { PaymentsService } from '../src/operations/payments/payments.service';
import { PaymentWebhooksService } from '../src/operations/payments/payment-webhooks.service';
import { RetailerLedgerService } from '../src/operations/payments/retailer-ledger.service';

type Dict = Record<string, any>;

type TestHarness = {
  prisma: any;
  state: Dict;
  actor: AuthenticatedUser;
  paymentIntentsService: PaymentIntentsService;
  paymentsService: PaymentsService;
  paymentWebhooksService: PaymentWebhooksService;
  advanceWalletService: AdvanceWalletService;
  retailerLedgerService: RetailerLedgerService;
  paymentMetricsService: PaymentMetricsService;
};

function createActor(): AuthenticatedUser {
  return {
    id: 'user-1',
    organizationId: 'org-1',
    retailerId: null,
    employeeId: null,
    fullName: 'Owner User',
    mobile: '9999999999',
    userType: 'owner',
    roles: ['OWNER'],
    permissions: [],
  };
}

function createHarness(options?: { invoiceOutstanding?: number; receiptAmount?: number; targetAmount?: number }) {
  const invoiceOutstanding = options?.invoiceOutstanding ?? 800;
  const receiptAmount = options?.receiptAmount ?? 1000;
  const targetAmount = options?.targetAmount ?? 800;

  const state = {
    organizations: [{ id: 'org-1', name: 'Test Org' }],
    users: [
      {
        id: 'user-1',
        organizationId: 'org-1',
        retailerId: null,
        employeeId: null,
        fullName: 'Owner User',
        mobile: '9999999999',
        userType: 'owner',
      },
    ],
    retailers: [
      {
        id: 'ret-1',
        organizationId: 'org-1',
        retailerCode: 'RET-001',
        shopName: 'Retailer One',
        creditLimit: 5000,
        creditDays: 7,
        orderingMode: 'assisted',
        isOrderingEnabled: true,
        isBillingEnabled: true,
        openingBalance: 0,
      },
    ],
    salesInvoices: [
      {
        id: 'inv-1',
        organizationId: 'org-1',
        invoiceNo: 'INV-001',
        retailerId: 'ret-1',
        salesOrderId: null,
        dispatchTripId: null,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        source: 'assisted_billing',
        createdByUserId: 'user-1',
        status: 'posted',
        subtotal: invoiceOutstanding,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: invoiceOutstanding,
        outstandingAmount: invoiceOutstanding,
        paymentStatus: 'unpaid',
        paidAt: null,
        dueBucket: 'current',
        paymentIntentId: null,
        autoReconciled: false,
        reminderEnabled: true,
        pdfUrl: null,
        remarks: null,
        journalEntryId: null,
        createdAt: new Date('2026-07-10T00:00:00.000Z'),
        updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      },
    ],
    paymentReceipts: [] as any[],
    paymentAllocations: [] as any[],
    retailerPaymentIntents: [] as any[],
    retailerPaymentIntentInvoices: [] as any[],
    paymentGatewayWebhooks: [] as any[],
    retailerLedgerEntries: [] as any[],
    retailerCreditProfiles: [] as any[],
    retailerPaymentMetrics: [] as any[],
    retailerAdvanceWallets: [] as any[],
    retailerWalletTransactions: [] as any[],
    retailerCreditOverrides: [] as any[],
    suppliers: [] as any[],
    dispatchTrips: [] as any[],
    bankAccounts: [] as any[],
    cashRegisters: [] as any[],
  };

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
  const toNum = (value: any) => Number(value ?? 0);
  const nextId = (() => {
    let i = 1;
    return (prefix: string) => `${prefix}-${i++}`;
  })();

  const matchesDate = (value: Date | null | undefined, condition: any) => {
    if (!condition) return true;
    if (!value) return false;
    const time = new Date(value).getTime();
    if (condition.gte && time < new Date(condition.gte).getTime()) return false;
    if (condition.lte && time > new Date(condition.lte).getTime()) return false;
    if (condition.lt && time >= new Date(condition.lt).getTime()) return false;
    if (condition.gt && time <= new Date(condition.gt).getTime()) return false;
    return true;
  };

  const includesText = (value: any, contains?: string) => {
    if (!contains) return true;
    return String(value ?? '').toLowerCase().includes(String(contains).toLowerCase());
  };

  const filterSalesInvoices = (where: any = {}) =>
    state.salesInvoices.filter((row) => {
      if (where.organizationId && row.organizationId !== where.organizationId) return false;
      if (where.retailerId && row.retailerId !== where.retailerId) return false;
      if (where.id) {
        if (typeof where.id === 'string' && row.id !== where.id) return false;
        if (where.id.in && !where.id.in.includes(row.id)) return false;
      }
      if (where.status) {
        if (typeof where.status === 'string' && row.status !== where.status) return false;
        if (where.status.in && !where.status.in.includes(row.status)) return false;
        if (where.status.not && row.status === where.status.not) return false;
      }
      if (where.outstandingAmount) {
        if (where.outstandingAmount.gt !== undefined && !(toNum(row.outstandingAmount) > toNum(where.outstandingAmount.gt))) return false;
      }
      if (where.invoiceDate && !matchesDate(row.invoiceDate, where.invoiceDate)) return false;
      if (where.dueDate && !matchesDate(row.dueDate, where.dueDate)) return false;
      if (where.invoiceNo && !includesText(row.invoiceNo, where.invoiceNo.contains)) return false;
      return true;
    });

  const filterPaymentReceipts = (where: any = {}) =>
    state.paymentReceipts.filter((row) => {
      if (where.organizationId && row.organizationId !== where.organizationId) return false;
      if (where.id && row.id !== where.id) return false;
      if (where.partyType && row.partyType !== where.partyType) return false;
      if (where.partyId && row.partyId !== where.partyId) return false;
      if (where.paymentIntentId && row.paymentIntentId !== where.paymentIntentId) return false;
      if (where.status) {
        if (typeof where.status === 'string' && row.status !== where.status) return false;
        if (where.status.not && row.status === where.status.not) return false;
      }
      if (where.paymentDate && !matchesDate(row.paymentDate, where.paymentDate)) return false;
      return true;
    });

  const filterPaymentAllocations = (where: any = {}) =>
    state.paymentAllocations.filter((row) => {
      if (where.organizationId && row.organizationId !== where.organizationId) return false;
      if (where.paymentReceiptId && row.paymentReceiptId !== where.paymentReceiptId) return false;
      if (where.salesInvoiceId !== undefined) {
        if (where.salesInvoiceId?.not === null) {
          if (row.salesInvoiceId === null || row.salesInvoiceId === undefined) return false;
        } else if (row.salesInvoiceId !== where.salesInvoiceId) {
          return false;
        }
      }
      if (where.purchaseInvoiceId !== undefined) {
        if (row.purchaseInvoiceId !== where.purchaseInvoiceId) return false;
      }
      if (where.salesInvoice?.is?.retailerId) {
        const invoice = state.salesInvoices.find((x: any) => x.id === row.salesInvoiceId);
        if (!invoice || invoice.retailerId !== where.salesInvoice.is.retailerId) return false;
      }
      if (where.paymentReceipt?.is) {
        const receipt = state.paymentReceipts.find((x: any) => x.id === row.paymentReceiptId);
        if (!receipt) return false;
        if (where.paymentReceipt.is.partyType && receipt.partyType !== where.paymentReceipt.is.partyType) return false;
        if (where.paymentReceipt.is.partyId && receipt.partyId !== where.paymentReceipt.is.partyId) return false;
        if (where.paymentReceipt.is.status && receipt.status !== where.paymentReceipt.is.status) return false;
      }
      return true;
    });

  const filterPaymentIntents = (where: any = {}) =>
    state.retailerPaymentIntents.filter((row) => {
      if (where.organizationId && row.organizationId !== where.organizationId) return false;
      if (where.id && row.id !== where.id) return false;
      if (where.retailerId && row.retailerId !== where.retailerId) return false;
      if (where.gatewayOrderId && row.gatewayOrderId !== where.gatewayOrderId) return false;
      if (where.gatewayPaymentId && row.gatewayPaymentId !== where.gatewayPaymentId) return false;
      if (where.status && row.status !== where.status) return false;
      return true;
    });

  const sortRows = (rows: any[], orderBy: any) => {
    if (!orderBy) return rows;
    const list = Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...rows].sort((a, b) => {
      for (const entry of list) {
        const [[key, direction]] = Object.entries(entry) as any;
        const av = a[key];
        const bv = b[key];
        if (av === bv) continue;
        const delta = av > bv ? 1 : -1;
        return direction === 'desc' ? -delta : delta;
      }
      return 0;
    });
  };

  const pickSelect = (row: any, select: any) => {
    if (!select) return clone(row);
    const out: any = {};
    for (const [key, value] of Object.entries(select)) {
      if (!value) continue;
      if (value === true) out[key] = row[key];
      else if (key === 'salesInvoice' && row.salesInvoiceId) {
        const invoice = state.salesInvoices.find((x: any) => x.id === row.salesInvoiceId);
        out[key] = invoice ? pickSelect(invoice, (value as any).select) : null;
      } else if (key === 'paymentReceipt' && row.paymentReceiptId) {
        const receipt = state.paymentReceipts.find((x: any) => x.id === row.paymentReceiptId);
        out[key] = receipt ? pickSelect(receipt, (value as any).select) : null;
      } else if (key === 'product' && row.product) {
        out[key] = pickSelect(row.product, (value as any).select);
      }
    }
    return out;
  };

  const prisma: any = {
    $transaction: async (fn: any) => fn(prisma),
    organization: {
      findFirst: async ({ select }: any = {}) => {
        const row = state.organizations[0] ?? null;
        return row ? (select ? pickSelect(row, select) : clone(row)) : null;
      },
    },
    user: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.users.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null;
        return row ? (select ? pickSelect(row, select) : clone(row)) : null;
      },
    },
    retailer: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.retailers.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null;
        return row ? (select ? pickSelect(row, select) : clone(row)) : null;
      },
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.retailers.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id)));
        return rows.map((row: any) => (select ? pickSelect(row, select) : clone(row)));
      },
      update: async ({ where, data }: any) => {
        const row = state.retailers.find((x: any) => x.id === where.id);
        Object.assign(row, data);
        return clone(row);
      },
    },
    salesInvoice: {
      findMany: async ({ where, select, orderBy }: any = {}) => sortRows(filterSalesInvoices(where), orderBy).map((row: any) => (select ? pickSelect(row, select) : clone(row))),
      findFirst: async ({ where, select }: any = {}) => {
        const row = filterSalesInvoices(where)[0] ?? null;
        return row ? (select ? pickSelect(row, select) : clone(row)) : null;
      },
      update: async ({ where, data }: any) => {
        const row = state.salesInvoices.find((x: any) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
    },
    paymentReceipt: {
      create: async ({ data }: any) => {
        const row = { id: nextId('rcpt'), createdAt: new Date(), updatedAt: new Date(), autoReconciled: false, journalEntryId: null, ...data };
        state.paymentReceipts.push(row);
        return clone(row);
      },
      findFirst: async ({ where, select }: any = {}) => {
        const row = filterPaymentReceipts(where)[0] ?? null;
        return row ? (select ? pickSelect(row, select) : clone(row)) : null;
      },
      findMany: async ({ where, select, orderBy }: any = {}) => sortRows(filterPaymentReceipts(where), orderBy).map((row: any) => (select ? pickSelect(row, select) : clone(row))),
      findUniqueOrThrow: async ({ where }: any) => {
        const row = state.paymentReceipts.find((x: any) => x.id === where.id);
        if (!row) throw new Error('Receipt not found');
        return clone(row);
      },
      update: async ({ where, data }: any) => {
        const row = state.paymentReceipts.find((x: any) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      count: async ({ where }: any = {}) => filterPaymentReceipts(where).length,
    },
    paymentAllocation: {
      create: async ({ data }: any) => {
        const row = { id: nextId('alloc'), createdAt: new Date(), updatedAt: new Date(), purchaseInvoiceId: null, ...data };
        state.paymentAllocations.push(row);
        return clone(row);
      },
      findFirst: async ({ where }: any = {}) => clone(filterPaymentAllocations(where)[0] ?? null),
      findMany: async ({ where, include, orderBy }: any = {}) => sortRows(filterPaymentAllocations(where), orderBy).map((row: any) => {
        const cloned = clone(row);
        if (include?.salesInvoice && row.salesInvoiceId) {
          const invoice = state.salesInvoices.find((x: any) => x.id === row.salesInvoiceId);
          cloned.salesInvoice = invoice ? pickSelect(invoice, include.salesInvoice.select) : null;
        }
        if (include?.paymentReceipt && row.paymentReceiptId) {
          const receipt = state.paymentReceipts.find((x: any) => x.id === row.paymentReceiptId);
          cloned.paymentReceipt = receipt ? pickSelect(receipt, include.paymentReceipt.select) : null;
        }
        return cloned;
      }),
      aggregate: async ({ where }: any = {}) => ({
        _sum: {
          allocatedAmount: filterPaymentAllocations(where).reduce((sum: number, row: any) => sum + toNum(row.allocatedAmount), 0),
        },
      }),
      deleteMany: async ({ where }: any = {}) => {
        const before = state.paymentAllocations.length;
        state.paymentAllocations = state.paymentAllocations.filter((row: any) => !filterPaymentAllocations(where).some((match: any) => match.id === row.id));
        return { count: before - state.paymentAllocations.length };
      },
    },
    retailerPaymentIntent: {
      count: async ({ where }: any = {}) => filterPaymentIntents(where).length,
      create: async ({ data }: any) => {
        const row = { id: nextId('intent'), initiatedAt: new Date(), createdAt: new Date(), updatedAt: new Date(), gatewayPaymentId: null, gatewaySignature: null, completedAt: null, expiresAt: null, failureReason: null, ...data };
        state.retailerPaymentIntents.push(row);
        return clone(row);
      },
      findFirst: async ({ where, select, include }: any = {}) => {
        const row = filterPaymentIntents(where)[0] ?? null;
        if (!row) return null;
        if (include) {
          const out: any = clone(row);
          if (include.invoiceLinks) {
            const links = state.retailerPaymentIntentInvoices.filter((x: any) => x.paymentIntentId === row.id);
            out.invoiceLinks = links.map((link: any) => ({
              ...clone(link),
              ...(include.invoiceLinks.include?.salesInvoice
                ? {
                    salesInvoice: pickSelect(
                      state.salesInvoices.find((inv: any) => inv.id === link.salesInvoiceId),
                      include.invoiceLinks.include.salesInvoice.select,
                    ),
                  }
                : {}),
            }));
          }
          if (include.paymentReceipts) {
            out.paymentReceipts = state.paymentReceipts
              .filter((x: any) => x.paymentIntentId === row.id)
              .map((receipt: any) => pickSelect(receipt, include.paymentReceipts.select));
          }
          return out;
        }
        return select ? pickSelect(row, select) : clone(row);
      },
      findMany: async ({ where, include, orderBy }: any = {}) => sortRows(filterPaymentIntents(where), orderBy).map((row: any) => {
        if (!include) return clone(row);
        const out: any = clone(row);
        if (include.invoiceLinks) {
          const links = state.retailerPaymentIntentInvoices.filter((x: any) => x.paymentIntentId === row.id);
          out.invoiceLinks = links.map((link: any) => ({
            ...clone(link),
            ...(include.invoiceLinks.include?.salesInvoice
              ? {
                  salesInvoice: pickSelect(
                    state.salesInvoices.find((inv: any) => inv.id === link.salesInvoiceId),
                    include.invoiceLinks.include.salesInvoice.select,
                  ),
                }
              : {}),
          }));
        }
        if (include.paymentReceipts) {
          out.paymentReceipts = state.paymentReceipts
            .filter((x: any) => x.paymentIntentId === row.id)
            .map((receipt: any) => pickSelect(receipt, include.paymentReceipts.select));
        }
        return out;
      }),
      update: async ({ where, data }: any) => {
        const row = state.retailerPaymentIntents.find((x: any) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
    },
    retailerPaymentIntentInvoice: {
      createMany: async ({ data }: any) => {
        for (const row of data) state.retailerPaymentIntentInvoices.push({ createdAt: new Date(), ...row });
        return { count: data.length };
      },
    },
    paymentGatewayWebhook: {
      create: async ({ data }: any) => {
        const row = { id: nextId('wh'), createdAt: new Date(), processedAt: null, errorMessage: null, ...data };
        state.paymentGatewayWebhooks.push(row);
        return clone(row);
      },
      update: async ({ where, data }: any) => {
        const row = state.paymentGatewayWebhooks.find((x: any) => x.id === where.id);
        Object.assign(row, data);
        return clone(row);
      },
      findMany: async ({ where }: any = {}) => state.paymentGatewayWebhooks.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId)).map(clone),
      findFirst: async ({ where }: any = {}) => clone(state.paymentGatewayWebhooks.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null),
      count: async ({ where }: any = {}) => state.paymentGatewayWebhooks.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId)).length,
    },
    retailerLedgerEntry: {
      create: async ({ data }: any) => {
        const row = { id: nextId('led'), createdAt: new Date(), ...data };
        state.retailerLedgerEntries.push(row);
        return clone(row);
      },
      findFirst: async ({ where }: any = {}) => clone(state.retailerLedgerEntries.find((row: any) => {
        if (where?.organizationId && row.organizationId !== where.organizationId) return false;
        if (where?.retailerId && row.retailerId !== where.retailerId) return false;
        if (where?.invoiceId && row.invoiceId !== where.invoiceId) return false;
        if (where?.paymentReceiptId && row.paymentReceiptId !== where.paymentReceiptId) return false;
        if (where?.transactionType && row.transactionType !== where.transactionType) return false;
        if (where?.referenceType && row.referenceType !== where.referenceType) return false;
        return true;
      }) ?? null),
      findMany: async ({ where }: any = {}) => state.retailerLedgerEntries.filter((row: any) => (!where?.organizationId || row.organizationId === where.organizationId) && (!where?.retailerId || row.retailerId === where.retailerId)).map(clone),
      count: async ({ where }: any = {}) => state.retailerLedgerEntries.filter((row: any) => (!where?.organizationId || row.organizationId === where.organizationId)).length,
    },
    retailerCreditProfile: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.retailerCreditProfiles.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerId || x.retailerId === where.retailerId)) ?? null;
        return row ? (select ? pickSelect(row, select) : clone(row)) : null;
      },
      upsert: async ({ where, create, update }: any) => {
        let row = state.retailerCreditProfiles.find((x: any) => x.retailerId === where.retailerId);
        if (!row) {
          row = { id: nextId('rcp'), createdAt: new Date(), updatedAt: new Date(), ...create };
          state.retailerCreditProfiles.push(row);
        } else {
          Object.assign(row, update, { updatedAt: new Date() });
        }
        return clone(row);
      },
    },
    retailerPaymentMetric: {
      findFirst: async ({ where }: any = {}) => clone(state.retailerPaymentMetrics.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerId || x.retailerId === where.retailerId)) ?? null),
      upsert: async ({ where, create, update }: any) => {
        let row = state.retailerPaymentMetrics.find((x: any) => x.retailerId === where.retailerId);
        if (!row) {
          row = { id: nextId('rpm'), ...create };
          state.retailerPaymentMetrics.push(row);
        } else {
          Object.assign(row, update);
        }
        return clone(row);
      },
    },
    retailerAdvanceWallet: {
      upsert: async ({ where, create, update }: any) => {
        let row = state.retailerAdvanceWallets.find((x: any) => x.retailerId === where.retailerId);
        if (!row) {
          row = { id: nextId('wal'), createdAt: new Date(), updatedAt: new Date(), lastUpdatedAt: new Date(), ...create };
          state.retailerAdvanceWallets.push(row);
        } else {
          Object.assign(row, update, { updatedAt: new Date() });
        }
        return clone(row);
      },
      findFirst: async ({ where }: any = {}) => clone(state.retailerAdvanceWallets.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id) && (!where?.retailerId || x.retailerId === where.retailerId)) ?? null),
      update: async ({ where, data }: any) => {
        const row = state.retailerAdvanceWallets.find((x: any) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
    },
    retailerWalletTransaction: {
      findFirst: async ({ where }: any = {}) => clone(state.retailerWalletTransactions.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerAdvanceWalletId || x.retailerAdvanceWalletId === where.retailerAdvanceWalletId) && (!where?.transactionType || x.transactionType === where.transactionType) && (!where?.referenceType || x.referenceType === where.referenceType) && (!where?.referenceId || x.referenceId === where.referenceId)) ?? null),
      findMany: async ({ where }: any = {}) => state.retailerWalletTransactions.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerAdvanceWalletId || x.retailerAdvanceWalletId === where.retailerAdvanceWalletId)).map(clone),
      create: async ({ data }: any) => {
        const row = { id: nextId('wtxn'), createdAt: new Date(), ...data };
        state.retailerWalletTransactions.push(row);
        return clone(row);
      },
      count: async ({ where }: any = {}) => state.retailerWalletTransactions.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId)).length,
    },
    dispatchTrip: {
      findFirst: async () => null,
    },
    bankAccount: {
      findFirst: async () => null,
    },
    cashRegister: {
      findFirst: async () => null,
    },
    supplier: {
      findFirst: async () => null,
      findMany: async () => [],
    },
  };

  const accountingService = {
    postPaymentReceipt: async () => ({ success: true }),
    reversePaymentReceipt: async () => ({ success: true }),
  } as any;

  const actor = createActor();
  const advanceWalletService = new AdvanceWalletService(prisma);
  const paymentMetricsService = new PaymentMetricsService(prisma);
  const retailerLedgerService = new RetailerLedgerService(prisma);
  const paymentsService = new PaymentsService(
    prisma,
    accountingService,
    retailerLedgerService,
    paymentMetricsService,
    advanceWalletService,
  );
  const paymentIntentsService = new PaymentIntentsService(prisma);
  const paymentWebhooksService = new PaymentWebhooksService(prisma, paymentIntentsService, paymentsService);

  return {
    prisma,
    state,
    actor,
    paymentIntentsService,
    paymentsService,
    paymentWebhooksService,
    advanceWalletService,
    retailerLedgerService,
    paymentMetricsService,
  };
}

test('payment intent -> webhook -> receipt -> ledger -> wallet -> metrics chain completes successfully', async () => {
  process.env.PAYMENT_GATEWAY_RAZORPAY_WEBHOOK_SECRET = 'integration-secret';
  const harness = createHarness({ invoiceOutstanding: 800, receiptAmount: 1000, targetAmount: 800 });

  const intentResponse = await harness.paymentIntentsService.create(harness.actor, {
    retailerId: 'ret-1',
    paymentContext: 'custom_amount',
    amount: 1000,
    gatewayName: 'razorpay',
    allocationMode: 'manual',
    selectedInvoices: [{ invoiceId: 'inv-1', targetAmount: 800 }],
    remarks: 'Integration test payment intent',
  });

  assert.equal(intentResponse.success, true);
  const intent = intentResponse.data;
  assert.equal(intent.status, 'initiated');
  assert.equal(intent.invoiceLinks.length, 1);

  const payload = {
    event: 'payment.captured',
    status: 'captured',
    order_id: intent.gatewayOrderId,
    payment_id: 'pay_12345',
    method: 'upi',
    paidAt: '2026-07-10T10:00:00.000Z',
  };
  const rawBody = JSON.stringify(payload);
  const signature = createHmac('sha256', process.env.PAYMENT_GATEWAY_RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  const webhookResponse = await harness.paymentWebhooksService.handleWebhook(
    'razorpay',
    { 'x-razorpay-signature': signature },
    rawBody,
    payload,
  );

  assert.equal(webhookResponse.success, true);
  assert.ok(webhookResponse.data.paymentReceiptId);

  const storedIntent = harness.state.retailerPaymentIntents[0];
  assert.equal(storedIntent.status, 'success');
  assert.equal(storedIntent.gatewayPaymentId, 'pay_12345');

  assert.equal(harness.state.paymentReceipts.length, 1);
  const receipt = harness.state.paymentReceipts[0];
  assert.equal(receipt.status, 'confirmed');
  assert.equal(receipt.paymentSource, 'gateway_webhook');
  assert.equal(receipt.paymentIntentId, storedIntent.id);
  assert.equal(Number(receipt.amount), 1000);
  assert.equal(Number(receipt.unallocatedAmount), 200);
  assert.equal(receipt.autoReconciled, true);

  assert.equal(harness.state.paymentAllocations.length, 1);
  const allocation = harness.state.paymentAllocations[0];
  assert.equal(allocation.salesInvoiceId, 'inv-1');
  assert.equal(Number(allocation.allocatedAmount), 800);

  const invoice = harness.state.salesInvoices[0];
  assert.equal(Number(invoice.outstandingAmount), 0);
  assert.equal(invoice.status, 'paid');
  assert.equal(invoice.paymentStatus, 'paid');

  assert.equal(harness.state.retailerLedgerEntries.length, 1);
  const ledger = harness.state.retailerLedgerEntries[0];
  assert.equal(ledger.transactionType, 'payment_receipt');
  assert.equal(Number(ledger.creditAmount), 1000);
  assert.equal(Number(ledger.runningBalance), -1000);

  assert.equal(harness.state.retailerAdvanceWallets.length, 1);
  const wallet = harness.state.retailerAdvanceWallets[0];
  assert.equal(Number(wallet.availableBalance), 200);

  assert.equal(harness.state.retailerWalletTransactions.length, 1);
  const walletTxn = harness.state.retailerWalletTransactions[0];
  assert.equal(walletTxn.transactionType, 'advance_credit');
  assert.equal(walletTxn.referenceType, 'payment_receipt');
  assert.equal(walletTxn.referenceId, receipt.id);
  assert.equal(Number(walletTxn.creditAmount), 200);
  assert.equal(Number(walletTxn.runningWalletBalance), 200);

  assert.equal(harness.state.retailerPaymentMetrics.length, 1);
  const metrics = harness.state.retailerPaymentMetrics[0];
  assert.equal(Number(metrics.currentOutstanding), 0);
  assert.equal(Number(metrics.overdueAmount), 0);
  assert.equal(metrics.pendingInvoiceCount, 0);

  assert.equal(harness.state.retailerCreditProfiles.length, 1);
  const profile = harness.state.retailerCreditProfiles[0];
  assert.equal(Number(profile.availableCredit), 5000);
  assert.equal(Number(profile.usedCredit), 0);

  assert.equal(harness.state.paymentGatewayWebhooks.length, 1);
  const webhook = harness.state.paymentGatewayWebhooks[0];
  assert.equal(webhook.verificationStatus, 'verified');
  assert.equal(webhook.processedStatus, 'processed');
});

test('gateway webhook processing remains idempotent for same payment intent', async () => {
  process.env.PAYMENT_GATEWAY_RAZORPAY_WEBHOOK_SECRET = 'integration-secret';
  const harness = createHarness({ invoiceOutstanding: 800, receiptAmount: 1000, targetAmount: 800 });

  const intentResponse = await harness.paymentIntentsService.create(harness.actor, {
    retailerId: 'ret-1',
    paymentContext: 'custom_amount',
    amount: 1000,
    gatewayName: 'razorpay',
    allocationMode: 'manual',
    selectedInvoices: [{ invoiceId: 'inv-1', targetAmount: 800 }],
    remarks: 'Idempotency integration test',
  });

  const payload = {
    event: 'payment.captured',
    status: 'captured',
    order_id: intentResponse.data.gatewayOrderId,
    payment_id: 'pay_repeat',
    method: 'upi',
    paidAt: '2026-07-10T10:00:00.000Z',
  };
  const rawBody = JSON.stringify(payload);
  const signature = createHmac('sha256', process.env.PAYMENT_GATEWAY_RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  await harness.paymentWebhooksService.handleWebhook('razorpay', { 'x-razorpay-signature': signature }, rawBody, payload);
  await harness.paymentWebhooksService.handleWebhook('razorpay', { 'x-razorpay-signature': signature }, rawBody, payload);

  assert.equal(harness.state.paymentReceipts.length, 1);
  assert.equal(harness.state.paymentAllocations.length, 1);
  assert.equal(harness.state.retailerLedgerEntries.length, 1);
  assert.equal(harness.state.retailerWalletTransactions.length, 1);
});

test('failed signature webhook does not create receipt or ledger posting', async () => {
  process.env.PAYMENT_GATEWAY_RAZORPAY_WEBHOOK_SECRET = 'integration-secret';
  const harness = createHarness({ invoiceOutstanding: 800, receiptAmount: 1000, targetAmount: 800 });

  const intentResponse = await harness.paymentIntentsService.create(harness.actor, {
    retailerId: 'ret-1',
    paymentContext: 'custom_amount',
    amount: 1000,
    gatewayName: 'razorpay',
    allocationMode: 'manual',
    selectedInvoices: [{ invoiceId: 'inv-1', targetAmount: 800 }],
    remarks: 'Invalid signature test',
  });

  const payload = {
    event: 'payment.captured',
    status: 'captured',
    order_id: intentResponse.data.gatewayOrderId,
    payment_id: 'pay_bad_sig',
    method: 'upi',
    paidAt: '2026-07-10T10:00:00.000Z',
  };

  const response = await harness.paymentWebhooksService.handleWebhook(
    'razorpay',
    { 'x-razorpay-signature': 'invalid-signature' },
    JSON.stringify(payload),
    payload,
  );

  assert.equal(response.success, true);
  assert.equal(harness.state.paymentReceipts.length, 0);
  assert.equal(harness.state.paymentAllocations.length, 0);
  assert.equal(harness.state.retailerLedgerEntries.length, 0);
  assert.equal(harness.state.retailerWalletTransactions.length, 0);
  assert.equal(harness.state.paymentGatewayWebhooks[0].verificationStatus, 'failed');
  assert.equal(harness.state.paymentGatewayWebhooks[0].processedStatus, 'failed');
});
