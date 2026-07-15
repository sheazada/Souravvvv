// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { GoodsReceiptsController } from '../src/operations/goods-receipts/goods-receipts.controller';
import { GoodsReceiptsService } from '../src/operations/goods-receipts/goods-receipts.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedBaseFixture,
} from './helpers/prisma-e2e';

const GRN_IDS = {
  supplier: '76000000-0000-4000-8000-000000000001',
  warehouse: '76000000-0000-4000-8000-000000000002',
  po: '76000000-0000-4000-8000-000000000003',
  poItem: '76000000-0000-4000-8000-000000000004',
  grn: '76000000-0000-4000-8000-000000000005',
};

function createRetailerActor() {
  return {
    id: '76000000-0000-4000-8000-000000000099',
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

async function seedGrnFixture(prisma: any) {
  await prisma.supplier.create({
    data: {
      id: GRN_IDS.supplier,
      organizationId: IDS.org,
      supplierCode: 'SUP-GRN-01',
      name: 'Sudha Plant Depot',
      contactPerson: 'Manager',
      mobile: '9191919191',
      paymentTermsDays: 7,
      isActive: true,
    },
  });

  await prisma.warehouse.create({
    data: {
      id: GRN_IDS.warehouse,
      organizationId: IDS.org,
      code: 'WH-GRN-01',
      name: 'Central Dairy Storage',
      warehouseType: 'main',
      isActive: true,
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      id: GRN_IDS.po,
      organizationId: IDS.org,
      poNo: 'PO-GRN-001',
      supplierId: GRN_IDS.supplier,
      poDate: new Date('2026-07-14T00:00:00.000Z'),
      status: 'approved',
      subtotal: 4500,
      taxTotal: 0,
      grandTotal: 4500,
    },
  });

  await prisma.purchaseOrderItem.create({
    data: {
      id: GRN_IDS.poItem,
      organizationId: IDS.org,
      purchaseOrderId: GRN_IDS.po,
      variantId: IDS.variant,
      orderedQty: 100,
      demandQty: 100,
      extraQty: 0,
      unitCost: 45,
      taxRate: 0,
      taxAmount: 0,
      lineTotal: 4500,
    },
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);
  await seedGrnFixture(prisma);

  return createPrismaBackedApp({
    controllers: [GoodsReceiptsController],
    providers: [GoodsReceiptsService],
    actor,
  });
}

test('Prisma-backed HTTP e2e: create goods receipt compares received vs ordered PO quantity and calculates shortage', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/goods-receipts')
    .send({
      supplierId: GRN_IDS.supplier,
      warehouseId: GRN_IDS.warehouse,
      purchaseOrderId: GRN_IDS.po,
      receiptDate: '2026-07-15T00:00:00.000Z',
      supplierChallanNo: 'CHL-SUDHA-101',
      vehicleNo: 'BR-01-AB-1234',
      items: [
        {
          variantId: IDS.variant,
          purchaseOrderItemId: GRN_IDS.poItem,
          orderedQty: 100,
          receivedQty: 95,
          acceptedQty: 90,
          rejectedQty: 5,
          batchNo: 'BATCH-SUDHA-101',
          manufacturingDate: '2026-07-14T00:00:00.000Z',
          expiryDate: '2026-07-20T00:00:00.000Z',
          unitCost: 45,
          remarks: '5 pouches leaked in transit',
        },
      ],
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, 'draft');
  assert.equal(response.body.data.items.length, 1);
  assert.equal(Number(response.body.data.items[0].shortQty), 5); // 100 ordered vs 95 received = 5 short
  assert.equal(Number(response.body.data.items[0].excessQty), 0);
  assert.equal(Number(response.body.data.items[0].rejectedQty), 5);
});

test('Prisma-backed HTTP e2e: get comparison endpoint aggregates GRN item variances and totals', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const createRes = await request(app.getHttpServer())
    .post('/api/v1/goods-receipts')
    .send({
      supplierId: GRN_IDS.supplier,
      warehouseId: GRN_IDS.warehouse,
      purchaseOrderId: GRN_IDS.po,
      receiptDate: '2026-07-15T00:00:00.000Z',
      items: [
        {
          variantId: IDS.variant,
          purchaseOrderItemId: GRN_IDS.poItem,
          orderedQty: 100,
          receivedQty: 95,
          acceptedQty: 90,
          rejectedQty: 5,
          batchNo: 'BATCH-SUDHA-102',
          expiryDate: '2026-07-20T00:00:00.000Z',
          unitCost: 45,
        },
      ],
    })
    .expect(201);

  const grnId = createRes.body.data.id;

  const comparison = await request(app.getHttpServer())
    .get(`/api/v1/goods-receipts/${grnId}/comparison`)
    .expect(200);

  assert.equal(comparison.body.success, true);
  assert.equal(comparison.body.data.totals.orderedQty, 100);
  assert.equal(comparison.body.data.totals.receivedQty, 95);
  assert.equal(comparison.body.data.totals.acceptedQty, 90);
  assert.equal(comparison.body.data.totals.rejectedQty, 5);
  assert.equal(comparison.body.data.totals.shortQty, 5);
  assert.equal(comparison.body.data.totals.excessQty, 0);
});

test('Prisma-backed HTTP e2e: approve and post GRN creates inventory batch, records stock movement, and updates PO receipt status', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const createRes = await request(app.getHttpServer())
    .post('/api/v1/goods-receipts')
    .send({
      supplierId: GRN_IDS.supplier,
      warehouseId: GRN_IDS.warehouse,
      purchaseOrderId: GRN_IDS.po,
      receiptDate: '2026-07-15T00:00:00.000Z',
      items: [
        {
          variantId: IDS.variant,
          purchaseOrderItemId: GRN_IDS.poItem,
          orderedQty: 100,
          receivedQty: 95,
          acceptedQty: 90,
          rejectedQty: 5,
          batchNo: 'BATCH-SUDHA-103',
          expiryDate: '2026-07-20T00:00:00.000Z',
          unitCost: 45,
        },
      ],
    })
    .expect(201);

  const grnId = createRes.body.data.id;

  await request(app.getHttpServer())
    .post(`/api/v1/goods-receipts/${grnId}/approve`)
    .expect(201);

  const postRes = await request(app.getHttpServer())
    .post(`/api/v1/goods-receipts/${grnId}/post`)
    .expect(201);

  assert.equal(postRes.body.data.status, 'posted');

  const batch = await prisma.inventoryBatch.findFirst({
    where: { batchNo: 'BATCH-SUDHA-103', warehouseId: GRN_IDS.warehouse },
  });
  assert.ok(batch);
  assert.equal(Number(batch.availableQty), 90);

  const movement = await prisma.stockMovement.findFirst({
    where: { referenceId: grnId, movementType: 'grn_in' },
  });
  assert.ok(movement);
  assert.equal(Number(movement.qtyIn), 90);

  const po = await prisma.purchaseOrder.findFirst({ where: { id: GRN_IDS.po } });
  assert.equal(po.status, 'partial'); // 90 accepted < 100 ordered -> partial PO status
});

test('Prisma-backed HTTP e2e: retailer actor is forbidden from accessing goods receipt endpoints', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await request(app.getHttpServer())
    .get('/api/v1/goods-receipts')
    .expect(403);
});
