// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { AccountingService } from '../src/finance/accounting/accounting.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AdvanceWalletController } from '../src/operations/payments/advance-wallet.controller';
import { AdvanceWalletService } from '../src/operations/payments/advance-wallet.service';
import { PaymentGatewaysController } from '../src/operations/payments/payment-gateways.controller';
import { PaymentIntentsController } from '../src/operations/payments/payment-intents.controller';
import { PaymentIntentsService } from '../src/operations/payments/payment-intents.service';
import { PaymentMetricsService } from '../src/operations/payments/payment-metrics.service';
import { PaymentWebhooksService } from '../src/operations/payments/payment-webhooks.service';
import { PaymentsService } from '../src/operations/payments/payments.service';
import { RetailerFinanceController } from '../src/operations/payments/retailer-finance.controller';
import { RetailerFinanceService } from '../src/operations/payments/retailer-finance.service';
import { RetailerLedgerService } from '../src/operations/payments/retailer-ledger.service';

const IDS = {
  org: '00000000-0000-4000-8000-000000000001',
  user: '00000000-0000-4000-8000-000000000002',
  retailer: '00000000-0000-4000-8000-000000000003',
  invoice: '00000000-0000-4000-8000-000000000004',
};

function uuid(index: number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function createActor(): AuthenticatedUser {
  return {
    id: IDS.user,
    organizationId: IDS.org,
    retailerId: null,
    employeeId: null,
    fullName: 'Owner User',
    mobile: '9999999999',
    userType: 'owner',
    roles: ['OWNER'],
    permissions: [],
  };
}

function createPaymentsHarness(options?: { invoiceOutstanding?: number; receiptAmount?: number; targetAmount?: number }) {
  const invoiceOutstanding = options?.invoiceOutstanding ?? 800;
  const receiptAmount = options?.receiptAmount ?? 1000;
  const targetAmount = options?.targetAmount ?? 800;

  const state = {
    organizations: [{ id: IDS.org, name: 'Test Org' }],
    users: [
      {
        id: IDS.user,
        organizationId: IDS.org,
        retailerId: null,
        employeeId: null,
        fullName: 'Owner User',
        mobile: '9999999999',
        userType: 'owner',
      },
    ],
    retailers: [
      {
        id: IDS.retailer,
        organizationId: IDS.org,
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
        id: IDS.invoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-001',
        retailerId: IDS.retailer,
        salesOrderId: null,
        dispatchTripId: null,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        source: 'assisted_billing',
        createdByUserId: IDS.user,
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
    suppliers: [] as any[],
    dispatchTrips: [] as any[],
    bankAccounts: [] as any[],
    cashRegisters: [] as any[],
  };

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
  const toNum = (value: any) => Number(value ?? 0);
  let seq = 10;
  const nextId = () => uuid(seq++);

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
      if (where.outstandingAmount?.gt !== undefined && !(toNum(row.outstandingAmount) > toNum(where.outstandingAmount.gt))) return false;
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
          if (row.salesInvoiceId == null) return false;
        } else if (row.salesInvoiceId !== where.salesInvoiceId) return false;
      }
      if (where.salesInvoice?.is?.retailerId) {
        const invoice = state.salesInvoices.find((x) => x.id === row.salesInvoiceId);
        if (!invoice || invoice.retailerId !== where.salesInvoice.is.retailerId) return false;
      }
      if (where.paymentReceipt?.is) {
        const receipt = state.paymentReceipts.find((x) => x.id === row.paymentReceiptId);
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
      else if (key === 'salesInvoice' && row?.salesInvoiceId) {
        const invoice = state.salesInvoices.find((x) => x.id === row.salesInvoiceId);
        out[key] = invoice ? pickSelect(invoice, (value as any).select) : null;
      } else if (key === 'paymentReceipt' && row?.paymentReceiptId) {
        const receipt = state.paymentReceipts.find((x) => x.id === row.paymentReceiptId);
        out[key] = receipt ? pickSelect(receipt, (value as any).select) : null;
      } else if (key === 'product' && row?.product) {
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
        const row = state.users.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null;
        return row ? (select ? pickSelect(row, select) : clone(row)) : null;
      },
    },
    retailer: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.retailers.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null;
        return row ? (select ? pickSelect(row, select) : clone(row)) : null;
      },
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.retailers.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id)));
        return rows.map((row) => (select ? pickSelect(row, select) : clone(row)));
      },
      update: async ({ where, data }: any) => {
        const row = state.retailers.find((x) => x.id === where.id);
        Object.assign(row, data);
        return clone(row);
      },
    },
    salesInvoice: {
      findMany: async ({ where, select, orderBy }: any = {}) => sortRows(filterSalesInvoices(where), orderBy).map((row) => (select ? pickSelect(row, select) : clone(row))),
      findFirst: async ({ where, select }: any = {}) => {
        const row = filterSalesInvoices(where)[0] ?? null;
        return row ? (select ? pickSelect(row, select) : clone(row)) : null;
      },
      update: async ({ where, data }: any) => {
        const row = state.salesInvoices.find((x) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
    },
    paymentReceipt: {
      create: async ({ data }: any) => {
        const row = { id: nextId(), createdAt: new Date(), updatedAt: new Date(), autoReconciled: false, journalEntryId: null, ...data };
        state.paymentReceipts.push(row);
        return clone(row);
      },
      findFirst: async ({ where, select }: any = {}) => {
        const row = filterPaymentReceipts(where)[0] ?? null;
        return row ? (select ? pickSelect(row, select) : clone(row)) : null;
      },
      findMany: async ({ where, select, orderBy }: any = {}) => sortRows(filterPaymentReceipts(where), orderBy).map((row) => (select ? pickSelect(row, select) : clone(row))),
      findUniqueOrThrow: async ({ where }: any) => {
        const row = state.paymentReceipts.find((x) => x.id === where.id);
        if (!row) throw new Error('Receipt not found');
        return clone(row);
      },
      update: async ({ where, data }: any) => {
        const row = state.paymentReceipts.find((x) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      count: async ({ where }: any = {}) => filterPaymentReceipts(where).length,
    },
    paymentAllocation: {
      create: async ({ data }: any) => {
        const row = { id: nextId(), createdAt: new Date(), updatedAt: new Date(), purchaseInvoiceId: null, ...data };
        state.paymentAllocations.push(row);
        return clone(row);
      },
      findFirst: async ({ where }: any = {}) => clone(filterPaymentAllocations(where)[0] ?? null),
      findMany: async ({ where, include, orderBy }: any = {}) => sortRows(filterPaymentAllocations(where), orderBy).map((row) => {
        const cloned = clone(row);
        if (include?.salesInvoice && row.salesInvoiceId) {
          const invoice = state.salesInvoices.find((x) => x.id === row.salesInvoiceId);
          cloned.salesInvoice = invoice ? pickSelect(invoice, include.salesInvoice.select) : null;
        }
        if (include?.paymentReceipt && row.paymentReceiptId) {
          const receipt = state.paymentReceipts.find((x) => x.id === row.paymentReceiptId);
          cloned.paymentReceipt = receipt ? pickSelect(receipt, include.paymentReceipt.select) : null;
        }
        return cloned;
      }),
      aggregate: async ({ where }: any = {}) => ({
        _sum: {
          allocatedAmount: filterPaymentAllocations(where).reduce((sum, row) => sum + toNum(row.allocatedAmount), 0),
        },
      }),
      deleteMany: async ({ where }: any = {}) => {
        const matches = filterPaymentAllocations(where).map((row) => row.id);
        const before = state.paymentAllocations.length;
        state.paymentAllocations = state.paymentAllocations.filter((row) => !matches.includes(row.id));
        return { count: before - state.paymentAllocations.length };
      },
      count: async ({ where }: any = {}) => filterPaymentAllocations(where).length,
    },
    retailerPaymentIntent: {
      count: async ({ where }: any = {}) => filterPaymentIntents(where).length,
      create: async ({ data }: any) => {
        const row = { id: nextId(), initiatedAt: new Date(), createdAt: new Date(), updatedAt: new Date(), gatewayPaymentId: null, gatewaySignature: null, completedAt: null, expiresAt: null, failureReason: null, ...data };
        state.retailerPaymentIntents.push(row);
        return clone(row);
      },
      findFirst: async ({ where, select, include }: any = {}) => {
        const row = filterPaymentIntents(where)[0] ?? null;
        if (!row) return null;
        if (include) {
          const out: any = clone(row);
          if (include.invoiceLinks) {
            const links = state.retailerPaymentIntentInvoices.filter((x) => x.paymentIntentId === row.id);
            out.invoiceLinks = links.map((link) => ({
              ...clone(link),
              ...(include.invoiceLinks.include?.salesInvoice
                ? {
                    salesInvoice: pickSelect(
                      state.salesInvoices.find((inv) => inv.id === link.salesInvoiceId),
                      include.invoiceLinks.include.salesInvoice.select,
                    ),
                  }
                : {}),
            }));
          }
          if (include.paymentReceipts) {
            out.paymentReceipts = state.paymentReceipts
              .filter((x) => x.paymentIntentId === row.id)
              .map((receipt) => pickSelect(receipt, include.paymentReceipts.select));
          }
          return out;
        }
        return select ? pickSelect(row, select) : clone(row);
      },
      findMany: async ({ where, include, orderBy }: any = {}) => sortRows(filterPaymentIntents(where), orderBy).map((row) => {
        if (!include) return clone(row);
        const out: any = clone(row);
        if (include.invoiceLinks) {
          const links = state.retailerPaymentIntentInvoices.filter((x) => x.paymentIntentId === row.id);
          out.invoiceLinks = links.map((link) => ({
            ...clone(link),
            ...(include.invoiceLinks.include?.salesInvoice
              ? {
                  salesInvoice: pickSelect(
                    state.salesInvoices.find((inv) => inv.id === link.salesInvoiceId),
                    include.invoiceLinks.include.salesInvoice.select,
                  ),
                }
              : {}),
          }));
        }
        if (include.paymentReceipts) {
          out.paymentReceipts = state.paymentReceipts
            .filter((x) => x.paymentIntentId === row.id)
            .map((receipt) => pickSelect(receipt, include.paymentReceipts.select));
        }
        return out;
      }),
      update: async ({ where, data }: any) => {
        const row = state.retailerPaymentIntents.find((x) => x.id === where.id);
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
        const row = { id: nextId(), createdAt: new Date(), processedAt: null, errorMessage: null, ...data };
        state.paymentGatewayWebhooks.push(row);
        return clone(row);
      },
      update: async ({ where, data }: any) => {
        const row = state.paymentGatewayWebhooks.find((x) => x.id === where.id);
        Object.assign(row, data);
        return clone(row);
      },
      findMany: async ({ where }: any = {}) => state.paymentGatewayWebhooks.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId)).map(clone),
      findFirst: async ({ where }: any = {}) => clone(state.paymentGatewayWebhooks.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null),
      count: async ({ where }: any = {}) => state.paymentGatewayWebhooks.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId)).length,
    },
    retailerLedgerEntry: {
      create: async ({ data }: any) => {
        const row = { id: nextId(), createdAt: new Date(), ...data };
        state.retailerLedgerEntries.push(row);
        return clone(row);
      },
      findFirst: async ({ where }: any = {}) => clone(state.retailerLedgerEntries.find((row) => {
        if (where?.organizationId && row.organizationId !== where.organizationId) return false;
        if (where?.retailerId && row.retailerId !== where.retailerId) return false;
        if (where?.invoiceId && row.invoiceId !== where.invoiceId) return false;
        if (where?.paymentReceiptId && row.paymentReceiptId !== where.paymentReceiptId) return false;
        if (where?.transactionType && row.transactionType !== where.transactionType) return false;
        if (where?.referenceType && row.referenceType !== where.referenceType) return false;
        return true;
      }) ?? null),
      findMany: async ({ where, include, orderBy }: any = {}) => sortRows(
        state.retailerLedgerEntries.filter((row) => (!where?.organizationId || row.organizationId === where.organizationId) && (!where?.retailerId || row.retailerId === where.retailerId)),
        orderBy,
      ).map((row) => {
        const cloned = clone(row);
        if (include?.invoice && row.invoiceId) {
          const invoice = state.salesInvoices.find((x) => x.id === row.invoiceId);
          cloned.invoice = invoice ? pickSelect(invoice, include.invoice.select) : null;
        }
        if (include?.paymentReceipt && row.paymentReceiptId) {
          const receipt = state.paymentReceipts.find((x) => x.id === row.paymentReceiptId);
          cloned.paymentReceipt = receipt ? pickSelect(receipt, include.paymentReceipt.select) : null;
        }
        cloned.creditNote = null;
        cloned.debitNote = null;
        return cloned;
      }),
      count: async ({ where }: any = {}) => state.retailerLedgerEntries.filter((row) => (!where?.organizationId || row.organizationId === where.organizationId)).length,
    },
    retailerCreditProfile: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.retailerCreditProfiles.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerId || x.retailerId === where.retailerId)) ?? null;
        return row ? (select ? pickSelect(row, select) : clone(row)) : null;
      },
      upsert: async ({ where, create, update }: any) => {
        let row = state.retailerCreditProfiles.find((x) => x.retailerId === where.retailerId);
        if (!row) {
          row = { id: nextId(), createdAt: new Date(), updatedAt: new Date(), ...create };
          state.retailerCreditProfiles.push(row);
        } else {
          Object.assign(row, update, { updatedAt: new Date() });
        }
        return clone(row);
      },
    },
    retailerPaymentMetric: {
      findFirst: async ({ where }: any = {}) => clone(state.retailerPaymentMetrics.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerId || x.retailerId === where.retailerId)) ?? null),
      upsert: async ({ where, create, update }: any) => {
        let row = state.retailerPaymentMetrics.find((x) => x.retailerId === where.retailerId);
        if (!row) {
          row = { id: nextId(), ...create };
          state.retailerPaymentMetrics.push(row);
        } else {
          Object.assign(row, update);
        }
        return clone(row);
      },
    },
    retailerAdvanceWallet: {
      upsert: async ({ where, create, update }: any) => {
        let row = state.retailerAdvanceWallets.find((x) => x.retailerId === where.retailerId);
        if (!row) {
          row = { id: nextId(), createdAt: new Date(), updatedAt: new Date(), lastUpdatedAt: new Date(), ...create };
          state.retailerAdvanceWallets.push(row);
        } else {
          Object.assign(row, update, { updatedAt: new Date() });
        }
        return clone(row);
      },
      findFirst: async ({ where }: any = {}) => clone(state.retailerAdvanceWallets.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id) && (!where?.retailerId || x.retailerId === where.retailerId)) ?? null),
      update: async ({ where, data }: any) => {
        const row = state.retailerAdvanceWallets.find((x) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
    },
    retailerWalletTransaction: {
      findFirst: async ({ where }: any = {}) => clone(state.retailerWalletTransactions.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerAdvanceWalletId || x.retailerAdvanceWalletId === where.retailerAdvanceWalletId) && (!where?.transactionType || x.transactionType === where.transactionType) && (!where?.referenceType || x.referenceType === where.referenceType) && (!where?.referenceId || x.referenceId === where.referenceId)) ?? null),
      findMany: async ({ where }: any = {}) => state.retailerWalletTransactions.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerAdvanceWalletId || x.retailerAdvanceWalletId === where.retailerAdvanceWalletId)).map(clone),
      create: async ({ data }: any) => {
        const row = { id: nextId(), createdAt: new Date(), ...data };
        state.retailerWalletTransactions.push(row);
        return clone(row);
      },
      count: async ({ where }: any = {}) => state.retailerWalletTransactions.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId)).length,
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

async function createApp() {
  const harness = createPaymentsHarness();
  const moduleRef = await Test.createTestingModule({
    controllers: [
      PaymentIntentsController,
      PaymentGatewaysController,
      AdvanceWalletController,
      RetailerFinanceController,
    ],
    providers: [
      PaymentIntentsService,
      PaymentWebhooksService,
      PaymentsService,
      AdvanceWalletService,
      RetailerLedgerService,
      PaymentMetricsService,
      RetailerFinanceService,
      { provide: PrismaService, useValue: harness.prisma },
      { provide: AccountingService, useValue: { postPaymentReceipt: async () => ({ success: true }), reversePaymentReceipt: async () => ({ success: true }) } },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate(context: any) {
        context.switchToHttp().getRequest().user = harness.actor;
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return { app, harness };
}

test('HTTP e2e: payment intent -> webhook -> receipt -> ledger -> wallet -> metrics chain', async (t) => {
  process.env.PAYMENT_GATEWAY_RAZORPAY_WEBHOOK_SECRET = 'e2e-secret';
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const createIntent = await request(app.getHttpServer())
    .post('/api/v1/payment-intents')
    .send({
      retailerId: IDS.retailer,
      paymentContext: 'custom_amount',
      amount: 1000,
      gatewayName: 'razorpay',
      allocationMode: 'manual',
      selectedInvoices: [{ invoiceId: IDS.invoice, targetAmount: 800 }],
      remarks: 'HTTP e2e payment intent',
    })
    .expect(201);

  assert.equal(createIntent.body.success, true);
  assert.equal(createIntent.body.data.status, 'initiated');
  const intentId = createIntent.body.data.id as string;
  const gatewayOrderId = createIntent.body.data.gatewayOrderId as string;

  const payload = {
    event: 'payment.captured',
    status: 'captured',
    order_id: gatewayOrderId,
    payment_id: 'pay_http_1',
    method: 'upi',
    paidAt: '2026-07-10T10:00:00.000Z',
  };
  const rawBody = JSON.stringify(payload);
  const signature = createHmac('sha256', process.env.PAYMENT_GATEWAY_RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  const webhook = await request(app.getHttpServer())
    .post('/api/v1/payment-gateways/razorpay/webhook')
    .set('x-razorpay-signature', signature)
    .send(payload)
    .expect(201);

  assert.equal(webhook.body.success, true);
  assert.ok(webhook.body.data.paymentReceiptId);

  const reconciliation = await request(app.getHttpServer())
    .get(`/api/v1/payment-intents/${intentId}/reconciliation-status`)
    .expect(200);

  assert.equal(reconciliation.body.data.intent.status, 'success');
  assert.equal(reconciliation.body.data.receipts.length, 1);
  assert.equal(reconciliation.body.data.webhooks.length, 1);

  const wallet = await request(app.getHttpServer())
    .get(`/api/v1/retailers/${IDS.retailer}/advance-wallet`)
    .expect(200);

  assert.equal(wallet.body.data.availableBalance, 200);
  assert.equal(wallet.body.data.transactions.length, 1);

  const summary = await request(app.getHttpServer())
    .get(`/api/v1/retailers/${IDS.retailer}/financial-summary`)
    .expect(200);

  assert.equal(summary.body.data.currentOutstanding, 0);
  assert.equal(summary.body.data.availableCredit, 5000);

  const ledger = await request(app.getHttpServer())
    .get(`/api/v1/retailers/${IDS.retailer}/ledger-entries?limit=10`)
    .expect(200);

  assert.equal(ledger.body.data.length, 1);
  assert.equal(ledger.body.data[0].transactionType, 'payment_receipt');
  assert.equal(ledger.body.data[0].creditAmount, 1000);

  assert.equal(harness.state.paymentReceipts.length, 1);
  assert.equal(harness.state.paymentAllocations.length, 1);
  assert.equal(harness.state.retailerWalletTransactions.length, 1);
  assert.equal(harness.state.retailerLedgerEntries.length, 1);
});

test('HTTP e2e: invalid webhook signature does not create receipt', async (t) => {
  process.env.PAYMENT_GATEWAY_RAZORPAY_WEBHOOK_SECRET = 'e2e-secret';
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const createIntent = await request(app.getHttpServer())
    .post('/api/v1/payment-intents')
    .send({
      retailerId: IDS.retailer,
      paymentContext: 'custom_amount',
      amount: 1000,
      gatewayName: 'razorpay',
      allocationMode: 'manual',
      selectedInvoices: [{ invoiceId: IDS.invoice, targetAmount: 800 }],
      remarks: 'HTTP e2e bad signature',
    })
    .expect(201);

  const payload = {
    event: 'payment.captured',
    status: 'captured',
    order_id: createIntent.body.data.gatewayOrderId,
    payment_id: 'pay_http_bad',
    method: 'upi',
    paidAt: '2026-07-10T10:00:00.000Z',
  };

  const webhook = await request(app.getHttpServer())
    .post('/api/v1/payment-gateways/razorpay/webhook')
    .set('x-razorpay-signature', 'bad-signature')
    .send(payload)
    .expect(201);

  assert.equal(webhook.body.success, true);
  assert.equal(harness.state.paymentReceipts.length, 0);
  assert.equal(harness.state.retailerLedgerEntries.length, 0);
  assert.equal(harness.state.retailerWalletTransactions.length, 0);
  assert.equal(harness.state.paymentGatewayWebhooks[0].verificationStatus, 'failed');
});
