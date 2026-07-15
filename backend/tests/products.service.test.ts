import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductsService } from '../src/masters/products/products.service';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';

const IDS = {
  org: '75000000-0000-4000-8000-000000000001',
  otherOrg: '75000000-0000-4000-8000-000000000002',
  user: '75000000-0000-4000-8000-000000000003',
  retailerUser: '75000000-0000-4000-8000-000000000004',
  product: '75000000-0000-4000-8000-000000000005',
  product2: '75000000-0000-4000-8000-000000000006',
  variant: '75000000-0000-4000-8000-000000000007',
  variant2: '75000000-0000-4000-8000-000000000008',
  brand: '75000000-0000-4000-8000-000000000009',
  otherBrand: '75000000-0000-4000-8000-000000000010',
  category: '75000000-0000-4000-8000-000000000011',
  taxCode: '75000000-0000-4000-8000-000000000012',
  crateType: '75000000-0000-4000-8000-000000000013',
  unit: '75000000-0000-4000-8000-000000000014',
  otherUnit: '75000000-0000-4000-8000-000000000015',
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
    retailerId: 'retailer-1',
    employeeId: null,
    fullName: 'Retailer User',
    mobile: '8888888888',
    userType: 'retailer_user',
    roles: ['RETAILER'],
    permissions: [],
  };
}

function createServiceFixture() {
  const state = {
    products: [
      {
        id: IDS.product,
        organizationId: IDS.org,
        productCode: 'PROD-001',
        name: 'Sudha Toned Milk',
        brandId: IDS.brand,
        categoryId: IDS.category,
        description: 'Milk product',
        taxCodeId: IDS.taxCode,
        isBatchTracked: false,
        isExpiryTracked: true,
        isReturnable: true,
        defaultCrateTypeId: IDS.crateType,
        status: 'active',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      },
      {
        id: IDS.product2,
        organizationId: IDS.org,
        productCode: 'PROD-002',
        name: 'Sudha Curd',
        brandId: IDS.brand,
        categoryId: IDS.category,
        description: 'Curd product',
        taxCodeId: IDS.taxCode,
        isBatchTracked: false,
        isExpiryTracked: false,
        isReturnable: true,
        defaultCrateTypeId: IDS.crateType,
        status: 'active',
        createdAt: new Date('2026-07-12T01:00:00.000Z'),
        updatedAt: new Date('2026-07-12T01:00:00.000Z'),
      },
    ],
    variants: [
      {
        id: IDS.variant,
        organizationId: IDS.org,
        productId: IDS.product,
        sku: 'SKU-001',
        variantName: '500 ml',
        sizeValue: '0.500',
        unitId: IDS.unit,
        barcode: '8900000000012',
        mrp: '32.00',
        distributorPrice: '28.00',
        defaultRetailerPrice: '30.00',
        offerPrice: '27.50',
        status: 'active',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      },
      {
        id: IDS.variant2,
        organizationId: IDS.org,
        productId: IDS.product2,
        sku: 'SKU-002',
        variantName: '1 litre',
        sizeValue: '1.000',
        unitId: IDS.unit,
        barcode: '8900000000099',
        mrp: '64.00',
        distributorPrice: '58.00',
        defaultRetailerPrice: '60.00',
        offerPrice: null,
        status: 'active',
        createdAt: new Date('2026-07-12T01:00:00.000Z'),
        updatedAt: new Date('2026-07-12T01:00:00.000Z'),
      },
    ],
    brands: [
      { id: IDS.brand, organizationId: IDS.org, name: 'Sudha', isActive: true },
      { id: IDS.otherBrand, organizationId: IDS.otherOrg, name: 'Other Brand', isActive: true },
    ],
    categories: [{ id: IDS.category, organizationId: IDS.org, name: 'Dairy', parentId: null, isActive: true }],
    taxCodes: [
      {
        id: IDS.taxCode,
        organizationId: IDS.org,
        code: 'GST5',
        hsnCode: '0401',
        gstRate: '5.00',
        cgstRate: '2.50',
        sgstRate: '2.50',
        igstRate: '5.00',
        isActive: true,
      },
    ],
    crateTypes: [
      {
        id: IDS.crateType,
        organizationId: IDS.org,
        code: 'CR24',
        name: '24 Bottle Crate',
        capacityUnits: 24,
        depositValue: '250.00',
        isActive: true,
      },
    ],
    units: [{ id: IDS.unit, organizationId: IDS.org, code: 'LTR', name: 'Litre', decimalPlaces: 3 }],
  };

  let productCounter = 100;
  let variantCounter = 200;

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  const attachProduct = (product: any) => ({
    ...clone(product),
    brand: state.brands.find((row) => row.id === product.brandId) ?? null,
    category: (() => {
      const category = state.categories.find((row) => row.id === product.categoryId) ?? null;
      return category ? { ...clone(category), parent: null } : null;
    })(),
    taxCode: state.taxCodes.find((row) => row.id === product.taxCodeId) ?? null,
    defaultCrateType: state.crateTypes.find((row) => row.id === product.defaultCrateTypeId) ?? null,
    variants: state.variants.filter((row) => row.productId === product.id).map(attachVariant),
  });

  const attachVariant = (variant: any) => ({
    ...clone(variant),
    product: (() => {
      const product = state.products.find((row) => row.id === variant.productId) ?? null;
      return product ? { id: product.id, name: product.name } : null;
    })(),
    unit: state.units.find((row) => row.id === variant.unitId) ?? null,
  });

  const prisma = {
    product: {
      findFirst: async ({ where, select, include }: any = {}) => {
        const row =
          state.products.find((product) => {
            if (where?.organizationId && product.organizationId !== where.organizationId) return false;
            if (typeof where?.id === 'string' && product.id !== where.id) return false;
            if (where?.id?.not && product.id === where.id.not) return false;
            if (where?.productCode && product.productCode !== where.productCode) return false;
            return true;
          }) ?? null;

        if (!row) return null;
        if (select) return { id: row.id };
        if (include) return attachProduct(row);
        return clone(row);
      },
      findMany: async ({ where }: any = {}) => {
        let rows = state.products.filter((row) => row.organizationId === where.organizationId);
        if (where?.brandId) rows = rows.filter((row) => row.brandId === where.brandId);
        if (where?.categoryId) rows = rows.filter((row) => row.categoryId === where.categoryId);
        if (where?.status) rows = rows.filter((row) => row.status === where.status);
        return rows.map(attachProduct);
      },
      count: async ({ where }: any = {}) => {
        let rows = state.products.filter((row) => row.organizationId === where.organizationId);
        if (where?.brandId) rows = rows.filter((row) => row.brandId === where.brandId);
        if (where?.categoryId) rows = rows.filter((row) => row.categoryId === where.categoryId);
        if (where?.status) rows = rows.filter((row) => row.status === where.status);
        return rows.length;
      },
      create: async ({ data, include }: any) => {
        const created = {
          id: `product-${productCounter++}`,
          createdAt: new Date('2026-07-12T02:00:00.000Z'),
          updatedAt: new Date('2026-07-12T02:00:00.000Z'),
          ...data,
        };
        state.products.push(created);
        return include ? attachProduct(created) : clone(created);
      },
      update: async ({ where, data, include }: any) => {
        const row = state.products.find((product) => product.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date('2026-07-12T03:00:00.000Z') });
        return include ? attachProduct(row) : clone(row);
      },
    },
    productVariant: {
      findFirst: async ({ where, select, include }: any = {}) => {
        const row =
          state.variants.find((variant) => {
            if (where?.organizationId && variant.organizationId !== where.organizationId) return false;
            if (typeof where?.id === 'string' && variant.id !== where.id) return false;
            if (where?.id?.not && variant.id === where.id.not) return false;
            if (where?.sku && variant.sku !== where.sku) return false;
            return true;
          }) ?? null;

        if (!row) return null;
        if (select) return { id: row.id };
        if (include) return attachVariant(row);
        return clone(row);
      },
      findMany: async ({ where }: any = {}) =>
        state.variants
          .filter((variant) => {
            if (where?.organizationId && variant.organizationId !== where.organizationId) return false;
            if (where?.productId && variant.productId !== where.productId) return false;
            return true;
          })
          .map(attachVariant),
      create: async ({ data, include }: any) => {
        const created = {
          id: `variant-${variantCounter++}`,
          createdAt: new Date('2026-07-12T02:00:00.000Z'),
          updatedAt: new Date('2026-07-12T02:00:00.000Z'),
          ...data,
        };
        state.variants.push(created);
        return include ? attachVariant(created) : clone(created);
      },
      update: async ({ where, data, include }: any) => {
        const row = state.variants.find((variant) => variant.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date('2026-07-12T03:00:00.000Z') });
        return include ? attachVariant(row) : clone(row);
      },
    },
    brand: {
      findFirst: async ({ where }: any = {}) =>
        state.brands.find((row) => row.organizationId === where.organizationId && row.id === where.id) ?? null,
    },
    productCategory: {
      findFirst: async ({ where }: any = {}) =>
        state.categories.find((row) => row.organizationId === where.organizationId && row.id === where.id) ?? null,
    },
    taxCode: {
      findFirst: async ({ where }: any = {}) =>
        state.taxCodes.find((row) => row.organizationId === where.organizationId && row.id === where.id) ?? null,
    },
    crateType: {
      findFirst: async ({ where }: any = {}) =>
        state.crateTypes.find((row) => row.organizationId === where.organizationId && row.id === where.id) ?? null,
    },
    unit: {
      findFirst: async ({ where }: any = {}) =>
        state.units.find((row) => row.organizationId === where.organizationId && row.id === where.id) ?? null,
    },
  } as any;

  return {
    state,
    service: new ProductsService(prisma),
  };
}

test('create rejects duplicate product code before write', async () => {
  const { service, state } = createServiceFixture();

  await assert.rejects(
    () =>
      service.create(createActor(), {
        productCode: 'PROD-001',
        name: 'Duplicate Milk',
      } as any),
    /Product with same code already exists/,
  );

  assert.equal(state.products.length, 2);
});

test('create rejects invalid brand lookup reference', async () => {
  const { service, state } = createServiceFixture();

  await assert.rejects(
    () =>
      service.create(createActor(), {
        productCode: 'PROD-003',
        name: 'Invalid Brand Product',
        brandId: IDS.otherBrand,
      } as any),
    /Brand not found/,
  );

  assert.equal(state.products.length, 2);
});

test('update rejects duplicate product code used by another product', async () => {
  const { service } = createServiceFixture();

  await assert.rejects(
    () =>
      service.update(createActor(), IDS.product, {
        productCode: 'PROD-002',
      } as any),
    /Another product already uses the same code/,
  );
});

test('createVariant rejects product path/body mismatch before persistence', async () => {
  const { service, state } = createServiceFixture();

  await assert.rejects(
    () =>
      service.createVariant(createActor(), IDS.product, {
        productId: IDS.product2,
        sku: 'SKU-NEW-003',
        mrp: 72,
        distributorPrice: 68,
        defaultRetailerPrice: 70,
      } as any),
    /Variant product must match requested product/,
  );

  assert.equal(state.variants.length, 2);
});

test('createVariant rejects duplicate SKU before write', async () => {
  const { service, state } = createServiceFixture();

  await assert.rejects(
    () =>
      service.createVariant(createActor(), IDS.product, {
        productId: IDS.product,
        sku: 'SKU-001',
        mrp: 72,
        distributorPrice: 68,
        defaultRetailerPrice: 70,
      } as any),
    /Product variant with same SKU already exists/,
  );

  assert.equal(state.variants.length, 2);
});

test('createVariant rejects invalid unit lookup reference', async () => {
  const { service, state } = createServiceFixture();

  await assert.rejects(
    () =>
      service.createVariant(createActor(), IDS.product, {
        productId: IDS.product,
        sku: 'SKU-NEW-003',
        unitId: IDS.otherUnit,
        mrp: 72,
        distributorPrice: 68,
        defaultRetailerPrice: 70,
      } as any),
    /Unit not found/,
  );

  assert.equal(state.variants.length, 2);
});

test('updateVariant rejects moving variant to another product', async () => {
  const { service } = createServiceFixture();

  await assert.rejects(
    () =>
      service.updateVariant(createActor(), IDS.variant, {
        productId: IDS.product2,
      } as any),
    /Product variant cannot be moved to another product in this flow/,
  );
});

test('updateVariant rejects duplicate SKU used by another variant', async () => {
  const { service } = createServiceFixture();

  await assert.rejects(
    () =>
      service.updateVariant(createActor(), IDS.variant, {
        sku: 'SKU-002',
      } as any),
    /Another product variant already uses the same SKU/,
  );
});

test('findAll returns paginated serialized products with linked search-friendly fields', async () => {
  const { service } = createServiceFixture();

  const result = await service.findAll(createActor(), {
    page: 1,
    limit: 20,
    brandId: IDS.brand,
    categoryId: IDS.category,
    availableOnly: 'true',
    search: 'sudha',
  } as any);

  assert.equal(result.success, true);
  assert.equal(result.meta.total, 2);
  assert.equal(result.meta.page, 1);
  assert.equal(result.data.length, 2);
  assert.equal(result.data[0].brand.name, 'Sudha');
  assert.equal(result.data[0].taxCode.code, 'GST5');
  assert.equal(result.data[0].defaultCrateType.name, '24 Bottle Crate');
});

test('createVariant returns serialized numeric variant fields and unit details', async () => {
  const { service } = createServiceFixture();

  const result = await service.createVariant(createActor(), IDS.product, {
    productId: IDS.product,
    sku: 'SKU-NEW-003',
    variantName: '750 ml',
    sizeValue: 0.75,
    unitId: IDS.unit,
    barcode: '8900000000020',
    mrp: 48,
    distributorPrice: 42,
    defaultRetailerPrice: 45,
    offerPrice: 40,
    status: 'active',
  } as any);

  assert.equal(result.success, true);
  assert.equal(result.data.sku, 'SKU-NEW-003');
  assert.equal(result.data.sizeValue, 0.75);
  assert.equal(result.data.mrp, 48);
  assert.equal(result.data.distributorPrice, 42);
  assert.equal(result.data.defaultRetailerPrice, 45);
  assert.equal(result.data.offerPrice, 40);
  assert.equal(result.data.unit.id, IDS.unit);
  assert.equal(result.data.unit.code, 'LTR');
});

test('retailer actor is forbidden from backoffice product service flows', async () => {
  const { service } = createServiceFixture();

  await assert.rejects(
    () => service.findAll(createRetailerActor(), { page: 1, limit: 20 } as any),
    /Backoffice access required/,
  );

  await assert.rejects(
    () =>
      service.createVariant(createRetailerActor(), IDS.product, {
        productId: IDS.product,
        sku: 'SKU-NEW-004',
        mrp: 50,
        distributorPrice: 46,
        defaultRetailerPrice: 48,
      } as any),
    /Backoffice access required/,
  );
});
