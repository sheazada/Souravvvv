// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { AuditController } from '../src/core/audit/audit.controller';
import { AuditService } from '../src/core/audit/audit.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedBaseFixture,
} from './helpers/prisma-e2e';

const AUDIT_IDS = {
  log1: '78000000-0000-4000-8000-000000000001',
  log2: '78000000-0000-4000-8000-000000000002',
};

function createRetailerActor() {
  return {
    id: '78000000-0000-4000-8000-000000000099',
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

async function seedAuditFixture(prisma: any) {
  await prisma.auditLog.createMany({
    data: [
      {
        id: AUDIT_IDS.log1,
        organizationId: IDS.org,
        userId: IDS.user,
        module: 'procurement',
        entityType: 'purchase_order',
        entityId: '78000000-0000-4000-8000-000000000003',
        action: 'update_demand_extras',
        beforeJson: { extraQty: 2 },
        afterJson: { extraQty: 5 },
      },
      {
        id: AUDIT_IDS.log2,
        organizationId: IDS.org,
        userId: IDS.user,
        module: 'finance',
        entityType: 'credit_note',
        entityId: '78000000-0000-4000-8000-000000000004',
        action: 'create_credit_note',
        beforeJson: {},
        afterJson: { amount: 100 },
      },
    ],
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);
  await seedAuditFixture(prisma);

  return createPrismaBackedApp({
    controllers: [AuditController],
    providers: [AuditService],
    actor,
  });
}

test('Prisma-backed HTTP e2e: get audit-logs returns paginated records with enriched user metadata and module filtering', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/audit-logs?module=procurement')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].id, AUDIT_IDS.log1);
  assert.equal(response.body.data[0].action, 'update_demand_extras');
  assert.equal(response.body.data[0].user.id, IDS.user);
});

test('Prisma-backed HTTP e2e: retailer actor is forbidden from querying backoffice audit logs', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await request(app.getHttpServer())
    .get('/api/v1/audit-logs')
    .expect(403);
});
