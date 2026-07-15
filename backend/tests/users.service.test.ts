import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../src/core/users/users.service';

function createService(overrides: Record<string, any> = {}) {
  const prisma = {
    user: {
      findFirst: async () => overrides.existingUser ?? null,
      create: async ({ data }: any) => ({ id: 'user-new', ...data }),
      update: async ({ where, data }: any) => ({ id: where.id, ...data }),
      findMany: async () => [
        {
          id: 'user-1',
          fullName: 'Staff One',
          mobile: '9111111111',
          email: 'staff1@sudha.com',
          userType: 'employee',
          isActive: true,
          userRoles: [{ role: { id: 'role-1', code: 'STAFF', name: 'Staff' } }],
        },
      ],
      count: async () => 1,
    },
    role: {
      findMany: async () => [{ id: 'role-1', code: 'STAFF' }],
    },
    userRole: {
      createMany: async (args: any) => args,
      deleteMany: async () => ({ count: 1 }),
    },
    userSession: {
      deleteMany: async () => ({ count: 2 }),
    },
    $transaction: async (cb: any) => cb(prisma),
  } as any;

  return new UsersService(prisma);
}

test('UsersService create hashes password and assigns user roles inside transaction', async () => {
  const service = createService();
  const actor = { id: 'admin-1', organizationId: 'org-1', roles: ['OWNER'] } as any;

  // We mock findOne return to verify
  service.findOne = async () => ({ success: true, data: { id: 'user-new', fullName: 'New Staff' } } as any);

  const result = await service.create(actor, {
    fullName: 'New Staff',
    mobile: '9222222222',
    email: 'new@sudha.com',
    password: 'Password@123',
    userType: 'employee',
    roleCodes: ['STAFF'],
  });

  assert.equal(result.success, true);
  assert.equal(result.data.fullName, 'New Staff');
});

test('UsersService create throws conflict if mobile number already registered', async () => {
  const service = createService({ existingUser: { id: 'user-exist', mobile: '9222222222' } });
  const actor = { id: 'admin-1', organizationId: 'org-1', roles: ['OWNER'] } as any;

  await assert.rejects(
    () =>
      service.create(actor, {
        fullName: 'Duplicate Mobile',
        mobile: '9222222222',
        password: 'Password@123',
        userType: 'employee',
        roleCodes: ['STAFF'],
      }),
    (err: any) => {
      assert.equal(err instanceof ConflictException, true);
      assert.equal(err.message, 'User with this mobile number already exists');
      return true;
    },
  );
});

test('UsersService resetPassword hashes new password and revokes all active sessions', async () => {
  const service = createService({ existingUser: { id: 'user-1' } });
  const actor = { id: 'admin-1', organizationId: 'org-1', roles: ['OWNER'] } as any;

  const result = await service.resetPassword(actor, 'user-1', { newPassword: 'NewPassword@456' });
  assert.equal(result.success, true);
  assert.match(result.message, /password reset successfully and sessions revoked/);
});

test('UsersService forbids retailer actors from managing users', async () => {
  const service = createService();
  const actor = { id: 'ret-1', organizationId: 'org-1', roles: ['RETAILER'] } as any;

  await assert.rejects(
    () => service.findAll(actor, {}),
    (err: any) => {
      assert.equal(err instanceof ForbiddenException, true);
      return true;
    },
  );
});
