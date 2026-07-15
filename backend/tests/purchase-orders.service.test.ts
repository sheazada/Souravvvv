import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { PurchaseOrdersService } from '../src/operations/purchase-orders/purchase-orders.service';

function createService() {
  const allVariants = [
    {
      id: 'var-1',
      distributorPrice: 20,
      product: { taxCodeId: 'tax-1' },
    },
    {
      id: 'var-2',
      distributorPrice: 30,
      product: { taxCodeId: null },
    },
  ];

  const prisma = {
    productVariant: {
      findMany: async ({ where }: any = {}) => {
        if (where?.id?.in) {
          return allVariants.filter((v) => where.id.in.includes(v.id));
        }
        return allVariants;
      },
    },
    taxCode: {
      findMany: async () => [{ id: 'tax-1', gstRate: 5 }],
    },
  } as any;

  return new PurchaseOrdersService(prisma);
}

function createFindAllService() {
  const now = Date.now();
  const purchaseOrders = [
    {
      id: 'po-1',
      organizationId: 'org-1',
      poNo: 'PO-001',
      supplierId: 'sup-1',
      demandConsolidationId: 'dem-1',
      poDate: new Date('2026-07-15'),
      status: 'draft',
      grandTotal: 1200,
    },
    {
      id: 'po-2',
      organizationId: 'org-1',
      poNo: 'PO-002',
      supplierId: 'sup-1',
      demandConsolidationId: 'dem-2',
      poDate: new Date('2026-07-14'),
      status: 'draft',
      grandTotal: 1300,
    },
    {
      id: 'po-3',
      organizationId: 'org-1',
      poNo: 'PO-003',
      supplierId: 'sup-1',
      demandConsolidationId: null,
      poDate: new Date('2026-07-13'),
      status: 'draft',
      grandTotal: 1400,
    },
  ];
  const auditLogs = [
    {
      id: 'audit-recent',
      organizationId: 'org-1',
      entityType: 'purchase_order',
      entityId: 'po-1',
      action: 'update_demand_extras',
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      user: { id: 'user-1', fullName: 'Ravi Kumar', userType: 'owner', mobile: '9999999999' },
      beforeJson: { items: [{ variantId: 'var-1', demandQty: 20, extraQty: 2, orderedQty: 22 }] },
      afterJson: { items: [{ variantId: 'var-1', demandQty: 20, extraQty: 5, orderedQty: 25 }] },
    },
    {
      id: 'audit-old',
      organizationId: 'org-1',
      entityType: 'purchase_order',
      entityId: 'po-2',
      action: 'update_demand_extras',
      createdAt: new Date(now - 14 * 24 * 60 * 60 * 1000),
      user: { id: 'user-2', fullName: 'Amit Kumar', userType: 'owner', mobile: '8888888888' },
      beforeJson: { items: [{ variantId: 'var-2', demandQty: 10, extraQty: 1, orderedQty: 11 }] },
      afterJson: { items: [{ variantId: 'var-2', demandQty: 10, extraQty: 3, orderedQty: 13 }] },
    },
  ];

  function applyWhere(rows: any[], where: any) {
    let filtered = rows.filter((row) => row.organizationId === where.organizationId);
    if (where.status) filtered = filtered.filter((row) => row.status === where.status);
    if (where.id?.in) filtered = filtered.filter((row) => where.id.in.includes(row.id));
    if (where.id?.notIn) filtered = filtered.filter((row) => !where.id.notIn.includes(row.id));
    return filtered;
  }

  const prisma = {
    purchaseOrder: {
      findMany: async ({ where }: any) => applyWhere(purchaseOrders, where),
      count: async ({ where }: any) => applyWhere(purchaseOrders, where).length,
    },
    auditLog: {
      findMany: async ({ where, select, include }: any) => {
        let rows = auditLogs.filter(
          (row) =>
            row.organizationId === where.organizationId &&
            row.entityType === where.entityType &&
            row.action === where.action,
        );
        if (where.entityId?.in) rows = rows.filter((row) => where.entityId.in.includes(row.entityId));
        if (where.createdAt?.gte) rows = rows.filter((row) => row.createdAt >= where.createdAt.gte);
        return rows.map((row) => {
          if (select?.entityId) return { entityId: row.entityId };
          if (include?.user) return { ...row };
          return { ...row };
        });
      },
    },
    supplier: {
      findMany: async () => [{ id: 'sup-1', supplierCode: 'SUP-001', name: 'Sudha Dairy' }],
    },
    demandConsolidation: {
      findMany: async () => [
        { id: 'dem-1', consolidationNo: 'DCON-001', status: 'approved' },
        { id: 'dem-2', consolidationNo: 'DCON-002', status: 'approved' },
      ],
    },
  } as any;

  return new PurchaseOrdersService(prisma);
}

test('prepareDemandItems applies supplier-side extra procurement beyond consolidation demand', async () => {
  const service = createService() as any;

  const result = await service.prepareDemandItems(
    'org-1',
    [
      {
        variantId: 'var-1',
        finalProcurementQty: 10,
      },
      {
        variantId: 'var-2',
        finalProcurementQty: 5,
      },
    ],
    [
      {
        variantId: 'var-1',
        extraQty: 2.5,
      },
    ],
  );

  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items[0], {
    variantId: 'var-1',
    orderedQty: 12.5,
    demandQty: 10,
    extraQty: 2.5,
    unitCost: 20,
    taxRate: 5,
    taxAmount: 12.5,
    lineTotal: 262.5,
  });
  assert.deepEqual(result.items[1], {
    variantId: 'var-2',
    orderedQty: 5,
    demandQty: 5,
    extraQty: 0,
    unitCost: 30,
    taxRate: 0,
    taxAmount: 0,
    lineTotal: 150,
  });
  assert.equal(result.subtotal, 400);
  assert.equal(result.taxTotal, 12.5);
  assert.equal(result.grandTotal, 412.5);
});

test('prepareDemandItems allows manual extra procurement quantity for variants outside the demand consolidation', async () => {
  const service = createService() as any;

  const result = await service.prepareDemandItems(
    'org-1',
    [
      {
        variantId: 'var-1',
        finalProcurementQty: 10,
      },
    ],
    [
      {
        variantId: 'var-2',
        extraQty: 5,
      },
    ],
  );

  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items[0], {
    variantId: 'var-1',
    orderedQty: 10,
    demandQty: 10,
    extraQty: 0,
    unitCost: 20,
    taxRate: 5,
    taxAmount: 10,
    lineTotal: 210,
  });
  assert.deepEqual(result.items[1], {
    variantId: 'var-2',
    orderedQty: 5,
    demandQty: 0,
    extraQty: 5,
    unitCost: 30,
    taxRate: 0,
    taxAmount: 0,
    lineTotal: 150,
  });
  assert.equal(result.subtotal, 350);
  assert.equal(result.taxTotal, 10);
  assert.equal(result.grandTotal, 360);
});

test('prepareDemandItems rejects invalid or inactive extra procurement variants', async () => {
  const service = createService() as any;

  await assert.rejects(
    () =>
      service.prepareDemandItems(
        'org-1',
        [
          {
            variantId: 'var-1',
            finalProcurementQty: 10,
          },
        ],
        [
          {
            variantId: 'var-999',
            extraQty: 1,
          },
        ],
      ),
    (error: any) => {
      assert.equal(error instanceof BadRequestException, true);
      assert.equal(error.message, 'One or more extra procurement variants are invalid or inactive');
      return true;
    },
  );
});

test('prepareDemandItems rejects negative extra procurement quantity', async () => {
  const service = createService() as any;

  await assert.rejects(
    () =>
      service.prepareDemandItems(
        'org-1',
        [
          {
            variantId: 'var-1',
            finalProcurementQty: 10,
          },
        ],
        [
          {
            variantId: 'var-1',
            extraQty: -0.5,
          },
        ],
      ),
    (error: any) => {
      assert.equal(error instanceof BadRequestException, true);
      assert.equal(error.message, 'Extra procurement quantity cannot be negative');
      return true;
    },
  );
});

test('prepareDemandExtraUpdates preserves demand qty and pricing while updating only extra qty', async () => {
  const service = createService() as any;

  const result = await service.prepareDemandExtraUpdates(
    'org-1',
    [
      {
        variantId: 'var-1',
        orderedQty: 12,
        demandQty: 10,
        extraQty: 2,
        unitCost: 20,
        taxRate: 5,
      },
      {
        variantId: 'var-2',
        orderedQty: 5,
        demandQty: 5,
        extraQty: 0,
        unitCost: 30,
        taxRate: 0,
      },
    ],
    [
      {
        variantId: 'var-1',
        extraQty: 5,
      },
    ],
  );

  assert.deepEqual(result.items[0], {
    variantId: 'var-1',
    orderedQty: 15,
    demandQty: 10,
    extraQty: 5,
    unitCost: 20,
    taxRate: 5,
    taxAmount: 15,
    lineTotal: 315,
  });
  assert.deepEqual(result.items[1], {
    variantId: 'var-2',
    orderedQty: 5,
    demandQty: 5,
    extraQty: 0,
    unitCost: 30,
    taxRate: 0,
    taxAmount: 0,
    lineTotal: 150,
  });
  assert.equal(result.subtotal, 450);
  assert.equal(result.taxTotal, 15);
  assert.equal(result.grandTotal, 465);
});

test('prepareDemandExtraUpdates allows adding new extra variants not in the original PO (and rejects invalid/inactive variants)', async () => {
  const service = createService() as any;

  const result = await service.prepareDemandExtraUpdates(
    'org-1',
    [
      {
        variantId: 'var-1',
        orderedQty: 12,
        demandQty: 10,
        extraQty: 2,
        unitCost: 20,
        taxRate: 5,
      },
    ],
    [
      {
        variantId: 'var-1',
        extraQty: 4,
      },
      {
        variantId: 'var-2',
        extraQty: 3,
      },
    ],
  );

  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items[1], {
    variantId: 'var-2',
    orderedQty: 3,
    demandQty: 0,
    extraQty: 3,
    unitCost: 30,
    taxRate: 0,
    taxAmount: 0,
    lineTotal: 90,
  });

  await assert.rejects(
    () =>
      service.prepareDemandExtraUpdates(
        'org-1',
        [
          {
            variantId: 'var-1',
            orderedQty: 12,
            demandQty: 10,
            extraQty: 2,
            unitCost: 20,
            taxRate: 5,
          },
        ],
        [
          {
            variantId: 'var-999',
            extraQty: 1,
          },
        ],
      ),
    (error: any) => {
      assert.equal(error instanceof BadRequestException, true);
      assert.equal(error.message, 'One or more extra procurement variants are invalid or inactive');
      return true;
    },
  );
});

test('findAll filters recently changed extra procurement purchase orders and returns latest summary', async () => {
  const service = createFindAllService() as any;

  const result = await service.findAll(
    { id: 'user-1', organizationId: 'org-1', fullName: 'Owner', mobile: '9999999999', userType: 'owner', roles: ['OWNER'], permissions: [] },
    { extraQtyAuditState: 'recently_changed', page: 1, limit: 20 },
  );

  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].id, 'po-1');
  assert.equal(result.data[0].latestDemandExtraAudit.changedBy.fullName, 'Ravi Kumar');
  assert.equal(result.data[0].latestDemandExtraAudit.totalExtraQtyBefore, 2);
  assert.equal(result.data[0].latestDemandExtraAudit.totalExtraQtyAfter, 5);
  assert.equal(result.meta.total, 1);
});

test('findAll filters purchase orders with no extra procurement audit history', async () => {
  const service = createFindAllService() as any;

  const result = await service.findAll(
    { id: 'user-1', organizationId: 'org-1', fullName: 'Owner', mobile: '9999999999', userType: 'owner', roles: ['OWNER'], permissions: [] },
    { extraQtyAuditState: 'never_changed', page: 1, limit: 20 },
  );

  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].id, 'po-3');
  assert.equal(result.data[0].latestDemandExtraAudit ?? null, null);
  assert.equal(result.meta.total, 1);
});
