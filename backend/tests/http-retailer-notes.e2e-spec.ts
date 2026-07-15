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
import { RetailerNoteThresholdCache } from '../src/core/settings/retailer-note-thresholds';
import { AccountingService } from '../src/finance/accounting/accounting.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentMetricsService } from '../src/operations/payments/payment-metrics.service';
import { RetailerCreditNotesController } from '../src/operations/payments/retailer-credit-notes.controller';
import { RetailerCreditNotesService } from '../src/operations/payments/retailer-credit-notes.service';
import { RetailerDebitNotesController } from '../src/operations/payments/retailer-debit-notes.controller';
import { RetailerDebitNotesService } from '../src/operations/payments/retailer-debit-notes.service';
import { RetailerLedgerService } from '../src/operations/payments/retailer-ledger.service';

const IDS = {
  org: '51000000-0000-4000-8000-000000000001',
  user: '51000000-0000-4000-8000-000000000002',
  retailer: '51000000-0000-4000-8000-000000000003',
  partialInvoice: '51000000-0000-4000-8000-000000000004',
  paidInvoice: '51000000-0000-4000-8000-000000000005',
  otherRetailer: '51000000-0000-4000-8000-000000000006',
  otherPartialInvoice: '51000000-0000-4000-8000-000000000007',
  otherPaidInvoice: '51000000-0000-4000-8000-000000000008',
  ownCreditNote: '51000000-0000-4000-8000-000000000009',
  otherCreditNote: '51000000-0000-4000-8000-000000000010',
  ownDebitNote: '51000000-0000-4000-8000-000000000011',
  otherDebitNote: '51000000-0000-4000-8000-000000000012',
  retailerUser: '51000000-0000-4000-8000-000000000013',
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

function createRetailerActor(retailerId = IDS.retailer): AuthenticatedUser {
  return {
    id: IDS.retailerUser,
    organizationId: IDS.org,
    retailerId,
    employeeId: null,
    fullName: 'Retailer User',
    mobile: '8888800000',
    userType: 'retailer_user',
    roles: ['RETAILER'],
    permissions: [],
  };
}

async function withEnv(overrides: Record<string, string | undefined>, fn: () => Promise<void>) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    await fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function seedRetailerAccessNotes(state: any) {
  state.creditNotes.push(
    {
      id: IDS.ownCreditNote,
      organizationId: IDS.org,
      creditNoteNo: 'CRN-20260711-0001',
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedReturnId: IDS.partialInvoice,
      noteDate: new Date('2026-07-11T00:00:00.000Z'),
      amount: 120,
      taxAmount: 0,
      status: 'posted',
      journalEntryId: 'JRN-OWN-CR',
      affectsLedger: true,
      affectsInvoiceBalance: true,
      appliedAmount: 120,
      remainingAmount: 0,
      remarks: 'Own retailer credit note',
      createdAt: new Date('2026-07-11T08:00:00.000Z'),
      updatedAt: new Date('2026-07-11T08:00:00.000Z'),
    },
    {
      id: IDS.otherCreditNote,
      organizationId: IDS.org,
      creditNoteNo: 'CRN-20260711-0002',
      partyType: 'retailer',
      partyId: IDS.otherRetailer,
      retailerId: IDS.otherRetailer,
      relatedReturnId: IDS.otherPartialInvoice,
      noteDate: new Date('2026-07-11T00:00:00.000Z'),
      amount: 90,
      taxAmount: 0,
      status: 'posted',
      journalEntryId: 'JRN-OTHER-CR',
      affectsLedger: true,
      affectsInvoiceBalance: true,
      appliedAmount: 90,
      remainingAmount: 0,
      remarks: 'Other retailer credit note',
      createdAt: new Date('2026-07-11T09:00:00.000Z'),
      updatedAt: new Date('2026-07-11T09:00:00.000Z'),
    },
  );

  state.debitNotes.push(
    {
      id: IDS.ownDebitNote,
      organizationId: IDS.org,
      debitNoteNo: 'DBN-20260711-0001',
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: new Date('2026-07-11T00:00:00.000Z'),
      amount: 150,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      appliedAmount: 150,
      remainingAmount: 0,
      status: 'posted',
      remarks: 'Own retailer debit note',
      journalEntryId: 'JRN-OWN-DB',
      createdAt: new Date('2026-07-11T10:00:00.000Z'),
      updatedAt: new Date('2026-07-11T10:00:00.000Z'),
    },
    {
      id: IDS.otherDebitNote,
      organizationId: IDS.org,
      debitNoteNo: 'DBN-20260711-0002',
      retailerId: IDS.otherRetailer,
      relatedInvoiceId: IDS.otherPaidInvoice,
      noteDate: new Date('2026-07-11T00:00:00.000Z'),
      amount: 80,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      appliedAmount: 80,
      remainingAmount: 0,
      status: 'posted',
      remarks: 'Other retailer debit note',
      journalEntryId: 'JRN-OTHER-DB',
      createdAt: new Date('2026-07-11T11:00:00.000Z'),
      updatedAt: new Date('2026-07-11T11:00:00.000Z'),
    },
  );
}

function createHarness() {
  RetailerNoteThresholdCache.invalidate(IDS.org);
  RetailerNoteThresholdCache.resetDebugCounters();
  const state = {
    retailers: [
      {
        id: IDS.retailer,
        organizationId: IDS.org,
        retailerCode: 'RET-001',
        shopName: 'Retailer One',
        mobile: '9999999999',
        receivableAccountId: 'acc-rec',
      },
      {
        id: IDS.otherRetailer,
        organizationId: IDS.org,
        retailerCode: 'RET-002',
        shopName: 'Retailer Two',
        mobile: '8888888888',
        receivableAccountId: 'acc-rec',
      },
    ],
    salesInvoices: [
      {
        id: IDS.partialInvoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-PARTIAL-001',
        retailerId: IDS.retailer,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        grandTotal: 1000,
        outstandingAmount: 400,
        paymentStatus: 'partial_paid',
        status: 'partial_paid',
        paidAt: null,
      },
      {
        id: IDS.paidInvoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-PAID-001',
        retailerId: IDS.retailer,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        grandTotal: 800,
        outstandingAmount: 0,
        paymentStatus: 'paid',
        status: 'paid',
        paidAt: new Date('2026-07-10T12:00:00.000Z'),
      },
      {
        id: IDS.otherPartialInvoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-PARTIAL-002',
        retailerId: IDS.otherRetailer,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        grandTotal: 900,
        outstandingAmount: 250,
        paymentStatus: 'partial_paid',
        status: 'partial_paid',
        paidAt: null,
      },
      {
        id: IDS.otherPaidInvoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-PAID-002',
        retailerId: IDS.otherRetailer,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        grandTotal: 700,
        outstandingAmount: 0,
        paymentStatus: 'paid',
        status: 'paid',
        paidAt: new Date('2026-07-10T14:00:00.000Z'),
      },
    ],
    creditNotes: [] as any[],
    debitNotes: [] as any[],
    systemSettings: [] as any[],
    accounts: [
      { id: 'acc-rec', organizationId: IDS.org, accountCode: '1100' },
      { id: 'acc-sales', organizationId: IDS.org, accountCode: '4100' },
    ],
  };

  let counter = 100;
  const nextId = () => `51000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`;
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  const toNum = (v: any) => Number(v ?? 0);

  const accountingCalls = { createJournalEntry: [] as any[], reverseJournalEntry: [] as any[] };
  const ledgerCalls = { postCreditNote: [] as any[], reverseCreditNotePosting: [] as any[], postDebitNote: [] as any[], reverseDebitNotePosting: [] as any[] };
  const metricCalls = { refreshAfterCreditNote: [] as any[], refreshAfterDebitNote: [] as any[] };

  const prisma: any = {
    $transaction: async (fn: any) => fn(prisma),
    retailer: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.retailers.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null;
        if (!row) return null;
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      },
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.retailers.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id)));
        return rows.map((row: any) => {
          if (!select) return clone(row);
          const out: any = {};
          for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
          return out;
        });
      },
    },
    salesInvoice: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.salesInvoices.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerId || x.retailerId === where.retailerId) && (!where?.id || x.id === where.id)) ?? null;
        if (!row) return null;
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      },
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.salesInvoices.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id)));
        return rows.map((row: any) => {
          if (!select) return clone(row);
          const out: any = {};
          for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
          return out;
        });
      },
      update: async ({ where, data }: any) => {
        const row = state.salesInvoices.find((x: any) => x.id === where.id);
        Object.assign(row, data);
        return clone(row);
      },
    },
    creditNote: {
      findMany: async ({ where }: any = {}) => state.creditNotes.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.partyType || x.partyType === where.partyType) && (!where?.retailerId || x.retailerId === where.retailerId) && (!where?.id || x.id === where.id)).map(clone),
      findFirst: async ({ where }: any = {}) => clone(state.creditNotes.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.partyType || x.partyType === where.partyType) && (!where?.id || x.id === where.id)) ?? null),
      create: async ({ data }: any) => {
        const row = { id: nextId(), createdAt: new Date(), updatedAt: new Date(), journalEntryId: null, ...data };
        state.creditNotes.push(row);
        return clone(row);
      },
      update: async ({ where, data }: any) => {
        const row = state.creditNotes.find((x: any) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      count: async ({ where }: any = {}) => state.creditNotes.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.partyType || x.partyType === where.partyType) && (!where?.retailerId || x.retailerId === where.retailerId)).length,
    },
    retailerDebitNote: {
      findMany: async ({ where }: any = {}) => state.debitNotes.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerId || x.retailerId === where.retailerId) && (!where?.id || x.id === where.id)).map(clone),
      findFirst: async ({ where }: any = {}) => clone(state.debitNotes.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null),
      create: async ({ data }: any) => {
        const row = { id: nextId(), createdAt: new Date(), updatedAt: new Date(), journalEntryId: null, ...data };
        state.debitNotes.push(row);
        return clone(row);
      },
      update: async ({ where, data }: any) => {
        const row = state.debitNotes.find((x: any) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      count: async ({ where }: any = {}) => state.debitNotes.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerId || x.retailerId === where.retailerId)).length,
    },
    account: {
      findFirst: async ({ where }: any = {}) => clone(state.accounts.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && ((!where?.id || x.id === where.id) || (!where?.accountCode || x.accountCode === where.accountCode))) ?? null),
    },
    systemSetting: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.systemSettings.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.settingGroup || x.settingGroup === where.settingGroup) && (!where?.settingKey || x.settingKey === where.settingKey)) ?? null;
        if (!row) return null;
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      },
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.systemSettings.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.settingGroup || x.settingGroup === where.settingGroup) && (!where?.settingKey?.in || where.settingKey.in.includes(x.settingKey)));
        return rows.map((row: any) => {
          if (!select) return clone(row);
          const out: any = {};
          for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
          return out;
        });
      },
    },
  };

  const actor = createActor();
  const accountingService = {
    createJournalEntry: async (...args: any[]) => { accountingCalls.createJournalEntry.push(args); return { id: `JRN-${accountingCalls.createJournalEntry.length}` }; },
    reverseJournalEntry: async (...args: any[]) => { accountingCalls.reverseJournalEntry.push(args); return { id: `RVJ-${accountingCalls.reverseJournalEntry.length}` }; },
  } as any;
  const retailerLedgerService = {
    postCreditNote: async (...args: any[]) => { ledgerCalls.postCreditNote.push(args); return { success: true }; },
    reverseCreditNotePosting: async (...args: any[]) => { ledgerCalls.reverseCreditNotePosting.push(args); return { success: true }; },
    postDebitNote: async (...args: any[]) => { ledgerCalls.postDebitNote.push(args); return { success: true }; },
    reverseDebitNotePosting: async (...args: any[]) => { ledgerCalls.reverseDebitNotePosting.push(args); return { success: true }; },
  } as any;
  const paymentMetricsService = {
    refreshAfterCreditNote: async (...args: any[]) => { metricCalls.refreshAfterCreditNote.push(args); return { success: true }; },
    refreshAfterDebitNote: async (...args: any[]) => { metricCalls.refreshAfterDebitNote.push(args); return { success: true }; },
  } as any;

  return {
    actor,
    state,
    prisma,
    providers: {
      accountingService,
      retailerLedgerService,
      paymentMetricsService,
    },
    calls: { accountingCalls, ledgerCalls, metricCalls },
  };
}

async function createApp(actor: AuthenticatedUser = createActor()) {
  const harness = createHarness();
  const moduleRef = await Test.createTestingModule({
    controllers: [RetailerCreditNotesController, RetailerDebitNotesController],
    providers: [
      RetailerCreditNotesService,
      RetailerDebitNotesService,
      { provide: PrismaService, useValue: harness.prisma },
      { provide: AccountingService, useValue: harness.providers.accountingService },
      { provide: RetailerLedgerService, useValue: harness.providers.retailerLedgerService },
      { provide: PaymentMetricsService, useValue: harness.providers.paymentMetricsService },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate(context: any) { context.switchToHttp().getRequest().user = actor; return true; } })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return { app, harness };
}

test('HTTP e2e: credit note create rejects party and retailer mismatch', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.otherRetailer,
      retailerId: IDS.retailer,
      noteDate: '2026-07-10',
      amount: 150,
      remarks: 'Invalid retailer mapping',
    })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Credit note retailer must match retailer party');
  assert.equal(harness.state.creditNotes.length, 0);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
  assert.equal(harness.calls.metricCalls.refreshAfterCreditNote.length, 0);
});

test('HTTP e2e: credit note create rejects partial-paid invoice linked to another retailer', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.otherPartialInvoice,
      noteDate: '2026-07-10',
      amount: 125,
      remarks: 'Invalid invoice mapping',
    })
    .expect(404);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Related sales invoice not found');
  assert.equal(harness.state.creditNotes.length, 0);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
  assert.equal(harness.calls.metricCalls.refreshAfterCreditNote.length, 0);
});

test('HTTP e2e: debit note create rejects paid invoice linked to another retailer', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.otherPaidInvoice,
      noteDate: '2026-07-10',
      amount: 160,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Invalid debit note invoice mapping',
    })
    .expect(404);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Related sales invoice not found');
  assert.equal(harness.state.debitNotes.length, 0);
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 0);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
  assert.equal(harness.calls.metricCalls.refreshAfterDebitNote.length, 0);
});

test('HTTP e2e: credit note create rejects zero amount', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 0,
      remarks: 'Zero amount credit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Credit note amount must be greater than zero');
  assert.equal(harness.state.creditNotes.length, 0);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
});

test('HTTP e2e: credit note create rejects negative amount', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: -10,
      remarks: 'Negative amount credit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Credit note amount must be greater than zero');
  assert.equal(harness.state.creditNotes.length, 0);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
});

test('HTTP e2e: credit note create rejects amount with more than 2 decimal places', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 100.123,
      remarks: 'High precision amount credit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Credit note amount cannot have more than 2 decimal places');
  assert.equal(harness.state.creditNotes.length, 0);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
});

test('HTTP e2e: debit note create rejects zero amount', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: '2026-07-10',
      amount: 0,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Zero amount debit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Retailer debit note amount must be greater than zero');
  assert.equal(harness.state.debitNotes.length, 0);
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 0);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
});

test('HTTP e2e: debit note create rejects negative amount', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: '2026-07-10',
      amount: -25,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Negative amount debit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Retailer debit note amount must be greater than zero');
  assert.equal(harness.state.debitNotes.length, 0);
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 0);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
});

test('HTTP e2e: debit note create rejects amount with more than 2 decimal places', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: '2026-07-10',
      amount: 160.257,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'High precision amount debit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Retailer debit note amount cannot have more than 2 decimal places');
  assert.equal(harness.state.debitNotes.length, 0);
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 0);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
});

test('HTTP e2e: credit note create rejects negative tax amount', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 100,
      taxAmount: -5,
      remarks: 'Negative tax amount credit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Credit note tax amount cannot be negative');
  assert.equal(harness.state.creditNotes.length, 0);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
});

test('HTTP e2e: credit note create rejects tax amount with more than 2 decimal places', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 100,
      taxAmount: 18.255,
      remarks: 'High precision tax amount credit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Credit note tax amount cannot have more than 2 decimal places');
  assert.equal(harness.state.creditNotes.length, 0);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
});

test('HTTP e2e: credit note create rejects tax amount above configured maximum limit', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25' }, async () => {
    const { app, harness } = await createApp();
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: 100,
        taxAmount: 25.01,
        remarks: 'Above configured tax ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Credit note tax amount exceeds configured maximum limit');
    assert.equal(harness.state.creditNotes.length, 0);
    assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('HTTP e2e: credit note create accepts tax amount exactly at configured maximum limit', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25' }, async () => {
    const { app, harness } = await createApp();
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: 100,
        taxAmount: 25,
        remarks: 'At configured tax ceiling',
      })
      .expect(201);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.taxAmount, 25);
    assert.equal(response.body.data.remainingAmount, 125);
    assert.equal(harness.state.creditNotes.length, 1);
    assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('HTTP e2e: credit note create rejects total amount above configured maximum limit', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120' }, async () => {
    const { app, harness } = await createApp();
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: 100,
        taxAmount: 20.01,
        remarks: 'Above configured total ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Credit note total amount exceeds configured maximum limit');
    assert.equal(harness.state.creditNotes.length, 0);
    assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('HTTP e2e: credit note create accepts total amount exactly at configured maximum limit', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120' }, async () => {
    const { app, harness } = await createApp();
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: 100,
        taxAmount: 20,
        remarks: 'At configured total ceiling',
      })
      .expect(201);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.amount, 100);
    assert.equal(response.body.data.taxAmount, 20);
    assert.equal(response.body.data.remainingAmount, 120);
    assert.equal(harness.state.creditNotes.length, 1);
    assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('HTTP e2e: credit note create rejects amount above configured maximum limit', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250' }, async () => {
    const { app, harness } = await createApp();
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: 251,
        remarks: 'Above configured credit note ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Credit note amount exceeds configured maximum limit');
    assert.equal(harness.state.creditNotes.length, 0);
    assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('HTTP e2e: debit note create rejects amount above configured maximum limit', async (t) => {
  await withEnv({ RETAILER_DEBIT_NOTE_MAX_AMOUNT: '250' }, async () => {
    const { app, harness } = await createApp();
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/retailer-debit-notes')
      .send({
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.paidInvoice,
        noteDate: '2026-07-10',
        amount: 251,
        affectsLedger: true,
        affectsInvoiceBalance: true,
        remarks: 'Above configured debit note ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Retailer debit note amount exceeds configured maximum limit');
    assert.equal(harness.state.debitNotes.length, 0);
    assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 0);
    assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('HTTP e2e: credit note create accepts amount exactly at configured maximum limit', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250' }, async () => {
    const { app, harness } = await createApp();
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: 250,
        remarks: 'At configured credit note ceiling',
      })
      .expect(201);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.amount, 250);
    assert.equal(response.body.data.remainingAmount, 250);
    assert.equal(harness.state.creditNotes.length, 1);
    assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('HTTP e2e: debit note create accepts amount exactly at configured maximum limit', async (t) => {
  await withEnv({ RETAILER_DEBIT_NOTE_MAX_AMOUNT: '250' }, async () => {
    const { app, harness } = await createApp();
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/retailer-debit-notes')
      .send({
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.paidInvoice,
        noteDate: '2026-07-10',
        amount: 250,
        affectsLedger: true,
        affectsInvoiceBalance: true,
        remarks: 'At configured debit note ceiling',
      })
      .expect(201);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.amount, 250);
    assert.equal(response.body.data.remainingAmount, 250);
    assert.equal(harness.state.debitNotes.length, 1);
    assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 0);
    assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('HTTP e2e: credit note create uses org-level DB amount ceiling over env fallback', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_AMOUNT: '1000' }, async () => {
    const { app, harness } = await createApp();
    harness.state.systemSettings.push({
      organizationId: IDS.org,
      settingGroup: 'retailer_note_limits',
      settingKey: 'credit_note_max_amount',
      valueJson: 250,
    });
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: 251,
        remarks: 'Above org-level DB credit note ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Credit note amount exceeds configured maximum limit');
    assert.equal(harness.state.creditNotes.length, 0);
  });
});

test('HTTP e2e: credit note create uses org-level DB total ceiling over env fallback', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '1000' }, async () => {
    const { app, harness } = await createApp();
    harness.state.systemSettings.push({
      organizationId: IDS.org,
      settingGroup: 'retailer_note_limits',
      settingKey: 'credit_note_max_total_amount',
      valueJson: 120,
    });
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: 100,
        taxAmount: 20.01,
        remarks: 'Above org-level DB total ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Credit note total amount exceeds configured maximum limit');
    assert.equal(harness.state.creditNotes.length, 0);
  });
});

test('HTTP e2e: debit note create uses org-level DB amount ceiling over env fallback', async (t) => {
  await withEnv({ RETAILER_DEBIT_NOTE_MAX_AMOUNT: '1000' }, async () => {
    const { app, harness } = await createApp();
    harness.state.systemSettings.push({
      organizationId: IDS.org,
      settingGroup: 'retailer_note_limits',
      settingKey: 'debit_note_max_amount',
      valueJson: 250,
    });
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/retailer-debit-notes')
      .send({
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.paidInvoice,
        noteDate: '2026-07-10',
        amount: 251,
        affectsLedger: true,
        affectsInvoiceBalance: true,
        remarks: 'Above org-level DB debit note ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Retailer debit note amount exceeds configured maximum limit');
    assert.equal(harness.state.debitNotes.length, 0);
  });
});

test('HTTP e2e: retailer /my/credit-notes returns only own records even if another retailerId is supplied', async (t) => {
  const { app, harness } = await createApp(createRetailerActor());
  seedRetailerAccessNotes(harness.state);
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get(`/api/v1/my/credit-notes?retailerId=${IDS.otherRetailer}`)
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data[0].id, IDS.ownCreditNote);
  assert.equal(response.body.data[0].retailerId, IDS.retailer);
  assert.equal(response.body.data[0].retailer.id, IDS.retailer);
  assert.equal(response.body.data[0].relatedInvoice.id, IDS.partialInvoice);
});

test('HTTP e2e: retailer /my/debit-notes returns only own records even if another retailerId is supplied', async (t) => {
  const { app, harness } = await createApp(createRetailerActor());
  seedRetailerAccessNotes(harness.state);
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get(`/api/v1/my/debit-notes?retailerId=${IDS.otherRetailer}`)
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data[0].id, IDS.ownDebitNote);
  assert.equal(response.body.data[0].retailerId, IDS.retailer);
  assert.equal(response.body.data[0].retailer.id, IDS.retailer);
  assert.equal(response.body.data[0].relatedInvoice.id, IDS.paidInvoice);
});

test('HTTP e2e: retailer is forbidden from querying another retailer credit notes route', async (t) => {
  const { app } = await createApp(createRetailerActor());
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get(`/api/v1/retailers/${IDS.otherRetailer}/credit-notes`)
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'You can only access your own retailer credit notes');
});

test('HTTP e2e: retailer is forbidden from querying another retailer debit notes route', async (t) => {
  const { app } = await createApp(createRetailerActor());
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get(`/api/v1/retailers/${IDS.otherRetailer}/debit-notes`)
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'You can only access your own retailer debit notes');
});

test('HTTP e2e: retailer is forbidden from opening another retailer credit note detail', async (t) => {
  const { app, harness } = await createApp(createRetailerActor());
  seedRetailerAccessNotes(harness.state);
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get(`/api/v1/credit-notes/${IDS.otherCreditNote}`)
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'You can only access your own credit notes');
});

test('HTTP e2e: retailer is forbidden from opening another retailer debit note detail', async (t) => {
  const { app, harness } = await createApp(createRetailerActor());
  seedRetailerAccessNotes(harness.state);
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get(`/api/v1/retailer-debit-notes/${IDS.otherDebitNote}`)
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'You can only access your own debit notes');
});

test('HTTP e2e: credit note post is idempotent and does not duplicate finance side effects', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 300,
      remarks: 'Idempotent credit note post',
    })
    .expect(201);
  const noteId = created.body.data.id;

  const firstPost = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/post`)
    .expect(201);
  assert.equal(firstPost.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).outstandingAmount, 100);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(harness.calls.metricCalls.refreshAfterCreditNote.length, 1);

  const secondPost = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/post`)
    .expect(201);
  assert.equal(secondPost.body.success, true);
  assert.equal(secondPost.body.data.id, noteId);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).outstandingAmount, 100);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(harness.calls.metricCalls.refreshAfterCreditNote.length, 1);
});

test('HTTP e2e: credit note cancel is idempotent and does not duplicate reversal side effects', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 300,
      remarks: 'Idempotent credit note cancel',
    })
    .expect(201);
  const noteId = created.body.data.id;

  await request(app.getHttpServer()).post(`/api/v1/credit-notes/${noteId}/post`).expect(201);

  const firstCancel = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/cancel`)
    .send({ reason: 'First cancel' })
    .expect(201);
  assert.equal(firstCancel.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).outstandingAmount, 400);
  assert.equal(harness.calls.ledgerCalls.reverseCreditNotePosting.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 1);

  const secondCancel = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/cancel`)
    .send({ reason: 'Second cancel should be no-op' })
    .expect(201);
  assert.equal(secondCancel.body.success, true);
  assert.equal(secondCancel.body.message, 'Retailer credit note already cancelled');
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).outstandingAmount, 400);
  assert.equal(harness.calls.ledgerCalls.reverseCreditNotePosting.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('HTTP e2e: cancelled credit note cannot be reposted', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 300,
      remarks: 'Cancelled credit note repost block',
    })
    .expect(201);
  const noteId = created.body.data.id;

  await request(app.getHttpServer()).post(`/api/v1/credit-notes/${noteId}/post`).expect(201);
  await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/cancel`)
    .send({ reason: 'Cancel before repost attempt' })
    .expect(201);

  const repost = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/post`)
    .expect(409);
  assert.equal(repost.body.success, false);
  assert.equal(repost.body.message, 'Cancelled credit note cannot be posted');
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).outstandingAmount, 400);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(harness.calls.ledgerCalls.reverseCreditNotePosting.length, 1);
});

test('HTTP e2e: debit note post is idempotent and does not duplicate finance side effects', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: '2026-07-10',
      amount: 160,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Idempotent debit note post',
    })
    .expect(201);
  const noteId = created.body.data.id;

  const firstPost = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/post`)
    .expect(201);
  assert.equal(firstPost.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).outstandingAmount, 160);
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(harness.calls.metricCalls.refreshAfterDebitNote.length, 1);

  const secondPost = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/post`)
    .expect(201);
  assert.equal(secondPost.body.success, true);
  assert.equal(secondPost.body.data.id, noteId);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).outstandingAmount, 160);
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(harness.calls.metricCalls.refreshAfterDebitNote.length, 1);
});

test('HTTP e2e: debit note cancel is idempotent and does not duplicate reversal side effects', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: '2026-07-10',
      amount: 160,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Idempotent debit note cancel',
    })
    .expect(201);
  const noteId = created.body.data.id;

  await request(app.getHttpServer()).post(`/api/v1/retailer-debit-notes/${noteId}/post`).expect(201);

  const firstCancel = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'First cancel' })
    .expect(201);
  assert.equal(firstCancel.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).outstandingAmount, 0);
  assert.equal(harness.calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 1);

  const secondCancel = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'Second cancel should be no-op' })
    .expect(201);
  assert.equal(secondCancel.body.success, true);
  assert.equal(secondCancel.body.message, 'Retailer debit note already cancelled');
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).outstandingAmount, 0);
  assert.equal(harness.calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('HTTP e2e: cancelled debit note cannot be reposted', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: '2026-07-10',
      amount: 160,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Cancelled debit note repost block',
    })
    .expect(201);
  const noteId = created.body.data.id;

  await request(app.getHttpServer()).post(`/api/v1/retailer-debit-notes/${noteId}/post`).expect(201);
  await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'Cancel before repost attempt' })
    .expect(201);

  const repost = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/post`)
    .expect(409);
  assert.equal(repost.body.success, false);
  assert.equal(repost.body.message, 'Cancelled retailer debit note cannot be posted');
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).outstandingAmount, 0);
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(harness.calls.ledgerCalls.reverseDebitNotePosting.length, 1);
});

test('HTTP e2e: credit note linked to a fully paid invoice does not make outstanding negative', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: '2026-07-10',
      amount: 120,
      remarks: 'Return after full settlement',
    })
    .expect(201);
  assert.equal(created.body.success, true);
  const noteId = created.body.data.id;

  const posted = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/post`)
    .expect(201);
  assert.equal(posted.body.success, true);
  assert.equal(posted.body.data.appliedAmount, 0);
  assert.equal(posted.body.data.remainingAmount, 120);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).outstandingAmount, 0);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).paymentStatus, 'paid');
  assert.equal(harness.state.creditNotes.find((x: any) => x.id === noteId).remainingAmount, 120);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 0);
});

test('HTTP e2e: credit note amount and tax with 2 decimal precision are preserved in totals and invoice rounding', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 100.12,
      taxAmount: 18.25,
      remarks: 'Precision and rounding credit note',
    })
    .expect(201);
  assert.equal(created.body.success, true);
  const noteId = created.body.data.id;
  assert.equal(created.body.data.amount, 100.12);
  assert.equal(created.body.data.taxAmount, 18.25);
  assert.equal(created.body.data.remainingAmount, 118.37);

  const posted = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/post`)
    .expect(201);
  assert.equal(posted.body.success, true);
  assert.equal(posted.body.data.appliedAmount, 118.37);
  assert.equal(posted.body.data.remainingAmount, 0);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).outstandingAmount, 281.63);
  assert.equal(harness.state.creditNotes.find((x: any) => x.id === noteId).amount, 100.12);
  assert.equal(harness.state.creditNotes.find((x: any) => x.id === noteId).taxAmount, 18.25);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
});

test('HTTP e2e: debit note amount with 2 decimal precision is preserved in totals and invoice rounding', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: '2026-07-10',
      amount: 160.25,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Precision and rounding debit note',
    })
    .expect(201);
  assert.equal(created.body.success, true);
  const noteId = created.body.data.id;
  assert.equal(created.body.data.amount, 160.25);
  assert.equal(created.body.data.remainingAmount, 160.25);

  const posted = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/post`)
    .expect(201);
  assert.equal(posted.body.success, true);
  assert.equal(posted.body.data.appliedAmount, 160.25);
  assert.equal(posted.body.data.remainingAmount, 0);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).outstandingAmount, 160.25);
  assert.equal(harness.state.debitNotes.find((x: any) => x.id === noteId).amount, 160.25);
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
});

test('HTTP e2e: payment -> debit note -> partial settlement -> cancel debit note ends at zero without negative outstanding', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: '2026-07-10',
      amount: 160,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Mixed sequence debit note flow',
    })
    .expect(201);
  const noteId = created.body.data.id;

  const posted = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/post`)
    .expect(201);
  assert.equal(posted.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).outstandingAmount, 160);

  Object.assign(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice), {
    outstandingAmount: 60,
    paymentStatus: 'partial_paid',
    status: 'partial_paid',
    paidAt: null,
  });

  const cancelled = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'Debit note reversed after partial settlement' })
    .expect(201);
  assert.equal(cancelled.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).outstandingAmount, 0);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).paymentStatus, 'paid');
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).status, 'paid');
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(harness.calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('HTTP e2e: debit note cancel clamps outstanding at zero if invoice was settled after posting', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: '2026-07-10',
      amount: 160,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Clamp negative outstanding on reversal',
    })
    .expect(201);
  const noteId = created.body.data.id;

  await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/post`)
    .expect(201);

  Object.assign(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice), {
    outstandingAmount: 20,
    paymentStatus: 'partial_paid',
    status: 'partial_paid',
    paidAt: null,
  });

  const cancelled = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'Reversal after retailer settlement' })
    .expect(201);
  assert.equal(cancelled.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).outstandingAmount, 0);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).paymentStatus, 'paid');
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).status, 'paid');
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(harness.calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('HTTP e2e: over-credit note caps invoice outstanding at zero and tracks remaining amount', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 550,
      remarks: 'Over-credit adjustment after retailer refusal',
    })
    .expect(201);
  assert.equal(created.body.success, true);
  const noteId = created.body.data.id;

  const posted = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/post`)
    .expect(201);
  assert.equal(posted.body.success, true);
  assert.equal(posted.body.data.appliedAmount, 400);
  assert.equal(posted.body.data.remainingAmount, 150);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).outstandingAmount, 0);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).paymentStatus, 'paid');
  assert.equal(harness.state.creditNotes.find((x: any) => x.id === noteId).remainingAmount, 150);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 0);

  const cancelled = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/cancel`)
    .send({ reason: 'Reverse over-credit correction' })
    .expect(201);
  assert.equal(cancelled.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).outstandingAmount, 400);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).paymentStatus, 'partial_paid');
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(harness.calls.ledgerCalls.reverseCreditNotePosting.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('HTTP e2e: over-debit note can push outstanding above invoice grand total', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 700,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Over-debit charge correction',
    })
    .expect(201);
  assert.equal(created.body.success, true);
  const noteId = created.body.data.id;

  const posted = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/post`)
    .expect(201);
  assert.equal(posted.body.success, true);
  assert.equal(posted.body.data.appliedAmount, 700);
  assert.equal(posted.body.data.remainingAmount, 0);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).outstandingAmount, 1100);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).paymentStatus, 'unpaid');
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).status, 'posted');
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 0);

  const cancelled = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'Reverse over-debit correction' })
    .expect(201);
  assert.equal(cancelled.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).outstandingAmount, 400);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).paymentStatus, 'partial_paid');
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(harness.calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('HTTP e2e: credit note create, post, and cancel workflow', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 300,
      remarks: 'Retailer refused some quantity',
    })
    .expect(201);
  assert.equal(created.body.success, true);
  const noteId = created.body.data.id;

  const posted = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/post`)
    .expect(201);
  assert.equal(posted.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).outstandingAmount, 100);
  assert.equal(harness.calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);

  const cancelled = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/cancel`)
    .send({ reason: 'Reverse correction' })
    .expect(201);
  assert.equal(cancelled.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice).outstandingAmount, 400);
  assert.equal(harness.calls.ledgerCalls.reverseCreditNotePosting.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('HTTP e2e: debit note create, post, and cancel workflow', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: '2026-07-10',
      amount: 160,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Retailer accepted extra items',
    })
    .expect(201);
  assert.equal(created.body.success, true);
  const noteId = created.body.data.id;

  const posted = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/post`)
    .expect(201);
  assert.equal(posted.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).outstandingAmount, 160);
  assert.equal(harness.calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(harness.calls.accountingCalls.createJournalEntry.length, 1);

  const cancelled = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'Reverse extra charge' })
    .expect(201);
  assert.equal(cancelled.body.success, true);
  assert.equal(harness.state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice).outstandingAmount, 0);
  assert.equal(harness.calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(harness.calls.accountingCalls.reverseJournalEntry.length, 1);
});
