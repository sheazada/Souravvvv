// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { DispatchController } from '../src/operations/dispatch/dispatch.controller';
import { DispatchService } from '../src/operations/dispatch/dispatch.service';
import { CreditControlController } from '../src/operations/payments/credit-control.controller';
import { CreditControlService } from '../src/operations/payments/credit-control.service';
import { PaymentMetricsService } from '../src/operations/payments/payment-metrics.service';
import { RetailerFinanceService } from '../src/operations/payments/retailer-finance.service';
import { RetailerLedgerService } from '../src/operations/payments/retailer-ledger.service';
import { SalesInvoicesController } from '../src/operations/sales-invoices/sales-invoices.controller';
import { SalesInvoicesService } from '../src/operations/sales-invoices/sales-invoices.service';
import { SalesOrdersController } from '../src/operations/sales-orders/sales-orders.controller';
import { SalesOrdersService } from '../src/operations/sales-orders/sales-orders.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedCreditOpsFixture,
} from './helpers/prisma-e2e';

async function buildApp(seedOptions?: Parameters<typeof seedCreditOpsFixture>[1]) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedCreditOpsFixture(prisma, seedOptions);

  return createPrismaBackedApp({
    controllers: [CreditControlController, SalesOrdersController, DispatchController, SalesInvoicesController],
    providers: [
      CreditControlService,
      PaymentMetricsService,
      RetailerFinanceService,
      RetailerLedgerService,
      SalesOrdersService,
      DispatchService,
      SalesInvoicesService,
    ],
  });
}

test('Prisma-backed HTTP e2e: assisted order approval blocked without override', async (t) => {
  const { app, prisma } = await buildApp({
    creditLimit: 1000,
    currentOutstanding: 950,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
  });
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-orders/${IDS.order}/approve`)
    .send({ note: 'Approve assisted order' })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Credit approval required/);

  const order = await prisma.salesOrder.findFirst({ where: { id: IDS.order } });
  assert.equal(order!.status, 'pending');
});

test('Prisma-backed HTTP e2e: dispatch start blocked by overdue credit policy', async (t) => {
  const { app, prisma } = await buildApp({
    creditLimit: 5000,
    currentOutstanding: 1000,
    overdueAmount: 600,
    managerApprovalRequired: false,
    allowDispatchWithOverdue: false,
    blockOrdersOnLimitExceed: false,
  });
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await prisma.salesOrder.update({
    where: { id: IDS.order },
    data: { status: 'approved', approvedByUserId: IDS.user, approvedAt: new Date() },
  });
  await prisma.salesOrderItem.update({ where: { id: IDS.orderItem }, data: { approvedQty: 10 } });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/dispatch-trips/${IDS.trip}/start`)
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Credit policy blocked action|Credit approval required/);

  const trip = await prisma.dispatchTrip.findFirst({ where: { id: IDS.trip } });
  assert.equal(trip!.status, 'loaded');
});

test('Prisma-backed HTTP e2e: invoice generation blocked by credit policy without override', async (t) => {
  const { app, prisma } = await buildApp({
    creditLimit: 1000,
    currentOutstanding: 950,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
  });
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await prisma.salesOrder.update({
    where: { id: IDS.order },
    data: { status: 'approved', approvedByUserId: IDS.user, approvedAt: new Date() },
  });
  await prisma.salesOrderItem.update({ where: { id: IDS.orderItem }, data: { approvedQty: 10 } });

  const response = await request(app.getHttpServer())
    .post('/api/v1/sales-invoices/generate')
    .send({
      retailerId: IDS.retailer,
      salesOrderId: IDS.order,
      source: 'assisted_billing',
    })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Credit approval required/);

  const count = await prisma.salesInvoice.count({ where: { salesOrderId: IDS.order } });
  assert.equal(count, 0);
});

test('Prisma-backed HTTP e2e: successful override then approval, dispatch, and invoice generation path works', async (t) => {
  const { app, prisma } = await buildApp({
    creditLimit: 1000,
    currentOutstanding: 950,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
  });
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const override = await request(app.getHttpServer())
    .post(`/api/v1/retailers/${IDS.retailer}/credit-overrides`)
    .send({
      salesOrderId: IDS.order,
      overrideType: 'credit_limit_exceed',
      requestedAmount: 1000,
      approvedAmount: 1000,
      reason: 'Manager approved extra temporary credit',
    })
    .expect(201);

  assert.equal(override.body.success, true);

  const approved = await request(app.getHttpServer())
    .post(`/api/v1/sales-orders/${IDS.order}/approve`)
    .send({ note: 'Approve with override' })
    .expect(201);
  assert.equal(approved.body.success, true);

  const started = await request(app.getHttpServer())
    .post(`/api/v1/dispatch-trips/${IDS.trip}/start`)
    .expect(201);
  assert.equal(started.body.success, true);

  const invoice = await request(app.getHttpServer())
    .post('/api/v1/sales-invoices/generate')
    .send({
      retailerId: IDS.retailer,
      salesOrderId: IDS.order,
      source: 'assisted_billing',
    })
    .expect(201);
  assert.equal(invoice.body.success, true);

  const order = await prisma.salesOrder.findFirst({ where: { id: IDS.order } });
  const trip = await prisma.dispatchTrip.findFirst({ where: { id: IDS.trip } });
  const invoiceRow = await prisma.salesInvoice.findFirst({ where: { salesOrderId: IDS.order } });

  assert.equal(order!.status, 'dispatched');
  assert.equal(trip!.status, 'dispatched');
  assert.ok(invoiceRow);
  assert.equal(invoiceRow!.retailerId, IDS.retailer);
  assert.equal(invoiceRow!.paymentStatus, 'unpaid');
});
