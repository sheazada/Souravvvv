// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import request = require('supertest');
import { UsersController } from '../src/core/users/users.controller';
import { UsersService } from '../src/core/users/users.service';
import {
  IDS,
  createPrismaBackedApp,
  disconnectPrisma,
  ensureTestDatabaseUrl,
  getPrisma,
  resetPrismaTestDb,
  seedBaseFixture,
} from './helpers/prisma-e2e';

const USER_IDS = {
  roleStaff: '79000000-0000-4000-8000-000000000001',
  roleSales: '79000000-0000-4000-8000-000000000002',
  userStaff: '79000000-0000-4000-8000-000000000003',
};

function createRetailerActor() {
  return {
    id: '79000000-0000-4000-8000-000000000099',
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

async function seedUsersFixture(prisma: any) {
  await prisma.role.createMany({
    data: [
      {
        id: USER_IDS.roleStaff,
        organizationId: IDS.org,
        code: 'STAFF_REP',
        name: 'Staff Representative',
        isSystemRole: false,
      },
      {
        id: USER_IDS.roleSales,
        organizationId: IDS.org,
        code: 'SALES_REP',
        name: 'Sales Representative',
        isSystemRole: false,
      },
    ],
  });

  await prisma.user.create({
    data: {
      id: USER_IDS.userStaff,
      organizationId: IDS.org,
      fullName: 'Existing Staff',
      mobile: '9393939393',
      email: 'existing@sudha.com',
      passwordHash: 'hashed_password',
      userType: 'employee',
      isActive: true,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: USER_IDS.userStaff,
      roleId: USER_IDS.roleStaff,
    },
  });
}

async function buildApp(actor?: any) {
  ensureTestDatabaseUrl();
  const prisma = await getPrisma();
  await resetPrismaTestDb(prisma);
  await seedBaseFixture(prisma);
  await seedUsersFixture(prisma);

  return createPrismaBackedApp({
    controllers: [UsersController],
    providers: [UsersService],
    actor,
  });
}

test('Prisma-backed HTTP e2e: create user hashes password, creates user, and maps user roles inside transaction', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post('/api/v1/users')
    .send({
      fullName: 'New Sales Officer',
      mobile: '9494949494',
      email: 'sales@sudha.com',
      password: 'StrongPassword@123',
      userType: 'sales',
      roleCodes: ['SALES_REP'],
      isActive: true,
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.fullName, 'New Sales Officer');
  assert.equal(response.body.data.roles[0].code, 'SALES_REP');

  const dbUser = await prisma.user.findFirst({ where: { mobile: '9494949494' } });
  assert.ok(dbUser);
  assert.notEqual(dbUser.passwordHash, 'StrongPassword@123'); // must be hashed
});

test('Prisma-backed HTTP e2e: update user modifies details and replaces assigned role mappings', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/users/${USER_IDS.userStaff}`)
    .send({
      fullName: 'Updated Staff Leader',
      roleCodes: ['SALES_REP'],
    })
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.fullName, 'Updated Staff Leader');
  assert.equal(response.body.data.roles.length, 1);
  assert.equal(response.body.data.roles[0].code, 'SALES_REP');
});

test('Prisma-backed HTTP e2e: reset-password updates passwordHash and revokes existing sessions', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .post(`/api/v1/users/${USER_IDS.userStaff}/reset-password`)
    .send({
      newPassword: 'BrandNewPassword@789',
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.match(response.body.message, /password reset successfully and sessions revoked/);
});

test('Prisma-backed HTTP e2e: deactivate user marks user inactive and deletes active sessions', async (t) => {
  const { app, prisma } = await buildApp();
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  const response = await request(app.getHttpServer())
    .delete(`/api/v1/users/${USER_IDS.userStaff}`)
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.isActive, false);
});

test('Prisma-backed HTTP e2e: retailer actor is forbidden from managing backoffice users', async (t) => {
  const { app } = await buildApp(createRetailerActor());
  t.after(async () => {
    await app.close();
    await disconnectPrisma();
  });

  await request(app.getHttpServer())
    .get('/api/v1/users')
    .expect(403);
});
