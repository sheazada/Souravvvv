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
import { LookupsController } from '../src/core/lookups/lookups.controller';
import { LookupsService } from '../src/core/lookups/lookups.service';
import { PrismaService } from '../src/prisma/prisma.service';

const IDS = {
  org: '73000000-0000-4000-8000-000000000001',
  otherOrg: '73000000-0000-4000-8000-000000000002',
  user: '73000000-0000-4000-8000-000000000003',
  retailerUser: '73000000-0000-4000-8000-000000000004',
  retailer: '73000000-0000-4000-8000-000000000005',
  brand1: '73000000-0000-4000-8000-000000000006',
  brand2: '73000000-0000-4000-8000-000000000007',
  brandInactive: '73000000-0000-4000-8000-000000000008',
  brandOtherOrg: '73000000-0000-4000-8000-000000000009',
  categoryParent: '73000000-0000-4000-8000-000000000010',
  categoryChild: '73000000-0000-4000-8000-000000000011',
  categoryInactive: '73000000-0000-4000-8000-000000000012',
  categoryOtherOrg: '73000000-0000-4000-8000-000000000013',
  taxCode1: '73000000-0000-4000-8000-000000000014',
  taxCode2: '73000000-0000-4000-8000-000000000015',
  taxCodeInactive: '73000000-0000-4000-8000-000000000016',
  taxCodeOtherOrg: '73000000-0000-4000-8000-000000000017',
  unit1: '73000000-0000-4000-8000-000000000018',
  unit2: '73000000-0000-4000-8000-000000000019',
  unitOtherOrg: '73000000-0000-4000-8000-000000000020',
  crateType1: '73000000-0000-4000-8000-000000000021',
  crateType2: '73000000-0000-4000-8000-000000000022',
  crateTypeInactive: '73000000-0000-4000-8000-000000000023',
  crateTypeOtherOrg: '73000000-0000-4000-8000-000000000024',
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

function containsInsensitive(value: string | null | undefined, search: string) {
  return String(value ?? '').toLowerCase().includes(search.toLowerCase());
}

function createHarness() {
  const state = {
    brands: [
      { id: IDS.brand1, organizationId: IDS.org, name: 'Sudha', isActive: true },
      { id: IDS.brand2, organizationId: IDS.org, name: 'Paras', isActive: true },
      { id: IDS.brandInactive, organizationId: IDS.org, name: 'Legacy', isActive: false },
      { id: IDS.brandOtherOrg, organizationId: IDS.otherOrg, name: 'Other Brand', isActive: true },
    ],
    categories: [
      { id: IDS.categoryParent, organizationId: IDS.org, name: 'Dairy', parentId: null, isActive: true },
      { id: IDS.categoryChild, organizationId: IDS.org, name: 'Milk', parentId: IDS.categoryParent, isActive: true },
      { id: IDS.categoryInactive, organizationId: IDS.org, name: 'Legacy Category', parentId: null, isActive: false },
      { id: IDS.categoryOtherOrg, organizationId: IDS.otherOrg, name: 'Other Category', parentId: null, isActive: true },
    ],
    taxCodes: [
      {
        id: IDS.taxCode1,
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
      {
        id: IDS.taxCodeInactive,
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
        id: IDS.taxCodeOtherOrg,
        organizationId: IDS.otherOrg,
        code: 'GST18',
        hsnCode: '8888',
        gstRate: 18,
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 18,
        isActive: true,
      },
    ],
    units: [
      { id: IDS.unit1, organizationId: IDS.org, code: 'LTR', name: 'Litre', decimalPlaces: 3 },
      { id: IDS.unit2, organizationId: IDS.org, code: 'PCS', name: 'Pieces', decimalPlaces: 0 },
      { id: IDS.unitOtherOrg, organizationId: IDS.otherOrg, code: 'BOX', name: 'Box', decimalPlaces: 0 },
    ],
    crateTypes: [
      { id: IDS.crateType1, organizationId: IDS.org, code: 'CR24', name: '24 Bottle Crate', isActive: true },
      { id: IDS.crateType2, organizationId: IDS.org, code: 'CR12', name: '12 Bottle Crate', isActive: true },
      { id: IDS.crateTypeInactive, organizationId: IDS.org, code: 'LEG', name: 'Legacy Crate', isActive: false },
      { id: IDS.crateTypeOtherOrg, organizationId: IDS.otherOrg, code: 'OTH', name: 'Other Org Crate', isActive: true },
    ],
  };

  const prisma: any = {
    brand: {
      findMany: async ({ where, orderBy, take }: any = {}) => {
        let rows = state.brands.filter(
          (row) => row.organizationId === where.organizationId && row.isActive === where.isActive,
        );
        const search = where?.OR?.[0]?.name?.contains;
        if (search) rows = rows.filter((row) => containsInsensitive(row.name, search));
        if (orderBy?.name === 'asc') rows = rows.slice().sort((a, b) => a.name.localeCompare(b.name));
        return rows.slice(0, take ?? rows.length).map((row) => ({ ...row }));
      },
    },
    productCategory: {
      findMany: async ({ where, orderBy, take }: any = {}) => {
        let rows = state.categories.filter(
          (row) => row.organizationId === where.organizationId && row.isActive === where.isActive,
        );
        const search = where?.OR?.[0]?.name?.contains;
        if (search) rows = rows.filter((row) => containsInsensitive(row.name, search));
        if (Array.isArray(orderBy)) {
          rows = rows.slice().sort((a, b) => {
            const parentCompare = String(a.parentId ?? '').localeCompare(String(b.parentId ?? ''));
            if (parentCompare !== 0) return parentCompare;
            return a.name.localeCompare(b.name);
          });
        }
        return rows.slice(0, take ?? rows.length).map((row) => ({
          ...row,
          parent: row.parentId
            ? (() => {
                const parent = state.categories.find((item) => item.id === row.parentId) ?? null;
                return parent ? { id: parent.id, name: parent.name } : null;
              })()
            : null,
        }));
      },
    },
    taxCode: {
      findMany: async ({ where, orderBy, take }: any = {}) => {
        let rows = state.taxCodes.filter(
          (row) => row.organizationId === where.organizationId && row.isActive === where.isActive,
        );
        const codeSearch = where?.OR?.[0]?.code?.contains;
        const hsnSearch = where?.OR?.[1]?.hsnCode?.contains;
        if (codeSearch || hsnSearch) {
          rows = rows.filter(
            (row) =>
              containsInsensitive(row.code, codeSearch) || containsInsensitive(row.hsnCode, hsnSearch),
          );
        }
        if (orderBy?.code === 'asc') rows = rows.slice().sort((a, b) => a.code.localeCompare(b.code));
        return rows.slice(0, take ?? rows.length).map((row) => ({ ...row }));
      },
    },
    unit: {
      findMany: async ({ where, orderBy, take }: any = {}) => {
        let rows = state.units.filter((row) => row.organizationId === where.organizationId);
        const codeSearch = where?.OR?.[0]?.code?.contains;
        const nameSearch = where?.OR?.[1]?.name?.contains;
        if (codeSearch || nameSearch) {
          rows = rows.filter(
            (row) =>
              containsInsensitive(row.code, codeSearch) || containsInsensitive(row.name, nameSearch),
          );
        }
        if (Array.isArray(orderBy)) {
          rows = rows.slice().sort((a, b) => {
            const nameCompare = a.name.localeCompare(b.name);
            if (nameCompare !== 0) return nameCompare;
            return a.code.localeCompare(b.code);
          });
        }
        return rows.slice(0, take ?? rows.length).map((row) => ({ ...row }));
      },
    },
    crateType: {
      findMany: async ({ where, orderBy, take }: any = {}) => {
        let rows = state.crateTypes.filter(
          (row) => row.organizationId === where.organizationId && row.isActive === where.isActive,
        );
        const nameSearch = where?.OR?.[0]?.name?.contains;
        const codeSearch = where?.OR?.[1]?.code?.contains;
        if (nameSearch || codeSearch) {
          rows = rows.filter(
            (row) =>
              containsInsensitive(row.name, nameSearch) || containsInsensitive(row.code, codeSearch),
          );
        }
        if (orderBy?.name === 'asc') {
          rows = rows.slice().sort((a, b) => a.name.localeCompare(b.name));
        }
        return rows.slice(0, take ?? rows.length).map((row) => ({ ...row }));
      },
    },
  };

  return { prisma };
}

async function createApp(actor: AuthenticatedUser = createActor()) {
  const harness = createHarness();
  const moduleRef = await Test.createTestingModule({
    controllers: [LookupsController],
    providers: [LookupsService, { provide: PrismaService, useValue: harness.prisma }],
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
  return { app };
}

test('HTTP e2e: brands lookup returns active same-org brands and supports search', async (t) => {
  const { app } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/brands?search=sud&limit=10')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, IDS.brand1);
  assert.equal(response.body[0].name, 'Sudha');
  assert.equal(response.body[0].isActive, true);
});

test('HTTP e2e: brands lookup respects limit and name ordering', async (t) => {
  const { app } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/brands?limit=1')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, IDS.brand2);
  assert.equal(response.body[0].name, 'Paras');
});

test('HTTP e2e: product categories lookup returns parent metadata and supports search', async (t) => {
  const { app } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/product-categories?search=milk')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, IDS.categoryChild);
  assert.equal(response.body[0].name, 'Milk');
  assert.equal(response.body[0].parentId, IDS.categoryParent);
  assert.equal(response.body[0].parent.id, IDS.categoryParent);
  assert.equal(response.body[0].parent.name, 'Dairy');
});

test('HTTP e2e: tax codes lookup supports code or HSN search and excludes inactive rows', async (t) => {
  const { app } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/tax-codes?search=0401')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, IDS.taxCode1);
  assert.equal(response.body[0].code, 'GST5');
  assert.equal(response.body[0].hsnCode, '0401');
  assert.equal(Number(response.body[0].gstRate), 5);
});

test('HTTP e2e: tax codes lookup respects code ordering and limit', async (t) => {
  const { app } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/tax-codes?limit=1')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, IDS.taxCode2);
  assert.equal(response.body[0].code, 'GST12');
});

test('HTTP e2e: units lookup supports code or name search and remains organization scoped', async (t) => {
  const { app } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/units?search=ltr')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, IDS.unit1);
  assert.equal(response.body[0].code, 'LTR');
  assert.equal(response.body[0].name, 'Litre');
  assert.equal(response.body[0].decimalPlaces, 3);
});

test('HTTP e2e: crate types lookup supports code or name search and excludes inactive rows', async (t) => {
  const { app } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/crate-types?search=cr24')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, IDS.crateType1);
  assert.equal(response.body[0].code, 'CR24');
  assert.equal(response.body[0].name, '24 Bottle Crate');
});

test('HTTP e2e: crate types lookup respects name ordering and limit', async (t) => {
  const { app } = await createApp();
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .get('/api/v1/lookups/crate-types?limit=1')
    .expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, IDS.crateType2);
  assert.equal(response.body[0].name, '12 Bottle Crate');
});

for (const endpoint of ['brands', 'product-categories', 'tax-codes', 'units', 'crate-types']) {
  test(`HTTP e2e: retailer user cannot access ${endpoint} lookup`, async (t) => {
    const { app } = await createApp(createRetailerActor());
    t.after(async () => app.close());

    const response = await request(app.getHttpServer())
      .get(`/api/v1/lookups/${endpoint}`)
      .expect(403);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Backoffice access required');
  });
}
