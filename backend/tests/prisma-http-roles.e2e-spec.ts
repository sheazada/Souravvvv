// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { RolesController } from '../src/core/roles/roles.controller';
import { RolesService } from '../src/core/roles/roles.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedBaseFixture,
} from './helpers/prisma-e2e';

const ROLE_IDS = {
  roleCustom: '80000000-0000-4000-8000-000000000001',
  roleSystem: '80000000-0000-4000-8000-000000000002',
  permRead: '80000000-0000-4000-8000-000000000003',
  permWrite: '80000000-0000-4000-8000-000000000004',
};

function createRetailerActor() {
  return {
    id: '80000000-0000-4000-8000-000000000099',
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

async function seedRolesFixture(prisma: any) {
  await prisma.permission.createMany({
    data: [
      {
        id: ROLE_IDS.permRead,
        code: 'procurement:read',
        module: 'procurement',
        action: 'read',
        description: 'Read procurement orders',
      },
      {
        id: ROLE_IDS.permWrite,
        code: 'procurement:write',
        module: 'procurement',
        action: 'write',
        description: 'Write procurement orders',
      },
    ],
  });

  await prisma.role.createMany({
    data: [
      {
        id: ROLE_IDS.roleCustom,
        organizationId: IDS.org,
        code: 'LOGISTICS_MGR',
        name: 'Logistics Manager',
        description: 'Handles dispatch trips',
        isSystemRole: false,
      },
      {
        id: ROLE_IDS.roleSystem,
        organizationId: IDS.org,
        code: 'SYS_ADMIN',
        name: 'System Administrator',
        description: 'Built-in administrator role',
        isSystemRole: true,
      },
    ],
  });

  await prisma.rolePermission.create({
    data: {
      roleId: ROLE_IDS.roleCustom,
      permissionId: ROLE_IDS.permRead,
    },
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);
  await seedRolesFixture(prisma);

  return createPrismaBackedApp({
    controllers: [RolesController],
    providers: [RolesService],
    actor,
  });
}

test('Prisma-backed HTTP e2e: create role creates custom role and assigns permissions', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/roles')
    .send({
      code: 'sales_officer',
      name: 'Sales Officer',
      description: 'Field sales operations',
      permissionCodes: ['procurement:read', 'procurement:write'],
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.code, 'SALES_OFFICER');
  assert.equal(response.body.data.permissions.length, 2);
});

test('Prisma-backed HTTP e2e: update role prevents renaming predefined system roles', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/roles/${ROLE_IDS.roleSystem}`)
    .send({
      name: 'Hacked System Role Name',
    })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'System roles cannot be renamed or modified');
});

test('Prisma-backed HTTP e2e: delete role prevents deleting predefined system roles', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .delete(`/api/v1/roles/${ROLE_IDS.roleSystem}`)
    .expect(409);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'System roles cannot be deleted');
});

test('Prisma-backed HTTP e2e: get permissions lists available system permissions', async (t) => {
  const { app } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .get('/api/v1/permissions?module=procurement')
    .expect(200);

  assert.equal(response.body.success, true);
  assert.ok(response.body.data.length >= 2);
  assert.equal(response.body.data[0].module, 'procurement');
});

test('Prisma-backed HTTP e2e: retailer actor is forbidden from managing roles and permissions', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await request(app.getHttpServer())
    .get('/api/v1/roles')
    .expect(403);
});
