// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { CratesController } from '../src/operations/crates/crates.controller';
import { CratesService } from '../src/operations/crates/crates.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedBaseFixture,
} from './helpers/prisma-e2e';

const CRATE_IDS = {
  crateType: '83000000-0000-4000-8000-000000000001',
  txIssue: '83000000-0000-4000-8000-000000000002',
  txReturn: '83000000-0000-4000-8000-000000000003',
};

function createRetailerActor() {
  return {
    id: '83000000-0000-4000-8000-000000000099',
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

async function seedCratesFixture(prisma: any) {
  const today = new Date('2026-07-15T10:00:00.000Z');

  await prisma.crateType.create({
    data: {
      id: CRATE_IDS.crateType,
      organizationId: IDS.org,
      code: 'CR-SUDHA-24',
      name: '24 Pouch Plastic Crate',
      depositValue: 150,
      isActive: true,
    },
  });

  await prisma.crateTransaction.createMany({
    data: [
      {
        id: CRATE_IDS.txIssue,
        organizationId: IDS.org,
        crateTypeId: CRATE_IDS.crateType,
        retailerId: IDS.retailer,
        transactionType: 'issue',
        quantity: 20,
        transactionDate: today,
        remarks: 'Morning delivery issue',
      },
      {
        id: CRATE_IDS.txReturn,
        organizationId: IDS.org,
        crateTypeId: CRATE_IDS.crateType,
        retailerId: IDS.retailer,
        transactionType: 'return',
        quantity: 5,
        transactionDate: today,
        remarks: 'Empties returned',
      },
    ],
  });

  await prisma.crateBalanceSnapshot.create({
    data: {
      organizationId: IDS.org,
      balanceDate: new Date('2026-07-15T00:00:00.000Z'),
      retailerId: IDS.retailer,
      crateTypeId: CRATE_IDS.crateType,
      openingQty: 0,
      issuedQty: 20,
      returnedQty: 5,
      damagedQty: 0,
      missingQty: 0,
      closingQty: 15,
    },
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);
  await seedCratesFixture(prisma);

  return createPrismaBackedApp({
    controllers: [CratesController],
    providers: [CratesService],
    actor,
  });
}

test('Prisma-backed HTTP e2e: get crate transactions returns enriched log of container issues and returns', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/crates/transactions')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 2);
  assert.equal(response.body.data[0].crateType.code, 'CR-SUDHA-24');
});

test('Prisma-backed HTTP e2e: get crate balances returns live snapshot with calculated deposit liabilities', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/crates/balances')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].closingQty, 15);
  assert.equal(Number(response.body.data[0].totalLiability), 2250); // 15 crates * ₹150 deposit = 2250
});

test('Prisma-backed HTTP e2e: create crate transaction records issue and automatically updates balance snapshot', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/crates/transactions')
    .send({
      crateTypeId: CRATE_IDS.crateType,
      retailerId: IDS.retailer,
      transactionType: 'issue',
      quantity: 10,
      transactionDate: '2026-07-15T14:00:00.000Z',
      remarks: 'Evening dispatch issue',
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.quantity, 10);

  const snapshot = await prisma.crateBalanceSnapshot.findFirst({
    where: { retailerId: IDS.retailer, crateTypeId: CRATE_IDS.crateType },
  });
  assert.equal(snapshot.issuedQty, 30); // 20 + 10 = 30
  assert.equal(snapshot.closingQty, 25); // 30 - 5 = 25
});

test('Prisma-backed HTTP e2e: recalculate balances recomputes snapshots from raw container transactions', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/crates/balances/recalculate')
    .send({ retailerId: IDS.retailer })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.match(response.body.message, /Crate balances recalculated successfully/);
});

test('Prisma-backed HTTP e2e: retailer actor can view own container balances but is forbidden from recording transactions', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const balRes = await request(app.getHttpServer())
    .get('/api/v1/crates/balances')
    .expect(200);

  assert.equal(balRes.body.success, true);
  assert.equal(balRes.body.data[0].closingQty, 15);

  await request(app.getHttpServer())
    .post('/api/v1/crates/transactions')
    .send({
      crateTypeId: CRATE_IDS.crateType,
      transactionType: 'issue',
      quantity: 5,
    })
    .expect(403);
});
