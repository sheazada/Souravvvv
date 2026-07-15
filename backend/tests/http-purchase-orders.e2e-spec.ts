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
import { PurchaseOrdersController } from '../src/operations/purchase-orders/purchase-orders.controller';
import { PurchaseOrdersService } from '../src/operations/purchase-orders/purchase-orders.service';
import { PrismaService } from '../src/prisma/prisma.service';

const IDS = {
  org: '74000000-0000-4000-8000-000000000001',
  user: '74000000-0000-4000-8000-000000000002',
  retailerUser: '74000000-0000-4000-8000-000000000003',
  retailer: '74000000-0000-4000-8000-000000000004',
  supplier: '74000000-0000-4000-8000-000000000005',
  demand1: '74000000-0000-4000-8000-000000000006',
  demand2: '74000000-0000-4000-8000-000000000007',
  po1: '74000000-0000-4000-8000-000000000008',
  po2: '74000000-0000-4000-8000-000000000009',
  po3: '74000000-0000-4000-8000-000000000010',
  variant1: '74000000-0000-4000-8000-000000000011',
  variant2: '74000000-0000-4000-8000-000000000012',
  product1: '74000000-0000-4000-8000-000000000013',
  product2: '74000000-0000-4000-8000-000000000014',
  po1Item: '74000000-0000-4000-8000-000000000015',
  po2Item: '74000000-0000-4000-8000-000000000016',
  po3Item: '74000000-0000-4000-8000-000000000017',
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

function createRetailerActor(): AuthenticatedUser {
  return {
    id: IDS.retailerUser,
    organizationId: IDS.org,
    retailerId: IDS.retailer,
    employeeId: null,
    fullName: 'Retailer User',
    mobile: '8888888888',
    userType: 'retailer_user',
    roles: ['RETAILER'],
    permissions: [],
  };
}

function createHarness() {
  const now = new Date('2026-07-15T10:00:00.000Z');

  const state = {
    users: [
      {
        id: IDS.user,
        organizationId: IDS.org,
        fullName: 'Owner User',
        mobile: '9999999999',
        userType: 'owner',
      },
    ],
    products: [
      {
        id: IDS.product1,
        organizationId: IDS.org,
        name: 'Sudha Milk',
      },
      {
        id: IDS.product2,
        organizationId: IDS.org,
        name: 'Sudha Curd',
      },
    ],
    productVariants: [
      {
        id: IDS.variant1,
        organizationId: IDS.org,
        productId: IDS.product1,
        sku: 'SKU-001',
        variantName: '500 ml',
      },
      {
        id: IDS.variant2,
        organizationId: IDS.org,
        productId: IDS.product2,
        sku: 'SKU-002',
        variantName: '1 kg',
      },
    ],
    purchaseOrders: [
      {
        id: IDS.po1,
        organizationId: IDS.org,
        poNo: 'PO-001',
        supplierId: IDS.supplier,
        demandConsolidationId: IDS.demand1,
        poDate: new Date('2026-07-15T00:00:00.000Z'),
        expectedReceiptDate: new Date('2026-07-16T00:00:00.000Z'),
        status: 'draft',
        subtotal: 500,
        taxTotal: 25,
        grandTotal: 525,
        remarks: 'Demand generated PO with recent extra edit',
      },
      {
        id: IDS.po2,
        organizationId: IDS.org,
        poNo: 'PO-002',
        supplierId: IDS.supplier,
        demandConsolidationId: IDS.demand2,
        poDate: new Date('2026-07-14T00:00:00.000Z'),
        expectedReceiptDate: new Date('2026-07-17T00:00:00.000Z'),
        status: 'draft',
        subtotal: 330,
        taxTotal: 16.5,
        grandTotal: 346.5,
        remarks: 'Demand generated PO with old extra edit',
      },
      {
        id: IDS.po3,
        organizationId: IDS.org,
        poNo: 'PO-003',
        supplierId: IDS.supplier,
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
    purchaseOrderItems: [
      {
        id: IDS.po1Item,
        organizationId: IDS.org,
        purchaseOrderId: IDS.po1,
        variantId: IDS.variant1,
        orderedQty: 25,
        demandQty: 20,
        extraQty: 5,
        unitCost: 20,
        taxRate: 5,
        taxAmount: 25,
        lineTotal: 525,
        createdAt: new Date('2026-07-15T08:00:00.000Z'),
      },
      {
        id: IDS.po2Item,
        organizationId: IDS.org,
        purchaseOrderId: IDS.po2,
        variantId: IDS.variant2,
        orderedQty: 13,
        demandQty: 10,
        extraQty: 3,
        unitCost: 25,
        taxRate: 5,
        taxAmount: 16.5,
        lineTotal: 341.5,
        createdAt: new Date('2026-07-14T08:00:00.000Z'),
      },
      {
        id: IDS.po3Item,
        organizationId: IDS.org,
        purchaseOrderId: IDS.po3,
        variantId: IDS.variant1,
        orderedQty: 5,
        demandQty: 0,
        extraQty: 0,
        unitCost: 20,
        taxRate: 5,
        taxAmount: 5,
        lineTotal: 105,
        createdAt: new Date('2026-07-13T08:00:00.000Z'),
      },
    ],
    suppliers: [
      {
        id: IDS.supplier,
        organizationId: IDS.org,
        supplierCode: 'SUP-001',
        name: 'Sudha Dairy',
        contactPerson: 'Supplier Contact',
        mobile: '9090909090',
        paymentTermsDays: 7,
        isActive: true,
      },
    ],
    demandConsolidations: [
      {
        id: IDS.demand1,
        organizationId: IDS.org,
        consolidationNo: 'DCON-001',
        status: 'approved',
        consolidationDate: new Date('2026-07-15T00:00:00.000Z'),
      },
      {
        id: IDS.demand2,
        organizationId: IDS.org,
        consolidationNo: 'DCON-002',
        status: 'approved',
        consolidationDate: new Date('2026-07-14T00:00:00.000Z'),
      },
    ],
    goodsReceipts: [],
    goodsReceiptItems: [],
    auditLogs: [
      {
        id: '74000000-0000-4000-8000-000000000021',
        organizationId: IDS.org,
        userId: IDS.user,
        module: 'procurement',
        entityType: 'purchase_order',
        entityId: IDS.po1,
        action: 'update_demand_extras',
        beforeJson: { items: [{ variantId: IDS.variant1, demandQty: 20, extraQty: 2, orderedQty: 22 }] },
        afterJson: { items: [{ variantId: IDS.variant1, demandQty: 20, extraQty: 5, orderedQty: 25 }] },
        createdAt: new Date('2026-07-13T09:30:00.000Z'),
        user: {
          id: IDS.user,
          fullName: 'Ravi Kumar',
          userType: 'owner',
          mobile: '9999999999',
        },
      },
      {
        id: '74000000-0000-4000-8000-000000000022',
        organizationId: IDS.org,
        userId: IDS.user,
        module: 'procurement',
        entityType: 'purchase_order',
        entityId: IDS.po2,
        action: 'update_demand_extras',
        beforeJson: { items: [{ variantId: IDS.variant2, demandQty: 10, extraQty: 1, orderedQty: 11 }] },
        afterJson: { items: [{ variantId: IDS.variant2, demandQty: 10, extraQty: 3, orderedQty: 13 }] },
        createdAt: new Date('2026-06-28T09:30:00.000Z'),
        user: {
          id: IDS.user,
          fullName: 'Ravi Kumar',
          userType: 'owner',
          mobile: '9999999999',
        },
      },
    ],
  };

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  function applyPurchaseOrderWhere(rows: any[], where: any = {}) {
    let filtered = rows.filter((row) => row.organizationId === where.organizationId);
    if (where.supplierId) filtered = filtered.filter((row) => row.supplierId === where.supplierId);
    if (where.status) filtered = filtered.filter((row) => row.status === where.status);
    if (where.id?.in) filtered = filtered.filter((row) => where.id.in.includes(row.id));
    if (where.id?.notIn) filtered = filtered.filter((row) => !where.id.notIn.includes(row.id));
    if (where.poDate?.gte) filtered = filtered.filter((row) => new Date(row.poDate) >= where.poDate.gte);
    if (where.poDate?.lte) filtered = filtered.filter((row) => new Date(row.poDate) <= where.poDate.lte);
    if (Array.isArray(where.OR) && where.OR.length) {
      filtered = filtered.filter((row) =>
        where.OR.some((condition: any) => {
          if (condition.poNo?.contains) return String(row.poNo).toLowerCase().includes(String(condition.poNo.contains).toLowerCase());
          if (condition.remarks?.contains) return String(row.remarks ?? '').toLowerCase().includes(String(condition.remarks.contains).toLowerCase());
          return false;
        }),
      );
    }
    return filtered;
  }

  function sortByCreatedDesc(rows: any[]) {
    return rows.slice().sort((a, b) => Number(new Date(b.createdAt ?? 0)) - Number(new Date(a.createdAt ?? 0)));
  }

  const prisma: any = {
    $transaction: async (fn: any) => fn(prisma),
    purchaseOrder: {
      findFirst: async ({ where }: any = {}) => {
        const row = state.purchaseOrders.find(
          (item) => item.organizationId === where.organizationId && item.id === where.id,
        );
        return row ? clone(row) : null;
      },
      findMany: async ({ where, orderBy, skip = 0, take }: any = {}) => {
        let rows = applyPurchaseOrderWhere(state.purchaseOrders, where);
        if (orderBy?.poDate === 'desc') {
          rows = rows.slice().sort((a, b) => Number(new Date(b.poDate)) - Number(new Date(a.poDate)));
        }
        return rows.slice(skip, take ? skip + take : undefined).map(clone);
      },
      count: async ({ where }: any = {}) => applyPurchaseOrderWhere(state.purchaseOrders, where).length,
      update: async ({ where, data }: any) => {
        const row = state.purchaseOrders.find((item) => item.id === where.id);
        Object.assign(row, data);
        return clone(row);
      },
    },
    purchaseOrderItem: {
      findMany: async ({ where, orderBy }: any = {}) => {
        let rows = state.purchaseOrderItems.filter(
          (row) =>
            row.organizationId === where.organizationId &&
            (!where.purchaseOrderId || row.purchaseOrderId === where.purchaseOrderId),
        );
        if (orderBy?.createdAt === 'asc') {
          rows = rows.slice().sort((a, b) => Number(new Date(a.createdAt)) - Number(new Date(b.createdAt)));
        }
        return rows.map(clone);
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const row of state.purchaseOrderItems) {
          if (
            row.organizationId === where.organizationId &&
            row.purchaseOrderId === where.purchaseOrderId &&
            row.variantId === where.variantId
          ) {
            Object.assign(row, data);
            count += 1;
          }
        }
        return { count };
      },
    },
    productVariant: {
      findMany: async ({ where }: any = {}) => {
        const rows = state.productVariants
          .filter((row) => row.organizationId === where.organizationId && (!where.id?.in || where.id.in.includes(row.id)))
          .map((row) => ({
            ...clone(row),
            product: (() => {
              const product = state.products.find((item) => item.id === row.productId);
              return product ? { id: product.id, name: product.name } : null;
            })(),
          }));
        return rows;
      },
    },
    supplier: {
      findFirst: async ({ where }: any = {}) => {
        const row = state.suppliers.find((item) => item.organizationId === where.organizationId && item.id === where.id);
        return row ? clone(row) : null;
      },
      findMany: async ({ where }: any = {}) =>
        state.suppliers
          .filter((row) => row.organizationId === where.organizationId && (!where.id?.in || where.id.in.includes(row.id)))
          .map(clone),
    },
    demandConsolidation: {
      findFirst: async ({ where }: any = {}) => {
        const row = state.demandConsolidations.find((item) => item.organizationId === where.organizationId && item.id === where.id);
        return row ? clone(row) : null;
      },
      findMany: async ({ where }: any = {}) =>
        state.demandConsolidations
          .filter((row) => row.organizationId === where.organizationId && (!where.id?.in || where.id.in.includes(row.id)))
          .map(clone),
    },
    goodsReceipt: {
      count: async () => 0,
      findMany: async () => [],
    },
    goodsReceiptItem: {
      findMany: async () => [],
    },
    auditLog: {
      findMany: async ({ where, orderBy, select, include, take }: any = {}) => {
        let rows = state.auditLogs.filter(
          (row) =>
            row.organizationId === where.organizationId &&
            row.entityType === where.entityType &&
            row.action === where.action,
        );
        if (where.entityId?.in) rows = rows.filter((row) => where.entityId.in.includes(row.entityId));
        if (where.entityId && typeof where.entityId === 'string') rows = rows.filter((row) => row.entityId === where.entityId);
        if (where.createdAt?.gte) rows = rows.filter((row) => new Date(row.createdAt) >= where.createdAt.gte);
        if (orderBy?.createdAt === 'desc') {
          rows = sortByCreatedDesc(rows);
        }
        if (typeof take === 'number') rows = rows.slice(0, take);

        return rows.map((row) => {
          if (select?.entityId) {
            return { entityId: row.entityId };
          }
          if (include?.user) {
            return clone(row);
          }
          return clone(row);
        });
      },
      create: async ({ data }: any) => {
        const user = state.users.find((item) => item.id === data.userId) ?? null;
        const row = {
          id: `audit-${state.auditLogs.length + 1}`,
          createdAt: new Date(Date.now()),
          ...data,
          user: user
            ? {
                id: user.id,
                fullName: user.fullName,
                userType: user.userType,
                mobile: user.mobile,
              }
            : null,
        };
        state.auditLogs.push(row);
        return clone(row);
      },
    },
  };

  const originalDateNow = Date.now;
  Date.now = () => now.getTime();

  return {
    prisma,
    state,
    restoreDateNow() {
      Date.now = originalDateNow;
    },
  };
}

async function createApp(actor: AuthenticatedUser = createActor()) {
  const harness = createHarness();
  const moduleRef = await Test.createTestingModule({
    controllers: [PurchaseOrdersController],
    providers: [PurchaseOrdersService, { provide: PrismaService, useValue: harness.prisma }],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate(context: any) {
        context.switchToHttp().getRequest().user = actor;
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return { app, harness };
}

test('HTTP e2e: purchase orders filter recently_changed returns only recently edited demand-generated POs', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => {
    harness.restoreDateNow();
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/purchase-orders?extraQtyAuditState=recently_changed')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].id, IDS.po1);
  assert.equal(response.body.data[0].demandConsolidation.consolidationNo, 'DCON-001');
  assert.equal(response.body.data[0].latestDemandExtraAudit.changedBy.fullName, 'Ravi Kumar');
  assert.equal(response.body.data[0].latestDemandExtraAudit.changedItemCount, 1);
  assert.equal(response.body.data[0].latestDemandExtraAudit.totalExtraQtyBefore, 2);
  assert.equal(response.body.data[0].latestDemandExtraAudit.totalExtraQtyAfter, 5);
});

test('HTTP e2e: purchase orders filter never_changed returns only POs with no extra procurement audit history', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => {
    harness.restoreDateNow();
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/purchase-orders?extraQtyAuditState=never_changed')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].id, IDS.po3);
  assert.equal(response.body.data[0].demandConsolidation, null);
  assert.equal(response.body.data[0].latestDemandExtraAudit, null);
});

test('HTTP e2e: purchase orders filter validates extraQtyAuditState values', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => {
    harness.restoreDateNow();
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/purchase-orders?extraQtyAuditState=invalid_state')
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Bad Request Exception');
});

test('HTTP e2e: PATCH demand-extras updates draft demand-generated PO totals and appends audit trail', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => {
    harness.restoreDateNow();
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/purchase-orders/${IDS.po1}/demand-extras`)
    .send({
      items: [
        {
          variantId: IDS.variant1,
          extraQty: 7,
        },
      ],
    })
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.id, IDS.po1);
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

  const updatedPo = harness.state.purchaseOrders.find((row: any) => row.id === IDS.po1);
  assert.equal(Number(updatedPo.subtotal), 540);
  assert.equal(Number(updatedPo.taxTotal), 27);
  assert.equal(Number(updatedPo.grandTotal), 567);

  const updatedItem = harness.state.purchaseOrderItems.find((row: any) => row.purchaseOrderId === IDS.po1 && row.variantId === IDS.variant1);
  assert.equal(Number(updatedItem.extraQty), 7);
  assert.equal(Number(updatedItem.orderedQty), 27);
  assert.equal(Number(updatedItem.taxAmount), 27);
  assert.equal(Number(updatedItem.lineTotal), 567);

  const latestAudit = harness.state.auditLogs
    .slice()
    .sort((a: any, b: any) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    .find((row: any) => row.entityId === IDS.po1);
  assert.ok(latestAudit);
  assert.equal(latestAudit.userId, IDS.user);
  assert.deepEqual(latestAudit.beforeJson.items[0], {
    variantId: IDS.variant1,
    demandQty: 20,
    extraQty: 5,
    orderedQty: 25,
  });
  assert.deepEqual(latestAudit.afterJson.items[0], {
    variantId: IDS.variant1,
    demandQty: 20,
    extraQty: 7,
    orderedQty: 27,
  });
});

test('HTTP e2e: PATCH demand-extras rejects manual purchase orders', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => {
    harness.restoreDateNow();
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/purchase-orders/${IDS.po3}/demand-extras`)
    .send({
      items: [
        {
          variantId: IDS.variant1,
          extraQty: 1,
        },
      ],
    })
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Only demand-generated purchase orders support extra procurement editing');
});

test('HTTP e2e: PATCH demand-extras rejects non-draft demand-generated purchase orders', async (t) => {
  const { app, harness } = await createApp();
  harness.state.purchaseOrders.find((row: any) => row.id === IDS.po2).status = 'approved';
  t.after(async () => {
    harness.restoreDateNow();
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/purchase-orders/${IDS.po2}/demand-extras`)
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

test('HTTP e2e: retailer user cannot PATCH purchase-order demand extras', async (t) => {
  const { app, harness } = await createApp(createRetailerActor());
  t.after(async () => {
    harness.restoreDateNow();
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/purchase-orders/${IDS.po1}/demand-extras`)
    .send({
      items: [
        {
          variantId: IDS.variant1,
          extraQty: 6,
        },
      ],
    })
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Retailer users cannot access purchase orders');
});

test('HTTP e2e: retailer user cannot access purchase order list filters', async (t) => {
  const { app, harness } = await createApp(createRetailerActor());
  t.after(async () => {
    harness.restoreDateNow();
    await app.close();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/purchase-orders?extraQtyAuditState=recently_changed')
    .expect(403);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Retailer users cannot access purchase orders');
});
