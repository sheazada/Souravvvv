// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';
import { AccountingService } from '../src/finance/accounting/accounting.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { CreditControlService } from '../src/operations/payments/credit-control.service';
import { PaymentMetricsService } from '../src/operations/payments/payment-metrics.service';
import { RetailerFinanceService } from '../src/operations/payments/retailer-finance.service';
import { RetailerLedgerService } from '../src/operations/payments/retailer-ledger.service';
import { SalesInvoicesController } from '../src/operations/sales-invoices/sales-invoices.controller';
import { SalesInvoicesService } from '../src/operations/sales-invoices/sales-invoices.service';

const IDS = {
  org: '40000000-0000-4000-8000-000000000001',
  user: '40000000-0000-4000-8000-000000000002',
  retailer: '40000000-0000-4000-8000-000000000003',
  variant1: '40000000-0000-4000-8000-000000000004',
  variant2: '40000000-0000-4000-8000-000000000005',
  draftInvoice: '40000000-0000-4000-8000-000000000006',
  postedInvoice: '40000000-0000-4000-8000-000000000007',
  draftItem1: '40000000-0000-4000-8000-000000000008',
  draftItem2: '40000000-0000-4000-8000-000000000009',
  postedItem1: '40000000-0000-4000-8000-000000000010',
  journalEntry: '40000000-0000-4000-8000-000000000011',
};

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

function uuid(index: number) {
  return `40000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function createHarness() {
  const state = {
    retailers: [
      {
        id: IDS.retailer,
        organizationId: IDS.org,
        retailerCode: 'RET-001',
        shopName: 'Retailer One',
        ownerName: 'Owner',
        mobile: '9999999999',
        orderingMode: 'assisted',
      },
    ],
    productVariants: [
      {
        id: IDS.variant1,
        organizationId: IDS.org,
        sku: 'SKU-1',
        variantName: '500ml',
        product: { id: uuid(20), name: 'Sudha Milk' },
      },
      {
        id: IDS.variant2,
        organizationId: IDS.org,
        sku: 'SKU-2',
        variantName: '1L',
        product: { id: uuid(21), name: 'Sudha Curd' },
      },
    ],
    salesInvoices: [
      {
        id: IDS.draftInvoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-DRAFT-001',
        retailerId: IDS.retailer,
        salesOrderId: null,
        dispatchTripId: null,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        source: 'assisted_billing',
        createdByUserId: IDS.user,
        status: 'draft',
        subtotal: 1600,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: 1600,
        outstandingAmount: 1600,
        paymentStatus: 'unpaid',
        paidAt: null,
        dueBucket: 'current',
        paymentIntentId: null,
        autoReconciled: false,
        reminderEnabled: true,
        pdfUrl: null,
        remarks: 'Draft invoice',
        journalEntryId: null,
        createdAt: new Date('2026-07-10T00:00:00.000Z'),
        updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      },
      {
        id: IDS.postedInvoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-POSTED-001',
        retailerId: IDS.retailer,
        salesOrderId: null,
        dispatchTripId: null,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        source: 'assisted_billing',
        createdByUserId: IDS.user,
        status: 'posted',
        subtotal: 1600,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: 1600,
        outstandingAmount: 1600,
        paymentStatus: 'unpaid',
        paidAt: null,
        dueBucket: 'current',
        paymentIntentId: null,
        autoReconciled: false,
        reminderEnabled: true,
        pdfUrl: null,
        remarks: 'Posted invoice',
        journalEntryId: IDS.journalEntry,
        createdAt: new Date('2026-07-10T00:00:00.000Z'),
        updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      },
    ],
    salesInvoiceItems: [
      {
        id: IDS.draftItem1,
        organizationId: IDS.org,
        salesInvoiceId: IDS.draftInvoice,
        deliveryStopItemId: null,
        variantId: IDS.variant1,
        billedQty: 10,
        unitPrice: 80,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: 800,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: IDS.draftItem2,
        organizationId: IDS.org,
        salesInvoiceId: IDS.draftInvoice,
        deliveryStopItemId: null,
        variantId: IDS.variant2,
        billedQty: 10,
        unitPrice: 80,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: 800,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: IDS.postedItem1,
        organizationId: IDS.org,
        salesInvoiceId: IDS.postedInvoice,
        deliveryStopItemId: null,
        variantId: IDS.variant1,
        billedQty: 20,
        unitPrice: 80,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: 1600,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    paymentAllocations: [] as any[],
  };

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
  const toNum = (value: any) => Number(value ?? 0);
  let counter = 100;
  const nextId = () => uuid(counter++);

  const accountingCalls = {
    postSalesInvoice: [] as any[],
    reverseSalesInvoice: [] as any[],
  };
  const ledgerCalls = {
    postInvoiceDebit: [] as any[],
    reverseInvoicePosting: [] as any[],
  };
  const metricCalls = {
    refreshAfterInvoice: [] as any[],
  };

  const prisma: any = {
    $transaction: async (fn: any) => fn(prisma),
    salesInvoice: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.salesInvoices.find((x) => {
          if (where?.id && x.id !== where.id) return false;
          if (where?.organizationId && x.organizationId !== where.organizationId) return false;
          if (where?.retailerId && x.retailerId !== where.retailerId) return false;
          if (where?.salesOrderId !== undefined && x.salesOrderId !== where.salesOrderId) return false;
          if (where?.dispatchTripId !== undefined && x.dispatchTripId !== where.dispatchTripId) return false;
          if (where?.status?.not && x.status === where.status.not) return false;
          return true;
        }) ?? null;
        if (!row) return null;
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      },
      findMany: async ({ where, select, orderBy }: any = {}) => {
        let rows = state.salesInvoices.filter((x) => {
          if (where?.organizationId && x.organizationId !== where.organizationId) return false;
          if (where?.retailerId && x.retailerId !== where.retailerId) return false;
          if (where?.id?.in && !where.id.in.includes(x.id)) return false;
          if (where?.salesOrderId !== undefined && x.salesOrderId !== where.salesOrderId) return false;
          if (where?.dispatchTripId !== undefined && x.dispatchTripId !== where.dispatchTripId) return false;
          return true;
        });
        if (orderBy) {
          rows = [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        return rows.map((row) => {
          if (!select) return clone(row);
          const out: any = {};
          for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
          return out;
        });
      },
      update: async ({ where, data }: any) => {
        const row = state.salesInvoices.find((x) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      create: async ({ data }: any) => {
        const row = {
          id: nextId(),
          paidAt: null,
          dueBucket: 'current',
          paymentIntentId: null,
          autoReconciled: false,
          reminderEnabled: true,
          pdfUrl: null,
          journalEntryId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.salesInvoices.push(row);
        return clone(row);
      },
      delete: async ({ where }: any) => {
        const index = state.salesInvoices.findIndex((x) => x.id === where.id);
        const [removed] = state.salesInvoices.splice(index, 1);
        state.salesInvoiceItems = state.salesInvoiceItems.filter((x) => x.salesInvoiceId !== where.id);
        return clone(removed);
      },
      count: async ({ where }: any = {}) => {
        return state.salesInvoices.filter((x) => {
          if (where?.organizationId && x.organizationId !== where.organizationId) return false;
          if (where?.invoiceNo?.startsWith && !String(x.invoiceNo).startsWith(where.invoiceNo.startsWith)) return false;
          return true;
        }).length;
      },
    },
    salesInvoiceItem: {
      findMany: async ({ where }: any = {}) => {
        return state.salesInvoiceItems
          .filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.salesInvoiceId || x.salesInvoiceId === where.salesInvoiceId))
          .map(clone);
      },
      deleteMany: async ({ where }: any = {}) => {
        const before = state.salesInvoiceItems.length;
        state.salesInvoiceItems = state.salesInvoiceItems.filter((x) => !(x.organizationId === where.organizationId && x.salesInvoiceId === where.salesInvoiceId));
        return { count: before - state.salesInvoiceItems.length };
      },
      createMany: async ({ data }: any) => {
        for (const row of data) {
          state.salesInvoiceItems.push({
            id: nextId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...row,
          });
        }
        return { count: data.length };
      },
    },
    retailer: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.retailers.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null;
        if (!row) return null;
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      },
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.retailers.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id)));
        return rows.map((row) => {
          if (!select) return clone(row);
          const out: any = {};
          for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
          return out;
        });
      },
    },
    salesOrder: {
      findFirst: async () => null,
      findMany: async () => [],
    },
    dispatchTrip: {
      findFirst: async () => null,
      findMany: async () => [],
    },
    deliveryStop: {
      findMany: async () => [],
    },
    deliveryStopItem: {
      findMany: async () => [],
    },
    productVariant: {
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.productVariants.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id)));
        return rows.map((row) => {
          if (!select) return clone(row);
          const out: any = {};
          for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
          return out;
        });
      },
    },
    paymentAllocation: {
      aggregate: async ({ where }: any = {}) => ({
        _sum: {
          allocatedAmount: state.paymentAllocations
            .filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.salesInvoiceId || x.salesInvoiceId === where.salesInvoiceId))
            .reduce((sum, row) => sum + toNum(row.allocatedAmount), 0),
        },
      }),
      findMany: async ({ where }: any = {}) => {
        return state.paymentAllocations
          .filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.salesInvoiceId || x.salesInvoiceId === where.salesInvoiceId))
          .map((row) => ({ ...clone(row), paymentReceipt: null }));
      },
    },
  };

  const accountingService = {
    postSalesInvoice: async (...args: any[]) => {
      accountingCalls.postSalesInvoice.push(args);
      return { success: true };
    },
    reverseSalesInvoice: async (...args: any[]) => {
      accountingCalls.reverseSalesInvoice.push(args);
      return { success: true };
    },
  } as any;

  const retailerLedgerService = {
    postInvoiceDebit: async (...args: any[]) => {
      ledgerCalls.postInvoiceDebit.push(args);
      return { success: true };
    },
    reverseInvoicePosting: async (...args: any[]) => {
      ledgerCalls.reverseInvoicePosting.push(args);
      return { success: true };
    },
  } as any;

  const paymentMetricsService = {
    refreshAfterInvoice: async (...args: any[]) => {
      metricCalls.refreshAfterInvoice.push(args);
      return { success: true };
    },
  } as any;

  const retailerFinanceService = {
    getMyDues: async () => ({ success: true, data: {} }),
  } as any;

  const creditControlService = {
    assertCreditAllowed: async () => ({ decision: 'allowed' }),
  } as any;

  const actor = createActor();
  const service = new SalesInvoicesService(
    prisma,
    accountingService,
    retailerLedgerService,
    paymentMetricsService,
    retailerFinanceService,
    creditControlService,
  );

  return { actor, service, state, prisma, calls: { accountingCalls, ledgerCalls, metricCalls } };
}

async function createApp() {
  const harness = createHarness();
  const moduleRef = await Test.createTestingModule({
    controllers: [SalesInvoicesController],
    providers: [
      SalesInvoicesService,
      { provide: PrismaService, useValue: harness.prisma },
      { provide: AccountingService, useValue: { postSalesInvoice: async (...args: any[]) => harness.calls.accountingCalls.postSalesInvoice.push(args), reverseSalesInvoice: async (...args: any[]) => harness.calls.accountingCalls.reverseSalesInvoice.push(args) } },
      { provide: RetailerLedgerService, useValue: { postInvoiceDebit: async (...args: any[]) => harness.calls.ledgerCalls.postInvoiceDebit.push(args), reverseInvoicePosting: async (...args: any[]) => harness.calls.ledgerCalls.reverseInvoicePosting.push(args) } },
      { provide: PaymentMetricsService, useValue: { refreshAfterInvoice: async (...args: any[]) => harness.calls.metricCalls.refreshAfterInvoice.push(args) } },
      { provide: RetailerFinanceService, useValue: { getMyDues: async () => ({ success: true, data: {} }) } },
      { provide: CreditControlService, useValue: { assertCreditAllowed: async () => ({ decision: 'allowed' }) } },
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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  return { app, harness };
}

test('HTTP e2e: draft invoice can be updated', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/sales-invoices/${IDS.draftInvoice}`)
    .send({
      remarks: 'Retailer accepted less items',
      items: [
        { variantId: IDS.variant1, billedQty: 7, unitPrice: 80 },
        { variantId: IDS.variant2, billedQty: 5, unitPrice: 80 },
      ],
    })
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.remarks, 'Retailer accepted less items');
  assert.equal(response.body.data.grandTotal, 960);
  assert.equal(harness.state.salesInvoices.find((x) => x.id === IDS.draftInvoice).grandTotal, 960);
});

test('HTTP e2e: draft invoice can be deleted', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.draftInvoice}/delete-draft`)
    .send({ reason: 'Wrong draft before final delivery confirmation' })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(harness.state.salesInvoices.some((x) => x.id === IDS.draftInvoice), false);
});

test('HTTP e2e: posted unpaid invoice revision preview returns replacement flow', async (t) => {
  const { app } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/revision-preview`)
    .send({
      revisionMode: 'manual',
      reason: 'Retailer accepted only 15',
      items: [{ variantId: IDS.variant1, billedQty: 15, unitPrice: 80 }],
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.financialAction, 'cancel_and_regenerate');
  assert.equal(response.body.data.revisedGrandTotal, 1200);
  assert.equal(response.body.data.deltaAmount, -400);
});

test('HTTP e2e: posted unpaid invoice can be revised into replacement invoice', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/revise`)
    .send({
      revisionMode: 'manual',
      reason: 'Retailer accepted only 15',
      items: [{ variantId: IDS.variant1, billedQty: 15, unitPrice: 80 }],
    })
    .expect(201);

  assert.equal(response.body.success, true);
  const original = harness.state.salesInvoices.find((x) => x.id === IDS.postedInvoice)!;
  assert.equal(original.status, 'cancelled');

  const replacement = harness.state.salesInvoices.find((x) => x.id === response.body.data.replacementInvoiceId)!;
  assert.ok(replacement);
  assert.equal(replacement.invoiceNo, 'INV-POSTED-001-R1');
  assert.equal(replacement.grandTotal, 1200);
  assert.equal(harness.calls.ledgerCalls.reverseInvoicePosting.length, 1);
  assert.equal(harness.calls.ledgerCalls.postInvoiceDebit.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseSalesInvoice.length, 1);
  assert.equal(harness.calls.accountingCalls.postSalesInvoice.length, 1);
});

test('HTTP e2e: revision history includes original and replacement invoices', async (t) => {
  const { app } = await createApp();
  t.after(async () => app.close());

  const revise = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/revise`)
    .send({
      revisionMode: 'manual',
      reason: 'Retailer accepted only 15',
      items: [{ variantId: IDS.variant1, billedQty: 15, unitPrice: 80 }],
    })
    .expect(201);

  const history = await request(app.getHttpServer())
    .get(`/api/v1/sales-invoices/${IDS.postedInvoice}/revision-history`)
    .expect(200);

  assert.equal(history.body.success, true);
  assert.ok(history.body.data.length >= 2);
  assert.ok(history.body.data.some((row: any) => row.invoiceNo === 'INV-POSTED-001'));
  assert.ok(history.body.data.some((row: any) => row.id === revise.body.data.replacementInvoiceId));
});

test('HTTP e2e: revise endpoint returns 409 for partial-paid invoice', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const invoice = harness.state.salesInvoices.find((x) => x.id === IDS.postedInvoice)!;
  invoice.paymentStatus = 'partial_paid';
  invoice.status = 'posted';
  invoice.outstandingAmount = 800;

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/revise`)
    .send({
      revisionMode: 'manual',
      reason: 'Retailer accepted only 15',
      items: [{ variantId: IDS.variant1, billedQty: 15, unitPrice: 80 }],
    })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Invoice with payment activity must use note-based adjustment flow/);
});

test('HTTP e2e: cancel-and-regenerate endpoint returns 409 for partial-paid invoice', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const invoice = harness.state.salesInvoices.find((x) => x.id === IDS.postedInvoice)!;
  invoice.paymentStatus = 'partial_paid';
  invoice.status = 'posted';
  invoice.outstandingAmount = 800;

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/cancel-and-regenerate`)
    .send({
      reason: 'Cancel and regenerate after partial payment',
      source: 'manual',
      items: [{ variantId: IDS.variant1, billedQty: 15, unitPrice: 80 }],
    })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Invoice with payment activity must use note-based adjustment flow/);
});

test('HTTP e2e: cancel-and-regenerate endpoint returns 409 for paid invoice', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const invoice = harness.state.salesInvoices.find((x) => x.id === IDS.postedInvoice)!;
  invoice.paymentStatus = 'paid';
  invoice.status = 'paid';
  invoice.outstandingAmount = 0;
  invoice.paidAt = new Date('2026-07-10T12:00:00.000Z');

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/cancel-and-regenerate`)
    .send({
      reason: 'Cancel and regenerate after payment',
      source: 'manual',
      items: [{ variantId: IDS.variant1, billedQty: 15, unitPrice: 80 }],
    })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Invoice with payment activity must use note-based adjustment flow/);
});

test('HTTP e2e: recompute endpoint returns 409 for paid invoice', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const invoice = harness.state.salesInvoices.find((x) => x.id === IDS.postedInvoice)!;
  invoice.paymentStatus = 'paid';
  invoice.status = 'paid';
  invoice.outstandingAmount = 0;
  invoice.paidAt = new Date('2026-07-10T12:00:00.000Z');

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/recompute-from-delivery`)
    .send({
      reason: 'Recompute after payment',
      applyImmediately: true,
    })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Invoice cannot be recomputed directly after payment activity/);
});
