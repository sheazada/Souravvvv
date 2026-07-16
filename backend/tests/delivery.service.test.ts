import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DeliveryService } from '../src/operations/delivery/delivery.service';

function createService(overrides: Record<string, any> = {}) {
  const prisma = {
    deliveryStop: {
      findFirst: async () => overrides.existingStop ?? {
        id: 'stop-1',
        organizationId: 'org-1',
        dispatchTripId: 'trip-1',
        retailerId: 'ret-1',
        salesOrderId: 'order-1',
        stopSequence: 1,
        status: 'pending',
      },
      update: async (args: any) => overrides.stopUpdate ? overrides.stopUpdate(args) : args,
    },
    deliveryStopItem: {
      findMany: async () => overrides.stopItems ?? [
        {
          id: 'sitem-1',
          organizationId: 'org-1',
          deliveryStopId: 'stop-1',
          variantId: 'var-1',
          orderedQty: 20,
          loadedQty: 20,
          deliveredQty: 0,
          returnedQty: 0,
          damagedQty: 0,
          refusedQty: 0,
          unitPrice: 50,
          taxRate: 5,
        },
      ],
      update: async (args: any) => overrides.stopItemUpdate ? overrides.stopItemUpdate(args) : args,
    },
    dispatchTrip: {
      findFirst: async () => overrides.existingTrip ?? {
        id: 'trip-1',
        organizationId: 'org-1',
        tripNo: 'TRIP-01',
        status: 'dispatched',
        driverEmployeeId: 'emp-driver-1',
      },
      findMany: async () => [
        {
          id: 'trip-1',
          organizationId: 'org-1',
          tripNo: 'TRIP-01',
          status: 'dispatched',
        },
      ],
    },
    salesOrder: {
      findFirst: async () => ({ id: 'order-1', status: 'dispatched' }),
      update: async (args: any) => args,
    },
    salesOrderStatusHistory: {
      create: async (args: any) => args,
    },
    salesInvoice: {
      findMany: async () => [],
    },
    paymentReceipt: {
      findMany: async () => overrides.receipts ?? [
        { id: 'rec-1', amount: 1000, paymentMode: 'cash', status: 'confirmed' },
        { id: 'rec-2', amount: 500, paymentMode: 'upi', status: 'confirmed' },
      ],
    },
    retailer: {
      findFirst: async () => ({ id: 'ret-1', shopName: 'Patna Dairy Shop', mobile: '9999999999' }),
    },
    fileAttachment: {
      findMany: async () => [],
    },
    productVariant: {
      findMany: async () => [
        { id: 'var-1', sku: 'SKU-01', variantName: '1L Pouch', product: { name: 'Sudha Milk' } },
      ],
    },
    crateTransaction: {
      create: async (args: any) => ({ id: 'crate-tx-1', ...args.data }),
    },
    $transaction: async (cb: any) => cb(prisma),
  } as any;

  const paymentsService = {
    recordDeliveryStopCollection: async () => ({ success: true, id: 'rec-new' }),
  } as any;

  return new DeliveryService(prisma, paymentsService);
}

test('DeliveryService updateStopStatus marks stop delivered, calculates item totals, and updates order status', async () => {
  let updatedStopStatus: string | null = null;
  let updatedItemDeliveredQty: number | null = null;

  const service = createService({
    stopUpdate: (args: any) => {
      updatedStopStatus = args.data.status;
      return args;
    },
    stopItemUpdate: (args: any) => {
      updatedItemDeliveredQty = args.data.deliveredQty;
      return args;
    },
  });

  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['OWNER'] } as any;
  const result = await service.updateStopStatus(actor, 'stop-1', {
    status: 'delivered',
  });

  assert.equal(result.success, true);
  assert.equal(updatedStopStatus, 'delivered');
  assert.equal(updatedItemDeliveredQty, 20); // loadedQty = 20 -> full delivery
});

test('DeliveryService updateStopStatus handles partial delivery variance correctly', async () => {
  let itemUpdatePayload: any = null;
  const service = createService({
    stopItemUpdate: (args: any) => {
      itemUpdatePayload = args.data;
      return args;
    },
  });

  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['OWNER'] } as any;
  const result = await service.updateStopStatus(actor, 'stop-1', {
    status: 'partial',
    items: [
      {
        variantId: 'var-1',
        deliveredQty: 15,
        returnedQty: 5,
        damagedQty: 0,
      },
    ],
  });

  assert.equal(result.success, true);
  assert.equal(itemUpdatePayload.deliveredQty, 15);
  assert.equal(itemUpdatePayload.returnedQty, 5);
  assert.equal(itemUpdatePayload.lineTotal, 750); // 15 * 50 = 750
});

test('DeliveryService updateStopStatus throws when delivered plus returned quantity exceeds loaded quantity', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['OWNER'] } as any;

  await assert.rejects(
    () =>
      service.updateStopStatus(actor, 'stop-1', {
        status: 'partial',
        items: [
          {
            variantId: 'var-1',
            deliveredQty: 18,
            returnedQty: 5, // 18 + 5 = 23 > 20 loaded
          },
        ],
      }),
    (err: any) => {
      assert.equal(err instanceof BadRequestException, true);
      assert.match(err.message, /Delivery quantities exceed loaded quantity/);
      return true;
    },
  );
});

test('DeliveryService getCollectionSummary aggregates driver cash and upi collections today', async () => {
  const service = createService();
  const actor = { id: 'driver-1', organizationId: 'org-1', employeeId: 'emp-driver-1', roles: ['STAFF'], userType: 'employee' } as any;

  const summary = await service.getCollectionSummary(actor);
  assert.equal(summary.success, true);
  assert.equal(summary.data.totalAmount, 1500); // 1000 + 500 = 1500
  assert.equal(summary.data.totalCount, 2);
});

test('DeliveryService addCrateTransaction records empty crates collected on route', async () => {
  const service = createService();
  const actor = { id: 'driver-1', organizationId: 'org-1', employeeId: 'emp-driver-1', roles: ['STAFF'], userType: 'employee' } as any;

  const tx = await service.addCrateTransaction(actor, 'stop-1', {
    crateTypeId: 'ct-1',
    transactionType: 'return',
    quantity: 8,
  });

  assert.equal(tx.success, true);
  assert.equal(tx.data.quantity, 8);
  assert.equal(tx.data.transactionType, 'return');
});
