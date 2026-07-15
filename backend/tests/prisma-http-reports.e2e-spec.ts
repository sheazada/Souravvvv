// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { ReportsController } from '../src/finance/reports/reports.controller';
import { ReportsService } from '../src/finance/reports/reports.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedBaseFixture,
} from './helpers/prisma-e2e';

const REPORT_IDS = {
  supplier: '77000000-0000-4000-8000-000000000001',
  po: '77000000-0000-4000-8000-000000000002',
  poItem: '77000000-0000-4000-8000-000000000003',
  trip: '77000000-0000-4000-8000-000000000004',
  titem: '77000000-0000-4000-8000-000000000005',
  stop: '77000000-0000-4000-8000-000000000006',
  invoice: '77000000-0000-4000-8000-000000000007',
  receipt: '77000000-0000-4000-8000-000000000008',
  crate: '77000000-0000-4000-8000-000000000009',
  warehouse: '77000000-0000-4000-8000-000000000010',
  crateType: '77000000-0000-4000-8000-000000000011',
};

function createRetailerActor() {
  return {
    id: '77000000-0000-4000-8000-000000000099',
    organizationId: IDS.org,
    retailerId: IDS.retailer,
    employeeId: null,
    fullName: 'Retailer User',
    mobile: '8888800000',
    userType: 'retailer_user',
    roles: ['RETAILER'],
    permissions: [],
  };
}

async function seedReportsFixture(prisma: any) {
  const today = new Date('2026-07-15T10:00:00.000Z');

  await prisma.supplier.create({
    data: {
      id: REPORT_IDS.supplier,
      organizationId: IDS.org,
      supplierCode: 'SUP-REP-01',
      name: 'Sudha Dairy Patna Plant',
      contactPerson: 'Depot Manager',
      mobile: '9292929292',
      paymentTermsDays: 7,
      isActive: true,
    },
  });

  await prisma.warehouse.create({
    data: {
      id: REPORT_IDS.warehouse,
      organizationId: IDS.org,
      code: 'WH-REP-01',
      name: 'Reports Depot',
      warehouseType: 'main',
      isActive: true,
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      id: REPORT_IDS.po,
      organizationId: IDS.org,
      poNo: 'PO-REP-001',
      supplierId: REPORT_IDS.supplier,
      poDate: today,
      status: 'approved',
      subtotal: 5000,
      taxTotal: 250,
      grandTotal: 5250,
    },
  });

  await prisma.purchaseOrderItem.create({
    data: {
      id: REPORT_IDS.poItem,
      organizationId: IDS.org,
      purchaseOrderId: REPORT_IDS.po,
      variantId: IDS.variant,
      orderedQty: 100,
      demandQty: 100,
      extraQty: 0,
      unitCost: 50,
      taxRate: 5,
      taxAmount: 250,
      lineTotal: 5250,
    },
  });

  await prisma.dispatchTrip.create({
    data: {
      id: REPORT_IDS.trip,
      organizationId: IDS.org,
      tripNo: 'TRIP-REP-001',
      routeId: IDS.route,
      deliveryCycleId: IDS.cycle,
      dispatchDate: today,
      status: 'loaded',
    },
  });

  await prisma.dispatchTripItem.create({
    data: {
      id: REPORT_IDS.titem,
      organizationId: IDS.org,
      dispatchTripId: REPORT_IDS.trip,
      variantId: IDS.variant,
      sourceWarehouseId: REPORT_IDS.warehouse,
      plannedQty: 100,
      loadedQty: 100,
    },
  });

  await prisma.deliveryStop.create({
    data: {
      id: REPORT_IDS.stop,
      organizationId: IDS.org,
      dispatchTripId: REPORT_IDS.trip,
      retailerId: IDS.retailer,
      stopSequence: 1,
      status: 'delivered',
    },
  });

  await prisma.salesInvoice.create({
    data: {
      id: REPORT_IDS.invoice,
      organizationId: IDS.org,
      invoiceNo: 'INV-REP-001',
      retailerId: IDS.retailer,
      invoiceDate: today,
      dueDate: new Date('2026-07-22T00:00:00.000Z'),
      source: 'assisted_billing',
      status: 'posted',
      paymentStatus: 'unpaid',
      subtotal: 6000,
      taxTotal: 300,
      grandTotal: 6300,
      outstandingAmount: 6300,
    },
  });

  await prisma.paymentReceipt.create({
    data: {
      id: REPORT_IDS.receipt,
      organizationId: IDS.org,
      receiptNo: 'REC-REP-001',
      partyType: 'retailer',
      partyId: IDS.retailer,
      paymentDirection: 'inbound',
      paymentDate: today,
      paymentMode: 'cash',
      amount: 1500,
      status: 'confirmed',
    },
  });

  await prisma.crateType.create({
    data: {
      id: REPORT_IDS.crateType,
      organizationId: IDS.org,
      code: 'CR-REP-24',
      name: '24 Bottle Crate',
      isActive: true,
    },
  });

  await prisma.crateTransaction.create({
    data: {
      id: REPORT_IDS.crate,
      organizationId: IDS.org,
      crateTypeId: REPORT_IDS.crateType,
      retailerId: IDS.retailer,
      transactionType: 'issue',
      quantity: 25,
      transactionDate: today,
    },
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);
  await seedReportsFixture(prisma);

  return createPrismaBackedApp({
    controllers: [ReportsController],
    providers: [ReportsService],
    actor,
  });
}

test('Prisma-backed HTTP e2e: daily-purchase report returns procurement metrics from Sudha plant', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/reports/daily-purchase?fromDate=2026-07-15&toDate=2026-07-15')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].poNo, 'PO-REP-001');
  assert.equal(Number(response.body.data[0].orderedQty), 100);
  assert.equal(response.body.data[0].supplier.name, 'Sudha Dairy Patna Plant');
});

test('Prisma-backed HTTP e2e: daily-dispatch report aggregates planned vs loaded quantities and stop statuses', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/reports/daily-dispatch?fromDate=2026-07-15&toDate=2026-07-15')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].tripNo, 'TRIP-REP-001');
  assert.equal(Number(response.body.data[0].plannedQty), 100);
  assert.equal(Number(response.body.data[0].loadedQty), 100);
  assert.equal(response.body.data[0].stopSummary.totalStops, 1);
  assert.equal(response.body.data[0].stopSummary.delivered, 1);
});

test('Prisma-backed HTTP e2e: collection report groups receipts by mode and returns grand collection total', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/reports/collection?fromDate=2026-07-15&toDate=2026-07-15')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(Number(response.body.data.totalAmount), 1500);
  assert.equal(response.body.data.receiptCount, 1);
  assert.equal(response.body.data.byMode[0].paymentMode, 'cash');
  assert.equal(Number(response.body.data.byMode[0].amount), 1500);
});

test('Prisma-backed HTTP e2e: outstanding report lists open invoices with live shop details', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/reports/outstanding')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(Number(response.body.data.totalOutstanding), 6300);
  assert.equal(response.body.data.rows.length, 1);
  assert.equal(response.body.data.rows[0].invoiceNo, 'INV-REP-001');
});

test('Prisma-backed HTTP e2e: profit report calculates net margin across sales, purchases, and expenses', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/reports/profit?fromDate=2026-07-15&toDate=2026-07-15')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(Number(response.body.data.grossSales), 6300);
  assert.equal(Number(response.body.data.purchaseCost), 0);
  assert.equal(Number(response.body.data.netProfit), 6300);
});

test('Prisma-backed HTTP e2e: crate report summarizes container transactions by retailer and crate type', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/reports/crate?fromDate=2026-07-15&toDate=2026-07-15')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].transactionType, 'issue');
  assert.equal(Number(response.body.data[0].quantity), 25);
});

test('Prisma-backed HTTP e2e: monthly-business-summary aggregates multi-month order, invoice, and collection totals', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/reports/monthly-business-summary')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.ok(response.body.data.length >= 1);
});

test('Prisma-backed HTTP e2e: retailer actor is forbidden from accessing backoffice analytical reports', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await request(app.getHttpServer())
    .get('/api/v1/reports/daily-purchase')
    .expect(403);
});
