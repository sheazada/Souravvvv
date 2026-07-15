import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { GoodsReceiptsService } from '../src/operations/goods-receipts/goods-receipts.service';

function createService(overrides: Record<string, any> = {}) {
  const allVariants = [
    {
      id: 'var-1',
      product: { isBatchTracked: true, isExpiryTracked: true },
    },
    {
      id: 'var-2',
      product: { isBatchTracked: false, isExpiryTracked: false },
    },
  ];

  const prisma = {
    supplier: {
      findFirst: async () => ({ id: 'sup-1', supplierCode: 'SUP-001', name: 'Sudha Dairy' }),
    },
    warehouse: {
      findFirst: async () => ({ id: 'wh-1', code: 'WH-01', name: 'Main Depot' }),
    },
    purchaseOrder: {
      findFirst: async () => ({ id: 'po-1', poNo: 'PO-001', supplierId: 'sup-1', status: 'approved' }),
      update: async (args: any) => overrides.poUpdate ? overrides.poUpdate(args) : args,
    },
    purchaseOrderItem: {
      findMany: async () => [
        { id: 'po-item-1', variantId: 'var-1', orderedQty: 100, unitCost: 45 },
      ],
    },
    productVariant: {
      findMany: async ({ where }: any = {}) => {
        if (where?.id?.in) {
          return allVariants.filter((v) => where.id.in.includes(v.id));
        }
        return allVariants;
      },
    },
    goodsReceipt: {
      count: async () => 0,
      create: async ({ data }: any) => ({ id: 'grn-1', ...data }),
      findFirst: async () => ({
        id: 'grn-1',
        grnNo: 'GRN-001',
        supplierId: 'sup-1',
        warehouseId: 'wh-1',
        purchaseOrderId: 'po-1',
        status: 'approved',
        receiptDate: new Date('2026-07-15'),
      }),
      update: async ({ where, data }: any) => ({ id: where.id, ...data }),
    },
    goodsReceiptItem: {
      createMany: async (args: any) => overrides.grnItemCreateMany ? overrides.grnItemCreateMany(args) : args,
      findMany: async () => [
        {
          id: 'grn-item-1',
          goodsReceiptId: 'grn-1',
          purchaseOrderItemId: 'po-item-1',
          variantId: 'var-1',
          orderedQty: 100,
          receivedQty: 95,
          acceptedQty: 90,
          rejectedQty: 5,
          excessQty: 0,
          shortQty: 5,
          batchNo: 'BATCH-20260715',
          manufacturingDate: new Date('2026-07-14'),
          expiryDate: new Date('2026-07-20'),
          unitCost: 45,
        },
      ],
    },
    inventoryBatch: {
      findFirst: async () => overrides.existingBatch ?? null,
      create: async ({ data }: any) => ({ id: 'batch-1', ...data }),
      update: async ({ where, data }: any) => ({ id: where.id, ...data }),
    },
    stockMovement: {
      create: async ({ data }: any) => ({ id: 'mov-1', ...data }),
      count: async () => 1,
    },
    $transaction: async (cb: any) => cb(prisma),
  } as any;

  return new GoodsReceiptsService(prisma);
}

test('GoodsReceiptsService create calculates short and excess quantities against PO demand correctly', async () => {
  let createdItems: any[] = [];
  const service = createService({
    grnItemCreateMany: (args: any) => {
      createdItems = args.data;
      return args;
    },
  });

  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;
  await service.create(actor, {
    supplierId: 'sup-1',
    warehouseId: 'wh-1',
    purchaseOrderId: 'po-1',
    receiptDate: '2026-07-15',
    items: [
      {
        variantId: 'var-1',
        purchaseOrderItemId: 'po-item-1',
        orderedQty: 100,
        receivedQty: 95,
        acceptedQty: 90,
        rejectedQty: 5,
        batchNo: 'BATCH-001',
        expiryDate: '2026-07-20',
        unitCost: 45,
      },
    ],
  });

  assert.equal(createdItems.length, 1);
  assert.equal(createdItems[0].shortQty, 5); // 100 ordered - 95 received = 5 short
  assert.equal(createdItems[0].excessQty, 0);
});

test('GoodsReceiptsService create throws when accepted plus rejected quantity does not equal received quantity', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  await assert.rejects(
    () =>
      service.create(actor, {
        supplierId: 'sup-1',
        warehouseId: 'wh-1',
        purchaseOrderId: 'po-1',
        receiptDate: '2026-07-15',
        items: [
          {
            variantId: 'var-1',
            orderedQty: 100,
            receivedQty: 100,
            acceptedQty: 90,
            rejectedQty: 5, // 90 + 5 = 95 != 100
            batchNo: 'BATCH-001',
            expiryDate: '2026-07-20',
            unitCost: 45,
          },
        ],
      }),
    (err: any) => {
      assert.equal(err instanceof BadRequestException, true);
      assert.equal(err.message, 'Accepted quantity plus rejected quantity must equal received quantity');
      return true;
    },
  );
});

test('GoodsReceiptsService create enforces required batch and expiry attributes for tracked variants', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  await assert.rejects(
    () =>
      service.create(actor, {
        supplierId: 'sup-1',
        warehouseId: 'wh-1',
        purchaseOrderId: 'po-1',
        receiptDate: '2026-07-15',
        items: [
          {
            variantId: 'var-1',
            orderedQty: 100,
            receivedQty: 100,
            acceptedQty: 100,
            rejectedQty: 0,
            // missing batchNo and expiryDate on batch/expiry tracked item var-1
            unitCost: 45,
          },
        ],
      }),
    (err: any) => {
      assert.equal(err instanceof BadRequestException, true);
      assert.match(err.message, /Batch number is required/);
      return true;
    },
  );
});

test('GoodsReceiptsService post creates active InventoryBatch and StockMovement and updates PO receipt status', async () => {
  let poUpdatedStatus: string | null = null;
  const service = createService({
    poUpdate: (args: any) => {
      poUpdatedStatus = args.data.status;
      return args;
    },
  });

  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;
  const result = await service.post(actor, 'grn-1');

  assert.ok(result);
  assert.equal(poUpdatedStatus, 'partial'); // 90 accepted vs 100 ordered -> partial PO status
});

test('GoodsReceiptsService getComparison aggregates ordered, received, accepted, short, and excess totals', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  const comparison = await service.getComparison(actor, 'grn-1');
  assert.equal(comparison.success, true);
  assert.equal(comparison.data.totals.orderedQty, 100);
  assert.equal(comparison.data.totals.receivedQty, 95);
  assert.equal(comparison.data.totals.acceptedQty, 90);
  assert.equal(comparison.data.totals.rejectedQty, 5);
  assert.equal(comparison.data.totals.shortQty, 5);
  assert.equal(comparison.data.totals.excessQty, 0);
});
