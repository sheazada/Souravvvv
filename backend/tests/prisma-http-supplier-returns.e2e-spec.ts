// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { ReturnsController } from '../src/operations/returns/returns.controller';
import { ReturnsService } from '../src/operations/returns/returns.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedBaseFixture,
} from './helpers/prisma-e2e';

const SRET_IDS = {
  supplier: '82000000-0000-4000-8000-000000000001',
  grn: '82000000-0000-4000-8000-000000000002',
  batch: '82000000-0000-4000-8000-000000000003',
  ret: '82000000-0000-4000-8000-000000000004',
  item: '82000000-0000-4000-8000-000000000005',
  warehouse: '82000000-0000-4000-8000-000000000010',
};

function createRetailerActor() {
  return {
    id: '82000000-0000-4000-8000-000000000099',
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

async function seedSupplierReturnsFixture(prisma: any) {
  await prisma.supplier.create({
    data: {
      id: SRET_IDS.supplier,
      organizationId: IDS.org,
      supplierCode: 'SUP-SRET-01',
      name: 'Sudha Plant Returns Depot',
      contactPerson: 'Returns Mgr',
      mobile: '9696969696',
      paymentTermsDays: 7,
      isActive: true,
    },
  });

  await prisma.warehouse.create({
    data: {
      id: SRET_IDS.warehouse,
      organizationId: IDS.org,
      code: 'WH-SRET-01',
      name: 'Central Returns Storage',
      warehouseType: 'main',
      isActive: true,
    },
  });

  await prisma.goodsReceipt.create({
    data: {
      id: SRET_IDS.grn,
      organizationId: IDS.org,
      grnNo: 'GRN-SRET-001',
      supplierId: SRET_IDS.supplier,
      warehouseId: SRET_IDS.warehouse,
      receiptDate: new Date('2026-07-15T00:00:00.000Z'),
      status: 'posted',
    },
  });

  await prisma.inventoryBatch.create({
    data: {
      id: SRET_IDS.batch,
      organizationId: IDS.org,
      variantId: IDS.variant,
      warehouseId: SRET_IDS.warehouse,
      batchNo: 'BATCH-SRET-001',
      receivedQty: 50,
      availableQty: 40,
      reservedQty: 0,
      damagedQty: 0,
      status: 'active',
    },
  });

  await prisma.supplierReturn.create({
    data: {
      id: SRET_IDS.ret,
      organizationId: IDS.org,
      supplierReturnNo: 'SRET-2026-001',
      supplierId: SRET_IDS.supplier,
      goodsReceiptId: SRET_IDS.grn,
      returnDate: new Date('2026-07-15T00:00:00.000Z'),
      reason: 'Sour milk pouches identified during sorting',
      status: 'draft',
    },
  });

  await prisma.supplierReturnItem.create({
    data: {
      id: SRET_IDS.item,
      organizationId: IDS.org,
      supplierReturnId: SRET_IDS.ret,
      inventoryBatchId: SRET_IDS.batch,
      variantId: IDS.variant,
      returnQty: 10,
      unitCost: 45,
      reason: 'Sour taste',
    },
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);
  await seedSupplierReturnsFixture(prisma);

  return createPrismaBackedApp({
    controllers: [ReturnsController],
    providers: [ReturnsService],
    actor,
  });
}

test('Prisma-backed HTTP e2e: create supplier return saves item breakdown and reason', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/supplier-returns')
    .send({
      supplierReturnNo: 'SRET-2026-002',
      supplierId: SRET_IDS.supplier,
      returnDate: '2026-07-15T00:00:00.000Z',
      reason: 'Leaked pouches',
      items: [
        {
          variantId: IDS.variant,
          inventoryBatchId: SRET_IDS.batch,
          returnQty: 5,
          unitCost: 45,
        },
      ],
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.supplierReturnNo, 'SRET-2026-002');
  assert.equal(response.body.data.status, 'draft');
});

test('Prisma-backed HTTP e2e: approve and post supplier return debits InventoryBatch available stock and records StockMovement', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await request(app.getHttpServer())
    .post(`/api/v1/supplier-returns/${SRET_IDS.ret}/approve`)
    .expect(201);

  const postRes = await request(app.getHttpServer())
    .post(`/api/v1/supplier-returns/${SRET_IDS.ret}/post`)
    .expect(201);

  assert.equal(postRes.body.data.status, 'posted');
  assert.ok(postRes.body.data.debitNoteNo);

  const batch = await prisma.inventoryBatch.findFirst({ where: { id: SRET_IDS.batch } });
  assert.equal(Number(batch.availableQty), 30); // 40 initial available - 10 returned = 30 available

  const movement = await prisma.stockMovement.findFirst({
    where: { referenceId: SRET_IDS.ret, movementType: 'return_out' },
  });
  assert.ok(movement);
  assert.equal(Number(movement.qtyOut), 10);
});

test('Prisma-backed HTTP e2e: retailer actor is forbidden from accessing supplier returns', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await request(app.getHttpServer())
    .get('/api/v1/supplier-returns')
    .expect(403);
});
