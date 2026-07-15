import assert from 'node:assert/strict';
import test from 'node:test';
import { ReportsService } from '../src/finance/reports/reports.service';

function createService() {
  const prisma = {
    purchaseOrder: {
      findMany: async () => [
        {
          id: 'po-1',
          organizationId: 'org-1',
          poNo: 'PO-001',
          supplierId: 'sup-1',
          poDate: new Date('2026-07-15'),
          subtotal: 1000,
          taxTotal: 50,
          grandTotal: 1050,
        },
      ],
    },
    supplier: {
      findMany: async () => [{ id: 'sup-1', supplierCode: 'SUP-01', name: 'Sudha Plant' }],
    },
    purchaseOrderItem: {
      findMany: async () => [
        { id: 'item-1', purchaseOrderId: 'po-1', orderedQty: 50, lineTotal: 1050 },
      ],
    },
    goodsReceipt: {
      findMany: async () => [{ id: 'grn-1', purchaseOrderId: 'po-1' }],
    },
    dispatchTrip: {
      findMany: async () => [
        {
          id: 'trip-1',
          organizationId: 'org-1',
          tripNo: 'TRIP-01',
          routeId: 'route-1',
          vehicleId: 'veh-1',
          dispatchDate: new Date('2026-07-15'),
        },
      ],
    },
    dispatchTripItem: {
      findMany: async () => [
        { id: 'titem-1', dispatchTripId: 'trip-1', plannedQty: 100, loadedQty: 100 },
      ],
    },
    deliveryStop: {
      findMany: async () => [
        { id: 'stop-1', dispatchTripId: 'trip-1', status: 'delivered' },
        { id: 'stop-2', dispatchTripId: 'trip-1', status: 'partial' },
      ],
    },
    route: {
      findMany: async () => [{ id: 'route-1', code: 'RT-01', name: 'Patna Central' }],
    },
    vehicle: {
      findMany: async () => [{ id: 'veh-1', vehicleNo: 'BR01AB1234', vehicleType: 'van' }],
    },
    paymentReceipt: {
      findMany: async () => [
        {
          id: 'rec-1',
          organizationId: 'org-1',
          receiptNo: 'REC-01',
          amount: 500,
          paymentMode: 'cash',
          paymentDate: new Date('2026-07-15'),
          status: 'confirmed',
        },
        {
          id: 'rec-2',
          organizationId: 'org-1',
          receiptNo: 'REC-02',
          amount: 300,
          paymentMode: 'upi',
          paymentDate: new Date('2026-07-15'),
          status: 'confirmed',
        },
      ],
    },
    salesInvoice: {
      findMany: async () => [
        {
          id: 'inv-1',
          organizationId: 'org-1',
          invoiceNo: 'INV-01',
          retailerId: 'ret-1',
          grandTotal: 1000,
          outstandingAmount: 400,
          status: 'partial_paid',
          invoiceDate: new Date('2026-07-10'),
          dueDate: new Date('2026-07-17'),
        },
      ],
      aggregate: async () => ({ _sum: { grandTotal: 5000 } }),
    },
    retailer: {
      findMany: async () => [
        { id: 'ret-1', retailerCode: 'RET-01', shopName: 'Patna Dairy Shop', mobile: '9999999999' },
      ],
    },
    crateTransaction: {
      findMany: async () => [
        {
          id: 'cr-1',
          organizationId: 'org-1',
          retailerId: 'ret-1',
          crateTypeId: 'ct-1',
          transactionType: 'issue',
          quantity: 20,
          transactionDate: new Date('2026-07-15'),
        },
        {
          id: 'cr-2',
          organizationId: 'org-1',
          retailerId: 'ret-1',
          crateTypeId: 'ct-1',
          transactionType: 'return',
          quantity: 15,
          transactionDate: new Date('2026-07-15'),
        },
      ],
    },
    crateType: {
      findMany: async () => [{ id: 'ct-1', code: 'CR24', name: '24 Bottle Crate' }],
    },
    purchaseInvoice: {
      aggregate: async () => ({ _sum: { grandTotal: 3000 } }),
    },
    expenseEntry: {
      aggregate: async () => ({ _sum: { amount: 500 } }),
    },
    salesOrder: {
      findMany: async () => [{ orderDate: new Date('2026-07-15') }],
    },
  } as any;

  return new ReportsService(prisma);
}

test('ReportsService getDailyPurchaseReport returns aggregated purchase order totals and GRN counts', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  const report = await service.getDailyPurchaseReport(actor, { fromDate: '2026-07-15', toDate: '2026-07-15' });
  assert.equal(report.success, true);
  assert.equal(report.data.length, 1);
  assert.equal(report.data[0].poNo, 'PO-001');
  assert.equal(report.data[0].orderedQty, 50);
  assert.equal(report.data[0].receiptCount, 1);
  assert.equal(report.data[0].supplier.name, 'Sudha Plant');
});

test('ReportsService getDailyDispatchReport returns route, vehicle, planned vs loaded qty, and stop status breakdown', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  const report = await service.getDailyDispatchReport(actor, { fromDate: '2026-07-15', toDate: '2026-07-15' });
  assert.equal(report.success, true);
  assert.equal(report.data.length, 1);
  assert.equal(report.data[0].plannedQty, 100);
  assert.equal(report.data[0].loadedQty, 100);
  assert.equal(report.data[0].stopSummary.totalStops, 2);
  assert.equal(report.data[0].stopSummary.delivered, 1);
  assert.equal(report.data[0].stopSummary.partial, 1);
});

test('ReportsService getCollectionReport groups collections by payment mode and calculates total amount', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  const report = await service.getCollectionReport(actor, { fromDate: '2026-07-15', toDate: '2026-07-15' });
  assert.equal(report.success, true);
  assert.equal(report.data.totalAmount, 800); // 500 cash + 300 upi
  assert.equal(report.data.receiptCount, 2);
  assert.equal(report.data.byMode.length, 2);
});

test('ReportsService getOutstandingReport returns unpaid/partially paid invoices enriched with shop metadata', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  const report = await service.getOutstandingReport(actor, {});
  assert.equal(report.success, true);
  assert.equal(report.data.totalOutstanding, 400);
  assert.equal(report.data.rows.length, 1);
  assert.equal(report.data.rows[0].retailer.shopName, 'Patna Dairy Shop');
});

test('ReportsService getCrateReport summarizes container issues and returns by crate type', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  const report = await service.getCrateReport(actor, { fromDate: '2026-07-15', toDate: '2026-07-15' });
  assert.equal(report.success, true);
  assert.equal(report.data.length, 2);
  const issueRow = report.data.find((row: any) => row.transactionType === 'issue');
  assert.equal(issueRow.quantity, 20);
  assert.equal(issueRow.crateType.name, '24 Bottle Crate');
});

test('ReportsService getProfitReport calculates net profit across sales invoices, purchase invoices, and expense entries', async () => {
  const service = createService();
  const actor = { id: 'user-1', organizationId: 'org-1', roles: ['ADMIN'] } as any;

  const report = await service.getProfitReport(actor, { fromDate: '2026-07-01', toDate: '2026-07-31' });
  assert.equal(report.success, true);
  assert.equal(report.data.grossSales, 5000);
  assert.equal(report.data.purchaseCost, 3000);
  assert.equal(report.data.expenses, 500);
  assert.equal(report.data.netProfit, 1500); // 5000 - 3000 - 500 = 1500
});
