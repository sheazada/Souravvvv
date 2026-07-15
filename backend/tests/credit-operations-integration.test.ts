import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';
import { CreditControlService } from '../src/operations/payments/credit-control.service';
import { DispatchService } from '../src/operations/dispatch/dispatch.service';
import { SalesInvoicesService } from '../src/operations/sales-invoices/sales-invoices.service';
import { SalesOrdersService } from '../src/operations/sales-orders/sales-orders.service';

type HarnessOptions = {
  creditLimit?: number;
  currentOutstanding?: number;
  overdueAmount?: number;
  managerApprovalRequired?: boolean;
  blockOrdersOnLimitExceed?: boolean;
  allowDispatchWithOverdue?: boolean;
  overrides?: any[];
  orderGrandTotal?: number;
};

function createActor(): AuthenticatedUser {
  return {
    id: 'user-1',
    organizationId: 'org-1',
    retailerId: null,
    employeeId: null,
    fullName: 'Owner User',
    mobile: '9999999999',
    userType: 'owner',
    roles: ['OWNER'],
    permissions: [],
  };
}

function createHarness(options?: HarnessOptions) {
  const settings = {
    creditLimit: 10000,
    currentOutstanding: 0,
    overdueAmount: 0,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
    allowDispatchWithOverdue: false,
    overrides: [] as any[],
    orderGrandTotal: 800,
    ...options,
  };

  const state = {
    retailers: [
      {
        id: 'ret-1',
        organizationId: 'org-1',
        retailerCode: 'RET-001',
        shopName: 'Retailer One',
        creditLimit: settings.creditLimit,
        creditDays: 7,
        isOrderingEnabled: true,
        isBillingEnabled: true,
        orderingMode: 'assisted',
        assignedRouteId: 'route-1',
      },
    ],
    retailerCreditProfiles: [
      {
        id: 'rcp-1',
        organizationId: 'org-1',
        retailerId: 'ret-1',
        creditLimit: settings.creditLimit,
        creditDays: 7,
        warningThresholdPercent: 80,
        blockOrdersOnLimitExceed: settings.blockOrdersOnLimitExceed,
        managerApprovalRequired: settings.managerApprovalRequired,
        allowDispatchWithOverdue: settings.allowDispatchWithOverdue,
        availableCredit: Math.max(settings.creditLimit - settings.currentOutstanding, 0),
        usedCredit: settings.currentOutstanding,
        currentOutstanding: settings.currentOutstanding,
        overdueAmount: settings.overdueAmount,
        riskLevel: settings.overdueAmount > 0 ? 'high' : 'medium',
        averagePaymentDays: 8,
        lastPaymentDate: new Date('2026-07-08T00:00:00.000Z'),
        isCreditActive: true,
        notes: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      },
    ],
    retailerPaymentMetrics: [
      {
        id: 'rpm-1',
        organizationId: 'org-1',
        retailerId: 'ret-1',
        currentOutstanding: settings.currentOutstanding,
        overdueAmount: settings.overdueAmount,
        pendingInvoiceCount: settings.currentOutstanding > 0 ? 2 : 0,
        lastPaymentDate: new Date('2026-07-08T00:00:00.000Z'),
        averagePaymentDays: 8,
        collectionSuccessRate: 75,
        riskScore: settings.overdueAmount > 0 ? 90 : 45,
        riskLevel: settings.overdueAmount > 0 ? 'high' : 'medium',
        updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      },
    ],
    retailerCreditOverrides: settings.overrides.map((row, index) => ({
      id: row.id ?? `ovr-${index + 1}`,
      organizationId: 'org-1',
      retailerId: 'ret-1',
      salesOrderId: row.salesOrderId ?? null,
      overrideType: row.overrideType,
      requestedAmount: row.requestedAmount ?? row.approvedAmount ?? null,
      approvedAmount: row.approvedAmount ?? null,
      reason: row.reason ?? 'Approved override',
      status: row.status ?? 'approved',
      approvedByUserId: 'user-1',
      approvedAt: row.approvedAt ?? new Date('2026-07-10T09:00:00.000Z'),
      expiresAt: row.expiresAt ?? null,
      remarks: row.remarks ?? null,
      createdAt: new Date('2026-07-10T09:00:00.000Z'),
      updatedAt: new Date('2026-07-10T09:00:00.000Z'),
    })),
    salesOrders: [
      {
        id: 'so-1',
        organizationId: 'org-1',
        orderNo: 'SO-001',
        retailerId: 'ret-1',
        routeId: 'route-1',
        deliveryCycleId: 'dc-1',
        orderDate: new Date('2026-07-10T00:00:00.000Z'),
        requestedDeliveryDate: new Date('2026-07-11T00:00:00.000Z'),
        source: 'admin',
        orderingModeSnapshot: 'assisted',
        enteredByUserId: 'user-1',
        enteredByEmployeeId: null,
        status: 'pending',
        subtotal: settings.orderGrandTotal,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: settings.orderGrandTotal,
        notes: 'Assisted order',
        approvedByUserId: null,
        approvedAt: null,
        createdAt: new Date('2026-07-10T00:00:00.000Z'),
        updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      },
    ],
    salesOrderItems: [
      {
        id: 'soi-1',
        organizationId: 'org-1',
        salesOrderId: 'so-1',
        variantId: 'var-1',
        orderedQty: 10,
        approvedQty: null,
        unitPrice: 80,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: settings.orderGrandTotal,
        remarks: null,
        createdAt: new Date('2026-07-10T00:00:00.000Z'),
        updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      },
    ],
    salesOrderStatusHistory: [] as any[],
    deliveryCycles: [
      {
        id: 'dc-1',
        organizationId: 'org-1',
        cycleCode: 'DC-001',
        orderDate: new Date('2026-07-10T00:00:00.000Z'),
        deliveryDate: new Date('2026-07-11T00:00:00.000Z'),
        deliveryShift: 'morning',
        cutoffAt: new Date('2026-07-10T21:00:00.000Z'),
        status: 'open',
      },
    ],
    routes: [
      {
        id: 'route-1',
        organizationId: 'org-1',
        code: 'R1',
        name: 'Main Route',
        deliveryShift: 'morning',
        areaId: null,
        defaultCutoffTime: '21:00',
      },
    ],
    dispatchTrips: [
      {
        id: 'trip-1',
        organizationId: 'org-1',
        tripNo: 'TRIP-001',
        deliveryCycleId: 'dc-1',
        routeId: 'route-1',
        vehicleId: null,
        driverEmployeeId: null,
        helperEmployeeId: null,
        dispatchDate: new Date('2026-07-11T00:00:00.000Z'),
        plannedStartAt: null,
        actualStartAt: null,
        actualEndAt: null,
        status: 'loaded',
        loadingSheetNo: 'LOAD-001',
        challanNo: 'CHL-001',
        totalStops: 1,
        totalCratesLoaded: 0,
        notes: null,
        createdAt: new Date('2026-07-10T00:00:00.000Z'),
        updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      },
    ],
    deliveryStops: [
      {
        id: 'stop-1',
        organizationId: 'org-1',
        dispatchTripId: 'trip-1',
        retailerId: 'ret-1',
        salesOrderId: 'so-1',
        stopSequence: 1,
        plannedArrivalAt: null,
        actualArrivalAt: null,
        actualDepartureAt: null,
        status: 'pending',
        failureReason: null,
        cratesIssued: 0,
        emptyCratesReceived: 0,
        notes: null,
        createdAt: new Date('2026-07-10T00:00:00.000Z'),
        updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      },
    ],
    deliveryStopItems: [] as any[],
    dispatchTripItems: [] as any[],
    deliveryChallans: [
      {
        id: 'challan-1',
        organizationId: 'org-1',
        challanNo: 'CHL-001',
        dispatchTripId: 'trip-1',
        issueDate: new Date('2026-07-11T00:00:00.000Z'),
        status: 'generated',
        pdfUrl: null,
        createdAt: new Date('2026-07-10T00:00:00.000Z'),
        updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      },
    ],
    salesInvoices: [] as any[],
    salesInvoiceItems: [] as any[],
    paymentAllocations: [] as any[],
    demandSourceOrders: [] as any[],
    productVariants: [
      {
        id: 'var-1',
        organizationId: 'org-1',
        sku: 'SKU-001',
        variantName: '500 ml',
        offerPrice: null,
        defaultRetailerPrice: 80,
        product: {
          id: 'prod-1',
          name: 'Sudha Milk',
          taxCodeId: null,
        },
      },
    ],
    dispatchTripCounters: 1,
    invoiceCounter: 0,
  };

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
  const toNum = (value: any) => Number(value ?? 0);

  const sortRows = (rows: any[], orderBy: any) => {
    if (!orderBy) return rows;
    const list = Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...rows].sort((a, b) => {
      for (const entry of list) {
        const [key, direction] = Object.entries(entry)[0] as [string, any];
        const av = a[key];
        const bv = b[key];
        if (av === bv) continue;
        const delta = av > bv ? 1 : -1;
        return direction === 'desc' ? -delta : delta;
      }
      return 0;
    });
  };

  const findRetailer = (where: any) =>
    state.retailers.find((row: any) => (!where?.organizationId || row.organizationId === where.organizationId) && (!where?.id || row.id === where.id)) ?? null;

  const findSalesOrder = (where: any) =>
    state.salesOrders.find((row: any) => {
      if (where?.organizationId && row.organizationId !== where.organizationId) return false;
      if (where?.id && row.id !== where.id) return false;
      if (where?.retailerId && row.retailerId !== where.retailerId) return false;
      if (where?.routeId && row.routeId !== where.routeId) return false;
      return true;
    }) ?? null;

  const filterSalesOrders = (where: any = {}) =>
    state.salesOrders.filter((row: any) => {
      if (where.organizationId && row.organizationId !== where.organizationId) return false;
      if (where.id && row.id !== where.id) return false;
      if (where.id?.in && !where.id.in.includes(row.id)) return false;
      if (where.retailerId && row.retailerId !== where.retailerId) return false;
      if (where.status) {
        if (typeof where.status === 'string' && row.status !== where.status) return false;
        if (where.status.in && !where.status.in.includes(row.status)) return false;
      }
      if (where.routeId && row.routeId !== where.routeId) return false;
      if (where.deliveryCycleId && row.deliveryCycleId !== where.deliveryCycleId) return false;
      return true;
    });

  const filterSalesOrderItems = (where: any = {}) =>
    state.salesOrderItems.filter((row: any) => {
      if (where.organizationId && row.organizationId !== where.organizationId) return false;
      if (where.salesOrderId && row.salesOrderId !== where.salesOrderId) return false;
      return true;
    });

  const filterSalesInvoices = (where: any = {}) =>
    state.salesInvoices.filter((row: any) => {
      if (where.organizationId && row.organizationId !== where.organizationId) return false;
      if (where.id && row.id !== where.id) return false;
      if (where.retailerId && row.retailerId !== where.retailerId) return false;
      if (where.salesOrderId !== undefined && row.salesOrderId !== where.salesOrderId) return false;
      if (where.dispatchTripId !== undefined && row.dispatchTripId !== where.dispatchTripId) return false;
      if (where.status?.not && row.status === where.status.not) return false;
      if (where.status?.in && !where.status.in.includes(row.status)) return false;
      return true;
    });

  const filterDeliveryStops = (where: any = {}) =>
    state.deliveryStops.filter((row: any) => {
      if (where.organizationId && row.organizationId !== where.organizationId) return false;
      if (where.dispatchTripId && row.dispatchTripId !== where.dispatchTripId) return false;
      if (where.retailerId && row.retailerId !== where.retailerId) return false;
      if (where.status && row.status !== where.status) return false;
      return true;
    });

  const filterDispatchTrips = (where: any = {}) =>
    state.dispatchTrips.filter((row: any) => {
      if (where.organizationId && row.organizationId !== where.organizationId) return false;
      if (where.id && row.id !== where.id) return false;
      if (where.routeId && row.routeId !== where.routeId) return false;
      return true;
    });

  const filterProductVariants = (where: any = {}) =>
    state.productVariants.filter((row: any) => {
      if (where.organizationId && row.organizationId !== where.organizationId) return false;
      if (where.id?.in && !where.id.in.includes(row.id)) return false;
      return true;
    });

  const prisma: any = {
    $transaction: async (fn: any) => fn(prisma),
    retailer: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = findRetailer(where);
        if (!row) return null;
        return select ? Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, row[k]])) : clone(row);
      },
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.retailers.filter((row: any) => (!where?.organizationId || row.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(row.id)));
        return rows.map((row: any) => {
          if (!select) return clone(row);
          const out: any = {};
          for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
          return out;
        });
      },
      update: async ({ where, data }: any) => {
        const row = findRetailer(where);
        Object.assign(row, data);
        return clone(row);
      },
    },
    retailerCreditProfile: {
      findFirst: async ({ where }: any = {}) => clone(state.retailerCreditProfiles.find((row: any) => (!where?.organizationId || row.organizationId === where.organizationId) && (!where?.retailerId || row.retailerId === where.retailerId)) ?? null),
      upsert: async ({ where, create, update }: any) => {
        let row = state.retailerCreditProfiles.find((x: any) => x.retailerId === where.retailerId);
        if (!row) {
          row = { id: `rcp-${state.retailerCreditProfiles.length + 1}`, ...create };
          state.retailerCreditProfiles.push(row);
        } else {
          Object.assign(row, update, { updatedAt: new Date() });
        }
        return clone(row);
      },
    },
    retailerPaymentMetric: {
      findFirst: async ({ where }: any = {}) => clone(state.retailerPaymentMetrics.find((row: any) => (!where?.organizationId || row.organizationId === where.organizationId) && (!where?.retailerId || row.retailerId === where.retailerId)) ?? null),
    },
    retailerCreditOverride: {
      findMany: async ({ where }: any = {}) => state.retailerCreditOverrides.filter((row: any) => {
        if (where?.organizationId && row.organizationId !== where.organizationId) return false;
        if (where?.retailerId && row.retailerId !== where.retailerId) return false;
        if (where?.status && row.status !== where.status) return false;
        if (where?.AND?.length) {
          for (const clause of where.AND) {
            if (clause.OR) {
              const pass = clause.OR.some((inner: any) => {
                if (inner.expiresAt === null) return row.expiresAt === null;
                if (inner.expiresAt?.gte) return row.expiresAt === null || new Date(row.expiresAt).getTime() >= new Date(inner.expiresAt.gte).getTime();
                if (inner.salesOrderId === null) return row.salesOrderId === null;
                if (inner.salesOrderId) return row.salesOrderId === inner.salesOrderId;
                return false;
              });
              if (!pass) return false;
            }
          }
        }
        return true;
      }).map(clone),
      create: async ({ data }: any) => {
        const row = { id: `ovr-${state.retailerCreditOverrides.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
        state.retailerCreditOverrides.push(row);
        return clone(row);
      },
      count: async ({ where }: any = {}) => state.retailerCreditOverrides.filter((row: any) => (!where?.organizationId || row.organizationId === where.organizationId)).length,
    },
    salesOrder: {
      findFirst: async ({ where, include, select }: any = {}) => {
        const row = findSalesOrder(where);
        if (!row) return null;
        if (include) {
          return {
            ...clone(row),
            items: filterSalesOrderItems({ organizationId: row.organizationId, salesOrderId: row.id }).map(clone),
            statusHistory: state.salesOrderStatusHistory.filter((x: any) => x.salesOrderId === row.id).map(clone),
          };
        }
        if (select) {
          const out: any = {};
          for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
          return out;
        }
        return clone(row);
      },
      findMany: async ({ where, include, select, orderBy }: any = {}) => sortRows(filterSalesOrders(where), orderBy).map((row: any) => {
        if (include) {
          return {
            ...clone(row),
            items: filterSalesOrderItems({ organizationId: row.organizationId, salesOrderId: row.id }).map(clone),
          };
        }
        if (select) {
          const out: any = {};
          for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
          return out;
        }
        return clone(row);
      }),
      update: async ({ where, data }: any) => {
        const row = state.salesOrders.find((x: any) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      count: async ({ where }: any = {}) => filterSalesOrders(where).length,
    },
    salesOrderItem: {
      findMany: async ({ where }: any = {}) => filterSalesOrderItems(where).map(clone),
      update: async ({ where, data }: any) => {
        const row = state.salesOrderItems.find((x: any) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      deleteMany: async ({ where }: any) => {
        state.salesOrderItems = state.salesOrderItems.filter((x: any) => x.salesOrderId !== where.salesOrderId);
        return { count: 1 };
      },
      createMany: async ({ data }: any) => {
        for (const row of data) state.salesOrderItems.push({ id: `soi-${state.salesOrderItems.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...row });
        return { count: data.length };
      },
    },
    salesOrderStatusHistory: {
      create: async ({ data }: any) => {
        state.salesOrderStatusHistory.push({ id: `sosh-${state.salesOrderStatusHistory.length + 1}`, changedAt: new Date(), ...data });
        return clone(state.salesOrderStatusHistory[state.salesOrderStatusHistory.length - 1]);
      },
    },
    demandSourceOrder: {
      findFirst: async () => null,
    },
    deliveryCycle: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.deliveryCycles.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id) && (!where?.cycleCode || x.cycleCode === where.cycleCode)) ?? null;
        if (!row) return null;
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      },
      findMany: async ({ where, select }: any = {}) => state.deliveryCycles.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id))).map((row: any) => {
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      }),
      create: async ({ data }: any) => {
        const row = { id: `dc-${state.deliveryCycles.length + 1}`, ...data };
        state.deliveryCycles.push(row);
        return clone(row);
      },
    },
    route: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.routes.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null;
        if (!row) return null;
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      },
      findMany: async ({ where, select }: any = {}) => state.routes.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id))).map((row: any) => {
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      }),
    },
    dispatchTrip: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = filterDispatchTrips(where)[0] ?? null;
        if (!row) return null;
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      },
      findMany: async ({ where, select }: any = {}) => filterDispatchTrips(where).map((row: any) => {
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      }),
      update: async ({ where, data }: any) => {
        const row = state.dispatchTrips.find((x: any) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      count: async ({ where }: any = {}) => filterDispatchTrips(where).length,
    },
    dispatchTripItem: {
      findMany: async () => [],
    },
    deliveryStop: {
      findMany: async ({ where }: any = {}) => filterDeliveryStops(where).map(clone),
      create: async ({ data }: any) => {
        const row = { id: `stop-${state.deliveryStops.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
        state.deliveryStops.push(row);
        return clone(row);
      },
      count: async ({ where }: any = {}) => filterDeliveryStops(where).length,
    },
    deliveryStopItem: {
      findMany: async () => [],
      createMany: async ({ data }: any) => {
        for (const row of data) state.deliveryStopItems.push({ id: `dsi-${state.deliveryStopItems.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...row });
        return { count: data.length };
      },
    },
    deliveryChallan: {
      findFirst: async ({ where }: any = {}) => clone(state.deliveryChallans.find((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.dispatchTripId || x.dispatchTripId === where.dispatchTripId)) ?? null),
    },
    salesInvoice: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = filterSalesInvoices(where)[0] ?? null;
        if (!row) return null;
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      },
      findMany: async ({ where, select, orderBy }: any = {}) => sortRows(filterSalesInvoices(where), orderBy).map((row: any) => {
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
        return out;
      }),
      create: async ({ data }: any) => {
        state.invoiceCounter += 1;
        const row = { id: `inv-${state.invoiceCounter}`, createdAt: new Date(), updatedAt: new Date(), journalEntryId: null, paidAt: null, dueBucket: 'current', autoReconciled: false, reminderEnabled: true, pdfUrl: null, ...data };
        state.salesInvoices.push(row);
        return clone(row);
      },
      update: async ({ where, data }: any) => {
        const row = state.salesInvoices.find((x: any) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      count: async ({ where }: any = {}) => filterSalesInvoices(where).length,
    },
    salesInvoiceItem: {
      createMany: async ({ data }: any) => {
        for (const row of data) state.salesInvoiceItems.push({ id: `sii-${state.salesInvoiceItems.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...row });
        return { count: data.length };
      },
      findMany: async ({ where }: any = {}) => state.salesInvoiceItems.filter((x: any) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.salesInvoiceId || x.salesInvoiceId === where.salesInvoiceId)).map(clone),
    },
    paymentAllocation: {
      findMany: async () => [],
      aggregate: async () => ({ _sum: { allocatedAmount: 0 } }),
    },
    productVariant: {
      findMany: async ({ where, select }: any = {}) => filterProductVariants(where).map((row: any) => {
        if (!select) return clone(row);
        const out: any = {};
        for (const key of Object.keys(select)) {
          if (!select[key]) continue;
          if (key === 'product') out[key] = row.product;
          else out[key] = row[key];
        }
        return out;
      }),
    },
    employee: { findFirst: async () => null },
    vehicle: { findFirst: async () => null },
    warehouse: { findMany: async () => [] },
  };

  const paymentMetricsService = {
    refreshRetailerMetrics: async () => ({ success: true }),
    refreshRetailerCreditCache: async () => ({ success: true }),
    refreshAfterInvoice: async () => ({ success: true }),
  } as any;
  const retailerLedgerService = {
    postInvoiceDebit: async () => ({ success: true }),
    reverseInvoicePosting: async () => ({ success: true }),
  } as any;
  const retailerFinanceService = { getMyDues: async () => ({ success: true, data: {} }) } as any;
  const accountingService = {
    postSalesInvoice: async () => ({ success: true }),
    reverseSalesInvoice: async () => ({ success: true }),
  } as any;

  const actor = createActor();
  const creditControlService = new CreditControlService(prisma, paymentMetricsService);
  const salesOrdersService = new SalesOrdersService(prisma, creditControlService);
  const dispatchService = new DispatchService(prisma, creditControlService);
  const salesInvoicesService = new SalesInvoicesService(
    prisma,
    accountingService,
    retailerLedgerService,
    paymentMetricsService,
    retailerFinanceService,
    creditControlService,
  );

  return {
    actor,
    state,
    salesOrdersService,
    dispatchService,
    salesInvoicesService,
    creditControlService,
  };
}

test('assisted order approval is blocked without override when credit policy requires approval', async () => {
  const harness = createHarness({
    creditLimit: 1000,
    currentOutstanding: 950,
    orderGrandTotal: 200,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
  });

  await assert.rejects(
    () => harness.salesOrdersService.approve(harness.actor, 'so-1', { note: 'Approve assisted order' }),
    /Credit approval required/,
  );

  assert.equal(harness.state.salesOrders[0].status, 'pending');
});

test('assisted order approval succeeds with active credit override', async () => {
  const harness = createHarness({
    creditLimit: 1000,
    currentOutstanding: 950,
    orderGrandTotal: 200,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
    overrides: [
      {
        overrideType: 'credit_limit_exceed',
        approvedAmount: 500,
        requestedAmount: 500,
        salesOrderId: 'so-1',
      },
    ],
  });

  const response = await harness.salesOrdersService.approve(harness.actor, 'so-1', { note: 'Approve assisted order' });
  assert.equal(response.success, true);
  assert.equal(harness.state.salesOrders[0].status, 'approved');
});

test('dispatch start is blocked by overdue credit policy', async () => {
  const harness = createHarness({
    creditLimit: 5000,
    currentOutstanding: 1000,
    overdueAmount: 600,
    orderGrandTotal: 300,
    managerApprovalRequired: false,
    allowDispatchWithOverdue: false,
    blockOrdersOnLimitExceed: false,
  });

  harness.state.salesOrders[0].status = 'approved';
  harness.state.salesOrderItems[0].approvedQty = harness.state.salesOrderItems[0].orderedQty;

  await assert.rejects(
    () => harness.dispatchService.start(harness.actor, 'trip-1'),
    /Credit policy blocked action|Credit approval required/,
  );

  assert.equal(harness.state.dispatchTrips[0].status, 'loaded');
});

test('invoice generation is blocked by credit policy without override', async () => {
  const harness = createHarness({
    creditLimit: 1000,
    currentOutstanding: 950,
    orderGrandTotal: 200,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
  });

  harness.state.salesOrders[0].status = 'approved';
  harness.state.salesOrderItems[0].approvedQty = harness.state.salesOrderItems[0].orderedQty;

  await assert.rejects(
    () => harness.salesInvoicesService.generate(harness.actor, {
      retailerId: 'ret-1',
      salesOrderId: 'so-1',
      source: 'assisted_billing',
    } as any),
    /Credit approval required/,
  );

  assert.equal(harness.state.salesInvoices.length, 0);
});

test('successful override then approval, dispatch, and invoice generation path works', async () => {
  const harness = createHarness({
    creditLimit: 1000,
    currentOutstanding: 950,
    orderGrandTotal: 200,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
    overrides: [
      {
        overrideType: 'credit_limit_exceed',
        approvedAmount: 1000,
        requestedAmount: 1000,
        salesOrderId: null,
      },
    ],
  });

  const approved = await harness.salesOrdersService.approve(harness.actor, 'so-1', { note: 'Approve with override' });
  assert.equal(approved.success, true);
  assert.equal(harness.state.salesOrders[0].status, 'approved');

  const started = await harness.dispatchService.start(harness.actor, 'trip-1');
  assert.equal(started.success, true);
  assert.equal(harness.state.dispatchTrips[0].status, 'dispatched');
  assert.equal(harness.state.salesOrders[0].status, 'dispatched');

  const invoice = await harness.salesInvoicesService.generate(harness.actor, {
    retailerId: 'ret-1',
    salesOrderId: 'so-1',
    source: 'assisted_billing',
  } as any);
  assert.equal(invoice.success, true);
  assert.equal(harness.state.salesInvoices.length, 1);
  assert.equal(harness.state.salesInvoices[0].retailerId, 'ret-1');
  assert.equal(harness.state.salesInvoices[0].paymentStatus, 'unpaid');
});
