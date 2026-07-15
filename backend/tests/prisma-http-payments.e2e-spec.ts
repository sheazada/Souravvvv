// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import request = require('supertest');
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
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedPaymentsFixture,
} from './helpers/prisma-e2e';

async function buildApp() {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedPaymentsFixture(prisma);

  return createPrismaBackedApp({
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
    ],
  });
}

test('Prisma-backed HTTP e2e: payment intent -> webhook -> receipt -> ledger -> wallet -> metrics chain', async (t) => {
  process.env.PAYMENT_GATEWAY_RAZORPAY_WEBHOOK_SECRET = 'prisma-e2e-secret';
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const createIntent = await request(app.getHttpServer())
    .post('/api/v1/payment-intents')
    .send({
      retailerId: IDS.retailer,
      paymentContext: 'custom_amount',
      amount: 1000,
      gatewayName: 'razorpay',
      allocationMode: 'manual',
      selectedInvoices: [{ invoiceId: IDS.invoice, targetAmount: 800 }],
      remarks: 'Prisma-backed payment intent',
    })
    .expect(201);

  assert.equal(createIntent.body.success, true);
  const intentId = createIntent.body.data.id;
  const gatewayOrderId = createIntent.body.data.gatewayOrderId;

  const payload = {
    event: 'payment.captured',
    status: 'captured',
    order_id: gatewayOrderId,
    payment_id: 'pay_prisma_e2e',
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

  const receipt = await prisma.paymentReceipt.findFirst({
    where: { organizationId: IDS.org, paymentIntentId: intentId },
  });
  assert.ok(receipt);
  assert.equal(receipt!.status, 'confirmed');
  assert.equal(Number(receipt!.amount), 1000);
  assert.equal(Number(receipt!.unallocatedAmount), 200);

  const allocation = await prisma.paymentAllocation.findFirst({
    where: { organizationId: IDS.org, paymentReceiptId: receipt!.id },
  });
  assert.ok(allocation);
  assert.equal(allocation!.salesInvoiceId, IDS.invoice);
  assert.equal(Number(allocation!.allocatedAmount), 800);

  const invoice = await prisma.salesInvoice.findFirst({ where: { id: IDS.invoice } });
  assert.ok(invoice);
  assert.equal(Number(invoice!.outstandingAmount), 0);
  assert.equal(invoice!.paymentStatus, 'paid');

  const wallet = await prisma.retailerAdvanceWallet.findFirst({
    where: { organizationId: IDS.org, retailerId: IDS.retailer },
  });
  assert.ok(wallet);
  assert.equal(Number(wallet!.availableBalance), 200);

  const walletTxn = await prisma.retailerWalletTransaction.findFirst({
    where: {
      organizationId: IDS.org,
      referenceType: 'payment_receipt',
      referenceId: receipt!.id,
    },
  });
  assert.ok(walletTxn);
  assert.equal(Number(walletTxn!.creditAmount), 200);

  const ledger = await prisma.retailerLedgerEntry.findFirst({
    where: {
      organizationId: IDS.org,
      paymentReceiptId: receipt!.id,
    },
  });
  assert.ok(ledger);
  assert.equal(ledger!.transactionType, 'payment_receipt');
  assert.equal(Number(ledger!.creditAmount), 1000);

  const metric = await prisma.retailerPaymentMetric.findFirst({
    where: { organizationId: IDS.org, retailerId: IDS.retailer },
  });
  assert.ok(metric);
  assert.equal(Number(metric!.currentOutstanding), 0);

  const profile = await prisma.retailerCreditProfile.findFirst({
    where: { organizationId: IDS.org, retailerId: IDS.retailer },
  });
  assert.ok(profile);
  assert.equal(Number(profile!.usedCredit), 0);
  assert.equal(Number(profile!.availableCredit), 5000);

  const reconciliation = await request(app.getHttpServer())
    .get(`/api/v1/payment-intents/${intentId}/reconciliation-status`)
    .expect(200);
  assert.equal(reconciliation.body.data.receipts.length, 1);

  const walletApi = await request(app.getHttpServer())
    .get(`/api/v1/retailers/${IDS.retailer}/advance-wallet`)
    .expect(200);
  assert.equal(walletApi.body.data.availableBalance, 200);

  const summaryApi = await request(app.getHttpServer())
    .get(`/api/v1/retailers/${IDS.retailer}/financial-summary`)
    .expect(200);
  assert.equal(summaryApi.body.data.currentOutstanding, 0);

  const ledgerApi = await request(app.getHttpServer())
    .get(`/api/v1/retailers/${IDS.retailer}/ledger-entries?limit=10`)
    .expect(200);
  assert.equal(ledgerApi.body.data.length, 1);
});

