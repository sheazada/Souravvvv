// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { LookupsController } from '../src/core/lookups/lookups.controller';
import { LookupsService } from '../src/core/lookups/lookups.service';
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
  otherOrg: '74000000-0000-4000-8000-000000000001',
  brand1: '74000000-0000-4000-8000-000000000002',
  brand2: '74000000-0000-4000-8000-000000000003',
  brandInactive: '74000000-0000-4000-8000-000000000004',
  brandOtherOrg: '74000000-0000-4000-8000-000000000005',
  categoryParent: '74000000-0000-4000-8000-000000000006',
  categoryChild: '74000000-0000-4000-8000-000000000007',
  categoryInactive: '74000000-0000-4000-8000-000000000008',
  categoryOtherOrg: '74000000-0000-4000-8000-000000000009',
  taxCode1: '74000000-0000-4000-8000-000000000010',
  taxCode2: '74000000-0000-4000-8000-000000000011',
  taxCodeInactive: '74000000-0000-4000-8000-000000000012',
  taxCodeOtherOrg: '74000000-0000-4000-8000-000000000013',
  unit1: '74000000-0000-4000-8000-000000000014',
  unit2: '74000000-0000-4000-8000-000000000015',
  unitOtherOrg: '74000000-0000-4000-8000-000000000016',
};

function createRetailerActor(retailerId = IDS.retailer) {
  return {
    id: '74000000-0000-4000-8000-000000000099',
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

async function seedLookupMasters(prisma: any) {
  await prisma.organization.create({
    data: {
      id: MASTER_IDS.otherOrg,
      name: 'Other Org',
      timezone: 'Asia/Kolkata',
      currencyCode: 'INR',
    },
  });

  await prisma.brand.createMany({
    data: [
      { id: MASTER_IDS.brand1, organizationId: IDS.org, name: 'Sudha', isActive: true },
      { id: MASTER_IDS.brand2, organizationId: IDS.org, name: 'Paras', isActive: true },
      { id: MASTER_IDS.brandInactive, organizationId: IDS.org, name: 'Legacy', isActive: false },
      { id: MASTER_IDS.brandOtherOrg, organizationId: MASTER_IDS.otherOrg, name: 'Other Brand', isActive: true },
    ],
  });

  await prisma.productCategory.createMany({
    data: [
      {
        id: MASTER_IDS.categoryParent,
        organizationId: IDS.org,
        name: 'Dairy',
        parentId: null,
        isActive: true,
      },
      {
        id: MASTER_IDS.categoryChild,
        organizationId: IDS.org,
        name: 'Milk',
        parentId: MASTER_IDS.categoryParent,
        isActive: true,
      },
      {
        id: MASTER_IDS.categoryInactive,
        organizationId: IDS.org,
        name: 'Legacy Category',
        parentId: null,
        isActive: false,
      },
      {
        id: MASTER_IDS.categoryOtherOrg,
        organizationId: MASTER_IDS.otherOrg,
        name: 'Other Category',
        parentId: null,
        isActive: true,
      },
    ],
  });

  await prisma.taxCode.createMany({
    data: [
      {
        id: MASTER_IDS.taxCode1,
        organizationId: IDS.org,
        code: 'GST5',
        hsnCode: '0401',
        gstRate: 5,
        cgstRate: 2.5,
        sgstRate: 2.5,
        igstRate: 5,
        isActive: true,
      },
      {
        id: MASTER_IDS.taxCode2,
        organizationId: IDS.org,
        code: 'GST12',
        hsnCode: '0403',
        gstRate: 12,
        cgstRate: 6,
        sgstRate: 6,
        igstRate: 12,
        isActive: true,
      },
      {
        id: MASTER_IDS.taxCodeInactive,
        organizationId: IDS.org,
        code: 'GST0',
        hsnCode: '9999',
        gstRate: 0,
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
        isActive: false,
      },
      {
        id: MASTER_IDS.taxCodeOtherOrg,
        organizationId: MASTER_IDS.otherOrg,
        code: 'GST18',
        hsnCode: '8888',
        gstRate: 18,
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 18,
        isActive: true,
      },
    ],
  });

  await prisma.unit.createMany({
    data: [
      { id: MASTER_IDS.unit1, organizationId: IDS.org, code: 'LTR', name: 'Litre', decimalPlaces: 3 },
      { id: MASTER_IDS.unit2, organizationId: IDS.org, code: 'PCS', name: 'Pieces', decimalPlaces: 0 },
      { id: MASTER_IDS.unitOtherOrg, organizationId: MASTER_IDS.otherOrg, code: 'BOX', name: 'Box', decimalPlaces: 0 },
    ],
  });

  await prisma.crateType.createMany({
    data: [
      { id: MASTER_IDS.crateType1, organizationId: IDS.org, code: 'CR24', name: '24 Bottle Crate', isActive: true },
      { id: MASTER_IDS.crateType2, organizationId: IDS.org, code: 'CR12', name: '12 Bottle Crate', isActive: true },
      { id: MASTER_IDS.crateTypeInactive, organizationId: IDS.org, code: 'LEG', name: 'Legacy Crate', isActive: false },
      { id: MASTER_IDS.crateTypeOtherOrg, organizationId: MASTER_IDS.otherOrg, code: 'OTH', name: 'Other Org Crate', isActive: true },
    ],
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);
  await seedLookupMasters(prisma);

  return createPrismaBackedApp({
    controllers: [LookupsController],
    providers: [LookupsService],
    actor,
  });
}

test('Prisma-backed HTTP e2e: brands lookup returns active same-org brands and supports search', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/brands?search=sud&limit=10')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, MASTER_IDS.brand1);
  assert.equal(response.body[0].name, 'Sudha');
  assert.equal(response.body[0].isActive, true);
});

test('Prisma-backed HTTP e2e: brands lookup respects limit and name ordering', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/brands?limit=1')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, MASTER_IDS.brand2);
  assert.equal(response.body[0].name, 'Paras');
});

test('Prisma-backed HTTP e2e: product categories lookup returns parent metadata and supports search', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/product-categories?search=milk')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, MASTER_IDS.categoryChild);
  assert.equal(response.body[0].name, 'Milk');
  assert.equal(response.body[0].parentId, MASTER_IDS.categoryParent);
  assert.equal(response.body[0].parent.id, MASTER_IDS.categoryParent);
  assert.equal(response.body[0].parent.name, 'Dairy');
});

test('Prisma-backed HTTP e2e: product categories lookup respects order with parent rows first and limit', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/product-categories?limit=2')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 2);
  assert.equal(response.body[0].id, MASTER_IDS.categoryParent);
  assert.equal(response.body[1].id, MASTER_IDS.categoryChild);
});

test('Prisma-backed HTTP e2e: tax codes lookup supports code or HSN search and excludes inactive rows', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/tax-codes?search=0401')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, MASTER_IDS.taxCode1);
  assert.equal(response.body[0].code, 'GST5');
  assert.equal(response.body[0].hsnCode, '0401');
  assert.equal(Number(response.body[0].gstRate), 5);
});

test('Prisma-backed HTTP e2e: units lookup supports code or name search and remains organization scoped', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/units?search=ltr')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, MASTER_IDS.unit1);
  assert.equal(response.body[0].code, 'LTR');
  assert.equal(response.body[0].name, 'Litre');
  assert.equal(response.body[0].decimalPlaces, 3);
});

test('Prisma-backed HTTP e2e: crate types lookup supports code or name search and excludes inactive rows', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/crate-types?search=cr24')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, MASTER_IDS.crateType1);
  assert.equal(response.body[0].code, 'CR24');
  assert.equal(response.body[0].name, '24 Bottle Crate');
});

test('Prisma-backed HTTP e2e: crate types lookup respects name ordering and limit', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/crate-types?limit=1')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, MASTER_IDS.crateType2);
  assert.equal(response.body[0].name, '12 Bottle Crate');
});

for (const endpoint of ['brands', 'product-categories', 'tax-codes', 'units', 'crate-types']) {
  test(`Prisma-backed HTTP e2e: retailer user cannot access ${endpoint} lookup`, async (t) => {
    const { app } = await buildApp(createRetailerActor());
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/lookups/${endpoint}`)
      .expect(403);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Backoffice access required');
  });
}
