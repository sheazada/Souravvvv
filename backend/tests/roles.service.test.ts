import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { RolesService } from '../src/core/roles/roles.service';

function createService(overrides: Record<string, any> = {}) {
  const prisma = {
    role: {
      findFirst: async () => overrides.existingRole ?? null,
      create: async ({ data }: any) => ({ id: 'role-new', ...data }),
      update: async ({ where, data }: any) => ({ id: where.id, ...data }),
      delete: async () => ({ id: 'role-1' }),
      findMany: async () => [
        { id: 'role-1', code: 'STAFF', name: 'Staff User', isSystemRole: true, _count: { userRoles: 1 } },
      ],
      count: async () => 1,
    },
    permission: {
      findMany: async () => [{ id: 'perm-1', code: 'procurement:read' }],
    },
    rolePermission: {
      createMany: async (args: any) => args,
      deleteMany: async () => ({ count: 1 }),
    },
    $transaction: async (cb: any) => cb(prisma),
  } as any;

  return new RolesService(prisma);
}

test('RolesService create creates custom role and assigns permissions inside transaction', async () => {
  const service = createService();
  const actor = { id: 'admin-1', organizationId: 'org-1', roles: ['OWNER'] } as any;

  service.findOne = async () => ({ success: true, data: { id: 'role-new', code: 'SALES_MGR' } } as any);

  const result = await service.create(actor, {
    code: 'sales_mgr',
    name: 'Sales Manager',
    permissionCodes: ['procurement:read'],
  });

  assert.equal(result.success, true);
  assert.equal(result.data.code, 'SALES_MGR');
});

test('RolesService update throws ConflictException when trying to rename system role', async () => {
  const service = createService({ existingRole: { id: 'sys-role', code: 'ADMIN', isSystemRole: true } });
  const actor = { id: 'admin-1', organizationId: 'org-1', roles: ['OWNER'] } as any;

  await assert.rejects(
    () => service.update(actor, 'sys-role', { name: 'Changed Admin Name' }),
    (err: any) => {
      assert.equal(err instanceof ConflictException, true);
      assert.equal(err.message, 'System roles cannot be renamed or modified');
      return true;
    },
  );
});

test('RolesService remove prevents deletion of role assigned to active users', async () => {
  const service = createService({ existingRole: { id: 'role-use', code: 'DRIVER', isSystemRole: false, _count: { userRoles: 3 } } });
  const actor = { id: 'admin-1', organizationId: 'org-1', roles: ['OWNER'] } as any;

  await assert.rejects(
    () => service.remove(actor, 'role-use'),
    (err: any) => {
      assert.equal(err instanceof ConflictException, true);
      assert.equal(err.message, 'Cannot delete role assigned to active users');
      return true;
    },
  );
});

test('RolesService forbids retailer actors from querying or modifying roles', async () => {
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
