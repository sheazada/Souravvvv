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
import { ProductVariantsController } from '../src/masters/products/product-variants.controller';
import { ProductsController } from '../src/masters/products/products.controller';
import { ProductsService } from '../src/masters/products/products.service';
import { PrismaService } from '../src/prisma/prisma.service';

const IDS = {
  org: '71000000-0000-4000-8000-000000000001',
  otherOrg: '71000000-0000-4000-8000-000000000002',
  user: '71000000-0000-4000-8000-000000000003',
  product: '71000000-0000-4000-8000-000000000004',
  brand: '71000000-0000-4000-8000-000000000005',
  otherBrand: '71000000-0000-4000-8000-000000000006',
  brand2: '71000000-0000-4000-8000-000000000016',
  category: '71000000-0000-4000-8000-000000000007',
  otherCategory: '71000000-0000-4000-8000-000000000008',
  category2: '71000000-0000-4000-8000-000000000017',
  taxCode: '71000000-0000-4000-8000-000000000009',
  otherTaxCode: '71000000-0000-4000-8000-000000000010',
  taxCode2: '71000000-0000-4000-8000-000000000018',
  crateType: '71000000-0000-4000-8000-000000000011',
  otherCrateType: '71000000-0000-4000-8000-000000000012',
  unit: '71000000-0000-4000-8000-000000000013',
  otherUnit: '71000000-0000-4000-8000-000000000014',
  variant: '71000000-0000-4000-8000-000000000015',
  variant2: '71000000-0000-4000-8000-000000000019',
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
    id: '71000000-0000-4000-8000-000000000020',
    organizationId: IDS.org,
    retailerId: IDS.product,
    employeeId: null,
    fullName: 'Retailer User',
    mobile: '8888888888',
    userType: 'retailer_user',
    roles: ['RETAILER'],
    permissions: [],
  };
}

function createStaffActor(): AuthenticatedUser {
  return {
    id: '71000000-0000-4000-8000-000000000025',
    organizationId: IDS.org,
    retailerId: null,
    employeeId: '71000000-0000-4000-8000-000000000026',
    fullName: 'Staff User',
    mobile: '7777777777',
    userType: 'employee',
    roles: ['STAFF'],
    permissions: [],
  };
}

function createHarness() {
  const state = {
    brands: [
      { id: IDS.brand, organizationId: IDS.org, name: 'Sudha', isActive: true },
      { id: IDS.otherBrand, organizationId: IDS.otherOrg, name: 'Other Brand', isActive: true },
      { id: IDS.brand2, organizationId: IDS.org, name: 'Paras', isActive: true },
    ],
    categories: [
      { id: IDS.category, organizationId: IDS.org, name: 'Milk', parentId: null, isActive: true },
      { id: IDS.otherCategory, organizationId: IDS.otherOrg, name: 'Other Category', parentId: null, isActive: true },
      { id: IDS.category2, organizationId: IDS.org, name: 'Curd', parentId: null, isActive: true },
    ],
    taxCodes: [
      {
        id: IDS.taxCode,
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
        id: IDS.otherTaxCode,
        organizationId: IDS.otherOrg,
        code: 'GST12',
        hsnCode: '9999',
        gstRate: 12,
        cgstRate: 6,
        sgstRate: 6,
        igstRate: 12,
        isActive: true,
      },
      {
        id: IDS.taxCode2,
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
    crateTypes: [
      {
        id: IDS.crateType,
        organizationId: IDS.org,
        code: 'CR-24',
        name: '24 Bottle Crate',
        capacityUnits: 24,
        depositValue: 250,
        isActive: true,
      },
      {
        id: IDS.otherCrateType,
        organizationId: IDS.otherOrg,
        code: 'CR-12',
        name: '12 Bottle Crate',
        capacityUnits: 12,
        depositValue: 150,
        isActive: true,
      },
    ],
    units: [
      { id: IDS.unit, organizationId: IDS.org, code: 'LTR', name: 'Litre', decimalPlaces: 3 },
      { id: IDS.otherUnit, organizationId: IDS.otherOrg, code: 'BOX', name: 'Box', decimalPlaces: 0 },
    ],
    products: [
      {
        id: IDS.product,
        organizationId: IDS.org,
        productCode: 'PROD-001',
        name: 'Sudha Toned Milk',
        brandId: null,
        categoryId: null,
        description: 'Existing product',
        taxCodeId: null,
        isBatchTracked: false,
        isExpiryTracked: false,
        isReturnable: true,
        defaultCrateTypeId: null,
        status: 'active',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      },
    ],
    productVariants: [
      {
        id: IDS.variant,
        organizationId: IDS.org,
        productId: IDS.product,
        sku: 'SKU-001',
        variantName: '500 ml',
        sizeValue: 0.5,
        unitId: null,
        barcode: null,
        mrp: 32,
        distributorPrice: 28,
        defaultRetailerPrice: 30,
        offerPrice: null,
        status: 'active',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      },
    ] as any[],
  };

  let counter = 100;
  const nextId = () => `71000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`;
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  const pickSelected = (row: any, select: any) => {
    if (!select) return clone(row);
    const out: any = {};
    for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
    return out;
  };

  const containsInsensitive = (value: any, search: any) =>
    String(value ?? '').toLowerCase().includes(String(search ?? '').toLowerCase());

  const matchesWhere = (row: any, where: any = {}) => {
    if (where.organizationId && row.organizationId !== where.organizationId) return false;
    if (where.id && typeof where.id === 'string' && row.id !== where.id) return false;
    if (where.id?.not && row.id === where.id.not) return false;
    if (where.productCode && row.productCode !== where.productCode) return false;
    if (where.code && row.code !== where.code) return false;
    if (where.sku && row.sku !== where.sku) return false;
    if (where.productId && row.productId !== where.productId) return false;
    return true;
  };

  const findByWhere = (rows: any[], where: any = {}) => rows.find((row) => matchesWhere(row, where)) ?? null;

  const attachCategory = (category: any) => {
    if (!category) return null;
    const parent = category.parentId
      ? state.categories.find((row) => row.id === category.parentId) ?? null
      : null;
    return {
      ...clone(category),
      parent: parent ? { id: parent.id, name: parent.name } : null,
    };
  };

  const attachUnit = (unit: any) => (unit ? clone(unit) : null);

  const attachVariant = (variant: any) => ({
    ...clone(variant),
    product: (() => {
      const product = state.products.find((row) => row.id === variant.productId) ?? null;
      return product ? { id: product.id, name: product.name } : null;
    })(),
    unit: variant.unitId ? attachUnit(state.units.find((row) => row.id === variant.unitId) ?? null) : null,
  });

  const attachProduct = (product: any) => ({
    ...clone(product),
    brand: product.brandId ? clone(state.brands.find((row) => row.id === product.brandId) ?? null) : null,
    category: product.categoryId
      ? attachCategory(state.categories.find((row) => row.id === product.categoryId) ?? null)
      : null,
    taxCode: product.taxCodeId ? clone(state.taxCodes.find((row) => row.id === product.taxCodeId) ?? null) : null,
    defaultCrateType: product.defaultCrateTypeId
      ? clone(state.crateTypes.find((row) => row.id === product.defaultCrateTypeId) ?? null)
      : null,
    variants: state.productVariants.filter((variant) => variant.productId === product.id).map(attachVariant),
  });

  const matchesProductSearch = (product: any, where: any = {}) => {
    if (!Array.isArray(where?.OR) || where.OR.length === 0) return true;
    const attached = attachProduct(product);

    return where.OR.some((condition: any) => {
      if (condition.productCode?.contains) {
        return containsInsensitive(product.productCode, condition.productCode.contains);
      }
      if (condition.name?.contains) {
        return containsInsensitive(product.name, condition.name.contains);
      }
      if (condition.description?.contains) {
        return containsInsensitive(product.description, condition.description.contains);
      }
      if (condition.brand?.is?.name?.contains) {
        return containsInsensitive(attached.brand?.name, condition.brand.is.name.contains);
      }
      if (condition.category?.is?.name?.contains) {
        return containsInsensitive(attached.category?.name, condition.category.is.name.contains);
      }
      if (condition.taxCode?.is?.code?.contains) {
        return containsInsensitive(attached.taxCode?.code, condition.taxCode.is.code.contains);
      }
      if (condition.defaultCrateType?.is?.name?.contains) {
        return containsInsensitive(
          attached.defaultCrateType?.name,
          condition.defaultCrateType.is.name.contains,
        );
      }
      return false;
    });
  };

  const prisma: any = {
    product: {
      findFirst: async ({ where, select, include }: any = {}) => {
        const row = findByWhere(state.products, where);
        if (!row) return null;
        if (include) return attachProduct(row);
        if (select) return pickSelected(row, select);
        return clone(row);
      },
      findMany: async ({ where, include, orderBy, skip = 0, take }: any = {}) => {
        let rows = state.products.filter(
          (row) => matchesWhere(row, where) && matchesProductSearch(row, where),
        );
        if (where?.brandId) rows = rows.filter((row) => row.brandId === where.brandId);
        if (where?.categoryId) rows = rows.filter((row) => row.categoryId === where.categoryId);
        if (where?.status) rows = rows.filter((row) => row.status === where.status);
        if (orderBy?.createdAt === 'desc') {
          rows = rows.slice().sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
        }
        const paged = rows.slice(skip, take ? skip + take : undefined);
        return paged.map((row) => (include ? attachProduct(row) : clone(row)));
      },
      count: async ({ where }: any = {}) => {
        let rows = state.products.filter(
          (row) => matchesWhere(row, where) && matchesProductSearch(row, where),
        );
        if (where?.brandId) rows = rows.filter((row) => row.brandId === where.brandId);
        if (where?.categoryId) rows = rows.filter((row) => row.categoryId === where.categoryId);
        if (where?.status) rows = rows.filter((row) => row.status === where.status);
        return rows.length;
      },
      create: async ({ data, include }: any) => {
        const row = {
          id: nextId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.products.push(row);
        return include ? attachProduct(row) : clone(row);
      },
      update: async ({ where, data, include }: any) => {
        const row = state.products.find((item) => item.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return include ? attachProduct(row) : clone(row);
      },
    },
    productVariant: {
      findFirst: async ({ where, select, include }: any = {}) => {
        const row = findByWhere(state.productVariants, where);
        if (!row) return null;
        if (include) return attachVariant(row);
        if (select) return pickSelected(row, select);
        return clone(row);
      },
      findMany: async ({ where }: any = {}) =>
        state.productVariants.filter((row) => matchesWhere(row, where)).map(attachVariant),
      create: async ({ data, include }: any) => {
        const row = {
          id: nextId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.productVariants.push(row);
        return include ? attachVariant(row) : clone(row);
      },
      update: async ({ where, data, include }: any) => {
        const row = state.productVariants.find((item) => item.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return include ? attachVariant(row) : clone(row);
      },
    },
    brand: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = findByWhere(state.brands, where);
        return row ? pickSelected(row, select) : null;
      },
    },
    productCategory: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = findByWhere(state.categories, where);
        return row ? pickSelected(row, select) : null;
      },
    },
    taxCode: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = findByWhere(state.taxCodes, where);
        return row ? pickSelected(row, select) : null;
      },
    },
    crateType: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = findByWhere(state.crateTypes, where);
        return row ? pickSelected(row, select) : null;
      },
    },
    unit: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = findByWhere(state.units, where);
        return row ? pickSelected(row, select) : null;
      },
    },
  };

  return { prisma, state };
}

async function createApp(actor: AuthenticatedUser = createActor()) {
  const harness = createHarness();
  const moduleRef = await Test.createTestingModule({
    controllers: [ProductsController, ProductVariantsController],
    providers: [ProductsService, { provide: PrismaService, useValue: harness.prisma }],
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

function buildProductPayload(overrides: Record<string, any> = {}) {
  return {
    productCode: 'PROD-NEW-001',
    name: 'Sudha Full Cream Milk',
    brandId: IDS.brand,
    categoryId: IDS.category,
    taxCodeId: IDS.taxCode,
    defaultCrateTypeId: IDS.crateType,
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
    unitId: IDS.unit,
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
  test(`HTTP e2e: retailer user cannot ${routeCase.label}`, async (t) => {
    const { app } = await createApp(createRetailerActor());
    t.after(async () => app.close());

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
    actor: createActor,
    buildProductPayload: () =>
      buildProductPayload({ productCode: 'PROD-OWNER-001', name: 'Owner Created Product' }),
    buildVariantPayload: () =>
      buildVariantPayload({ sku: 'SKU-OWNER-001', variantName: 'Owner Variant' }),
  },
  {
    label: 'staff',
    actor: createStaffActor,
    buildProductPayload: () =>
      buildProductPayload({ productCode: 'PROD-STAFF-001', name: 'Staff Created Product' }),
    buildVariantPayload: () =>
      buildVariantPayload({ sku: 'SKU-STAFF-001', variantName: 'Staff Variant' }),
  },
]) {
  test(`HTTP e2e: ${actorCase.label} can list products`, async (t) => {
    const { app } = await createApp(actorCase.actor());
    t.after(async () => app.close());

    await request(app.getHttpServer()).get('/api/v1/products').expect(200);
  });

  test(`HTTP e2e: ${actorCase.label} can create product`, async (t) => {
    const { app } = await createApp(actorCase.actor());
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .send(actorCase.buildProductPayload())
      .expect(201);

    assert.equal(response.body.success, true);
  });

  test(`HTTP e2e: ${actorCase.label} can read product detail`, async (t) => {
    const { app } = await createApp(actorCase.actor());
    t.after(async () => app.close());

    await request(app.getHttpServer()).get(`/api/v1/products/${IDS.product}`).expect(200);
  });

  test(`HTTP e2e: ${actorCase.label} can update product`, async (t) => {
    const { app } = await createApp(actorCase.actor());
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/products/${IDS.product}`)
      .send({ name: `${actorCase.label} product update` })
      .expect(200);

    assert.equal(response.body.success, true);
  });

  test(`HTTP e2e: ${actorCase.label} can list product variants`, async (t) => {
    const { app } = await createApp(actorCase.actor());
    t.after(async () => app.close());

    await request(app.getHttpServer()).get(`/api/v1/products/${IDS.product}/variants`).expect(200);
  });

  test(`HTTP e2e: ${actorCase.label} can create product variant`, async (t) => {
    const { app } = await createApp(actorCase.actor());
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post(`/api/v1/products/${IDS.product}/variants`)
      .send(actorCase.buildVariantPayload())
      .expect(201);

    assert.equal(response.body.success, true);
  });

  test(`HTTP e2e: ${actorCase.label} can read product variant detail`, async (t) => {
    const { app } = await createApp(actorCase.actor());
    t.after(async () => app.close());

    await request(app.getHttpServer())
      .get(`/api/v1/product-variants/${IDS.variant}`)
      .expect(200);
  });

  test(`HTTP e2e: ${actorCase.label} can update product variant`, async (t) => {
    const { app } = await createApp(actorCase.actor());
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/product-variants/${IDS.variant}`)
      .send({ variantName: `${actorCase.label} variant update` })
      .expect(200);

    assert.equal(response.body.success, true);
  });

  test(`HTTP e2e: ${actorCase.label} can update product variant status`, async (t) => {
    const { app } = await createApp(actorCase.actor());
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/product-variants/${IDS.variant}/status`)
      .send({ status: 'inactive' })
      .expect(200);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'inactive');
  });
}

test('HTTP e2e: product create accepts valid brand, category, tax code, and crate references', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post('/api/v1/products')
    .send(buildProductPayload())
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.brand.id, IDS.brand);
  assert.equal(response.body.data.brand.name, 'Sudha');
  assert.equal(response.body.data.category.id, IDS.category);
  assert.equal(response.body.data.category.name, 'Milk');
  assert.equal(response.body.data.taxCode.id, IDS.taxCode);
  assert.equal(response.body.data.taxCode.code, 'GST5');
  assert.equal(response.body.data.defaultCrateType.id, IDS.crateType);
  assert.equal(response.body.data.defaultCrateType.name, '24 Bottle Crate');
  assert.equal(response.body.data.defaultCrateType.depositValue, 250);
  assert.equal(harness.state.products.length, 2);

  const created = harness.state.products.find((row: any) => row.productCode === 'PROD-NEW-001');
  assert.equal(created.brandId, IDS.brand);
  assert.equal(created.categoryId, IDS.category);
  assert.equal(created.taxCodeId, IDS.taxCode);
  assert.equal(created.defaultCrateTypeId, IDS.crateType);
});

for (const invalidCreateCase of [
  { label: 'brand', key: 'brandId', value: IDS.otherBrand, message: 'Brand not found' },
  { label: 'category', key: 'categoryId', value: IDS.otherCategory, message: 'Product category not found' },
  { label: 'tax code', key: 'taxCodeId', value: IDS.otherTaxCode, message: 'Tax code not found' },
  { label: 'default crate type', key: 'defaultCrateTypeId', value: IDS.otherCrateType, message: 'Default crate type not found' },
]) {
  test(`HTTP e2e: product create rejects invalid ${invalidCreateCase.label} reference`, async (t) => {
    const { app, harness } = await createApp();
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .send(buildProductPayload({ [invalidCreateCase.key]: invalidCreateCase.value }))
      .expect(404);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, invalidCreateCase.message);
    assert.equal(harness.state.products.length, 1);
    assert.equal(harness.state.products.find((row: any) => row.productCode === 'PROD-NEW-001'), undefined);
  });
}

test('HTTP e2e: product update accepts valid brand, category, tax code, and crate references', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/products/${IDS.product}`)
    .send(
      buildProductPayload({
        productCode: 'PROD-001',
        name: 'Sudha Toned Milk Updated',
        description: 'Updated linked product master test',
      }),
    )
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.id, IDS.product);
  assert.equal(response.body.data.brand.id, IDS.brand);
  assert.equal(response.body.data.category.id, IDS.category);
  assert.equal(response.body.data.taxCode.id, IDS.taxCode);
  assert.equal(response.body.data.defaultCrateType.id, IDS.crateType);

  const updated = harness.state.products.find((row: any) => row.id === IDS.product);
  assert.equal(updated.name, 'Sudha Toned Milk Updated');
  assert.equal(updated.brandId, IDS.brand);
  assert.equal(updated.categoryId, IDS.category);
  assert.equal(updated.taxCodeId, IDS.taxCode);
  assert.equal(updated.defaultCrateTypeId, IDS.crateType);
});

for (const invalidUpdateCase of [
  { label: 'brand', key: 'brandId', value: IDS.otherBrand, message: 'Brand not found' },
  { label: 'category', key: 'categoryId', value: IDS.otherCategory, message: 'Product category not found' },
  { label: 'tax code', key: 'taxCodeId', value: IDS.otherTaxCode, message: 'Tax code not found' },
  { label: 'default crate type', key: 'defaultCrateTypeId', value: IDS.otherCrateType, message: 'Default crate type not found' },
]) {
  test(`HTTP e2e: product update rejects invalid ${invalidUpdateCase.label} reference`, async (t) => {
    const { app, harness } = await createApp();
    t.after(async () => app.close());

    const original = { ...harness.state.products.find((row: any) => row.id === IDS.product) };

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/products/${IDS.product}`)
      .send({ [invalidUpdateCase.key]: invalidUpdateCase.value })
      .expect(404);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, invalidUpdateCase.message);

    const updated = harness.state.products.find((row: any) => row.id === IDS.product);
    assert.equal(updated.brandId, original.brandId);
    assert.equal(updated.categoryId, original.categoryId);
    assert.equal(updated.taxCodeId, original.taxCodeId);
    assert.equal(updated.defaultCrateTypeId, original.defaultCrateTypeId);
  });
}

test('HTTP e2e: product list filters by brandId', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  Object.assign(harness.state.products.find((row: any) => row.id === IDS.product), {
    brandId: IDS.brand,
    categoryId: IDS.category,
  });
  harness.state.products.push({
    id: '71000000-0000-4000-8000-000000000018',
    organizationId: IDS.org,
    productCode: 'PROD-002',
    name: 'Paras Curd',
    brandId: IDS.brand2,
    categoryId: IDS.category2,
    description: 'Second filterable product',
    taxCodeId: IDS.taxCode,
    isBatchTracked: false,
    isExpiryTracked: false,
    isReturnable: true,
    defaultCrateTypeId: IDS.crateType,
    status: 'active',
    createdAt: new Date('2026-07-12T01:00:00.000Z'),
    updatedAt: new Date('2026-07-12T01:00:00.000Z'),
  });

  const response = await request(app.getHttpServer())
    .get(`/api/v1/products?brandId=${IDS.brand}`)
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].id, IDS.product);
  assert.equal(response.body.data[0].brand.id, IDS.brand);
  assert.equal(response.body.data[0].category.id, IDS.category);
});

test('HTTP e2e: product list filters by categoryId', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  Object.assign(harness.state.products.find((row: any) => row.id === IDS.product), {
    brandId: IDS.brand,
    categoryId: IDS.category,
  });
  harness.state.products.push({
    id: '71000000-0000-4000-8000-000000000019',
    organizationId: IDS.org,
    productCode: 'PROD-003',
    name: 'Paras Curd',
    brandId: IDS.brand2,
    categoryId: IDS.category2,
    description: 'Second filterable product',
    taxCodeId: IDS.taxCode,
    isBatchTracked: false,
    isExpiryTracked: false,
    isReturnable: true,
    defaultCrateTypeId: IDS.crateType,
    status: 'active',
    createdAt: new Date('2026-07-12T01:00:00.000Z'),
    updatedAt: new Date('2026-07-12T01:00:00.000Z'),
  });

  const response = await request(app.getHttpServer())
    .get(`/api/v1/products?categoryId=${IDS.category2}`)
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].productCode, 'PROD-003');
  assert.equal(response.body.data[0].brand.id, IDS.brand2);
  assert.equal(response.body.data[0].category.id, IDS.category2);
});

test('HTTP e2e: product search matches linked brand name', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  Object.assign(harness.state.products.find((row: any) => row.id === IDS.product), {
    name: 'Product One',
    description: 'Fresh stock one',
    brandId: IDS.brand,
    categoryId: IDS.category,
    taxCodeId: IDS.taxCode,
  });
  harness.state.products.push({
    id: '71000000-0000-4000-8000-000000000022',
    organizationId: IDS.org,
    productCode: 'PROD-004',
    name: 'Product Two',
    brandId: IDS.brand2,
    categoryId: IDS.category2,
    description: 'Fresh stock two',
    taxCodeId: IDS.taxCode2,
    isBatchTracked: false,
    isExpiryTracked: false,
    isReturnable: true,
    defaultCrateTypeId: IDS.crateType,
    status: 'active',
    createdAt: new Date('2026-07-12T02:00:00.000Z'),
    updatedAt: new Date('2026-07-12T02:00:00.000Z'),
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/products?search=paras')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].productCode, 'PROD-004');
  assert.equal(response.body.data[0].brand.id, IDS.brand2);
});

test('HTTP e2e: product search matches linked category name', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  Object.assign(harness.state.products.find((row: any) => row.id === IDS.product), {
    name: 'Product One',
    description: 'Fresh stock one',
    brandId: IDS.brand,
    categoryId: IDS.category,
    taxCodeId: IDS.taxCode,
  });
  harness.state.products.push({
    id: '71000000-0000-4000-8000-000000000023',
    organizationId: IDS.org,
    productCode: 'PROD-005',
    name: 'Product Two',
    brandId: IDS.brand2,
    categoryId: IDS.category2,
    description: 'Fresh stock two',
    taxCodeId: IDS.taxCode2,
    isBatchTracked: false,
    isExpiryTracked: false,
    isReturnable: true,
    defaultCrateTypeId: IDS.crateType,
    status: 'active',
    createdAt: new Date('2026-07-12T03:00:00.000Z'),
    updatedAt: new Date('2026-07-12T03:00:00.000Z'),
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/products?search=curd')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].productCode, 'PROD-005');
  assert.equal(response.body.data[0].category.id, IDS.category2);
});

test('HTTP e2e: product search matches linked tax code', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  Object.assign(harness.state.products.find((row: any) => row.id === IDS.product), {
    name: 'Product One',
    description: 'Fresh stock one',
    brandId: IDS.brand,
    categoryId: IDS.category,
    taxCodeId: IDS.taxCode,
  });
  harness.state.products.push({
    id: '71000000-0000-4000-8000-000000000024',
    organizationId: IDS.org,
    productCode: 'PROD-006',
    name: 'Product Two',
    brandId: IDS.brand2,
    categoryId: IDS.category2,
    description: 'Fresh stock two',
    taxCodeId: IDS.taxCode2,
    isBatchTracked: false,
    isExpiryTracked: false,
    isReturnable: true,
    defaultCrateTypeId: IDS.crateType,
    status: 'active',
    createdAt: new Date('2026-07-12T04:00:00.000Z'),
    updatedAt: new Date('2026-07-12T04:00:00.000Z'),
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/products?search=gst12')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].productCode, 'PROD-006');
  assert.equal(response.body.data[0].taxCode.id, IDS.taxCode2);
  assert.equal(response.body.data[0].taxCode.code, 'GST12');
});

test('HTTP e2e: variant create accepts valid unit reference', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post(`/api/v1/products/${IDS.product}/variants`)
    .send(buildVariantPayload())
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.unit.id, IDS.unit);
  assert.equal(response.body.data.unit.code, 'LTR');
  assert.equal(response.body.data.unit.name, 'Litre');
  assert.equal(response.body.data.unit.decimalPlaces, 3);
  assert.equal(harness.state.productVariants.length, 2);

  const created = harness.state.productVariants.find((row: any) => row.sku === 'SKU-NEW-001');
  assert.equal(created.unitId, IDS.unit);
});

test('HTTP e2e: variant create rejects invalid unit reference', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post(`/api/v1/products/${IDS.product}/variants`)
    .send(buildVariantPayload({ sku: 'SKU-NEW-002', unitId: IDS.otherUnit }))
    .expect(404);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Unit not found');
  assert.equal(harness.state.productVariants.length, 1);
  assert.equal(harness.state.productVariants.find((row: any) => row.sku === 'SKU-NEW-002'), undefined);
});

test('HTTP e2e: variant create rejects duplicate SKU within organization', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post(`/api/v1/products/${IDS.product}/variants`)
    .send(buildVariantPayload({ sku: 'SKU-001' }))
    .expect(409);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Product variant with same SKU already exists');
  assert.equal(harness.state.productVariants.length, 1);
});

test('HTTP e2e: variant update accepts valid unit reference', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/product-variants/${IDS.variant}`)
    .send({ unitId: IDS.unit, variantName: '500 ml Pack' })
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.unit.id, IDS.unit);
  assert.equal(response.body.data.unit.name, 'Litre');

  const updated = harness.state.productVariants.find((row: any) => row.id === IDS.variant);
  assert.equal(updated.unitId, IDS.unit);
  assert.equal(updated.variantName, '500 ml Pack');
});

test('HTTP e2e: variant update rejects invalid unit reference', async (t) => {
  const { app, harness } = await createApp();
  t.after(async () => app.close());

  const original = { ...harness.state.productVariants.find((row: any) => row.id === IDS.variant) };

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/product-variants/${IDS.variant}`)
    .send({ unitId: IDS.otherUnit })
    .expect(404);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Unit not found');

  const updated = harness.state.productVariants.find((row: any) => row.id === IDS.variant);
  assert.equal(updated.unitId, original.unitId);
  assert.equal(updated.variantName, original.variantName);
});
