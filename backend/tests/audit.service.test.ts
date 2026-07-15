import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { AuditService } from '../src/core/audit/audit.service';

function createService() {
  const prisma = {
    auditLog: {
      findMany: async ({ where }: any) => [
        {
          id: 'audit-1',
          organizationId: 'org-1',
          userId: 'user-1',
          module: 'procurement',
          entityType: 'purchase_order',
          entityId: 'po-1',
          action: 'update_demand_extras',
          beforeJson: { extraQty: 2 },
          afterJson: { extraQty: 5 },
          createdAt: new Date('2026-07-15T12:00:00.000Z'),
        },
      ],
      count: async () => 1,
    },
    user: {
      findMany: async () => [
        { id: 'user-1', fullName: 'Procurement Mgr', mobile: '9999999999', userType: 'owner', roles: ['OWNER'] },
      ],
    },
  } as any;

  return new AuditService(prisma);
}

test('AuditService findAll returns paginated audit logs enriched with user metadata', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['OWNER'] } as any;

  const result = await service.findAll(actor, { module: 'procurement' });
  assert.equal(result.success, true);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].action, 'update_demand_extras');
  assert.equal(result.data[0].user.fullName, 'Procurement Mgr');
});

test('AuditService findAll forbids retailer actors from accessing audit logs', async () => {
  const service = createService();
  const actor = { id: 'ret-1', organizationId: 'org-1', roles: ['RETAILER'] } as any;

  await assert.rejects(
    () => service.findAll(actor, {}),
    (err: any) => {
      assert.equal(err instanceof ForbiddenException, true);
      assert.equal(err.message, 'Audit visibility requires backoffice or auditor access');
      return true;
    },
  );
});
