import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PurchaseInvoicesService } from '../src/operations/purchase-invoices/purchase-invoices.service';

function createService(overrides: Record<string, any> = {}) {
  const prisma = {
    purchaseInvoice: {
      findFirst: async () => overrides.existingInvoice ?? null,
      create: async ({ data }: any) => ({ id: 'pinv-new', ...data }),
      update: async ({ where, data }: any) => ({ id: where.id, ...data }),
      findMany: async () => [
        {
          id: 'pinv-1',
          organizationId: 'org-1',
          invoiceNo: 'PINV-001',
          supplierId: 'sup-1',
          taxableAmount: 1000,
          taxTotal: 50,
          grandTotal: 1050,
          status: 'draft',
          invoiceDate: new Date('2026-07-15'),
        },
      ],
      count: async () => 1,
    },
    purchaseInvoiceItem: {
      createMany: async (args: any) => args,
      deleteMany: async () => ({ count: 1 }),
      findMany: async () => [
        { id: 'pitem-1', purchaseInvoiceId: 'pinv-1', variantId: 'var-1', billedQty: 20, unitCost: 50, taxAmount: 50 },
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
    $transaction: async (cb: any) => cb(prisma),
  } as any;

  return new PurchaseInvoicesService(prisma);
}

test('PurchaseInvoicesService create calculates taxableAmount, taxTotal, and grandTotal from items', async () => {
  const service = createService();
  const actor = { id: 'admin-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  service.findOne = async () => ({
    success: true,
    data: { id: 'pinv-new', invoiceNo: 'PINV-101', grandTotal: 1050 },
  } as any);

  const result = await service.create(actor, {
    invoiceNo: 'PINV-101',
    supplierId: 'sup-1',
    invoiceDate: '2026-07-15T00:00:00.000Z',
    items: [
      {
        variantId: 'var-1',
        billedQty: 20,
        unitCost: 50,
        taxAmount: 50,
      },
    ],
  });

  assert.equal(result.success, true);
  assert.equal(result.data.invoiceNo, 'PINV-101');
});

test('PurchaseInvoicesService create throws when GRN supplier does not match invoice supplier', async () => {
  const service = createService();
  service['prisma'].goodsReceipt.findFirst = async () => ({ id: 'grn-1', supplierId: 'sup-OTHER' }) as any;
  const actor = { id: 'admin-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  await assert.rejects(
    () =>
      service.create(actor, {
        invoiceNo: 'PINV-102',
        supplierId: 'sup-1',
        goodsReceiptId: 'grn-1',
        invoiceDate: '2026-07-15T00:00:00.000Z',
        items: [{ variantId: 'var-1', billedQty: 10, unitCost: 50 }],
      }),
    (err: any) => {
      assert.equal(err instanceof BadRequestException, true);
      assert.equal(err.message, 'Goods receipt supplier does not match invoice supplier');
      return true;
    },
  );
});

test('PurchaseInvoicesService approve and post transition invoice state cleanly', async () => {
  const service = createService({ existingInvoice: { id: 'pinv-1', status: 'draft', supplierId: 'sup-1' } });
  const actor = { id: 'admin-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  service.findOne = async () => ({ success: true, data: { id: 'pinv-1', status: 'posted' } } as any);

  const approved = await service.approve(actor, 'pinv-1');
  assert.equal(approved.success, true);
  assert.equal(approved.data.status, 'approved');

  const posted = await service.post(actor, 'pinv-1');
  assert.equal(posted.success, true);
  assert.equal(posted.data.status, 'posted');
});

test('PurchaseInvoicesService forbids retailer actors from accessing purchase invoices', async () => {
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
