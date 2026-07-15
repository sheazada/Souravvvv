import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';
import { RetailerNoteThresholdCache } from '../src/core/settings/retailer-note-thresholds';
import { RetailerCreditNotesService } from '../src/operations/payments/retailer-credit-notes.service';
import { RetailerDebitNotesService } from '../src/operations/payments/retailer-debit-notes.service';

const IDS = {
  org: '50000000-0000-4000-8000-000000000001',
  user: '50000000-0000-4000-8000-000000000002',
  retailer: '50000000-0000-4000-8000-000000000003',
  partialInvoice: '50000000-0000-4000-8000-000000000004',
  paidInvoice: '50000000-0000-4000-8000-000000000005',
  otherRetailer: '50000000-0000-4000-8000-000000000006',
  otherPartialInvoice: '50000000-0000-4000-8000-000000000007',
  otherPaidInvoice: '50000000-0000-4000-8000-000000000008',
  ownCreditNote: '50000000-0000-4000-8000-000000000009',
  otherCreditNote: '50000000-0000-4000-8000-000000000010',
  ownDebitNote: '50000000-0000-4000-8000-000000000011',
  otherDebitNote: '50000000-0000-4000-8000-000000000012',
  retailerUser: '50000000-0000-4000-8000-000000000013',
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
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    await fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
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
      relatedInvoiceId: IDS.partialInvoice,
      relatedReturnId: null,
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
      relatedInvoiceId: IDS.otherPartialInvoice,
      relatedReturnId: null,
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
  const nextId = () => `50000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`;
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  const toNum = (v: any) => Number(v ?? 0);

  const accountingCalls = {
    createJournalEntry: [] as any[],
    reverseJournalEntry: [] as any[],
  };
  const ledgerCalls = {
    postCreditNote: [] as any[],
    reverseCreditNotePosting: [] as any[],
    postDebitNote: [] as any[],
    reverseDebitNotePosting: [] as any[],
  };
  const metricCalls = {
    refreshAfterCreditNote: [] as any[],
    refreshAfterDebitNote: [] as any[],
  };

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

  const accountingService = {
    createJournalEntry: async (...args: any[]) => {
      accountingCalls.createJournalEntry.push(args);
      return { id: `JRN-${accountingCalls.createJournalEntry.length}` };
    },
    reverseJournalEntry: async (...args: any[]) => {
      accountingCalls.reverseJournalEntry.push(args);
      return { id: `RVJ-${accountingCalls.reverseJournalEntry.length}` };
    },
  } as any;

  const retailerLedgerService = {
    postCreditNote: async (...args: any[]) => {
      ledgerCalls.postCreditNote.push(args);
      return { success: true };
    },
    reverseCreditNotePosting: async (...args: any[]) => {
      ledgerCalls.reverseCreditNotePosting.push(args);
      return { success: true };
    },
    postDebitNote: async (...args: any[]) => {
      ledgerCalls.postDebitNote.push(args);
      return { success: true };
    },
    reverseDebitNotePosting: async (...args: any[]) => {
      ledgerCalls.reverseDebitNotePosting.push(args);
      return { success: true };
    },
  } as any;

  const paymentMetricsService = {
    refreshAfterCreditNote: async (...args: any[]) => {
      metricCalls.refreshAfterCreditNote.push(args);
      return { success: true };
    },
    refreshAfterDebitNote: async (...args: any[]) => {
      metricCalls.refreshAfterDebitNote.push(args);
      return { success: true };
    },
  } as any;

  return {
    actor: createActor(),
    state,
    creditService: new RetailerCreditNotesService(prisma, retailerLedgerService, paymentMetricsService, accountingService),
    debitService: new RetailerDebitNotesService(prisma, retailerLedgerService, paymentMetricsService, accountingService),
    calls: { accountingCalls, ledgerCalls, metricCalls },
  };
}

test('credit note create rejects party and retailer mismatch without side effects', async () => {
  const { creditService, actor, state, calls } = createHarness();

  await assert.rejects(
    () =>
      creditService.create(actor, {
        partyType: 'retailer',
        partyId: IDS.otherRetailer,
        retailerId: IDS.retailer,
        noteDate: '2026-07-10',
        amount: 150,
        remarks: 'Invalid retailer mapping',
      }),
    (error: any) => {
      assert.equal(error instanceof ConflictException, true);
      assert.equal(error.message, 'Credit note retailer must match retailer party');
      return true;
    },
  );

  assert.equal(state.creditNotes.length, 0);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  assert.equal(calls.metricCalls.refreshAfterCreditNote.length, 0);
});

test('credit note create rejects partial-paid invoice linked to another retailer', async () => {
  const { creditService, actor, state, calls } = createHarness();

  await assert.rejects(
    () =>
      creditService.create(actor, {
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.otherPartialInvoice,
        noteDate: '2026-07-10',
        amount: 125,
        remarks: 'Invalid invoice mapping',
      }),
    (error: any) => {
      assert.equal(error instanceof NotFoundException, true);
      assert.equal(error.message, 'Related sales invoice not found');
      return true;
    },
  );

  assert.equal(state.creditNotes.length, 0);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  assert.equal(calls.metricCalls.refreshAfterCreditNote.length, 0);
});

test('debit note create rejects paid invoice linked to another retailer', async () => {
  const { debitService, actor, state, calls } = createHarness();

  await assert.rejects(
    () =>
      debitService.create(actor, {
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.otherPaidInvoice,
        noteDate: '2026-07-10',
        amount: 160,
        remarks: 'Invalid debit note invoice mapping',
      }),
    (error: any) => {
      assert.equal(error instanceof NotFoundException, true);
      assert.equal(error.message, 'Related sales invoice not found');
      return true;
    },
  );

  assert.equal(state.debitNotes.length, 0);
  assert.equal(calls.ledgerCalls.postDebitNote.length, 0);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  assert.equal(calls.metricCalls.refreshAfterDebitNote.length, 0);
});

test('credit note create rejects zero amount', async () => {
  const { creditService, actor, state, calls } = createHarness();

  await assert.rejects(
    () =>
      creditService.create(actor, {
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: 0,
        remarks: 'Zero amount credit note',
      }),
    (error: any) => {
      assert.equal(error instanceof BadRequestException, true);
      assert.equal(error.message, 'Credit note amount must be greater than zero');
      return true;
    },
  );

  assert.equal(state.creditNotes.length, 0);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
});

test('credit note create rejects negative amount', async () => {
  const { creditService, actor, state, calls } = createHarness();

  await assert.rejects(
    () =>
      creditService.create(actor, {
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: -10,
        remarks: 'Negative amount credit note',
      }),
    (error: any) => {
      assert.equal(error instanceof BadRequestException, true);
      assert.equal(error.message, 'Credit note amount must be greater than zero');
      return true;
    },
  );

  assert.equal(state.creditNotes.length, 0);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
});

test('credit note create rejects amount with more than 2 decimal places', async () => {
  const { creditService, actor, state, calls } = createHarness();

  await assert.rejects(
    () =>
      creditService.create(actor, {
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: 100.123,
        remarks: 'High precision amount credit note',
      }),
    (error: any) => {
      assert.equal(error instanceof BadRequestException, true);
      assert.equal(error.message, 'Credit note amount cannot have more than 2 decimal places');
      return true;
    },
  );

  assert.equal(state.creditNotes.length, 0);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
});

test('debit note create rejects zero amount', async () => {
  const { debitService, actor, state, calls } = createHarness();

  await assert.rejects(
    () =>
      debitService.create(actor, {
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.paidInvoice,
        noteDate: '2026-07-10',
        amount: 0,
        remarks: 'Zero amount debit note',
      }),
    (error: any) => {
      assert.equal(error instanceof BadRequestException, true);
      assert.equal(error.message, 'Retailer debit note amount must be greater than zero');
      return true;
    },
  );

  assert.equal(state.debitNotes.length, 0);
  assert.equal(calls.ledgerCalls.postDebitNote.length, 0);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
});

test('debit note create rejects negative amount', async () => {
  const { debitService, actor, state, calls } = createHarness();

  await assert.rejects(
    () =>
      debitService.create(actor, {
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.paidInvoice,
        noteDate: '2026-07-10',
        amount: -25,
        remarks: 'Negative amount debit note',
      }),
    (error: any) => {
      assert.equal(error instanceof BadRequestException, true);
      assert.equal(error.message, 'Retailer debit note amount must be greater than zero');
      return true;
    },
  );

  assert.equal(state.debitNotes.length, 0);
  assert.equal(calls.ledgerCalls.postDebitNote.length, 0);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
});

test('debit note create rejects amount with more than 2 decimal places', async () => {
  const { debitService, actor, state, calls } = createHarness();

  await assert.rejects(
    () =>
      debitService.create(actor, {
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.paidInvoice,
        noteDate: '2026-07-10',
        amount: 160.257,
        remarks: 'High precision amount debit note',
      }),
    (error: any) => {
      assert.equal(error instanceof BadRequestException, true);
      assert.equal(error.message, 'Retailer debit note amount cannot have more than 2 decimal places');
      return true;
    },
  );

  assert.equal(state.debitNotes.length, 0);
  assert.equal(calls.ledgerCalls.postDebitNote.length, 0);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
});

test('credit note create rejects negative tax amount', async () => {
  const { creditService, actor, state, calls } = createHarness();

  await assert.rejects(
    () =>
      creditService.create(actor, {
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: 100,
        taxAmount: -5,
        remarks: 'Negative tax amount credit note',
      }),
    (error: any) => {
      assert.equal(error instanceof BadRequestException, true);
      assert.equal(error.message, 'Credit note tax amount cannot be negative');
      return true;
    },
  );

  assert.equal(state.creditNotes.length, 0);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
});

test('credit note create rejects tax amount with more than 2 decimal places', async () => {
  const { creditService, actor, state, calls } = createHarness();

  await assert.rejects(
    () =>
      creditService.create(actor, {
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.partialInvoice,
        noteDate: '2026-07-10',
        amount: 100,
        taxAmount: 18.255,
        remarks: 'High precision tax amount credit note',
      }),
    (error: any) => {
      assert.equal(error instanceof BadRequestException, true);
      assert.equal(error.message, 'Credit note tax amount cannot have more than 2 decimal places');
      return true;
    },
  );

  assert.equal(state.creditNotes.length, 0);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
});

test('credit note create rejects tax amount above configured maximum limit', async () => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25' }, async () => {
    const { creditService, actor, state, calls } = createHarness();

    await assert.rejects(
      () =>
        creditService.create(actor, {
          partyType: 'retailer',
          partyId: IDS.retailer,
          retailerId: IDS.retailer,
          relatedInvoiceId: IDS.partialInvoice,
          noteDate: '2026-07-10',
          amount: 100,
          taxAmount: 25.01,
          remarks: 'Above configured tax ceiling',
        }),
      (error: any) => {
        assert.equal(error instanceof BadRequestException, true);
        assert.equal(error.message, 'Credit note tax amount exceeds configured maximum limit');
        return true;
      },
    );

    assert.equal(state.creditNotes.length, 0);
    assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('credit note create accepts tax amount exactly at configured maximum limit', async () => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25' }, async () => {
    const { creditService, actor, state, calls } = createHarness();

    const created = await creditService.create(actor, {
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 100,
      taxAmount: 25,
      remarks: 'At configured tax ceiling',
    });

    assert.equal(created.success, true);
    assert.equal(created.data.taxAmount, 25);
    assert.equal(created.data.remainingAmount, 125);
    assert.equal(state.creditNotes.length, 1);
    assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('credit note create rejects total amount above configured maximum limit', async () => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120' }, async () => {
    const { creditService, actor, state, calls } = createHarness();

    await assert.rejects(
      () =>
        creditService.create(actor, {
          partyType: 'retailer',
          partyId: IDS.retailer,
          retailerId: IDS.retailer,
          relatedInvoiceId: IDS.partialInvoice,
          noteDate: '2026-07-10',
          amount: 100,
          taxAmount: 20.01,
          remarks: 'Above configured total ceiling',
        }),
      (error: any) => {
        assert.equal(error instanceof BadRequestException, true);
        assert.equal(error.message, 'Credit note total amount exceeds configured maximum limit');
        return true;
      },
    );

    assert.equal(state.creditNotes.length, 0);
    assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('credit note create accepts total amount exactly at configured maximum limit', async () => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120' }, async () => {
    const { creditService, actor, state, calls } = createHarness();

    const created = await creditService.create(actor, {
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 100,
      taxAmount: 20,
      remarks: 'At configured total ceiling',
    });

    assert.equal(created.success, true);
    assert.equal(created.data.amount, 100);
    assert.equal(created.data.taxAmount, 20);
    assert.equal(created.data.remainingAmount, 120);
    assert.equal(state.creditNotes.length, 1);
    assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('credit note create rejects amount above org-level DB maximum even when env is higher', async () => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_AMOUNT: '1000' }, async () => {
    const { creditService, actor, state, calls } = createHarness();
    state.systemSettings.push({
      organizationId: IDS.org,
      settingGroup: 'retailer_note_limits',
      settingKey: 'credit_note_max_amount',
      valueJson: 250,
    });

    await assert.rejects(
      () =>
        creditService.create(actor, {
          partyType: 'retailer',
          partyId: IDS.retailer,
          retailerId: IDS.retailer,
          relatedInvoiceId: IDS.partialInvoice,
          noteDate: '2026-07-10',
          amount: 251,
          remarks: 'Above org-level DB credit note ceiling',
        }),
      (error: any) => {
        assert.equal(error instanceof BadRequestException, true);
        assert.equal(error.message, 'Credit note amount exceeds configured maximum limit');
        return true;
      },
    );

    assert.equal(state.creditNotes.length, 0);
    assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('credit note create rejects tax amount above org-level DB maximum even when env is higher', async () => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '1000' }, async () => {
    const { creditService, actor, state, calls } = createHarness();
    state.systemSettings.push({
      organizationId: IDS.org,
      settingGroup: 'retailer_note_limits',
      settingKey: 'credit_note_max_tax_amount',
      valueJson: 25,
    });

    await assert.rejects(
      () =>
        creditService.create(actor, {
          partyType: 'retailer',
          partyId: IDS.retailer,
          retailerId: IDS.retailer,
          relatedInvoiceId: IDS.partialInvoice,
          noteDate: '2026-07-10',
          amount: 100,
          taxAmount: 25.01,
          remarks: 'Above org-level DB tax ceiling',
        }),
      (error: any) => {
        assert.equal(error instanceof BadRequestException, true);
        assert.equal(error.message, 'Credit note tax amount exceeds configured maximum limit');
        return true;
      },
    );

    assert.equal(state.creditNotes.length, 0);
    assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('credit note create rejects total amount above org-level DB maximum even when env is higher', async () => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '1000' }, async () => {
    const { creditService, actor, state, calls } = createHarness();
    state.systemSettings.push({
      organizationId: IDS.org,
      settingGroup: 'retailer_note_limits',
      settingKey: 'credit_note_max_total_amount',
      valueJson: 120,
    });

    await assert.rejects(
      () =>
        creditService.create(actor, {
          partyType: 'retailer',
          partyId: IDS.retailer,
          retailerId: IDS.retailer,
          relatedInvoiceId: IDS.partialInvoice,
          noteDate: '2026-07-10',
          amount: 100,
          taxAmount: 20.01,
          remarks: 'Above org-level DB total ceiling',
        }),
      (error: any) => {
        assert.equal(error instanceof BadRequestException, true);
        assert.equal(error.message, 'Credit note total amount exceeds configured maximum limit');
        return true;
      },
    );

    assert.equal(state.creditNotes.length, 0);
    assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('credit note create rejects amount above configured maximum limit', async () => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250' }, async () => {
    const { creditService, actor, state, calls } = createHarness();

    await assert.rejects(
      () =>
        creditService.create(actor, {
          partyType: 'retailer',
          partyId: IDS.retailer,
          retailerId: IDS.retailer,
          relatedInvoiceId: IDS.partialInvoice,
          noteDate: '2026-07-10',
          amount: 251,
          remarks: 'Above configured credit note ceiling',
        }),
      (error: any) => {
        assert.equal(error instanceof BadRequestException, true);
        assert.equal(error.message, 'Credit note amount exceeds configured maximum limit');
        return true;
      },
    );

    assert.equal(state.creditNotes.length, 0);
    assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('debit note create rejects amount above org-level DB maximum even when env is higher', async () => {
  await withEnv({ RETAILER_DEBIT_NOTE_MAX_AMOUNT: '1000' }, async () => {
    const { debitService, actor, state, calls } = createHarness();
    state.systemSettings.push({
      organizationId: IDS.org,
      settingGroup: 'retailer_note_limits',
      settingKey: 'debit_note_max_amount',
      valueJson: 250,
    });

    await assert.rejects(
      () =>
        debitService.create(actor, {
          retailerId: IDS.retailer,
          relatedInvoiceId: IDS.paidInvoice,
          noteDate: '2026-07-10',
          amount: 251,
          remarks: 'Above org-level DB debit note ceiling',
        }),
      (error: any) => {
        assert.equal(error instanceof BadRequestException, true);
        assert.equal(error.message, 'Retailer debit note amount exceeds configured maximum limit');
        return true;
      },
    );

    assert.equal(state.debitNotes.length, 0);
    assert.equal(calls.ledgerCalls.postDebitNote.length, 0);
    assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('debit note create rejects amount above configured maximum limit', async () => {
  await withEnv({ RETAILER_DEBIT_NOTE_MAX_AMOUNT: '250' }, async () => {
    const { debitService, actor, state, calls } = createHarness();

    await assert.rejects(
      () =>
        debitService.create(actor, {
          retailerId: IDS.retailer,
          relatedInvoiceId: IDS.paidInvoice,
          noteDate: '2026-07-10',
          amount: 251,
          remarks: 'Above configured debit note ceiling',
        }),
      (error: any) => {
        assert.equal(error instanceof BadRequestException, true);
        assert.equal(error.message, 'Retailer debit note amount exceeds configured maximum limit');
        return true;
      },
    );

    assert.equal(state.debitNotes.length, 0);
    assert.equal(calls.ledgerCalls.postDebitNote.length, 0);
    assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('credit note create accepts amount exactly at configured maximum limit', async () => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250' }, async () => {
    const { creditService, actor, state, calls } = createHarness();

    const created = await creditService.create(actor, {
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.partialInvoice,
      noteDate: '2026-07-10',
      amount: 250,
      remarks: 'At configured credit note ceiling',
    });

    assert.equal(created.success, true);
    assert.equal(created.data.amount, 250);
    assert.equal(created.data.remainingAmount, 250);
    assert.equal(state.creditNotes.length, 1);
    assert.equal(calls.ledgerCalls.postCreditNote.length, 0);
    assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('debit note create accepts amount exactly at configured maximum limit', async () => {
  await withEnv({ RETAILER_DEBIT_NOTE_MAX_AMOUNT: '250' }, async () => {
    const { debitService, actor, state, calls } = createHarness();

    const created = await debitService.create(actor, {
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.paidInvoice,
      noteDate: '2026-07-10',
      amount: 250,
      remarks: 'At configured debit note ceiling',
    });

    assert.equal(created.success, true);
    assert.equal(created.data.amount, 250);
    assert.equal(created.data.remainingAmount, 250);
    assert.equal(state.debitNotes.length, 1);
    assert.equal(calls.ledgerCalls.postDebitNote.length, 0);
    assert.equal(calls.accountingCalls.createJournalEntry.length, 0);
  });
});

test('retailer getMyNotes returns only own credit notes even if another retailerId is requested', async () => {
  const { creditService, state } = createHarness();
  seedRetailerAccessNotes(state);
  const retailerActor = createRetailerActor();

  const response = await creditService.getMyNotes(retailerActor, {
    retailerId: IDS.otherRetailer,
  } as any);

  assert.equal(response.success, true);
  assert.equal(response.data.length, 1);
  assert.equal(response.meta.total, 1);
  assert.equal(response.data[0].id, IDS.ownCreditNote);
  assert.equal(response.data[0].retailerId, IDS.retailer);
  assert.equal(response.data[0].retailer.id, IDS.retailer);
  assert.equal(response.data[0].relatedInvoice.id, IDS.partialInvoice);
});

test('retailer getMyNotes returns only own debit notes even if another retailerId is requested', async () => {
  const { debitService, state } = createHarness();
  seedRetailerAccessNotes(state);
  const retailerActor = createRetailerActor();

  const response = await debitService.getMyNotes(retailerActor, {
    retailerId: IDS.otherRetailer,
  } as any);

  assert.equal(response.success, true);
  assert.equal(response.data.length, 1);
  assert.equal(response.meta.total, 1);
  assert.equal(response.data[0].id, IDS.ownDebitNote);
  assert.equal(response.data[0].retailerId, IDS.retailer);
  assert.equal(response.data[0].retailer.id, IDS.retailer);
  assert.equal(response.data[0].relatedInvoice.id, IDS.paidInvoice);
});

test('retailer getRetailerNotes forbids querying another retailer credit notes', async () => {
  const { creditService } = createHarness();
  const retailerActor = createRetailerActor();

  await assert.rejects(
    () => creditService.getRetailerNotes(retailerActor, IDS.otherRetailer, {} as any),
    (error: any) => {
      assert.equal(error instanceof ForbiddenException, true);
      assert.equal(error.message, 'You can only access your own retailer credit notes');
      return true;
    },
  );
});

test('retailer getRetailerNotes forbids querying another retailer debit notes', async () => {
  const { debitService } = createHarness();
  const retailerActor = createRetailerActor();

  await assert.rejects(
    () => debitService.getRetailerNotes(retailerActor, IDS.otherRetailer, {} as any),
    (error: any) => {
      assert.equal(error instanceof ForbiddenException, true);
      assert.equal(error.message, 'You can only access your own retailer debit notes');
      return true;
    },
  );
});

test('retailer findOne blocks foreign credit note detail access', async () => {
  const { creditService, state } = createHarness();
  seedRetailerAccessNotes(state);
  const retailerActor = createRetailerActor();

  await assert.rejects(
    () => creditService.findOne(retailerActor, IDS.otherCreditNote),
    (error: any) => {
      assert.equal(error instanceof ForbiddenException, true);
      assert.equal(error.message, 'You can only access your own credit notes');
      return true;
    },
  );
});

test('retailer findOne blocks foreign debit note detail access', async () => {
  const { debitService, state } = createHarness();
  seedRetailerAccessNotes(state);
  const retailerActor = createRetailerActor();

  await assert.rejects(
    () => debitService.findOne(retailerActor, IDS.otherDebitNote),
    (error: any) => {
      assert.equal(error instanceof ForbiddenException, true);
      assert.equal(error.message, 'You can only access your own debit notes');
      return true;
    },
  );
});

test('credit note post is idempotent and does not duplicate finance side effects', async () => {
  const { creditService, actor, state, calls } = createHarness();

  const created = await creditService.create(actor, {
    partyType: 'retailer',
    partyId: IDS.retailer,
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.partialInvoice,
    noteDate: '2026-07-10',
    amount: 300,
    taxAmount: 0,
    remarks: 'Idempotent credit note post',
  });

  const noteId = created.data.id;

  const firstPost = await creditService.post(actor, noteId);
  assert.equal(firstPost.success, true);
  assert.equal(Number(state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice)!.outstandingAmount), 100);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(calls.metricCalls.refreshAfterCreditNote.length, 1);

  const secondPost = await creditService.post(actor, noteId);
  assert.equal(secondPost.success, true);
  assert.equal(secondPost.data.id, noteId);
  assert.equal(Number(state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice)!.outstandingAmount), 100);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(calls.metricCalls.refreshAfterCreditNote.length, 1);
});

test('credit note cancel is idempotent and does not duplicate reversal side effects', async () => {
  const { creditService, actor, state, calls } = createHarness();

  const created = await creditService.create(actor, {
    partyType: 'retailer',
    partyId: IDS.retailer,
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.partialInvoice,
    noteDate: '2026-07-10',
    amount: 300,
    taxAmount: 0,
    remarks: 'Idempotent credit note cancel',
  });

  const noteId = created.data.id;
  await creditService.post(actor, noteId);

  const firstCancel = await creditService.cancel(actor, noteId, { reason: 'First cancel' });
  assert.equal(firstCancel.success, true);
  assert.equal(Number(state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice)!.outstandingAmount), 400);
  assert.equal(calls.ledgerCalls.reverseCreditNotePosting.length, 1);
  assert.equal(calls.accountingCalls.reverseJournalEntry.length, 1);

  const secondCancel = await creditService.cancel(actor, noteId, { reason: 'Second cancel should be no-op' });
  assert.equal(secondCancel.success, true);
  assert.equal(secondCancel.message, 'Retailer credit note already cancelled');
  assert.equal(Number(state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice)!.outstandingAmount), 400);
  assert.equal(calls.ledgerCalls.reverseCreditNotePosting.length, 1);
  assert.equal(calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('credit note cannot be reposted after cancellation', async () => {
  const { creditService, actor, state, calls } = createHarness();

  const created = await creditService.create(actor, {
    partyType: 'retailer',
    partyId: IDS.retailer,
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.partialInvoice,
    noteDate: '2026-07-10',
    amount: 300,
    taxAmount: 0,
    remarks: 'Cancelled credit note repost block',
  });

  const noteId = created.data.id;
  await creditService.post(actor, noteId);
  await creditService.cancel(actor, noteId, { reason: 'Cancel before repost attempt' });

  await assert.rejects(
    () => creditService.post(actor, noteId),
    (error: any) => {
      assert.equal(error instanceof ConflictException, true);
      assert.equal(error.message, 'Cancelled credit note cannot be posted');
      return true;
    },
  );

  assert.equal(Number(state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice)!.outstandingAmount), 400);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(calls.ledgerCalls.reverseCreditNotePosting.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('debit note post is idempotent and does not duplicate finance side effects', async () => {
  const { debitService, actor, state, calls } = createHarness();

  const created = await debitService.create(actor, {
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.paidInvoice,
    noteDate: '2026-07-10',
    amount: 160,
    affectsLedger: true,
    affectsInvoiceBalance: true,
    remarks: 'Idempotent debit note post',
  });

  const noteId = created.data.id;

  const firstPost = await debitService.post(actor, noteId);
  assert.equal(firstPost.success, true);
  assert.equal(Number(state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!.outstandingAmount), 160);
  assert.equal(calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(calls.metricCalls.refreshAfterDebitNote.length, 1);

  const secondPost = await debitService.post(actor, noteId);
  assert.equal(secondPost.success, true);
  assert.equal(secondPost.data.id, noteId);
  assert.equal(Number(state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!.outstandingAmount), 160);
  assert.equal(calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(calls.metricCalls.refreshAfterDebitNote.length, 1);
});

test('debit note cancel is idempotent and does not duplicate reversal side effects', async () => {
  const { debitService, actor, state, calls } = createHarness();

  const created = await debitService.create(actor, {
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.paidInvoice,
    noteDate: '2026-07-10',
    amount: 160,
    affectsLedger: true,
    affectsInvoiceBalance: true,
    remarks: 'Idempotent debit note cancel',
  });

  const noteId = created.data.id;
  await debitService.post(actor, noteId);

  const firstCancel = await debitService.cancel(actor, noteId, { reason: 'First cancel' });
  assert.equal(firstCancel.success, true);
  assert.equal(Number(state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!.outstandingAmount), 0);
  assert.equal(calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(calls.accountingCalls.reverseJournalEntry.length, 1);

  const secondCancel = await debitService.cancel(actor, noteId, { reason: 'Second cancel should be no-op' });
  assert.equal(secondCancel.success, true);
  assert.equal(secondCancel.message, 'Retailer debit note already cancelled');
  assert.equal(Number(state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!.outstandingAmount), 0);
  assert.equal(calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('debit note cannot be reposted after cancellation', async () => {
  const { debitService, actor, state, calls } = createHarness();

  const created = await debitService.create(actor, {
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.paidInvoice,
    noteDate: '2026-07-10',
    amount: 160,
    affectsLedger: true,
    affectsInvoiceBalance: true,
    remarks: 'Cancelled debit note repost block',
  });

  const noteId = created.data.id;
  await debitService.post(actor, noteId);
  await debitService.cancel(actor, noteId, { reason: 'Cancel before repost attempt' });

  await assert.rejects(
    () => debitService.post(actor, noteId),
    (error: any) => {
      assert.equal(error instanceof ConflictException, true);
      assert.equal(error.message, 'Cancelled retailer debit note cannot be posted');
      return true;
    },
  );

  assert.equal(Number(state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!.outstandingAmount), 0);
  assert.equal(calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('credit note linked to a fully paid invoice does not make outstanding negative', async () => {
  const { creditService, actor, state, calls } = createHarness();

  const created = await creditService.create(actor, {
    partyType: 'retailer',
    partyId: IDS.retailer,
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.paidInvoice,
    noteDate: '2026-07-10',
    amount: 120,
    taxAmount: 0,
    remarks: 'Return after full settlement',
  });

  assert.equal(created.success, true);
  const noteId = created.data.id;

  const posted = await creditService.post(actor, noteId);
  assert.equal(posted.success, true);
  assert.equal(posted.data.appliedAmount, 0);
  assert.equal(posted.data.remainingAmount, 120);

  const invoiceAfterPost = state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!;
  assert.equal(Number(invoiceAfterPost.outstandingAmount), 0);
  assert.equal(invoiceAfterPost.paymentStatus, 'paid');
  assert.equal(invoiceAfterPost.status, 'paid');

  const noteAfterPost = state.creditNotes.find((x: any) => x.id === noteId)!;
  assert.equal(Number(noteAfterPost.appliedAmount), 0);
  assert.equal(Number(noteAfterPost.remainingAmount), 120);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(calls.metricCalls.refreshAfterCreditNote.length, 1);
});

test('credit note amount and tax with 2 decimal precision are preserved in totals and invoice rounding', async () => {
  const { creditService, actor, state, calls } = createHarness();

  const created = await creditService.create(actor, {
    partyType: 'retailer',
    partyId: IDS.retailer,
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.partialInvoice,
    noteDate: '2026-07-10',
    amount: 100.12,
    taxAmount: 18.25,
    remarks: 'Precision and rounding credit note',
  });

  assert.equal(created.success, true);
  const noteId = created.data.id;
  assert.equal(created.data.amount, 100.12);
  assert.equal(created.data.taxAmount, 18.25);
  assert.equal(created.data.remainingAmount, 118.37);

  const posted = await creditService.post(actor, noteId);
  assert.equal(posted.success, true);
  assert.equal(posted.data.appliedAmount, 118.37);
  assert.equal(posted.data.remainingAmount, 0);

  const invoiceAfterPost = state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice)!;
  assert.equal(Number(invoiceAfterPost.outstandingAmount), 281.63);
  assert.equal(invoiceAfterPost.paymentStatus, 'partial_paid');

  const noteAfterPost = state.creditNotes.find((x: any) => x.id === noteId)!;
  assert.equal(Number(noteAfterPost.amount), 100.12);
  assert.equal(Number(noteAfterPost.taxAmount), 18.25);
  assert.equal(Number(noteAfterPost.appliedAmount), 118.37);
  assert.equal(Number(noteAfterPost.remainingAmount), 0);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
});

test('debit note amount with 2 decimal precision is preserved in totals and invoice rounding', async () => {
  const { debitService, actor, state, calls } = createHarness();

  const created = await debitService.create(actor, {
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.paidInvoice,
    noteDate: '2026-07-10',
    amount: 160.25,
    affectsLedger: true,
    affectsInvoiceBalance: true,
    remarks: 'Precision and rounding debit note',
  });

  assert.equal(created.success, true);
  const noteId = created.data.id;
  assert.equal(created.data.amount, 160.25);
  assert.equal(created.data.remainingAmount, 160.25);

  const posted = await debitService.post(actor, noteId);
  assert.equal(posted.success, true);
  assert.equal(posted.data.appliedAmount, 160.25);
  assert.equal(posted.data.remainingAmount, 0);

  const invoiceAfterPost = state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!;
  assert.equal(Number(invoiceAfterPost.outstandingAmount), 160.25);
  assert.equal(invoiceAfterPost.paymentStatus, 'partial_paid');

  const noteAfterPost = state.debitNotes.find((x: any) => x.id === noteId)!;
  assert.equal(Number(noteAfterPost.amount), 160.25);
  assert.equal(Number(noteAfterPost.appliedAmount), 160.25);
  assert.equal(Number(noteAfterPost.remainingAmount), 0);
  assert.equal(calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
});

test('payment -> debit note -> partial settlement -> cancel debit note ends at zero without negative outstanding', async () => {
  const { debitService, actor, state, calls } = createHarness();

  const created = await debitService.create(actor, {
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.paidInvoice,
    noteDate: '2026-07-10',
    amount: 160,
    affectsLedger: true,
    affectsInvoiceBalance: true,
    remarks: 'Mixed sequence debit note flow',
  });

  const noteId = created.data.id;
  const posted = await debitService.post(actor, noteId);
  assert.equal(posted.success, true);

  const invoiceAfterDebitNote = state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!;
  assert.equal(Number(invoiceAfterDebitNote.outstandingAmount), 160);
  assert.equal(invoiceAfterDebitNote.paymentStatus, 'partial_paid');
  assert.equal(invoiceAfterDebitNote.status, 'partial_paid');

  Object.assign(invoiceAfterDebitNote, {
    outstandingAmount: 60,
    paymentStatus: 'partial_paid',
    status: 'partial_paid',
    paidAt: null,
  });

  const cancelled = await debitService.cancel(actor, noteId, { reason: 'Debit note reversed after partial settlement' });
  assert.equal(cancelled.success, true);

  const invoiceAfterCancel = state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!;
  assert.equal(Number(invoiceAfterCancel.outstandingAmount), 0);
  assert.equal(invoiceAfterCancel.paymentStatus, 'paid');
  assert.equal(invoiceAfterCancel.status, 'paid');
  assert.equal(calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('debit note cancel clamps outstanding at zero if invoice was settled after posting', async () => {
  const { debitService, actor, state, calls } = createHarness();

  const created = await debitService.create(actor, {
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.paidInvoice,
    noteDate: '2026-07-10',
    amount: 160,
    affectsLedger: true,
    affectsInvoiceBalance: true,
    remarks: 'Clamp negative outstanding on reversal',
  });

  const noteId = created.data.id;
  await debitService.post(actor, noteId);

  const invoiceBeforeCancel = state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!;
  Object.assign(invoiceBeforeCancel, {
    outstandingAmount: 20,
    paymentStatus: 'partial_paid',
    status: 'partial_paid',
    paidAt: null,
  });

  const cancelled = await debitService.cancel(actor, noteId, { reason: 'Reversal after retailer settlement' });
  assert.equal(cancelled.success, true);

  const invoiceAfterCancel = state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!;
  assert.equal(Number(invoiceAfterCancel.outstandingAmount), 0);
  assert.equal(invoiceAfterCancel.paymentStatus, 'paid');
  assert.equal(invoiceAfterCancel.status, 'paid');
  assert.equal(calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('credit note over-application caps at outstanding, preserves remaining amount, and restores invoice on cancel', async () => {
  const { creditService, actor, state, calls } = createHarness();

  const created = await creditService.create(actor, {
    partyType: 'retailer',
    partyId: IDS.retailer,
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.partialInvoice,
    noteDate: '2026-07-10',
    amount: 550,
    taxAmount: 0,
    remarks: 'Over-credit adjustment after retailer refusal',
  });

  assert.equal(created.success, true);
  const noteId = created.data.id;

  const posted = await creditService.post(actor, noteId);
  assert.equal(posted.success, true);
  assert.equal(posted.data.appliedAmount, 400);
  assert.equal(posted.data.remainingAmount, 150);

  const invoiceAfterPost = state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice)!;
  assert.equal(Number(invoiceAfterPost.outstandingAmount), 0);
  assert.equal(invoiceAfterPost.paymentStatus, 'paid');
  assert.equal(invoiceAfterPost.status, 'paid');

  const noteAfterPost = state.creditNotes.find((x: any) => x.id === noteId)!;
  assert.equal(Number(noteAfterPost.appliedAmount), 400);
  assert.equal(Number(noteAfterPost.remainingAmount), 150);
  assert.equal(calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(calls.metricCalls.refreshAfterCreditNote.length, 1);

  const cancelled = await creditService.cancel(actor, noteId, { reason: 'Reverse over-credit correction' });
  assert.equal(cancelled.success, true);
  const invoiceAfterCancel = state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice)!;
  assert.equal(Number(invoiceAfterCancel.outstandingAmount), 400);
  assert.equal(invoiceAfterCancel.paymentStatus, 'partial_paid');
  assert.equal(invoiceAfterCancel.status, 'partial_paid');
  assert.equal(calls.ledgerCalls.reverseCreditNotePosting.length, 1);
  assert.equal(calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('debit note over-application can push invoice beyond grand total and restores prior balance on cancel', async () => {
  const { debitService, actor, state, calls } = createHarness();

  const created = await debitService.create(actor, {
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.partialInvoice,
    noteDate: '2026-07-10',
    amount: 700,
    affectsLedger: true,
    affectsInvoiceBalance: true,
    remarks: 'Over-debit charge correction',
  });

  assert.equal(created.success, true);
  const noteId = created.data.id;

  const posted = await debitService.post(actor, noteId);
  assert.equal(posted.success, true);
  assert.equal(posted.data.appliedAmount, 700);
  assert.equal(posted.data.remainingAmount, 0);

  const invoiceAfterPost = state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice)!;
  assert.equal(Number(invoiceAfterPost.outstandingAmount), 1100);
  assert.equal(invoiceAfterPost.paymentStatus, 'unpaid');
  assert.equal(invoiceAfterPost.status, 'posted');

  const noteAfterPost = state.debitNotes.find((x: any) => x.id === noteId)!;
  assert.equal(Number(noteAfterPost.appliedAmount), 700);
  assert.equal(Number(noteAfterPost.remainingAmount), 0);
  assert.equal(calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(calls.metricCalls.refreshAfterDebitNote.length, 1);

  const cancelled = await debitService.cancel(actor, noteId, { reason: 'Reverse over-debit correction' });
  assert.equal(cancelled.success, true);
  const invoiceAfterCancel = state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice)!;
  assert.equal(Number(invoiceAfterCancel.outstandingAmount), 400);
  assert.equal(invoiceAfterCancel.paymentStatus, 'partial_paid');
  assert.equal(invoiceAfterCancel.status, 'partial_paid');
  assert.equal(calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('credit note post reduces outstanding and cancel restores it', async () => {
  const { creditService, actor, state, calls } = createHarness();

  const created = await creditService.create(actor, {
    partyType: 'retailer',
    partyId: IDS.retailer,
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.partialInvoice,
    noteDate: '2026-07-10',
    amount: 300,
    taxAmount: 0,
    remarks: 'Retailer refused some quantity',
  });

  assert.equal(created.success, true);
  const noteId = created.data.id;

  const posted = await creditService.post(actor, noteId);
  assert.equal(posted.success, true);
  const invoiceAfterPost = state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice)!;
  assert.equal(Number(invoiceAfterPost.outstandingAmount), 100);
  assert.equal(invoiceAfterPost.paymentStatus, 'partial_paid');
  assert.equal(calls.ledgerCalls.postCreditNote.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(calls.metricCalls.refreshAfterCreditNote.length, 1);

  const cancelled = await creditService.cancel(actor, noteId, { reason: 'Reversal of correction' });
  assert.equal(cancelled.success, true);
  const invoiceAfterCancel = state.salesInvoices.find((x: any) => x.id === IDS.partialInvoice)!;
  assert.equal(Number(invoiceAfterCancel.outstandingAmount), 400);
  assert.equal(calls.ledgerCalls.reverseCreditNotePosting.length, 1);
  assert.equal(calls.accountingCalls.reverseJournalEntry.length, 1);
});

test('debit note post increases outstanding and cancel restores paid invoice', async () => {
  const { debitService, actor, state, calls } = createHarness();

  const created = await debitService.create(actor, {
    retailerId: IDS.retailer,
    relatedInvoiceId: IDS.paidInvoice,
    noteDate: '2026-07-10',
    amount: 160,
    affectsLedger: true,
    affectsInvoiceBalance: true,
    remarks: 'Retailer accepted extra items',
  });

  assert.equal(created.success, true);
  const noteId = created.data.id;

  const posted = await debitService.post(actor, noteId);
  assert.equal(posted.success, true);
  const invoiceAfterPost = state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!;
  assert.equal(Number(invoiceAfterPost.outstandingAmount), 160);
  assert.equal(invoiceAfterPost.paymentStatus, 'partial_paid');
  assert.equal(calls.ledgerCalls.postDebitNote.length, 1);
  assert.equal(calls.accountingCalls.createJournalEntry.length, 1);
  assert.equal(calls.metricCalls.refreshAfterDebitNote.length, 1);

  const cancelled = await debitService.cancel(actor, noteId, { reason: 'Extra items were entered by mistake' });
  assert.equal(cancelled.success, true);
  const invoiceAfterCancel = state.salesInvoices.find((x: any) => x.id === IDS.paidInvoice)!;
  assert.equal(Number(invoiceAfterCancel.outstandingAmount), 0);
  assert.equal(invoiceAfterCancel.paymentStatus, 'paid');
  assert.equal(calls.ledgerCalls.reverseDebitNotePosting.length, 1);
  assert.equal(calls.accountingCalls.reverseJournalEntry.length, 1);
});
