import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ReturnsService } from '../src/operations/returns/returns.service';

function createService(overrides: Record<string, any> = {}) {
  const prisma = {
    supplierReturn: {
      findFirst: async () => overrides.existingReturn ?? null,
      create: async ({ data }: any) => ({ id: 'sret-new', ...data }),
      update: async ({ where, data }: any) => ({ id: where.id, ...data }),
      findMany: async () => [
        {
          id: 'sret-1',
          organizationId: 'org-1',
          supplierReturnNo: 'SRET-001',
          supplierId: 'sup-1',
          status: 'draft',
          returnDate: new Date('2026-07-15'),
        },
      ],
      count: async () => 1,
    },
    supplierReturnItem: {
      createMany: async (args: any) => args,
      deleteMany: async () => ({ count: 1 }),
      findMany: async () => [
        { id: 'ritem-1', supplierReturnId: 'sret-1', variantId: 'var-1', inventoryBatchId: 'batch-1', returnQty: 5, unitCost: 45 },
      ],
    },
    supplier: {
      findFirst: async () => ({ id: 'sup-1', supplierCode: 'SUP-01', name: 'Sudha Dairy', isActive: true }),
      findMany: async () => [{ id: 'sup-1', supplierCode: 'SUP-01', name: 'Sudha Dairy' }],
    },
    goodsReceipt: {
      findFirst: async () => ({ id: 'grn-1', grnNo: 'GRN-01', supplierId: 'sup-1', status: 'posted' }),
      findMany: async () => [{ id: 'grn-1', grnNo: 'GRN-01' }],
    },
    productVariant: {
      findMany: async () => [
        { id: 'var-1', sku: 'SKU-01', variantName: '1L Pouch', product: { id: 'prod-1', name: 'Milk' } },
      ],
    },
    inventoryBatch: {
      findFirst: async () => overrides.existingBatch ?? { id: 'batch-1', availableQty: 20, warehouseId: 'wh-1' },
      update: async (args: any) => args,
      findMany: async () => [{ id: 'batch-1', batchNo: 'BATCH-01', availableQty: 20 }],
    },
    stockMovement: {
      create: async (args: any) => args,
      count: async () => 5,
    },
    $transaction: async (cb: any) => cb(prisma),
  } as any;

  return new ReturnsService(prisma);
}

test('ReturnsService create creates supplier return with return items inside transaction', async () => {
  const service = createService();
  const actor = { id: 'admin-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  service.findOne = async () => ({
    success: true,
    data: { id: 'sret-new', supplierReturnNo: 'SRET-101' },
  } as any);

  const result = await service.create(actor, {
    supplierReturnNo: 'SRET-101',
    supplierId: 'sup-1',
    returnDate: '2026-07-15T00:00:00.000Z',
    reason: 'Pouches damaged in cold storage',
    items: [
      {
        variantId: 'var-1',
        inventoryBatchId: 'batch-1',
        returnQty: 5,
        unitCost: 45,
      },
    ],
  });

  assert.equal(result.success, true);
  assert.equal(result.data.supplierReturnNo, 'SRET-101');
});

test('ReturnsService post debits InventoryBatch available stock and records StockMovement out', async () => {
  let batchUpdatedQty: number | null = null;
  let movementCreated: any = null;

  const service = createService({
    existingReturn: { id: 'sret-1', status: 'approved', supplierId: 'sup-1', returnDate: new Date() },
  });
  service['prisma'].inventoryBatch.update = async (args: any) => {
    batchUpdatedQty = args.data.availableQty;
    return args;
  };
  service['prisma'].stockMovement.create = async (args: any) => {
    movementCreated = args.data;
    return args;
  };

  const actor = { id: 'admin-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;
  service.findOne = async () => ({ success: true, data: { id: 'sret-1', status: 'posted', debitNoteNo: 'SDN-101' } } as any);

  const result = await service.post(actor, 'sret-1');
  assert.equal(result.success, true);
  assert.equal(batchUpdatedQty, 15); // 20 available - 5 return = 15
  assert.equal(movementCreated.movementType, 'return_out');
  assert.equal(movementCreated.qtyOut, 5);
});

test('ReturnsService post throws when return quantity exceeds batch available stock', async () => {
  const service = createService({
    existingReturn: { id: 'sret-1', status: 'approved', supplierId: 'sup-1', returnDate: new Date() },
    existingBatch: { id: 'batch-1', availableQty: 2, warehouseId: 'wh-1' }, // only 2 available vs 5 return
  });
  const actor = { id: 'admin-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  await assert.rejects(
    () => service.post(actor, 'sret-1'),
    (err: any) => {
      assert.equal(err instanceof BadRequestException, true);
      assert.match(err.message, /Batch available stock \(2\) is less than return quantity \(5\)/);
      return true;
    },
  );
});

test('ReturnsService forbids retailer actors from accessing supplier returns', async () => {
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
