import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CratesService } from '../src/operations/crates/crates.service';

function createService() {
  const prisma = {
    crateTransaction: {
      findMany: async () => [
        {
          id: 'cr-1',
          organizationId: 'org-1',
          crateTypeId: 'ct-1',
          retailerId: 'ret-1',
          transactionType: 'issue',
          quantity: 20,
          transactionDate: new Date('2026-07-15'),
        },
      ],
      count: async () => 1,
      create: async ({ data }: any) => ({ id: 'cr-new', ...data }),
    },
    crateBalanceSnapshot: {
      findMany: async () => [
        {
          id: 'snap-1',
          organizationId: 'org-1',
          balanceDate: new Date('2026-07-15'),
          retailerId: 'ret-1',
          crateTypeId: 'ct-1',
          issuedQty: 20,
          returnedQty: 5,
          damagedQty: 0,
          missingQty: 0,
          closingQty: 15,
        },
      ],
      count: async () => 1,
      upsert: async (args: any) => args,
    },
    crateType: {
      findFirst: async () => ({ id: 'ct-1', code: 'CR24', name: '24 Bottle Crate', depositValue: 150 }),
      findMany: async () => [{ id: 'ct-1', code: 'CR24', name: '24 Bottle Crate', depositValue: 150 }],
    },
    retailer: {
      findFirst: async () => ({ id: 'ret-1', shopName: 'Patna Dairy Shop' }),
      findMany: async () => [{ id: 'ret-1', shopName: 'Patna Dairy Shop' }],
    },
    dispatchTrip: {
      findMany: async () => [],
    },
    $transaction: async (cb: any) => cb(prisma),
  } as any;

  return new CratesService(prisma);
}

test('CratesService findTransactions lists enriched container issue/return records', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  const result = await service.findTransactions(actor, { crateTypeId: 'ct-1' });
  assert.equal(result.success, true);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].crateType.code, 'CR24');
  assert.equal(result.data[0].quantity, 20);
});

test('CratesService findBalances calculates total deposit value liability (`closingQty * depositValue`)', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  const result = await service.findBalances(actor, { retailerId: 'ret-1' });
  assert.equal(result.success, true);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].closingQty, 15);
  assert.equal(result.data[0].totalLiability, 2250); // 15 crates * ₹150 deposit = 2250
});

test('CratesService createTransaction creates transaction and syncs balance snapshot', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['STAFF'] } as any;

  const result = await service.createTransaction(actor, {
    crateTypeId: 'ct-1',
    retailerId: 'ret-1',
    transactionType: 'issue',
    quantity: 10,
    remarks: 'Morning dispatch issue',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.quantity, 10);
});

test('CratesService forbids retailer actors from creating container transactions', async () => {
  const service = createService();
  const actor = { id: 'ret-1', organizationId: 'org-1', roles: ['RETAILER'] } as any;

  await assert.rejects(
    () =>
      service.createTransaction(actor, {
        crateTypeId: 'ct-1',
        transactionType: 'issue',
        quantity: 5,
      }),
    (err: any) => {
      assert.equal(err instanceof ForbiddenException, true);
      return true;
    },
  );
});
