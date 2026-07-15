// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { PaymentMetricsService } from '../src/operations/payments/payment-metrics.service';
import { RetailerCreditNotesController } from '../src/operations/payments/retailer-credit-notes.controller';
import { RetailerCreditNotesService } from '../src/operations/payments/retailer-credit-notes.service';
import { RetailerDebitNotesController } from '../src/operations/payments/retailer-debit-notes.controller';
import { RetailerDebitNotesService } from '../src/operations/payments/retailer-debit-notes.service';
import { RetailerLedgerService } from '../src/operations/payments/retailer-ledger.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedRetailerNotesFixture,
} from './helpers/prisma-e2e';

const ACCESS_NOTE_IDS = {
  ownCreditNote: '20000000-0000-4000-8000-000000000031',
  otherCreditNote: '20000000-0000-4000-8000-000000000032',
  ownDebitNote: '20000000-0000-4000-8000-000000000033',
  otherDebitNote: '20000000-0000-4000-8000-000000000034',
};

function createRetailerActor(retailerId = IDS.retailer) {
  return {
    id: '20000000-0000-4000-8000-000000000099',
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

async function seedRetailerAccessNotes(prisma: any) {
  await prisma.creditNote.createMany({
    data: [
      {
        id: ACCESS_NOTE_IDS.ownCreditNote,
        organizationId: IDS.org,
        creditNoteNo: 'CRN-20260711-0001',
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedReturnId: IDS.invoice,
        noteDate: new Date('2026-07-11T00:00:00.000Z'),
        amount: 120,
        taxAmount: 0,
        status: 'posted',
        affectsLedger: true,
        affectsInvoiceBalance: true,
        appliedAmount: 120,
        remainingAmount: 0,
        remarks: 'Own retailer credit note',
      },
      {
        id: ACCESS_NOTE_IDS.otherCreditNote,
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
        affectsLedger: true,
        affectsInvoiceBalance: true,
        appliedAmount: 90,
        remainingAmount: 0,
        remarks: 'Other retailer credit note',
      },
    ],
  });

  await prisma.retailerDebitNote.createMany({
    data: [
      {
        id: ACCESS_NOTE_IDS.ownDebitNote,
        organizationId: IDS.org,
        debitNoteNo: 'DBN-20260711-0001',
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.postedInvoice,
        noteDate: new Date('2026-07-11T00:00:00.000Z'),
        amount: 150,
        affectsLedger: true,
        affectsInvoiceBalance: true,
        appliedAmount: 150,
        remainingAmount: 0,
        status: 'posted',
        remarks: 'Own retailer debit note',
      },
      {
        id: ACCESS_NOTE_IDS.otherDebitNote,
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
      },
    ],
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedRetailerNotesFixture(prisma);

  return createPrismaBackedApp({
    controllers: [RetailerCreditNotesController, RetailerDebitNotesController],
    providers: [
      PaymentMetricsService,
      RetailerLedgerService,
      RetailerCreditNotesService,
      RetailerDebitNotesService,
    ],
    actor,
  });
}

async function getCreditAccountingCounts(prisma: any, noteId: string) {
  const note = await prisma.creditNote.findFirst({ where: { id: noteId } });
  const postedJournals = await prisma.journalEntry.findMany({
    where: { organizationId: IDS.org, referenceType: 'credit_note', referenceId: noteId },
  });
  const postedJournalIds = postedJournals.map((row: any) => row.id);
  const postedLineCount = postedJournalIds.length
    ? await prisma.accountJournalLine.count({ where: { organizationId: IDS.org, journalEntryId: { in: postedJournalIds } } })
    : 0;
  const reversalJournalCount = note?.journalEntryId
    ? await prisma.journalEntry.count({
        where: { organizationId: IDS.org, referenceType: 'journal_reversal', referenceId: note.journalEntryId },
      })
    : 0;

  return {
    postedJournalCount: postedJournals.length,
    postedLineCount,
    reversalJournalCount,
  };
}

async function getDebitAccountingCounts(prisma: any, noteId: string) {
  const note = await prisma.retailerDebitNote.findFirst({ where: { id: noteId } });
  const postedJournals = await prisma.journalEntry.findMany({
    where: { organizationId: IDS.org, referenceType: 'retailer_debit_note', referenceId: noteId },
  });
  const postedJournalIds = postedJournals.map((row: any) => row.id);
  const postedLineCount = postedJournalIds.length
    ? await prisma.accountJournalLine.count({ where: { organizationId: IDS.org, journalEntryId: { in: postedJournalIds } } })
    : 0;
  const reversalJournalCount = note?.journalEntryId
    ? await prisma.journalEntry.count({
        where: { organizationId: IDS.org, referenceType: 'journal_reversal', referenceId: note.journalEntryId },
      })
    : 0;

  return {
    postedJournalCount: postedJournals.length,
    postedLineCount,
    reversalJournalCount,
  };
}

test('Prisma-backed HTTP e2e: credit note create rejects party and retailer mismatch', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

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
  const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
  assert.equal(creditNotes.length, 0);
});

test('Prisma-backed HTTP e2e: credit note create rejects partial-paid invoice linked to another retailer', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

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
  const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
  assert.equal(creditNotes.length, 0);
});

test('Prisma-backed HTTP e2e: debit note create rejects paid invoice linked to another retailer', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

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
  const debitNotes = await prisma.retailerDebitNote.findMany({ where: { organizationId: IDS.org } });
  assert.equal(debitNotes.length, 0);
});

test('Prisma-backed HTTP e2e: credit note create rejects zero amount', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.invoice,
      noteDate: '2026-07-10',
      amount: 0,
      remarks: 'Zero amount credit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Credit note amount must be greater than zero');
  const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
  assert.equal(creditNotes.length, 0);
});

test('Prisma-backed HTTP e2e: credit note create rejects negative amount', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.invoice,
      noteDate: '2026-07-10',
      amount: -10,
      remarks: 'Negative amount credit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Credit note amount must be greater than zero');
  const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
  assert.equal(creditNotes.length, 0);
});

test('Prisma-backed HTTP e2e: credit note create rejects amount with more than 2 decimal places', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.invoice,
      noteDate: '2026-07-10',
      amount: 100.123,
      remarks: 'High precision amount credit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Credit note amount cannot have more than 2 decimal places');
  const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
  assert.equal(creditNotes.length, 0);
});

test('Prisma-backed HTTP e2e: debit note create rejects zero amount', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.postedInvoice,
      noteDate: '2026-07-10',
      amount: 0,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Zero amount debit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Retailer debit note amount must be greater than zero');
  const debitNotes = await prisma.retailerDebitNote.findMany({ where: { organizationId: IDS.org } });
  assert.equal(debitNotes.length, 0);
});

test('Prisma-backed HTTP e2e: debit note create rejects negative amount', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.postedInvoice,
      noteDate: '2026-07-10',
      amount: -25,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Negative amount debit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Retailer debit note amount must be greater than zero');
  const debitNotes = await prisma.retailerDebitNote.findMany({ where: { organizationId: IDS.org } });
  assert.equal(debitNotes.length, 0);
});

test('Prisma-backed HTTP e2e: debit note create rejects amount with more than 2 decimal places', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.postedInvoice,
      noteDate: '2026-07-10',
      amount: 160.257,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'High precision amount debit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Retailer debit note amount cannot have more than 2 decimal places');
  const debitNotes = await prisma.retailerDebitNote.findMany({ where: { organizationId: IDS.org } });
  assert.equal(debitNotes.length, 0);
});

test('Prisma-backed HTTP e2e: credit note create rejects negative tax amount', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.invoice,
      noteDate: '2026-07-10',
      amount: 100,
      taxAmount: -5,
      remarks: 'Negative tax amount credit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Credit note tax amount cannot be negative');
  const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
  assert.equal(creditNotes.length, 0);
});

test('Prisma-backed HTTP e2e: credit note create rejects tax amount with more than 2 decimal places', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.invoice,
      noteDate: '2026-07-10',
      amount: 100,
      taxAmount: 18.255,
      remarks: 'High precision tax amount credit note',
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Credit note tax amount cannot have more than 2 decimal places');
  const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
  assert.equal(creditNotes.length, 0);
});

test('Prisma-backed HTTP e2e: credit note create rejects tax amount above configured maximum limit', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25' }, async () => {
    const { app, prisma } = await buildApp();
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.invoice,
        noteDate: '2026-07-10',
        amount: 100,
        taxAmount: 25.01,
        remarks: 'Above configured tax ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Credit note tax amount exceeds configured maximum limit');
    const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
    assert.equal(creditNotes.length, 0);
  });
});

test('Prisma-backed HTTP e2e: credit note create accepts tax amount exactly at configured maximum limit', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: '25' }, async () => {
    const { app, prisma } = await buildApp();
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.invoice,
        noteDate: '2026-07-10',
        amount: 100,
        taxAmount: 25,
        remarks: 'At configured tax ceiling',
      })
      .expect(201);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.taxAmount, 25);
    assert.equal(response.body.data.remainingAmount, 125);
    const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
    assert.equal(creditNotes.length, 1);
    assert.equal(Number(creditNotes[0].taxAmount), 25);
  });
});

test('Prisma-backed HTTP e2e: credit note create rejects total amount above configured maximum limit', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120' }, async () => {
    const { app, prisma } = await buildApp();
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.invoice,
        noteDate: '2026-07-10',
        amount: 100,
        taxAmount: 20.01,
        remarks: 'Above configured total ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Credit note total amount exceeds configured maximum limit');
    const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
    assert.equal(creditNotes.length, 0);
  });
});

test('Prisma-backed HTTP e2e: credit note create accepts total amount exactly at configured maximum limit', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '120' }, async () => {
    const { app, prisma } = await buildApp();
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.invoice,
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
    const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
    assert.equal(creditNotes.length, 1);
    assert.equal(Number(creditNotes[0].amount), 100);
    assert.equal(Number(creditNotes[0].taxAmount), 20);
  });
});

test('Prisma-backed HTTP e2e: credit note create rejects amount above configured maximum limit', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250' }, async () => {
    const { app, prisma } = await buildApp();
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.invoice,
        noteDate: '2026-07-10',
        amount: 251,
        remarks: 'Above configured credit note ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Credit note amount exceeds configured maximum limit');
    const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
    assert.equal(creditNotes.length, 0);
  });
});

test('Prisma-backed HTTP e2e: debit note create rejects amount above configured maximum limit', async (t) => {
  await withEnv({ RETAILER_DEBIT_NOTE_MAX_AMOUNT: '250' }, async () => {
    const { app, prisma } = await buildApp();
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/retailer-debit-notes')
      .send({
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.postedInvoice,
        noteDate: '2026-07-10',
        amount: 251,
        affectsLedger: true,
        affectsInvoiceBalance: true,
        remarks: 'Above configured debit note ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Retailer debit note amount exceeds configured maximum limit');
    const debitNotes = await prisma.retailerDebitNote.findMany({ where: { organizationId: IDS.org } });
    assert.equal(debitNotes.length, 0);
  });
});

test('Prisma-backed HTTP e2e: credit note create accepts amount exactly at configured maximum limit', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_AMOUNT: '250' }, async () => {
    const { app, prisma } = await buildApp();
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.invoice,
        noteDate: '2026-07-10',
        amount: 250,
        remarks: 'At configured credit note ceiling',
      })
      .expect(201);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.amount, 250);
    assert.equal(response.body.data.remainingAmount, 250);
    const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
    assert.equal(creditNotes.length, 1);
    assert.equal(Number(creditNotes[0].amount), 250);
  });
});

test('Prisma-backed HTTP e2e: debit note create accepts amount exactly at configured maximum limit', async (t) => {
  await withEnv({ RETAILER_DEBIT_NOTE_MAX_AMOUNT: '250' }, async () => {
    const { app, prisma } = await buildApp();
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/retailer-debit-notes')
      .send({
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.postedInvoice,
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
    const debitNotes = await prisma.retailerDebitNote.findMany({ where: { organizationId: IDS.org } });
    assert.equal(debitNotes.length, 1);
    assert.equal(Number(debitNotes[0].amount), 250);
  });
});

test('Prisma-backed HTTP e2e: credit note create uses org-level DB amount ceiling over env fallback', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_AMOUNT: '1000' }, async () => {
    const { app, prisma } = await buildApp();
    await prisma.systemSetting.create({
      data: {
        organizationId: IDS.org,
        settingGroup: 'retailer_note_limits',
        settingKey: 'credit_note_max_amount',
        valueJson: 250,
      },
    });
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.invoice,
        noteDate: '2026-07-10',
        amount: 251,
        remarks: 'Above org-level DB credit note ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Credit note amount exceeds configured maximum limit');
    const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
    assert.equal(creditNotes.length, 0);
  });
});

test('Prisma-backed HTTP e2e: credit note create uses org-level DB total ceiling over env fallback', async (t) => {
  await withEnv({ RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: '1000' }, async () => {
    const { app, prisma } = await buildApp();
    await prisma.systemSetting.create({
      data: {
        organizationId: IDS.org,
        settingGroup: 'retailer_note_limits',
        settingKey: 'credit_note_max_total_amount',
        valueJson: 120,
      },
    });
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/credit-notes')
      .send({
        partyType: 'retailer',
        partyId: IDS.retailer,
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.invoice,
        noteDate: '2026-07-10',
        amount: 100,
        taxAmount: 20.01,
        remarks: 'Above org-level DB total ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Credit note total amount exceeds configured maximum limit');
    const creditNotes = await prisma.creditNote.findMany({ where: { organizationId: IDS.org, partyType: 'retailer' } });
    assert.equal(creditNotes.length, 0);
  });
});

test('Prisma-backed HTTP e2e: debit note create uses org-level DB amount ceiling over env fallback', async (t) => {
  await withEnv({ RETAILER_DEBIT_NOTE_MAX_AMOUNT: '1000' }, async () => {
    const { app, prisma } = await buildApp();
    await prisma.systemSetting.create({
      data: {
        organizationId: IDS.org,
        settingGroup: 'retailer_note_limits',
        settingKey: 'debit_note_max_amount',
        valueJson: 250,
      },
    });
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/retailer-debit-notes')
      .send({
        retailerId: IDS.retailer,
        relatedInvoiceId: IDS.postedInvoice,
        noteDate: '2026-07-10',
        amount: 251,
        affectsLedger: true,
        affectsInvoiceBalance: true,
        remarks: 'Above org-level DB debit note ceiling',
      })
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Retailer debit note amount exceeds configured maximum limit');
    const debitNotes = await prisma.retailerDebitNote.findMany({ where: { organizationId: IDS.org } });
    assert.equal(debitNotes.length, 0);
  });
});

test('Prisma-backed HTTP e2e: retailer /my/credit-notes returns only own records even if another retailerId is supplied', async (t) => {
  const { app, prisma } = await buildApp(createRetailerActor());
  await seedRetailerAccessNotes(prisma);
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get(`/api/v1/my/credit-notes?retailerId=${IDS.otherRetailer}`)
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data[0].retailerId, IDS.retailer);
  assert.equal(response.body.data[0].retailer.id, IDS.retailer);
  assert.equal(response.body.data[0].relatedInvoice.id, IDS.invoice);
});

test('Prisma-backed HTTP e2e: retailer /my/debit-notes returns only own records even if another retailerId is supplied', async (t) => {
  const { app, prisma } = await buildApp(createRetailerActor());
  await seedRetailerAccessNotes(prisma);
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get(`/api/v1/my/debit-notes?retailerId=${IDS.otherRetailer}`)
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data[0].retailerId, IDS.retailer);
  assert.equal(response.body.data[0].retailer.id, IDS.retailer);
  assert.equal(response.body.data[0].relatedInvoice.id, IDS.postedInvoice);
});

test('Prisma-backed HTTP e2e: retailer is forbidden from querying another retailer credit notes route', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get(`/api/v1/retailers/${IDS.otherRetailer}/credit-notes`)
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'You can only access your own retailer credit notes');
});

test('Prisma-backed HTTP e2e: retailer is forbidden from querying another retailer debit notes route', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get(`/api/v1/retailers/${IDS.otherRetailer}/debit-notes`)
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'You can only access your own retailer debit notes');
});

test('Prisma-backed HTTP e2e: retailer is forbidden from opening another retailer credit note detail', async (t) => {
  const { app, prisma } = await buildApp(createRetailerActor());
  await seedRetailerAccessNotes(prisma);
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get(`/api/v1/credit-notes/${ACCESS_NOTE_IDS.otherCreditNote}`)
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'You can only access your own credit notes');
});

test('Prisma-backed HTTP e2e: retailer is forbidden from opening another retailer debit note detail', async (t) => {
  const { app, prisma } = await buildApp(createRetailerActor());
  await seedRetailerAccessNotes(prisma);
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get(`/api/v1/retailer-debit-notes/${ACCESS_NOTE_IDS.otherDebitNote}`)
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'You can only access your own debit notes');
});

test('Prisma-backed HTTP e2e: credit note post is idempotent and does not duplicate finance side effects', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.invoice,
      noteDate: '2026-07-10',
      amount: 300,
      remarks: 'Idempotent credit note post',
    })
    .expect(201);
  const noteId = created.body.data.id;

  await request(app.getHttpServer()).post(`/api/v1/credit-notes/${noteId}/post`).expect(201);
  const firstLedgerCount = await prisma.retailerLedgerEntry.count({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, creditNoteId: noteId, transactionType: 'credit_note' },
  });
  const firstAccounting = await getCreditAccountingCounts(prisma, noteId);
  const invoiceAfterFirstPost = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.equal(firstLedgerCount, 1);
  assert.equal(firstAccounting.postedJournalCount, 1);
  assert.equal(firstAccounting.postedLineCount, 2);
  assert.equal(firstAccounting.reversalJournalCount, 0);
  assert.equal(Number(invoiceAfterFirstPost!.outstandingAmount), 100);

  const secondPost = await request(app.getHttpServer()).post(`/api/v1/credit-notes/${noteId}/post`).expect(201);
  assert.equal(secondPost.body.success, true);
  assert.equal(secondPost.body.data.id, noteId);

  const secondLedgerCount = await prisma.retailerLedgerEntry.count({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, creditNoteId: noteId, transactionType: 'credit_note' },
  });
  const secondAccounting = await getCreditAccountingCounts(prisma, noteId);
  const invoiceAfterSecondPost = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.equal(secondLedgerCount, 1);
  assert.equal(secondAccounting.postedJournalCount, 1);
  assert.equal(secondAccounting.postedLineCount, 2);
  assert.equal(secondAccounting.reversalJournalCount, 0);
  assert.equal(Number(invoiceAfterSecondPost!.outstandingAmount), 100);
});

test('Prisma-backed HTTP e2e: credit note cancel is idempotent and does not duplicate reversal side effects', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.invoice,
      noteDate: '2026-07-10',
      amount: 300,
      remarks: 'Idempotent credit note cancel',
    })
    .expect(201);
  const noteId = created.body.data.id;

  await request(app.getHttpServer()).post(`/api/v1/credit-notes/${noteId}/post`).expect(201);
  await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/cancel`)
    .send({ reason: 'First cancel' })
    .expect(201);

  const firstReverseCount = await prisma.retailerLedgerEntry.count({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, creditNoteId: noteId, referenceType: 'credit_note_cancel' },
  });
  const firstAccounting = await getCreditAccountingCounts(prisma, noteId);
  const invoiceAfterFirstCancel = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.equal(firstReverseCount, 1);
  assert.equal(firstAccounting.postedJournalCount, 1);
  assert.equal(firstAccounting.postedLineCount, 2);
  assert.equal(firstAccounting.reversalJournalCount, 1);
  assert.equal(Number(invoiceAfterFirstCancel!.outstandingAmount), 400);

  const secondCancel = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/cancel`)
    .send({ reason: 'Second cancel should be no-op' })
    .expect(201);
  assert.equal(secondCancel.body.success, true);
  assert.equal(secondCancel.body.message, 'Retailer credit note already cancelled');

  const secondReverseCount = await prisma.retailerLedgerEntry.count({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, creditNoteId: noteId, referenceType: 'credit_note_cancel' },
  });
  const secondAccounting = await getCreditAccountingCounts(prisma, noteId);
  const invoiceAfterSecondCancel = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.equal(secondReverseCount, 1);
  assert.equal(secondAccounting.postedJournalCount, 1);
  assert.equal(secondAccounting.postedLineCount, 2);
  assert.equal(secondAccounting.reversalJournalCount, 1);
  assert.equal(Number(invoiceAfterSecondCancel!.outstandingAmount), 400);
});

test('Prisma-backed HTTP e2e: cancelled credit note cannot be reposted', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.invoice,
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

  const ledgerCount = await prisma.retailerLedgerEntry.count({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, creditNoteId: noteId, transactionType: 'credit_note' },
  });
  const reverseCount = await prisma.retailerLedgerEntry.count({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, creditNoteId: noteId, referenceType: 'credit_note_cancel' },
  });
  const accounting = await getCreditAccountingCounts(prisma, noteId);
  const invoiceAfterRepostAttempt = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.equal(ledgerCount, 1);
  assert.equal(reverseCount, 1);
  assert.equal(accounting.postedJournalCount, 1);
  assert.equal(accounting.postedLineCount, 2);
  assert.equal(accounting.reversalJournalCount, 1);
  assert.equal(Number(invoiceAfterRepostAttempt!.outstandingAmount), 400);
});

test('Prisma-backed HTTP e2e: debit note post is idempotent and does not duplicate finance side effects', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.postedInvoice,
      noteDate: '2026-07-10',
      amount: 160,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Idempotent debit note post',
    })
    .expect(201);
  const noteId = created.body.data.id;

  await request(app.getHttpServer()).post(`/api/v1/retailer-debit-notes/${noteId}/post`).expect(201);
  const firstLedgerCount = await prisma.retailerLedgerEntry.count({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, debitNoteId: noteId, transactionType: 'debit_note' },
  });
  const firstAccounting = await getDebitAccountingCounts(prisma, noteId);
  const invoiceAfterFirstPost = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.equal(firstLedgerCount, 1);
  assert.equal(firstAccounting.postedJournalCount, 1);
  assert.equal(firstAccounting.postedLineCount, 2);
  assert.equal(firstAccounting.reversalJournalCount, 0);
  assert.equal(Number(invoiceAfterFirstPost!.outstandingAmount), 160);

  const secondPost = await request(app.getHttpServer()).post(`/api/v1/retailer-debit-notes/${noteId}/post`).expect(201);
  assert.equal(secondPost.body.success, true);
  assert.equal(secondPost.body.data.id, noteId);

  const secondLedgerCount = await prisma.retailerLedgerEntry.count({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, debitNoteId: noteId, transactionType: 'debit_note' },
  });
  const secondAccounting = await getDebitAccountingCounts(prisma, noteId);
  const invoiceAfterSecondPost = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.equal(secondLedgerCount, 1);
  assert.equal(secondAccounting.postedJournalCount, 1);
  assert.equal(secondAccounting.postedLineCount, 2);
  assert.equal(secondAccounting.reversalJournalCount, 0);
  assert.equal(Number(invoiceAfterSecondPost!.outstandingAmount), 160);
});

test('Prisma-backed HTTP e2e: debit note cancel is idempotent and does not duplicate reversal side effects', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.postedInvoice,
      noteDate: '2026-07-10',
      amount: 160,
      affectsLedger: true,
      affectsInvoiceBalance: true,
      remarks: 'Idempotent debit note cancel',
    })
    .expect(201);
  const noteId = created.body.data.id;

  await request(app.getHttpServer()).post(`/api/v1/retailer-debit-notes/${noteId}/post`).expect(201);
  await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'First cancel' })
    .expect(201);

  const firstReverseCount = await prisma.retailerLedgerEntry.count({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, debitNoteId: noteId, referenceType: 'retailer_debit_note_cancel' },
  });
  const firstAccounting = await getDebitAccountingCounts(prisma, noteId);
  const invoiceAfterFirstCancel = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.equal(firstReverseCount, 1);
  assert.equal(firstAccounting.postedJournalCount, 1);
  assert.equal(firstAccounting.postedLineCount, 2);
  assert.equal(firstAccounting.reversalJournalCount, 1);
  assert.equal(Number(invoiceAfterFirstCancel!.outstandingAmount), 0);

  const secondCancel = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'Second cancel should be no-op' })
    .expect(201);
  assert.equal(secondCancel.body.success, true);
  assert.equal(secondCancel.body.message, 'Retailer debit note already cancelled');

  const secondReverseCount = await prisma.retailerLedgerEntry.count({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, debitNoteId: noteId, referenceType: 'retailer_debit_note_cancel' },
  });
  const secondAccounting = await getDebitAccountingCounts(prisma, noteId);
  const invoiceAfterSecondCancel = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.equal(secondReverseCount, 1);
  assert.equal(secondAccounting.postedJournalCount, 1);
  assert.equal(secondAccounting.postedLineCount, 2);
  assert.equal(secondAccounting.reversalJournalCount, 1);
  assert.equal(Number(invoiceAfterSecondCancel!.outstandingAmount), 0);
});

test('Prisma-backed HTTP e2e: cancelled debit note cannot be reposted', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.postedInvoice,
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

  const ledgerCount = await prisma.retailerLedgerEntry.count({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, debitNoteId: noteId, transactionType: 'debit_note' },
  });
  const reverseCount = await prisma.retailerLedgerEntry.count({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, debitNoteId: noteId, referenceType: 'retailer_debit_note_cancel' },
  });
  const accounting = await getDebitAccountingCounts(prisma, noteId);
  const invoiceAfterRepostAttempt = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.equal(ledgerCount, 1);
  assert.equal(reverseCount, 1);
  assert.equal(accounting.postedJournalCount, 1);
  assert.equal(accounting.postedLineCount, 2);
  assert.equal(accounting.reversalJournalCount, 1);
  assert.equal(Number(invoiceAfterRepostAttempt!.outstandingAmount), 0);
});

test('Prisma-backed HTTP e2e: credit note linked to a fully paid invoice does not make outstanding negative', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.postedInvoice,
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

  const invoiceAfterPost = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.equal(Number(invoiceAfterPost!.outstandingAmount), 0);
  assert.equal(invoiceAfterPost!.paymentStatus, 'paid');
  assert.equal(invoiceAfterPost!.status, 'paid');

  const creditNote = await prisma.creditNote.findFirst({ where: { id: noteId } });
  const accounting = await getCreditAccountingCounts(prisma, noteId);
  assert.equal(creditNote!.status, 'posted');
  assert.equal(Number(creditNote!.appliedAmount), 0);
  assert.equal(Number(creditNote!.remainingAmount), 120);
  assert.equal(accounting.postedJournalCount, 1);
  assert.equal(accounting.postedLineCount, 2);
  assert.equal(accounting.reversalJournalCount, 0);
});

test('Prisma-backed HTTP e2e: credit note amount and tax with 2 decimal precision are preserved in totals and invoice rounding', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.invoice,
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

  const invoiceAfterPost = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.equal(Number(invoiceAfterPost!.outstandingAmount), 281.63);
  assert.equal(invoiceAfterPost!.paymentStatus, 'partial_paid');

  const creditNote = await prisma.creditNote.findFirst({ where: { id: noteId } });
  const accounting = await getCreditAccountingCounts(prisma, noteId);
  assert.equal(Number(creditNote!.amount), 100.12);
  assert.equal(Number(creditNote!.taxAmount), 18.25);
  assert.equal(Number(creditNote!.appliedAmount), 118.37);
  assert.equal(Number(creditNote!.remainingAmount), 0);
  assert.equal(accounting.postedJournalCount, 1);
  assert.equal(accounting.postedLineCount, 2);
  assert.equal(accounting.reversalJournalCount, 0);
});

test('Prisma-backed HTTP e2e: debit note amount with 2 decimal precision is preserved in totals and invoice rounding', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.postedInvoice,
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

  const invoiceAfterPost = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.equal(Number(invoiceAfterPost!.outstandingAmount), 160.25);
  assert.equal(invoiceAfterPost!.paymentStatus, 'partial_paid');

  const debitNote = await prisma.retailerDebitNote.findFirst({ where: { id: noteId } });
  const accounting = await getDebitAccountingCounts(prisma, noteId);
  assert.equal(Number(debitNote!.amount), 160.25);
  assert.equal(Number(debitNote!.appliedAmount), 160.25);
  assert.equal(Number(debitNote!.remainingAmount), 0);
  assert.equal(accounting.postedJournalCount, 1);
  assert.equal(accounting.postedLineCount, 2);
  assert.equal(accounting.reversalJournalCount, 0);
});

test('Prisma-backed HTTP e2e: payment -> debit note -> partial settlement -> cancel debit note ends at zero without negative outstanding', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.postedInvoice,
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

  const invoiceAfterDebitNote = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.equal(Number(invoiceAfterDebitNote!.outstandingAmount), 160);
  assert.equal(invoiceAfterDebitNote!.paymentStatus, 'partial_paid');
  assert.equal(invoiceAfterDebitNote!.status, 'partial_paid');

  await prisma.salesInvoice.update({
    where: { id: IDS.postedInvoice },
    data: {
      outstandingAmount: 60,
      paymentStatus: 'partial_paid',
      status: 'partial_paid',
      paidAt: null,
    },
  });

  const cancelled = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'Debit note reversed after partial settlement' })
    .expect(201);

  assert.equal(cancelled.body.success, true);
  const accounting = await getDebitAccountingCounts(prisma, noteId);
  const invoiceAfterCancel = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.equal(Number(invoiceAfterCancel!.outstandingAmount), 0);
  assert.equal(invoiceAfterCancel!.paymentStatus, 'paid');
  assert.equal(invoiceAfterCancel!.status, 'paid');
  assert.equal(accounting.postedJournalCount, 1);
  assert.equal(accounting.postedLineCount, 2);
  assert.equal(accounting.reversalJournalCount, 1);
});

test('Prisma-backed HTTP e2e: debit note cancel clamps outstanding at zero if invoice was settled after posting', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.postedInvoice,
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

  await prisma.salesInvoice.update({
    where: { id: IDS.postedInvoice },
    data: {
      outstandingAmount: 20,
      paymentStatus: 'partial_paid',
      status: 'partial_paid',
      paidAt: null,
    },
  });

  const cancelled = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'Reversal after retailer settlement' })
    .expect(201);

  assert.equal(cancelled.body.success, true);
  const accounting = await getDebitAccountingCounts(prisma, noteId);
  const invoiceAfterCancel = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.equal(Number(invoiceAfterCancel!.outstandingAmount), 0);
  assert.equal(invoiceAfterCancel!.paymentStatus, 'paid');
  assert.equal(invoiceAfterCancel!.status, 'paid');
  assert.equal(accounting.postedJournalCount, 1);
  assert.equal(accounting.postedLineCount, 2);
  assert.equal(accounting.reversalJournalCount, 1);
});

test('Prisma-backed HTTP e2e: over-credit note caps invoice outstanding at zero and tracks remaining amount', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.invoice,
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

  const invoiceAfterPost = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.equal(Number(invoiceAfterPost!.outstandingAmount), 0);
  assert.equal(invoiceAfterPost!.paymentStatus, 'paid');
  assert.equal(invoiceAfterPost!.status, 'paid');

  const creditNote = await prisma.creditNote.findFirst({ where: { id: noteId } });
  const accountingAfterPost = await getCreditAccountingCounts(prisma, noteId);
  assert.equal(creditNote!.status, 'posted');
  assert.equal(Number(creditNote!.appliedAmount), 400);
  assert.equal(Number(creditNote!.remainingAmount), 150);
  assert.equal(accountingAfterPost.postedJournalCount, 1);
  assert.equal(accountingAfterPost.postedLineCount, 2);
  assert.equal(accountingAfterPost.reversalJournalCount, 0);

  const cancelled = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/cancel`)
    .send({ reason: 'Reverse over-credit correction' })
    .expect(201);

  assert.equal(cancelled.body.success, true);
  const accountingAfterCancel = await getCreditAccountingCounts(prisma, noteId);
  const invoiceAfterCancel = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.equal(Number(invoiceAfterCancel!.outstandingAmount), 400);
  assert.equal(invoiceAfterCancel!.paymentStatus, 'partial_paid');
  assert.equal(invoiceAfterCancel!.status, 'partial_paid');
  assert.equal(accountingAfterCancel.postedJournalCount, 1);
  assert.equal(accountingAfterCancel.postedLineCount, 2);
  assert.equal(accountingAfterCancel.reversalJournalCount, 1);
});

test('Prisma-backed HTTP e2e: over-debit note can push outstanding above invoice grand total', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.invoice,
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

  const invoiceAfterPost = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.equal(Number(invoiceAfterPost!.outstandingAmount), 1100);
  assert.equal(invoiceAfterPost!.paymentStatus, 'unpaid');
  assert.equal(invoiceAfterPost!.status, 'posted');

  const debitNote = await prisma.retailerDebitNote.findFirst({ where: { id: noteId } });
  const accountingAfterPost = await getDebitAccountingCounts(prisma, noteId);
  assert.equal(debitNote!.status, 'posted');
  assert.equal(Number(debitNote!.appliedAmount), 700);
  assert.equal(Number(debitNote!.remainingAmount), 0);
  assert.equal(accountingAfterPost.postedJournalCount, 1);
  assert.equal(accountingAfterPost.postedLineCount, 2);
  assert.equal(accountingAfterPost.reversalJournalCount, 0);

  const cancelled = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'Reverse over-debit correction' })
    .expect(201);

  assert.equal(cancelled.body.success, true);
  const accountingAfterCancel = await getDebitAccountingCounts(prisma, noteId);
  const invoiceAfterCancel = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.equal(Number(invoiceAfterCancel!.outstandingAmount), 400);
  assert.equal(invoiceAfterCancel!.paymentStatus, 'partial_paid');
  assert.equal(invoiceAfterCancel!.status, 'partial_paid');
  assert.equal(accountingAfterCancel.postedJournalCount, 1);
  assert.equal(accountingAfterCancel.postedLineCount, 2);
  assert.equal(accountingAfterCancel.reversalJournalCount, 1);
});

test('Prisma-backed HTTP e2e: credit note create, post, and cancel workflow', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/credit-notes')
    .send({
      partyType: 'retailer',
      partyId: IDS.retailer,
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.invoice,
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
  const invoiceAfterPost = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.equal(Number(invoiceAfterPost!.outstandingAmount), 100);

  const creditNote = await prisma.creditNote.findFirst({ where: { id: noteId } });
  const accountingAfterPost = await getCreditAccountingCounts(prisma, noteId);
  assert.equal(creditNote!.status, 'posted');
  assert.equal(Number(creditNote!.appliedAmount), 300);

  const ledgerEntries = await prisma.retailerLedgerEntry.findMany({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, creditNoteId: noteId },
  });
  assert.equal(ledgerEntries.length, 1);
  assert.equal(accountingAfterPost.postedJournalCount, 1);
  assert.equal(accountingAfterPost.postedLineCount, 2);
  assert.equal(accountingAfterPost.reversalJournalCount, 0);

  const cancelled = await request(app.getHttpServer())
    .post(`/api/v1/credit-notes/${noteId}/cancel`)
    .send({ reason: 'Reverse correction' })
    .expect(201);

  assert.equal(cancelled.body.success, true);
  const accountingAfterCancel = await getCreditAccountingCounts(prisma, noteId);
  const invoiceAfterCancel = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.equal(Number(invoiceAfterCancel!.outstandingAmount), 400);

  const cancelledNote = await prisma.creditNote.findFirst({ where: { id: noteId } });
  assert.equal(cancelledNote!.status, 'cancelled');
  assert.equal(accountingAfterCancel.postedJournalCount, 1);
  assert.equal(accountingAfterCancel.postedLineCount, 2);
  assert.equal(accountingAfterCancel.reversalJournalCount, 1);
});

test('Prisma-backed HTTP e2e: debit note create, post, and cancel workflow', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const created = await request(app.getHttpServer())
    .post('/api/v1/retailer-debit-notes')
    .send({
      retailerId: IDS.retailer,
      relatedInvoiceId: IDS.postedInvoice,
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
  const invoiceAfterPost = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.equal(Number(invoiceAfterPost!.outstandingAmount), 160);
  assert.equal(invoiceAfterPost!.paymentStatus, 'partial_paid');

  const debitNote = await prisma.retailerDebitNote.findFirst({ where: { id: noteId } });
  const accountingAfterPost = await getDebitAccountingCounts(prisma, noteId);
  assert.equal(debitNote!.status, 'posted');
  assert.equal(Number(debitNote!.appliedAmount), 160);

  const ledgerEntries = await prisma.retailerLedgerEntry.findMany({
    where: { organizationId: IDS.org, retailerId: IDS.retailer, debitNoteId: noteId },
  });
  assert.equal(ledgerEntries.length, 1);
  assert.equal(accountingAfterPost.postedJournalCount, 1);
  assert.equal(accountingAfterPost.postedLineCount, 2);
  assert.equal(accountingAfterPost.reversalJournalCount, 0);

  const cancelled = await request(app.getHttpServer())
    .post(`/api/v1/retailer-debit-notes/${noteId}/cancel`)
    .send({ reason: 'Reverse extra charge' })
    .expect(201);

  assert.equal(cancelled.body.success, true);
  const accountingAfterCancel = await getDebitAccountingCounts(prisma, noteId);
  const invoiceAfterCancel = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.equal(Number(invoiceAfterCancel!.outstandingAmount), 0);
  assert.equal(invoiceAfterCancel!.paymentStatus, 'paid');

  const cancelledNote = await prisma.retailerDebitNote.findFirst({ where: { id: noteId } });
  assert.equal(cancelledNote!.status, 'cancelled');
  assert.equal(accountingAfterCancel.postedJournalCount, 1);
  assert.equal(accountingAfterCancel.postedLineCount, 2);
  assert.equal(accountingAfterCancel.reversalJournalCount, 1);
});
