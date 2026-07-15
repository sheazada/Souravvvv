import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';
import { SalesInvoicesService } from '../src/operations/sales-invoices/sales-invoices.service';

const IDS = {
  org: '30000000-0000-4000-8000-000000000001',
  user: '30000000-0000-4000-8000-000000000002',
  retailer: '30000000-0000-4000-8000-000000000003',
  variant1: '30000000-0000-4000-8000-000000000004',
  variant2: '30000000-0000-4000-8000-000000000005',
  draftInvoice: '30000000-0000-4000-8000-000000000006',
  postedInvoice: '30000000-0000-4000-8000-000000000007',
  draftItem1: '30000000-0000-4000-8000-000000000008',
  draftItem2: '30000000-0000-4000-8000-000000000009',
};

function createActor(): AuthenticatedUser {
  return {
    id: IDS.user,
    organizationId: IDS.org,
    retailerId: null,
    employeeId: null,
    fullName: 'Owner User',
    mobile: '9999999999',
    userType: 'owner',
    roles: ['OWNER'],
    permissions: [],
  };
}

function createHarness() {
  const state = {
    retailers: [
      {
        id: IDS.retailer,
        organizationId: IDS.org,
        retailerCode: 'RET-001',
        shopName: 'Retailer One',
        ownerName: 'Owner',
        mobile: '9999999999',
        orderingMode: 'assisted',
      },
    ],
    productVariants: [
      {
        id: IDS.variant1,
        organizationId: IDS.org,
        sku: 'SKU-1',
        variantName: '500ml',
        product: { id: 'p1', name: 'Sudha Milk' },
      },
      {
        id: IDS.variant2,
        organizationId: IDS.org,
        sku: 'SKU-2',
        variantName: '1L',
        product: { id: 'p2', name: 'Sudha Curd' },
      },
    ],
    salesInvoices: [
      {
        id: IDS.draftInvoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-DRAFT-001',
        retailerId: IDS.retailer,
        salesOrderId: null,
        dispatchTripId: null,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        source: 'assisted_billing',
        createdByUserId: IDS.user,
        status: 'draft',
        subtotal: 1600,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: 1600,
        outstandingAmount: 1600,
        paymentStatus: 'unpaid',
        paidAt: null,
        dueBucket: 'current',
        paymentIntentId: null,
        autoReconciled: false,
        reminderEnabled: true,
        pdfUrl: null,
        remarks: 'Draft invoice',
        journalEntryId: null,
        createdAt: new Date('2026-07-10T00:00:00.000Z'),
        updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      },
      {
        id: IDS.postedInvoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-POSTED-001',
        retailerId: IDS.retailer,
        salesOrderId: null,
        dispatchTripId: null,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        source: 'assisted_billing',
        createdByUserId: IDS.user,
        status: 'posted',
        subtotal: 1600,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: 1600,
        outstandingAmount: 1600,
        paymentStatus: 'unpaid',
        paidAt: null,
        dueBucket: 'current',
        paymentIntentId: null,
        autoReconciled: false,
        reminderEnabled: true,
        pdfUrl: null,
        remarks: 'Posted invoice',
        journalEntryId: 'JE-001',
        createdAt: new Date('2026-07-10T00:00:00.000Z'),
        updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      },
    ],
    salesInvoiceItems: [
      {
        id: IDS.draftItem1,
        organizationId: IDS.org,
        salesInvoiceId: IDS.draftInvoice,
        deliveryStopItemId: null,
        variantId: IDS.variant1,
        billedQty: 10,
        unitPrice: 80,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: 800,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: IDS.draftItem2,
        organizationId: IDS.org,
        salesInvoiceId: IDS.draftInvoice,
        deliveryStopItemId: null,
        variantId: IDS.variant2,
        billedQty: 10,
        unitPrice: 80,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: 800,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'posted-item-1',
        organizationId: IDS.org,
        salesInvoiceId: IDS.postedInvoice,
        deliveryStopItemId: null,
        variantId: IDS.variant1,
        billedQty: 20,
        unitPrice: 80,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: 1600,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    paymentAllocations: [] as any[],
  };

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
  const toNum = (value: any) => Number(value ?? 0);
  let idCounter = 50;
  const nextId = () => `30000000-0000-4000-8000-${String(idCounter++).padStart(12, '0')}`;

  const accountingCalls = {
    postSalesInvoice: [] as any[],
    reverseSalesInvoice: [] as any[],
  };
  const ledgerCalls = {
    postInvoiceDebit: [] as any[],
    reverseInvoicePosting: [] as any[],
  };
  const metricCalls = {
    refreshAfterInvoice: [] as any[],
  };

  const prisma: any = {
    $transaction: async (fn: any) => fn(prisma),
    salesInvoice: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.salesInvoices.find((x) => {
          if (where?.id && x.id !== where.id) return false;
          if (where?.organizationId && x.organizationId !== where.organizationId) return false;
          if (where?.retailerId && x.retailerId !== where.retailerId) return false;
          if (where?.salesOrderId !== undefined && x.salesOrderId !== where.salesOrderId) return false;
          if (where?.dispatchTripId !== undefined && x.dispatchTripId !== where.dispatchTripId) return false;
          if (where?.status?.not && x.status === where.status.not) return false;
          return true;
        }) ?? null;
        if (!row) return null;
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      },
      findMany: async ({ where, select, orderBy }: any = {}) => {
        let rows = state.salesInvoices.filter((x) => {
          if (where?.organizationId && x.organizationId !== where.organizationId) return false;
          if (where?.retailerId && x.retailerId !== where.retailerId) return false;
          if (where?.id?.in && !where.id.in.includes(x.id)) return false;
          return true;
        });
        if (orderBy) {
          rows = [...rows].sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
        }
        return rows.map((row) => {
          if (!select) return clone(row);
          const out: any = {};
          for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
          return out;
        });
      },
      update: async ({ where, data }: any) => {
        const row = state.salesInvoices.find((x) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      create: async ({ data }: any) => {
        const row = {
          id: nextId(),
          paidAt: null,
          dueBucket: 'current',
          paymentIntentId: null,
          autoReconciled: false,
          reminderEnabled: true,
          pdfUrl: null,
          journalEntryId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.salesInvoices.push(row);
        return clone(row);
      },
      delete: async ({ where }: any) => {
        const index = state.salesInvoices.findIndex((x) => x.id === where.id);
        const [removed] = state.salesInvoices.splice(index, 1);
        state.salesInvoiceItems = state.salesInvoiceItems.filter((x) => x.salesInvoiceId !== where.id);
        return clone(removed);
      },
      count: async ({ where }: any = {}) => {
        return state.salesInvoices.filter((x) => {
          if (where?.organizationId && x.organizationId !== where.organizationId) return false;
          if (where?.invoiceNo?.startsWith && !String(x.invoiceNo).startsWith(where.invoiceNo.startsWith)) return false;
          return true;
        }).length;
      },
    },
    salesInvoiceItem: {
      findMany: async ({ where }: any = {}) => {
        return state.salesInvoiceItems
          .filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.salesInvoiceId || x.salesInvoiceId === where.salesInvoiceId))
          .map(clone);
      },
      deleteMany: async ({ where }: any = {}) => {
        const before = state.salesInvoiceItems.length;
        state.salesInvoiceItems = state.salesInvoiceItems.filter((x) => !(x.organizationId === where.organizationId && x.salesInvoiceId === where.salesInvoiceId));
        return { count: before - state.salesInvoiceItems.length };
      },
      createMany: async ({ data }: any) => {
        for (const row of data) {
          state.salesInvoiceItems.push({
            id: nextId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...row,
          });
        }
        return { count: data.length };
      },
    },
    retailer: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.retailers.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null;
        if (!row) return null;
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      },
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.retailers.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id)));
        return rows.map((row) => {
          if (!select) return clone(row);
          const out: any = {};
          for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
          return out;
        });
      },
    },
    salesOrder: {
      findFirst: async () => null,
      findMany: async () => [],
    },
    dispatchTrip: {
      findFirst: async () => null,
      findMany: async () => [],
    },
    deliveryStop: {
      findMany: async () => [],
    },
    deliveryStopItem: {
      findMany: async () => [],
    },
    productVariant: {
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.productVariants.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id)));
        return rows.map((row) => {
          if (!select) return clone(row);
          const out: any = {};
          for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
          return out;
        });
      },
    },
    paymentAllocation: {
      aggregate: async ({ where }: any = {}) => ({
        _sum: {
          allocatedAmount: state.paymentAllocations
            .filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.salesInvoiceId || x.salesInvoiceId === where.salesInvoiceId))
            .reduce((sum, row) => sum + toNum(row.allocatedAmount), 0),
        },
      }),
      findMany: async () => [],
    },
  };

  const accountingService = {
    postSalesInvoice: async (...args: any[]) => {
      accountingCalls.postSalesInvoice.push(args);
      return { success: true };
    },
    reverseSalesInvoice: async (...args: any[]) => {
      accountingCalls.reverseSalesInvoice.push(args);
      return { success: true };
    },
  } as any;

  const retailerLedgerService = {
    postInvoiceDebit: async (...args: any[]) => {
      ledgerCalls.postInvoiceDebit.push(args);
      return { success: true };
    },
    reverseInvoicePosting: async (...args: any[]) => {
      ledgerCalls.reverseInvoicePosting.push(args);
      return { success: true };
    },
  } as any;

  const paymentMetricsService = {
    refreshAfterInvoice: async (...args: any[]) => {
      metricCalls.refreshAfterInvoice.push(args);
      return { success: true };
    },
  } as any;

  const retailerFinanceService = {
    getMyDues: async () => ({ success: true, data: {} }),
  } as any;

  const creditControlService = {
    assertCreditAllowed: async () => ({ decision: 'allowed' }),
  } as any;

  const service = new SalesInvoicesService(
    prisma,
    accountingService,
    retailerLedgerService,
    paymentMetricsService,
    retailerFinanceService,
    creditControlService,
  );

  return {
    service,
    state,
    actor: createActor(),
    calls: {
      accountingCalls,
      ledgerCalls,
      metricCalls,
    },
  };
}

test('updateDraft edits draft invoice header and items', async () => {
  const { service, state, actor } = createHarness();

  const response = await service.updateDraft(actor, IDS.draftInvoice, {
    invoiceDate: '2026-07-11T00:00:00.000Z',
    dueDate: '2026-07-18T00:00:00.000Z',
    remarks: 'Retailer accepted less items',
    items: [
      {
        variantId: IDS.variant1,
        billedQty: 7,
        unitPrice: 80,
      },
      {
        variantId: IDS.variant2,
        billedQty: 5,
        unitPrice: 80,
      },
    ],
  });

  assert.equal(response.success, true);
  const invoice = state.salesInvoices.find((x) => x.id === IDS.draftInvoice)!;
  assert.equal(Number(invoice.subtotal), 960);
  assert.equal(Number(invoice.grandTotal), 960);
  assert.equal(Number(invoice.outstandingAmount), 960);
  assert.equal(invoice.remarks, 'Retailer accepted less items');

  const items = state.salesInvoiceItems.filter((x) => x.salesInvoiceId === IDS.draftInvoice);
  assert.equal(items.length, 2);
  assert.equal(Number(items[0].billedQty) + Number(items[1].billedQty), 12);
});

test('deleteDraft removes draft invoice and its items', async () => {
  const { service, state, actor } = createHarness();

  const response = await service.deleteDraft(actor, IDS.draftInvoice, {
    reason: 'Wrong draft created before final delivery confirmation',
  });

  assert.equal(response.success, true);
  assert.equal(state.salesInvoices.some((x) => x.id === IDS.draftInvoice), false);
  assert.equal(state.salesInvoiceItems.some((x) => x.salesInvoiceId === IDS.draftInvoice), false);
});

test('revisePostedUnpaid cancels old invoice and creates replacement invoice with finance callbacks', async () => {
  const { service, state, actor, calls } = createHarness();

  const response = await service.revisePostedUnpaid(actor, IDS.postedInvoice, {
    revisionMode: 'manual',
    reason: 'Retailer accepted only 15 instead of 20',
    items: [
      {
        variantId: IDS.variant1,
        billedQty: 15,
        unitPrice: 80,
      },
    ],
  });

  assert.equal(response.success, true);
  assert.equal(response.data.originalInvoiceId, IDS.postedInvoice);
  const original = state.salesInvoices.find((x) => x.id === IDS.postedInvoice)!;
  assert.equal(original.status, 'cancelled');
  assert.equal(Number(original.outstandingAmount), 0);

  const replacement = state.salesInvoices.find((x) => x.id === response.data.replacementInvoiceId)!;
  assert.ok(replacement);
  assert.equal(replacement.invoiceNo, 'INV-POSTED-001-R1');
  assert.equal(replacement.status, 'posted');
  assert.equal(replacement.paymentStatus, 'unpaid');
  assert.equal(Number(replacement.grandTotal), 1200);
  assert.equal(Number(replacement.outstandingAmount), 1200);

  const replacementItems = state.salesInvoiceItems.filter((x) => x.salesInvoiceId === replacement.id);
  assert.equal(replacementItems.length, 1);
  assert.equal(Number(replacementItems[0].billedQty), 15);

  assert.equal(calls.ledgerCalls.reverseInvoicePosting.length, 1);
  assert.equal(calls.ledgerCalls.postInvoiceDebit.length, 1);
  assert.equal(calls.accountingCalls.reverseSalesInvoice.length, 1);
  assert.equal(calls.accountingCalls.postSalesInvoice.length, 1);
  assert.equal(calls.metricCalls.refreshAfterInvoice.length, 1);
});

test('revisePostedUnpaid rejects partial-paid invoice with conflict', async () => {
  const { service, state, actor } = createHarness();
  const invoice = state.salesInvoices.find((x) => x.id === IDS.postedInvoice)!;
  invoice.paymentStatus = 'partial_paid';
  invoice.status = 'posted';
  invoice.outstandingAmount = 800;

  await assert.rejects(
    () =>
      service.revisePostedUnpaid(actor, IDS.postedInvoice, {
        revisionMode: 'manual',
        reason: 'Try revise after partial payment',
        items: [{ variantId: IDS.variant1, billedQty: 15, unitPrice: 80 }],
      }),
    /Invoice with payment activity must use note-based adjustment flow/,
  );
});

test('cancelAndRegenerate rejects partial-paid invoice with conflict', async () => {
  const { service, state, actor } = createHarness();
  const invoice = state.salesInvoices.find((x) => x.id === IDS.postedInvoice)!;
  invoice.paymentStatus = 'partial_paid';
  invoice.status = 'posted';
  invoice.outstandingAmount = 800;

  await assert.rejects(
    () =>
      service.cancelAndRegenerate(actor, IDS.postedInvoice, {
        reason: 'Try cancel and regenerate after partial payment',
        source: 'manual',
        items: [{ variantId: IDS.variant1, billedQty: 15, unitPrice: 80 }],
      }),
    /Invoice with payment activity must use note-based adjustment flow/,
  );
});

test('cancelAndRegenerate rejects paid invoice with conflict', async () => {
  const { service, state, actor } = createHarness();
  const invoice = state.salesInvoices.find((x) => x.id === IDS.postedInvoice)!;
  invoice.paymentStatus = 'paid';
  invoice.status = 'paid';
  invoice.outstandingAmount = 0;
  invoice.paidAt = new Date('2026-07-10T12:00:00.000Z');

  await assert.rejects(
    () =>
      service.cancelAndRegenerate(actor, IDS.postedInvoice, {
        reason: 'Try cancel and regenerate after payment',
        source: 'manual',
        items: [{ variantId: IDS.variant1, billedQty: 15, unitPrice: 80 }],
      }),
    /Invoice with payment activity must use note-based adjustment flow/,
  );
});

test('recomputeFromDelivery rejects paid invoice with conflict', async () => {
  const { service, state, actor } = createHarness();
  const invoice = state.salesInvoices.find((x) => x.id === IDS.postedInvoice)!;
  invoice.paymentStatus = 'paid';
  invoice.status = 'paid';
  invoice.outstandingAmount = 0;
  invoice.paidAt = new Date('2026-07-10T12:00:00.000Z');

  await assert.rejects(
    () =>
      service.recomputeFromDelivery(actor, IDS.postedInvoice, {
        reason: 'Try recompute after full payment',
        applyImmediately: true,
      }),
    /Invoice cannot be recomputed directly after payment activity/,
  );
});
