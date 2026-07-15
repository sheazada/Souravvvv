// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { PurchaseOrdersController } from '../src/operations/purchase-orders/purchase-orders.controller';
import { PurchaseOrdersService } from '../src/operations/purchase-orders/purchase-orders.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedBaseFixture,
} from './helpers/prisma-e2e';

const MASTER_IDS = {
  supplier: '75000000-0000-4000-8000-000000000001',
  demand1: '75000000-0000-4000-8000-000000000002',
  demand2: '75000000-0000-4000-8000-000000000003',
  po1: '75000000-0000-4000-8000-000000000004',
  po2: '75000000-0000-4000-8000-000000000005',
  po3: '75000000-0000-4000-8000-000000000006',
  po1Item: '75000000-0000-4000-8000-000000000007',
  po2Item: '75000000-0000-4000-8000-000000000008',
  po3Item: '75000000-0000-4000-8000-000000000009',
  recentAudit: '75000000-0000-4000-8000-000000000010',
  oldAudit: '75000000-0000-4000-8000-000000000011',
};

function createRetailerActor(retailerId = IDS.retailer) {
  return {
    id: '75000000-0000-4000-8000-000000000099',
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

async function seedPurchaseOrderAuditFixture(prisma: any) {
  const now = Date.now();
  const recentChangedAt = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const oldChangedAt = new Date(now - 14 * 24 * 60 * 60 * 1000);

  await prisma.supplier.create({
    data: {
      id: MASTER_IDS.supplier,
      organizationId: IDS.org,
      supplierCode: 'SUP-001',
      name: 'Sudha Dairy',
      contactPerson: 'Ravi Supplier',
      mobile: '9090909090',
      paymentTermsDays: 7,
      isActive: true,
    },
  });

  await prisma.demandConsolidation.createMany({
    data: [
      {
        id: MASTER_IDS.demand1,
        organizationId: IDS.org,
        consolidationNo: 'DCON-001',
        deliveryCycleId: IDS.cycle,
        consolidationDate: new Date('2026-07-15T00:00:00.000Z'),
        status: 'approved',
        createdByUserId: IDS.user,
      },
      {
        id: MASTER_IDS.demand2,
        organizationId: IDS.org,
        consolidationNo: 'DCON-002',
        deliveryCycleId: IDS.cycle,
        consolidationDate: new Date('2026-07-14T00:00:00.000Z'),
        status: 'approved',
        createdByUserId: IDS.user,
      },
    ],
  });

  await prisma.purchaseOrder.createMany({
    data: [
      {
        id: MASTER_IDS.po1,
        organizationId: IDS.org,
        poNo: 'PO-001',
        supplierId: MASTER_IDS.supplier,
        demandConsolidationId: MASTER_IDS.demand1,
        poDate: new Date('2026-07-15T00:00:00.000Z'),
        expectedReceiptDate: new Date('2026-07-16T00:00:00.000Z'),
        status: 'draft',
        subtotal: 500,
        taxTotal: 25,
        grandTotal: 525,
        remarks: 'Demand generated PO with recent extra edit',
      },
      {
        id: MASTER_IDS.po2,
        organizationId: IDS.org,
        poNo: 'PO-002',
        supplierId: MASTER_IDS.supplier,
        demandConsolidationId: MASTER_IDS.demand2,
        poDate: new Date('2026-07-14T00:00:00.000Z'),
        expectedReceiptDate: new Date('2026-07-17T00:00:00.000Z'),
        status: 'draft',
        subtotal: 330,
        taxTotal: 16.5,
        grandTotal: 346.5,
        remarks: 'Demand generated PO with old extra edit',
      },
      {
        id: MASTER_IDS.po3,
        organizationId: IDS.org,
        poNo: 'PO-003',
        supplierId: MASTER_IDS.supplier,
        demandConsolidationId: null,
        poDate: new Date('2026-07-13T00:00:00.000Z'),
        expectedReceiptDate: null,
        status: 'draft',
        subtotal: 100,
        taxTotal: 5,
        grandTotal: 105,
        remarks: 'Manual PO with no extra edit history',
      },
    ],
  });

  await prisma.purchaseOrderItem.createMany({
    data: [
      {
        id: MASTER_IDS.po1Item,
        organizationId: IDS.org,
        purchaseOrderId: MASTER_IDS.po1,
        variantId: IDS.variant,
        orderedQty: 25,
        demandQty: 20,
        extraQty: 5,
        unitCost: 20,
        taxRate: 5,
        taxAmount: 25,
        lineTotal: 525,
      },
      {
        id: MASTER_IDS.po2Item,
        organizationId: IDS.org,
        purchaseOrderId: MASTER_IDS.po2,
        variantId: IDS.variant2,
        orderedQty: 13,
        demandQty: 10,
        extraQty: 3,
        unitCost: 25,
        taxRate: 5,
        taxAmount: 16.5,
        lineTotal: 341.5,
      },
      {
        id: MASTER_IDS.po3Item,
        organizationId: IDS.org,
        purchaseOrderId: MASTER_IDS.po3,
        variantId: IDS.variant,
        orderedQty: 5,
        demandQty: 0,
        extraQty: 0,
        unitCost: 20,
        taxRate: 5,
        taxAmount: 5,
        lineTotal: 105,
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      id: MASTER_IDS.recentAudit,
      organizationId: IDS.org,
      userId: IDS.user,
      module: 'procurement',
      entityType: 'purchase_order',
      entityId: MASTER_IDS.po1,
      action: 'update_demand_extras',
      beforeJson: {
        items: [{ variantId: IDS.variant, demandQty: 20, extraQty: 2, orderedQty: 22 }],
      },
      afterJson: {
        items: [{ variantId: IDS.variant, demandQty: 20, extraQty: 5, orderedQty: 25 }],
      },
      createdAt: recentChangedAt,
    },
  });

  await prisma.auditLog.create({
    data: {
      id: MASTER_IDS.oldAudit,
      organizationId: IDS.org,
      userId: IDS.user,
      module: 'procurement',
      entityType: 'purchase_order',
      entityId: MASTER_IDS.po2,
      action: 'update_demand_extras',
      beforeJson: {
        items: [{ variantId: IDS.variant2, demandQty: 10, extraQty: 1, orderedQty: 11 }],
      },
      afterJson: {
        items: [{ variantId: IDS.variant2, demandQty: 10, extraQty: 3, orderedQty: 13 }],
      },
      createdAt: oldChangedAt,
    },
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);
  await seedPurchaseOrderAuditFixture(prisma);

  return createPrismaBackedApp({
    controllers: [PurchaseOrdersController],
    providers: [PurchaseOrdersService],
    actor,
  });
}

test('Prisma-backed HTTP e2e: purchase orders filter recently_changed returns only recently edited demand-generated POs', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/purchase-orders?extraQtyAuditState=recently_changed')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].id, MASTER_IDS.po1);
  assert.equal(response.body.data[0].demandConsolidation.consolidationNo, 'DCON-001');
  assert.equal(response.body.data[0].latestDemandExtraAudit.changedBy.fullName, 'Owner User');
  assert.equal(response.body.data[0].latestDemandExtraAudit.changedItemCount, 1);
  assert.equal(response.body.data[0].latestDemandExtraAudit.totalExtraQtyBefore, 2);
  assert.equal(response.body.data[0].latestDemandExtraAudit.totalExtraQtyAfter, 5);
});

test('Prisma-backed HTTP e2e: purchase orders filter never_changed returns only POs with no extra procurement audit history', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/purchase-orders?extraQtyAuditState=never_changed')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].id, MASTER_IDS.po3);
  assert.equal(response.body.data[0].demandConsolidation, null);
  assert.equal(response.body.data[0].latestDemandExtraAudit, null);
});

test('Prisma-backed HTTP e2e: purchase order detail returns extra procurement audit trail entries', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get(`/api/v1/purchase-orders/${MASTER_IDS.po1}`)
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.id, MASTER_IDS.po1);
  assert.equal(response.body.data.auditTrail.length, 1);
  assert.equal(response.body.data.auditTrail[0].changedBy.fullName, 'Owner User');
  assert.equal(response.body.data.auditTrail[0].items.length, 1);
  assert.equal(response.body.data.auditTrail[0].items[0].variant.sku, 'SKU-001');
  assert.equal(response.body.data.auditTrail[0].items[0].beforeExtraQty, 2);
  assert.equal(response.body.data.auditTrail[0].items[0].afterExtraQty, 5);
  assert.equal(response.body.data.auditTrail[0].items[0].beforeOrderedQty, 22);
  assert.equal(response.body.data.auditTrail[0].items[0].afterOrderedQty, 25);
});

test('Prisma-backed HTTP e2e: PATCH demand-extras updates draft demand-generated PO totals and appends audit trail', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/purchase-orders/${MASTER_IDS.po1}/demand-extras`)
    .send({
      items: [
        {
          variantId: IDS.variant,
          extraQty: 7,
        },
      ],
    })
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.id, MASTER_IDS.po1);
  assert.equal(Number(response.body.data.subtotal), 540);
  assert.equal(Number(response.body.data.taxTotal), 27);
  assert.equal(Number(response.body.data.grandTotal), 567);
  assert.equal(response.body.data.items.length, 1);
  assert.equal(response.body.data.items[0].demandQty, 20);
  assert.equal(response.body.data.items[0].extraQty, 7);
  assert.equal(response.body.data.items[0].orderedQty, 27);
  assert.equal(response.body.data.items[0].taxAmount, 27);
  assert.equal(response.body.data.items[0].lineTotal, 567);
  assert.equal(response.body.data.auditTrail.length, 2);
  assert.equal(response.body.data.auditTrail[0].items[0].beforeExtraQty, 5);
  assert.equal(response.body.data.auditTrail[0].items[0].afterExtraQty, 7);
  assert.equal(response.body.data.auditTrail[0].items[0].beforeOrderedQty, 25);
  assert.equal(response.body.data.auditTrail[0].items[0].afterOrderedQty, 27);

  const updatedPo = await prisma.purchaseOrder.findFirst({ where: { id: MASTER_IDS.po1 } });
  assert.ok(updatedPo);
  assert.equal(Number(updatedPo.subtotal), 540);
  assert.equal(Number(updatedPo.taxTotal), 27);
  assert.equal(Number(updatedPo.grandTotal), 567);

  const updatedItem = await prisma.purchaseOrderItem.findFirst({
    where: { purchaseOrderId: MASTER_IDS.po1, variantId: IDS.variant },
  });
  assert.ok(updatedItem);
  assert.equal(Number(updatedItem.extraQty), 7);
  assert.equal(Number(updatedItem.orderedQty), 27);
  assert.equal(Number(updatedItem.taxAmount), 27);
  assert.equal(Number(updatedItem.lineTotal), 567);

  const latestAudit = await prisma.auditLog.findFirst({
    where: {
      organizationId: IDS.org,
      entityType: 'purchase_order',
      entityId: MASTER_IDS.po1,
      action: 'update_demand_extras',
    },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(latestAudit);
  assert.equal(latestAudit.userId, IDS.user);
  assert.deepEqual(latestAudit.beforeJson.items[0], {
    variantId: IDS.variant,
    demandQty: 20,
    extraQty: 5,
    orderedQty: 25,
  });
  assert.deepEqual(latestAudit.afterJson.items[0], {
    variantId: IDS.variant,
    demandQty: 20,
    extraQty: 7,
    orderedQty: 27,
  });
});

test('Prisma-backed HTTP e2e: PATCH demand-extras rejects manual purchase orders', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/purchase-orders/${MASTER_IDS.po3}/demand-extras`)
    .send({
      items: [
        {
          variantId: IDS.variant,
          extraQty: 1,
        },
      ],
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Only demand-generated purchase orders support extra procurement editing');
});

test('Prisma-backed HTTP e2e: PATCH demand-extras rejects non-draft demand-generated purchase orders', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await prisma.purchaseOrder.update({
    where: { id: MASTER_IDS.po2 },
    data: { status: 'approved' },
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/purchase-orders/${MASTER_IDS.po2}/demand-extras`)
    .send({
      items: [
        {
          variantId: IDS.variant2,
          extraQty: 4,
        },
      ],
    })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Only draft demand-generated purchase orders can update extra procurement quantities');
});

test('Prisma-backed HTTP e2e: retailer user cannot PATCH purchase-order demand extras', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/purchase-orders/${MASTER_IDS.po1}/demand-extras`)
    .send({
      items: [
        {
          variantId: IDS.variant,
          extraQty: 6,
        },
      ],
    })
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Retailer users cannot access purchase orders');
});

test('Prisma-backed HTTP e2e: retailer user cannot access purchase order audit/filter flow', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const listResponse = await request(app.getHttpServer())
    .get('/api/v1/purchase-orders?extraQtyAuditState=recently_changed')
    .expect(403);

  assert.equal(listResponse.body.success, false);
  assert.equal(listResponse.body.message, 'Retailer users cannot access purchase orders');

  const detailResponse = await request(app.getHttpServer())
    .get(`/api/v1/purchase-orders/${MASTER_IDS.po1}`)
    .expect(403);

  assert.equal(detailResponse.body.success, false);
  assert.equal(detailResponse.body.message, 'Retailer users cannot access purchase orders');
});
