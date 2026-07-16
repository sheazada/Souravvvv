// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { DeliveryController } from '../src/operations/delivery/delivery.controller';
import { DeliveryService } from '../src/operations/delivery/delivery.service';
import { PaymentsService } from '../src/operations/payments/payments.service';
import { RetailerLedgerService } from '../src/operations/payments/retailer-ledger.service';
import { PaymentMetricsService } from '../src/operations/payments/payment-metrics.service';
import { AdvanceWalletService } from '../src/operations/payments/advance-wallet.service';
import { SalesInvoicesService } from '../src/operations/sales-invoices/sales-invoices.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedBaseFixture,
} from './helpers/prisma-e2e';

const DEL_IDS = {
  driverEmp: '84000000-0000-4000-8000-000000000001',
  driverUser: '84000000-0000-4000-8000-000000000002',
  trip: '84000000-0000-4000-8000-000000000003',
  stop: '84000000-0000-4000-8000-000000000004',
  stopItem: '84000000-0000-4000-8000-000000000005',
  crateType: '84000000-0000-4000-8000-000000000006',
};

function createDriverActor() {
  return {
    id: DEL_IDS.driverUser,
    organizationId: IDS.org,
    retailerId: null,
    employeeId: DEL_IDS.driverEmp,
    fullName: 'Ram Driver',
    mobile: '9797979797',
    userType: 'employee',
    roles: ['STAFF'],
    permissions: [],
  };
}

async function seedDeliveryFixture(prisma: any) {
  const today = new Date();
  today.setHours(10, 0, 0, 0);

  await prisma.employee.create({
    data: {
      id: DEL_IDS.driverEmp,
      organizationId: IDS.org,
      employeeCode: 'DRV-001',
      fullName: 'Ram Driver',
      mobile: '9797979797',
      designation: 'Driver',
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      id: DEL_IDS.driverUser,
      organizationId: IDS.org,
      fullName: 'Ram Driver',
      mobile: '9797979797',
      userType: 'employee',
      employeeId: DEL_IDS.driverEmp,
      isActive: true,
    },
  });

  await prisma.crateType.create({
    data: {
      id: DEL_IDS.crateType,
      organizationId: IDS.org,
      code: 'CR-DEL-24',
      name: '24 Pouch Crate Delivery',
      depositValue: 150,
      isActive: true,
    },
  });

  await prisma.dispatchTrip.create({
    data: {
      id: DEL_IDS.trip,
      organizationId: IDS.org,
      tripNo: 'TRIP-DEL-001',
      routeId: IDS.route,
      deliveryCycleId: IDS.cycle,
      driverEmployeeId: DEL_IDS.driverEmp,
      dispatchDate: today,
      status: 'dispatched',
    },
  });

  await prisma.deliveryStop.create({
    data: {
      id: DEL_IDS.stop,
      organizationId: IDS.org,
      dispatchTripId: DEL_IDS.trip,
      retailerId: IDS.retailer,
      salesOrderId: IDS.order,
      stopSequence: 1,
      status: 'pending',
    },
  });

  await prisma.deliveryStopItem.create({
    data: {
      id: DEL_IDS.stopItem,
      organizationId: IDS.org,
      deliveryStopId: DEL_IDS.stop,
      variantId: IDS.variant,
      orderedQty: 25,
      loadedQty: 25,
      deliveredQty: 0,
      returnedQty: 0,
      damagedQty: 0,
      refusedQty: 0,
      unitPrice: 50,
    },
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);
  await seedDeliveryFixture(prisma);

  return createPrismaBackedApp({
    controllers: [DeliveryController],
    providers: [
      DeliveryService,
      {
        provide: PaymentsService,
        useValue: {
          recordDeliveryStopCollection: async (currentActor: any, stopId: string, dto: any) => {
            await prisma.paymentReceipt.create({
              data: {
                id: '84000000-0000-4000-8000-000000000010',
                organizationId: IDS.org,
                receiptNo: 'REC-DEL-101',
                partyType: 'retailer',
                partyId: IDS.retailer,
                paymentDirection: 'inbound',
                paymentDate: new Date(),
                paymentMode: dto?.paymentMode ?? 'cash',
                amount: dto?.amount ?? 1000,
                collectedByUserId: currentActor?.id ?? DEL_IDS.driverUser,
                status: 'confirmed',
              },
            });
            return { success: true, id: 'rec-new' };
          },
        },
      },
      {
        provide: RetailerLedgerService,
        useValue: {
          recordDeliveryStopCollection: async () => ({ success: true, id: 'rec-new' }),
          getLedgerEntries: async () => ({ data: [] }),
        },
      },
      {
        provide: PaymentMetricsService,
        useValue: {
          refreshAfterPayment: async () => {},
        },
      },
      {
        provide: AdvanceWalletService,
        useValue: {},
      },
      {
        provide: SalesInvoicesService,
        useValue: {
          recomputeFromDelivery: async () => ({ success: true }),
          cancel: async () => ({ success: true }),
        },
      },
    ],
    actor: actor ?? createDriverActor(),
  });
}

test('Prisma-backed HTTP e2e: driver get my/trips/today returns active assigned route trips', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/my/trips/today')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].tripNo, 'TRIP-DEL-001');
});

test('Prisma-backed HTTP e2e: driver update my/delivery-stops/:id/status records partial delivery variance', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/my/delivery-stops/${DEL_IDS.stop}/status`)
    .send({
      status: 'partial',
      items: [
        {
          variantId: IDS.variant,
          deliveredQty: 20,
          returnedQty: 5,
          damagedQty: 0,
        },
      ],
      notes: '5 pouches returned at shop door',
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, 'partial');

  const dbItem = await prisma.deliveryStopItem.findFirst({ where: { deliveryStopId: DEL_IDS.stop } });
  assert.equal(Number(dbItem.deliveredQty), 20);
  assert.equal(Number(dbItem.returnedQty), 5);
});

test('Prisma-backed HTTP e2e: driver record collection on delivery stop aggregates into collection summary', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const colRes = await request(app.getHttpServer())
    .post(`/api/v1/my/delivery-stops/${DEL_IDS.stop}/collections`)
    .send({
      amount: 1000,
      paymentMode: 'cash',
      paymentDate: new Date().toISOString(),
      remarks: 'Route collection cash',
    })
    .expect(201);

  assert.equal(colRes.body.success, true);

  const summaryRes = await request(app.getHttpServer())
    .get('/api/v1/my/collection-summary')
    .expect(200);

  assert.equal(summaryRes.body.success, true);
  assert.equal(Number(summaryRes.body.data.totalAmount), 1000);
  assert.equal(summaryRes.body.data.totalCount, 1);
});

test('Prisma-backed HTTP e2e: driver add crate transaction records empties collected from shop', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/my/delivery-stops/${DEL_IDS.stop}/crates`)
    .send({
      crateTypeId: DEL_IDS.crateType,
      transactionType: 'return',
      quantity: 12,
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.quantity, 12);
  assert.equal(response.body.data.transactionType, 'return');
});
