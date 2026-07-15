// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { CreditControlService } from '../src/operations/payments/credit-control.service';
import { PaymentMetricsService } from '../src/operations/payments/payment-metrics.service';
import { RetailerFinanceService } from '../src/operations/payments/retailer-finance.service';
import { RetailerLedgerService } from '../src/operations/payments/retailer-ledger.service';
import { SalesInvoicesController } from '../src/operations/sales-invoices/sales-invoices.controller';
import { SalesInvoicesService } from '../src/operations/sales-invoices/sales-invoices.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedInvoiceRevisionFixture,
} from './helpers/prisma-e2e';

async function buildApp() {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedInvoiceRevisionFixture(prisma);

  return createPrismaBackedApp({
    controllers: [SalesInvoicesController],
    providers: [
      CreditControlService,
      PaymentMetricsService,
      RetailerFinanceService,
      RetailerLedgerService,
      SalesInvoicesService,
    ],
  });
}

test('Prisma-backed HTTP e2e: draft invoice can be updated', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/sales-invoices/${IDS.draftInvoice}`)
    .send({
      remarks: 'Retailer accepted less items',
      items: [
        { variantId: IDS.variant, billedQty: 7, unitPrice: 80 },
        { variantId: IDS.variant2, billedQty: 5, unitPrice: 80 },
      ],
    })
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.grandTotal, 960);
  assert.equal(response.body.data.remarks, 'Retailer accepted less items');

  const invoice = await prisma.salesInvoice.findFirst({ where: { id: IDS.draftInvoice } });
  assert.ok(invoice);
  assert.equal(Number(invoice!.grandTotal), 960);
  assert.equal(Number(invoice!.outstandingAmount), 960);

  const items = await prisma.salesInvoiceItem.findMany({ where: { salesInvoiceId: IDS.draftInvoice } });
  assert.equal(items.length, 2);
});

test('Prisma-backed HTTP e2e: draft invoice can be deleted', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.draftInvoice}/delete-draft`)
    .send({ reason: 'Wrong draft before final delivery confirmation' })
    .expect(201);

  assert.equal(response.body.success, true);

  const invoice = await prisma.salesInvoice.findFirst({ where: { id: IDS.draftInvoice } });
  assert.equal(invoice, null);

  const items = await prisma.salesInvoiceItem.findMany({ where: { salesInvoiceId: IDS.draftInvoice } });
  assert.equal(items.length, 0);
});

test('Prisma-backed HTTP e2e: posted unpaid invoice revision preview returns replacement flow', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/revision-preview`)
    .send({
      revisionMode: 'manual',
      reason: 'Retailer accepted only 15',
      items: [{ variantId: IDS.variant, billedQty: 15, unitPrice: 80 }],
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.financialAction, 'cancel_and_regenerate');
  assert.equal(response.body.data.revisedGrandTotal, 1200);
  assert.equal(response.body.data.deltaAmount, -400);
});

test('Prisma-backed HTTP e2e: posted unpaid invoice can be revised into replacement invoice', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/revise`)
    .send({
      revisionMode: 'manual',
      reason: 'Retailer accepted only 15',
      items: [{ variantId: IDS.variant, billedQty: 15, unitPrice: 80 }],
    })
    .expect(201);

  assert.equal(response.body.success, true);

  const original = await prisma.salesInvoice.findFirst({ where: { id: IDS.postedInvoice } });
  assert.ok(original);
  assert.equal(original!.status, 'cancelled');
  assert.equal(Number(original!.outstandingAmount), 0);

  const replacement = await prisma.salesInvoice.findFirst({
    where: { id: response.body.data.replacementInvoiceId },
  });
  assert.ok(replacement);
  assert.equal(replacement!.invoiceNo, 'INV-POSTED-001-R1');
  assert.equal(replacement!.status, 'posted');
  assert.equal(replacement!.paymentStatus, 'unpaid');
  assert.equal(Number(replacement!.grandTotal), 1200);

  const replacementItems = await prisma.salesInvoiceItem.findMany({ where: { salesInvoiceId: replacement!.id } });
  assert.equal(replacementItems.length, 1);
  assert.equal(Number(replacementItems[0].billedQty), 15);

  const ledgerEntries = await prisma.retailerLedgerEntry.findMany({ where: { retailerId: IDS.retailer } });
  assert.ok(ledgerEntries.length >= 2);
});

test('Prisma-backed HTTP e2e: revision history includes original and replacement invoices', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const revise = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/revise`)
    .send({
      revisionMode: 'manual',
      reason: 'Retailer accepted only 15',
      items: [{ variantId: IDS.variant, billedQty: 15, unitPrice: 80 }],
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

test('Prisma-backed HTTP e2e: revise endpoint returns 409 for partial-paid invoice', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await prisma.salesInvoice.update({
    where: { id: IDS.postedInvoice },
    data: {
      status: 'posted',
      paymentStatus: 'partial_paid',
      outstandingAmount: 800,
    },
  });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/revise`)
    .send({
      revisionMode: 'manual',
      reason: 'Retailer accepted only 15',
      items: [{ variantId: IDS.variant, billedQty: 15, unitPrice: 80 }],
    })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Invoice with payment activity must use note-based adjustment flow/);
});

test('Prisma-backed HTTP e2e: cancel-and-regenerate endpoint returns 409 for partial-paid invoice', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await prisma.salesInvoice.update({
    where: { id: IDS.postedInvoice },
    data: {
      status: 'posted',
      paymentStatus: 'partial_paid',
      outstandingAmount: 800,
    },
  });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/cancel-and-regenerate`)
    .send({
      reason: 'Cancel and regenerate after partial payment',
      source: 'manual',
      items: [{ variantId: IDS.variant, billedQty: 15, unitPrice: 80 }],
    })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Invoice with payment activity must use note-based adjustment flow/);
});

test('Prisma-backed HTTP e2e: cancel-and-regenerate endpoint returns 409 for paid invoice', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await prisma.salesInvoice.update({
    where: { id: IDS.postedInvoice },
    data: {
      status: 'paid',
      paymentStatus: 'paid',
      outstandingAmount: 0,
      paidAt: new Date('2026-07-10T12:00:00.000Z'),
    },
  });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-invoices/${IDS.postedInvoice}/cancel-and-regenerate`)
    .send({
      reason: 'Cancel and regenerate after payment',
      source: 'manual',
      items: [{ variantId: IDS.variant, billedQty: 15, unitPrice: 80 }],
    })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Invoice with payment activity must use note-based adjustment flow/);
});

test('Prisma-backed HTTP e2e: recompute endpoint returns 409 for paid invoice', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await prisma.salesInvoice.update({
    where: { id: IDS.postedInvoice },
    data: {
      status: 'paid',
      paymentStatus: 'paid',
      outstandingAmount: 0,
      paidAt: new Date('2026-07-10T12:00:00.000Z'),
    },
  });

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
