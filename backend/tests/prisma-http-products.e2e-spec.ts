// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { ProductVariantsController } from '../src/masters/products/product-variants.controller';
import { ProductsController } from '../src/masters/products/products.controller';
import { ProductsService } from '../src/masters/products/products.service';
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
  otherOrg: '72000000-0000-4000-8000-000000000001',
  brand: '72000000-0000-4000-8000-000000000002',
  otherBrand: '72000000-0000-4000-8000-000000000003',
  brand2: '72000000-0000-4000-8000-000000000012',
  category: '72000000-0000-4000-8000-000000000004',
  otherCategory: '72000000-0000-4000-8000-000000000005',
  category2: '72000000-0000-4000-8000-000000000013',
  taxCode: '72000000-0000-4000-8000-000000000006',
  otherTaxCode: '72000000-0000-4000-8000-000000000007',
  taxCode2: '72000000-0000-4000-8000-000000000014',
  crateType: '72000000-0000-4000-8000-000000000008',
  otherCrateType: '72000000-0000-4000-8000-000000000009',
  unit: '72000000-0000-4000-8000-000000000010',
  otherUnit: '72000000-0000-4000-8000-000000000011',
};

function createRetailerActor(retailerId = IDS.retailer) {
  return {
    id: '72000000-0000-4000-8000-000000000099',
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

function createStaffActor() {
  return {
    id: '72000000-0000-4000-8000-000000000100',
    organizationId: IDS.org,
    retailerId: null,
    employeeId: '72000000-0000-4000-8000-000000000101',
    fullName: 'Staff User',
    mobile: '7777700000',
    userType: 'employee',
    roles: ['STAFF'],
    permissions: [],
  };
}

async function seedProductMasters(prisma: any) {
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
      {
        id: MASTER_IDS.brand,
        organizationId: IDS.org,
        name: 'Sudha',
        isActive: true,
      },
      {
        id: MASTER_IDS.otherBrand,
        organizationId: MASTER_IDS.otherOrg,
        name: 'Other Brand',
        isActive: true,
      },
      {
        id: MASTER_IDS.brand2,
        organizationId: IDS.org,
        name: 'Paras',
        isActive: true,
      },
    ],
  });

  await prisma.productCategory.createMany({
    data: [
      {
        id: MASTER_IDS.category,
        organizationId: IDS.org,
        name: 'Milk',
        parentId: null,
        isActive: true,
      },
      {
        id: MASTER_IDS.otherCategory,
        organizationId: MASTER_IDS.otherOrg,
        name: 'Other Category',
        parentId: null,
        isActive: true,
      },
      {
        id: MASTER_IDS.category2,
        organizationId: IDS.org,
        name: 'Curd',
        parentId: null,
        isActive: true,
      },
    ],
  });

  await prisma.taxCode.createMany({
    data: [
      {
        id: MASTER_IDS.taxCode,
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
        id: MASTER_IDS.otherTaxCode,
        organizationId: MASTER_IDS.otherOrg,
        code: 'GST12',
        hsnCode: '9999',
        gstRate: 12,
        cgstRate: 6,
        sgstRate: 6,
        igstRate: 12,
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
    ],
  });

  await prisma.crateType.createMany({
    data: [
      {
        id: MASTER_IDS.crateType,
        organizationId: IDS.org,
        code: 'CR-24',
        name: '24 Bottle Crate',
        capacityUnits: 24,
        depositValue: 250,
        isActive: true,
      },
      {
        id: MASTER_IDS.otherCrateType,
        organizationId: MASTER_IDS.otherOrg,
        code: 'CR-12',
        name: '12 Bottle Crate',
        capacityUnits: 12,
        depositValue: 150,
        isActive: true,
      },
    ],
  });

  await prisma.unit.createMany({
    data: [
      {
        id: MASTER_IDS.unit,
        organizationId: IDS.org,
        code: 'LTR',
        name: 'Litre',
        decimalPlaces: 3,
      },
      {
        id: MASTER_IDS.otherUnit,
        organizationId: MASTER_IDS.otherOrg,
        code: 'BOX',
        name: 'Box',
        decimalPlaces: 0,
      },
    ],
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);
  await seedProductMasters(prisma);

  return createPrismaBackedApp({
    controllers: [ProductsController, ProductVariantsController],
    providers: [ProductsService],
    actor,
  });
}

function buildProductPayload(overrides: Record<string, any> = {}) {
  return {
    productCode: 'PROD-NEW-001',
    name: 'Sudha Full Cream Milk',
    brandId: MASTER_IDS.brand,
    categoryId: MASTER_IDS.category,
    taxCodeId: MASTER_IDS.taxCode,
    defaultCrateTypeId: MASTER_IDS.crateType,
    description: 'Linked product master test',
    isBatchTracked: true,
    isExpiryTracked: true,
    isReturnable: true,
    status: 'active',
    ...overrides,
  };
}

function buildVariantPayload(overrides: Record<string, any> = {}) {
  return {
    productId: IDS.product,
    sku: 'SKU-NEW-001',
    variantName: '1 Litre',
    sizeValue: 1,
    unitId: MASTER_IDS.unit,
    barcode: '8900000000012',
    mrp: 64,
    distributorPrice: 58,
    defaultRetailerPrice: 60,
    offerPrice: 57,
    status: 'active',
    ...overrides,
  };
}

for (const routeCase of [
  { label: 'list products', method: 'get', path: '/api/v1/products' },
  { label: 'create product', method: 'post', path: '/api/v1/products', body: () => buildProductPayload() },
  { label: 'get product detail', method: 'get', path: `/api/v1/products/${IDS.product}` },
  { label: 'update product', method: 'patch', path: `/api/v1/products/${IDS.product}`, body: () => ({ name: 'Retailer Edit Attempt' }) },
  {
    label: 'update product status',
    method: 'patch',
    path: `/api/v1/products/${IDS.product}/status`,
    body: () => ({ status: 'inactive' }),
  },
  { label: 'list product variants', method: 'get', path: `/api/v1/products/${IDS.product}/variants` },
  {
    label: 'create product variant',
    method: 'post',
    path: `/api/v1/products/${IDS.product}/variants`,
    body: () => buildVariantPayload(),
  },
  { label: 'get product variant detail', method: 'get', path: `/api/v1/product-variants/${IDS.variant}` },
  {
    label: 'update product variant',
    method: 'patch',
    path: `/api/v1/product-variants/${IDS.variant}`,
    body: () => ({ variantName: 'Retailer Variant Edit Attempt' }),
  },
  {
    label: 'update product variant status',
    method: 'patch',
    path: `/api/v1/product-variants/${IDS.variant}/status`,
    body: () => ({ status: 'inactive' }),
  },
]) {
  test(`Prisma-backed HTTP e2e: retailer user cannot ${routeCase.label}`, async (t) => {
    const { app } = await buildApp(createRetailerActor());
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    let req = request(app.getHttpServer())[routeCase.method](routeCase.path);
    if (routeCase.body) {
      req = req.send(routeCase.body());
    }

    const response = await req.expect(403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Backoffice access required');
  });
}

for (const actorCase of [
  {
    label: 'owner',
    actor: undefined,
    buildProductPayload: () =>
      buildProductPayload({ productCode: 'PROD-OWNER-001', name: 'Owner Created Product' }),
    buildVariantPayload: () =>
      buildVariantPayload({ sku: 'SKU-OWNER-001', variantName: 'Owner Variant' }),
  },
  {
    label: 'staff',
    actor: createStaffActor(),
    buildProductPayload: () =>
      buildProductPayload({ productCode: 'PROD-STAFF-001', name: 'Staff Created Product' }),
    buildVariantPayload: () =>
      buildVariantPayload({ sku: 'SKU-STAFF-001', variantName: 'Staff Variant' }),
  },
]) {
  test(`Prisma-backed HTTP e2e: ${actorCase.label} can list products`, async (t) => {
    const { app } = await buildApp(actorCase.actor);
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    await request(app.getHttpServer()).get('/api/v1/products').expect(200);
  });

  test(`Prisma-backed HTTP e2e: ${actorCase.label} can create product`, async (t) => {
    const { app } = await buildApp(actorCase.actor);
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .send(actorCase.buildProductPayload())
      .expect(201);

    assert.equal(response.body.success, true);
  });

  test(`Prisma-backed HTTP e2e: ${actorCase.label} can read product detail`, async (t) => {
    const { app } = await buildApp(actorCase.actor);
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    await request(app.getHttpServer()).get(`/api/v1/products/${IDS.product}`).expect(200);
  });

  test(`Prisma-backed HTTP e2e: ${actorCase.label} can update product`, async (t) => {
    const { app } = await buildApp(actorCase.actor);
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/products/${IDS.product}`)
      .send({ name: `${actorCase.label} product update` })
      .expect(200);

    assert.equal(response.body.success, true);
  });

  test(`Prisma-backed HTTP e2e: ${actorCase.label} can list product variants`, async (t) => {
    const { app } = await buildApp(actorCase.actor);
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    await request(app.getHttpServer()).get(`/api/v1/products/${IDS.product}/variants`).expect(200);
  });

  test(`Prisma-backed HTTP e2e: ${actorCase.label} can create product variant`, async (t) => {
    const { app } = await buildApp(actorCase.actor);
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/products/${IDS.product}/variants`)
      .send(actorCase.buildVariantPayload())
      .expect(201);

    assert.equal(response.body.success, true);
  });

  test(`Prisma-backed HTTP e2e: ${actorCase.label} can read product variant detail`, async (t) => {
    const { app } = await buildApp(actorCase.actor);
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    await request(app.getHttpServer())
      .get(`/api/v1/product-variants/${IDS.variant}`)
      .expect(200);
  });

  test(`Prisma-backed HTTP e2e: ${actorCase.label} can update product variant`, async (t) => {
    const { app } = await buildApp(actorCase.actor);
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/product-variants/${IDS.variant}`)
      .send({ variantName: `${actorCase.label} variant update` })
      .expect(200);

    assert.equal(response.body.success, true);
  });

  test(`Prisma-backed HTTP e2e: ${actorCase.label} can update product variant status`, async (t) => {
    const { app } = await buildApp(actorCase.actor);
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/product-variants/${IDS.variant}/status`)
      .send({ status: 'inactive' })
      .expect(200);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'inactive');
  });
}

test('Prisma-backed HTTP e2e: product create accepts valid brand, category, tax code, and crate references', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/products')
    .send(buildProductPayload())
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.brand.id, MASTER_IDS.brand);
  assert.equal(response.body.data.category.id, MASTER_IDS.category);
  assert.equal(response.body.data.taxCode.id, MASTER_IDS.taxCode);
  assert.equal(response.body.data.defaultCrateType.id, MASTER_IDS.crateType);
  assert.equal(response.body.data.taxCode.gstRate, 5);
  assert.equal(response.body.data.defaultCrateType.depositValue, 250);

  const created = await prisma.product.findFirst({ where: { organizationId: IDS.org, productCode: 'PROD-NEW-001' } });
  assert.ok(created);
  assert.equal(created.brandId, MASTER_IDS.brand);
  assert.equal(created.categoryId, MASTER_IDS.category);
  assert.equal(created.taxCodeId, MASTER_IDS.taxCode);
  assert.equal(created.defaultCrateTypeId, MASTER_IDS.crateType);
});

for (const invalidCreateCase of [
  { label: 'brand', key: 'brandId', value: MASTER_IDS.otherBrand, message: 'Brand not found' },
  { label: 'category', key: 'categoryId', value: MASTER_IDS.otherCategory, message: 'Product category not found' },
  { label: 'tax code', key: 'taxCodeId', value: MASTER_IDS.otherTaxCode, message: 'Tax code not found' },
  { label: 'default crate type', key: 'defaultCrateTypeId', value: MASTER_IDS.otherCrateType, message: 'Default crate type not found' },
]) {
  test(`Prisma-backed HTTP e2e: product create rejects invalid ${invalidCreateCase.label} reference`, async (t) => {
    const { app, prisma } = await buildApp();
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .send(buildProductPayload({ [invalidCreateCase.key]: invalidCreateCase.value }))
      .expect(404);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, invalidCreateCase.message);

    const created = await prisma.product.findFirst({ where: { organizationId: IDS.org, productCode: 'PROD-NEW-001' } });
    assert.equal(created, null);
  });
}

test('Prisma-backed HTTP e2e: product update accepts valid brand, category, tax code, and crate references', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/products/${IDS.product}`)
    .send(
      buildProductPayload({
        productCode: 'PROD-001',
        name: 'Sudha Milk Updated',
        description: 'Updated linked product master test',
      }),
    )
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.id, IDS.product);
  assert.equal(response.body.data.brand.id, MASTER_IDS.brand);
  assert.equal(response.body.data.category.id, MASTER_IDS.category);
  assert.equal(response.body.data.taxCode.id, MASTER_IDS.taxCode);
  assert.equal(response.body.data.defaultCrateType.id, MASTER_IDS.crateType);

  const updated = await prisma.product.findFirst({ where: { id: IDS.product } });
  assert.equal(updated.name, 'Sudha Milk Updated');
  assert.equal(updated.brandId, MASTER_IDS.brand);
  assert.equal(updated.categoryId, MASTER_IDS.category);
  assert.equal(updated.taxCodeId, MASTER_IDS.taxCode);
  assert.equal(updated.defaultCrateTypeId, MASTER_IDS.crateType);
});

for (const invalidUpdateCase of [
  { label: 'brand', key: 'brandId', value: MASTER_IDS.otherBrand, message: 'Brand not found' },
  { label: 'category', key: 'categoryId', value: MASTER_IDS.otherCategory, message: 'Product category not found' },
  { label: 'tax code', key: 'taxCodeId', value: MASTER_IDS.otherTaxCode, message: 'Tax code not found' },
  { label: 'default crate type', key: 'defaultCrateTypeId', value: MASTER_IDS.otherCrateType, message: 'Default crate type not found' },
]) {
  test(`Prisma-backed HTTP e2e: product update rejects invalid ${invalidUpdateCase.label} reference`, async (t) => {
    const { app, prisma } = await buildApp();
    t.after(async () => {
      await app.close();
      await disconnectPrisma();
    });

    const before = await prisma.product.findFirst({ where: { id: IDS.product } });

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/products/${IDS.product}`)
      .send({ [invalidUpdateCase.key]: invalidUpdateCase.value })
      .expect(404);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, invalidUpdateCase.message);

    const after = await prisma.product.findFirst({ where: { id: IDS.product } });
    assert.equal(after.brandId, before.brandId);
    assert.equal(after.categoryId, before.categoryId);
    assert.equal(after.taxCodeId, before.taxCodeId);
    assert.equal(after.defaultCrateTypeId, before.defaultCrateTypeId);
  });
}

test('Prisma-backed HTTP e2e: product list filters by brandId', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await prisma.product.update({
    where: { id: IDS.product },
    data: {
      brandId: MASTER_IDS.brand,
      categoryId: MASTER_IDS.category,
    },
  });
  await prisma.product.update({
    where: { id: IDS.product2 },
    data: {
      brandId: MASTER_IDS.brand2,
      categoryId: MASTER_IDS.category2,
    },
  });

  const response = await request(app.getHttpServer())
    .get(`/api/v1/products?brandId=${MASTER_IDS.brand}`)
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].id, IDS.product);
  assert.equal(response.body.data[0].brand.id, MASTER_IDS.brand);
  assert.equal(response.body.data[0].category.id, MASTER_IDS.category);
});

test('Prisma-backed HTTP e2e: product list filters by categoryId', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await prisma.product.update({
    where: { id: IDS.product },
    data: {
      brandId: MASTER_IDS.brand,
      categoryId: MASTER_IDS.category,
    },
  });
  await prisma.product.update({
    where: { id: IDS.product2 },
    data: {
      brandId: MASTER_IDS.brand2,
      categoryId: MASTER_IDS.category2,
    },
  });

  const response = await request(app.getHttpServer())
    .get(`/api/v1/products?categoryId=${MASTER_IDS.category2}`)
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].id, IDS.product2);
  assert.equal(response.body.data[0].brand.id, MASTER_IDS.brand2);
  assert.equal(response.body.data[0].category.id, MASTER_IDS.category2);
});

test('Prisma-backed HTTP e2e: product search matches linked brand name', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await prisma.product.update({
    where: { id: IDS.product },
    data: {
      name: 'Product One',
      description: 'Fresh stock one',
      brandId: MASTER_IDS.brand,
      categoryId: MASTER_IDS.category,
      taxCodeId: MASTER_IDS.taxCode,
    },
  });
  await prisma.product.update({
    where: { id: IDS.product2 },
    data: {
      name: 'Product Two',
      description: 'Fresh stock two',
      brandId: MASTER_IDS.brand2,
      categoryId: MASTER_IDS.category2,
      taxCodeId: MASTER_IDS.taxCode2,
    },
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/products?search=paras')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].id, IDS.product2);
  assert.equal(response.body.data[0].brand.id, MASTER_IDS.brand2);
});

test('Prisma-backed HTTP e2e: product search matches linked category name', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await prisma.product.update({
    where: { id: IDS.product },
    data: {
      name: 'Product One',
      description: 'Fresh stock one',
      brandId: MASTER_IDS.brand,
      categoryId: MASTER_IDS.category,
      taxCodeId: MASTER_IDS.taxCode,
    },
  });
  await prisma.product.update({
    where: { id: IDS.product2 },
    data: {
      name: 'Product Two',
      description: 'Fresh stock two',
      brandId: MASTER_IDS.brand2,
      categoryId: MASTER_IDS.category2,
      taxCodeId: MASTER_IDS.taxCode2,
    },
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/products?search=curd')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].id, IDS.product2);
  assert.equal(response.body.data[0].category.id, MASTER_IDS.category2);
});

test('Prisma-backed HTTP e2e: product search matches linked tax code', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await prisma.product.update({
    where: { id: IDS.product },
    data: {
      name: 'Product One',
      description: 'Fresh stock one',
      brandId: MASTER_IDS.brand,
      categoryId: MASTER_IDS.category,
      taxCodeId: MASTER_IDS.taxCode,
    },
  });
  await prisma.product.update({
    where: { id: IDS.product2 },
    data: {
      name: 'Product Two',
      description: 'Fresh stock two',
      brandId: MASTER_IDS.brand2,
      categoryId: MASTER_IDS.category2,
      taxCodeId: MASTER_IDS.taxCode2,
    },
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/products?search=gst12')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].id, IDS.product2);
  assert.equal(response.body.data[0].taxCode.id, MASTER_IDS.taxCode2);
  assert.equal(response.body.data[0].taxCode.code, 'GST12');
});

test('Prisma-backed HTTP e2e: variant create accepts valid unit reference', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/products/${IDS.product}/variants`)
    .send(buildVariantPayload())
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.unit.id, MASTER_IDS.unit);
  assert.equal(response.body.data.unit.code, 'LTR');
  assert.equal(response.body.data.unit.name, 'Litre');
  assert.equal(response.body.data.unit.decimalPlaces, 3);

  const created = await prisma.productVariant.findFirst({ where: { organizationId: IDS.org, sku: 'SKU-NEW-001' } });
  assert.ok(created);
  assert.equal(created.unitId, MASTER_IDS.unit);
});

test('Prisma-backed HTTP e2e: variant create rejects invalid unit reference', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/products/${IDS.product}/variants`)
    .send(buildVariantPayload({ sku: 'SKU-NEW-002', unitId: MASTER_IDS.otherUnit }))
    .expect(404);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Unit not found');

  const created = await prisma.productVariant.findFirst({ where: { organizationId: IDS.org, sku: 'SKU-NEW-002' } });
  assert.equal(created, null);
});

test('Prisma-backed HTTP e2e: variant update accepts valid unit reference', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/product-variants/${IDS.variant}`)
    .send({ unitId: MASTER_IDS.unit, variantName: '500 ml Pack' })
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.unit.id, MASTER_IDS.unit);
  assert.equal(response.body.data.unit.name, 'Litre');

  const updated = await prisma.productVariant.findFirst({ where: { id: IDS.variant } });
  assert.equal(updated.unitId, MASTER_IDS.unit);
  assert.equal(updated.variantName, '500 ml Pack');
});

test('Prisma-backed HTTP e2e: variant update rejects invalid unit reference', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const before = await prisma.productVariant.findFirst({ where: { id: IDS.variant } });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/product-variants/${IDS.variant}`)
    .send({ unitId: MASTER_IDS.otherUnit })
    .expect(404);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Unit not found');

  const after = await prisma.productVariant.findFirst({ where: { id: IDS.variant } });
  assert.equal(after.unitId, before.unitId);
  assert.equal(after.variantName, before.variantName);
});

test('Prisma-backed HTTP e2e: variant update rejects duplicate SKU within organization', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const before = await prisma.productVariant.findFirst({ where: { id: IDS.variant } });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/product-variants/${IDS.variant}`)
    .send({ sku: 'SKU-002' })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Another product variant already uses the same SKU');

  const after = await prisma.productVariant.findFirst({ where: { id: IDS.variant } });
  assert.equal(after.sku, before.sku);
  assert.equal(after.variantName, before.variantName);
});
