// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { PurchaseInvoicesController } from '../src/operations/purchase-invoices/purchase-invoices.controller';
import { PurchaseInvoicesService } from '../src/operations/purchase-invoices/purchase-invoices.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedBaseFixture,
} from './helpers/prisma-e2e';

const PINV_IDS = {
  supplier: '81000000-0000-4000-8000-000000000001',
  grn: '81000000-0000-4000-8000-000000000002',
  inv: '81000000-0000-4000-8000-000000000003',
  item: '81000000-0000-4000-8000-000000000004',
  warehouse: '81000000-0000-4000-8000-000000000010',
};

function createRetailerActor() {
  return {
    id: '81000000-0000-4000-8000-000000000099',
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

async function seedPurchaseInvoicesFixture(prisma: any) {
  await prisma.supplier.create({
    data: {
      id: PINV_IDS.supplier,
      organizationId: IDS.org,
      supplierCode: 'SUP-PINV-01',
      name: 'Sudha Plant Patna',
      contactPerson: 'Accounts Mgr',
      mobile: '9595959595',
      paymentTermsDays: 14,
      isActive: true,
    },
  });

  await prisma.warehouse.create({
    data: {
      id: PINV_IDS.warehouse,
      organizationId: IDS.org,
      code: 'WH-PINV-01',
      name: 'Central Billing Storage',
      warehouseType: 'main',
      isActive: true,
    },
  });

  await prisma.goodsReceipt.create({
    data: {
      id: PINV_IDS.grn,
      organizationId: IDS.org,
      grnNo: 'GRN-PINV-001',
      supplierId: PINV_IDS.supplier,
      warehouseId: PINV_IDS.warehouse,
      receiptDate: new Date('2026-07-15T00:00:00.000Z'),
      status: 'posted',
    },
  });

  await prisma.purchaseInvoice.create({
    data: {
      id: PINV_IDS.inv,
      organizationId: IDS.org,
      invoiceNo: 'PINV-2026-001',
      internalVoucherNo: 'VCH-PINV-001',
      supplierId: PINV_IDS.supplier,
      goodsReceiptId: PINV_IDS.grn,
      invoiceDate: new Date('2026-07-15T00:00:00.000Z'),
      taxableAmount: 2000,
      taxTotal: 100,
      grandTotal: 2100,
      status: 'draft',
    },
  });

  await prisma.purchaseInvoiceItem.create({
    data: {
      id: PINV_IDS.item,
      organizationId: IDS.org,
      purchaseInvoiceId: PINV_IDS.inv,
      variantId: IDS.variant,
      billedQty: 40,
      unitCost: 50,
      taxAmount: 100,
    },
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);
  await seedPurchaseInvoicesFixture(prisma);

  return createPrismaBackedApp({
    controllers: [PurchaseInvoicesController],
    providers: [PurchaseInvoicesService],
    actor,
  });
}

test('Prisma-backed HTTP e2e: create purchase invoice calculates taxableAmount, taxTotal, and grandTotal', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/purchase-invoices')
    .send({
      invoiceNo: 'PINV-2026-002',
      supplierId: PINV_IDS.supplier,
      goodsReceiptId: PINV_IDS.grn,
      invoiceDate: '2026-07-15T00:00:00.000Z',
      items: [
        {
          variantId: IDS.variant,
          billedQty: 50,
          unitCost: 60,
          taxAmount: 150,
        },
      ],
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.invoiceNo, 'PINV-2026-002');
  assert.equal(Number(response.body.data.taxableAmount), 3000); // 50 * 60 = 3000
  assert.equal(Number(response.body.data.taxTotal), 150);
  assert.equal(Number(response.body.data.grandTotal), 3150);
});

test('Prisma-backed HTTP e2e: approve and post purchase invoice transition state cleanly', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await request(app.getHttpServer())
    .post(`/api/v1/purchase-invoices/${PINV_IDS.inv}/approve`)
    .expect(201);

  const postRes = await request(app.getHttpServer())
    .post(`/api/v1/purchase-invoices/${PINV_IDS.inv}/post`)
    .expect(201);

  assert.equal(postRes.body.data.status, 'posted');
  const dbInv = await prisma.purchaseInvoice.findFirst({ where: { id: PINV_IDS.inv } });
  assert.equal(dbInv.status, 'posted');
});

test('Prisma-backed HTTP e2e: retailer actor is forbidden from accessing purchase invoice endpoints', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await request(app.getHttpServer())
    .get('/api/v1/purchase-invoices')
    .expect(403);
});
