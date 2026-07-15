// @ts-nocheck
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';
import { AccountingService } from '../src/finance/accounting/accounting.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { DispatchController } from '../src/operations/dispatch/dispatch.controller';
import { DispatchService } from '../src/operations/dispatch/dispatch.service';
import { CreditControlController } from '../src/operations/payments/credit-control.controller';
import { CreditControlService } from '../src/operations/payments/credit-control.service';
import { PaymentMetricsService } from '../src/operations/payments/payment-metrics.service';
import { RetailerFinanceService } from '../src/operations/payments/retailer-finance.service';
import { RetailerLedgerService } from '../src/operations/payments/retailer-ledger.service';
import { SalesInvoicesController } from '../src/operations/sales-invoices/sales-invoices.controller';
import { SalesInvoicesService } from '../src/operations/sales-invoices/sales-invoices.service';
import { SalesOrdersController } from '../src/operations/sales-orders/sales-orders.controller';
import { SalesOrdersService } from '../src/operations/sales-orders/sales-orders.service';

const IDS = {
  org: '10000000-0000-4000-8000-000000000001',
  user: '10000000-0000-4000-8000-000000000002',
  retailer: '10000000-0000-4000-8000-000000000003',
  order: '10000000-0000-4000-8000-000000000004',
  route: '10000000-0000-4000-8000-000000000005',
  cycle: '10000000-0000-4000-8000-000000000006',
  stop: '10000000-0000-4000-8000-000000000007',
  trip: '10000000-0000-4000-8000-000000000008',
  variant: '10000000-0000-4000-8000-000000000009',
  challan: '10000000-0000-4000-8000-000000000010',
};

function uuid(index: number) {
  return `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

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

function createCreditOpsHarness(options?: {
  creditLimit?: number;
  currentOutstanding?: number;
  overdueAmount?: number;
  managerApprovalRequired?: boolean;
  blockOrdersOnLimitExceed?: boolean;
  allowDispatchWithOverdue?: boolean;
  overrides?: any[];
  orderGrandTotal?: number;
}) {
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
        id: IDS.retailer,
        organizationId: IDS.org,
        retailerCode: 'RET-001',
        shopName: 'Retailer One',
        creditLimit: settings.creditLimit,
        creditDays: 7,
        isOrderingEnabled: true,
        isBillingEnabled: true,
        orderingMode: 'assisted',
        assignedRouteId: IDS.route,
      },
    ],
    retailerCreditProfiles: [
      {
        id: uuid(20),
        organizationId: IDS.org,
        retailerId: IDS.retailer,
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
        id: uuid(21),
        organizationId: IDS.org,
        retailerId: IDS.retailer,
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
      id: row.id ?? uuid(30 + index),
      organizationId: IDS.org,
      retailerId: IDS.retailer,
      salesOrderId: row.salesOrderId ?? null,
      overrideType: row.overrideType,
      requestedAmount: row.requestedAmount ?? row.approvedAmount ?? null,
      approvedAmount: row.approvedAmount ?? null,
      reason: row.reason ?? 'Approved override',
      status: row.status ?? 'approved',
      approvedByUserId: IDS.user,
      approvedAt: row.approvedAt ?? new Date('2026-07-10T09:00:00.000Z'),
      expiresAt: row.expiresAt ?? null,
      remarks: row.remarks ?? null,
      createdAt: new Date('2026-07-10T09:00:00.000Z'),
      updatedAt: new Date('2026-07-10T09:00:00.000Z'),
    })),
    salesOrders: [
      {
        id: IDS.order,
        organizationId: IDS.org,
        orderNo: 'SO-001',
        retailerId: IDS.retailer,
        routeId: IDS.route,
        deliveryCycleId: IDS.cycle,
        orderDate: new Date('2026-07-10T00:00:00.000Z'),
        requestedDeliveryDate: new Date('2026-07-11T00:00:00.000Z'),
        source: 'admin',
        orderingModeSnapshot: 'assisted',
        enteredByUserId: IDS.user,
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
        id: uuid(40),
        organizationId: IDS.org,
        salesOrderId: IDS.order,
        variantId: IDS.variant,
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
        id: IDS.cycle,
        organizationId: IDS.org,
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
        id: IDS.route,
        organizationId: IDS.org,
        code: 'R1',
        name: 'Main Route',
        deliveryShift: 'morning',
        areaId: null,
        defaultCutoffTime: '21:00',
      },
    ],
    dispatchTrips: [
      {
        id: IDS.trip,
        organizationId: IDS.org,
        tripNo: 'TRIP-001',
        deliveryCycleId: IDS.cycle,
        routeId: IDS.route,
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
        id: IDS.stop,
        organizationId: IDS.org,
        dispatchTripId: IDS.trip,
        retailerId: IDS.retailer,
        salesOrderId: IDS.order,
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
        id: IDS.challan,
        organizationId: IDS.org,
        challanNo: 'CHL-001',
        dispatchTripId: IDS.trip,
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
        id: IDS.variant,
        organizationId: IDS.org,
        sku: 'SKU-001',
        variantName: '500 ml',
        offerPrice: null,
        defaultRetailerPrice: 80,
        product: {
          id: uuid(50),
          name: 'Sudha Milk',
          taxCodeId: null,
        },
      },
    ],
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

  const pick = (row: any, select: any) => {
    if (!select) return clone(row);
    const out: any = {};
    for (const key of Object.keys(select)) {
      if (!select[key]) continue;
      if (key === 'product') out[key] = clone(row.product);
      else out[key] = row[key];
    }
    return out;
  };

  const prisma: any = {
    $transaction: async (fn: any) => fn(prisma),
    retailer: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.retailers.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null;
        return row ? (select ? pick(row, select) : clone(row)) : null;
      },
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.retailers.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id)));
        return rows.map((row) => (select ? pick(row, select) : clone(row)));
      },
    },
    retailerCreditProfile: {
      findFirst: async ({ where }: any = {}) => clone(state.retailerCreditProfiles.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerId || x.retailerId === where.retailerId)) ?? null),
      upsert: async ({ where, create, update }: any) => {
        let row = state.retailerCreditProfiles.find((x) => x.retailerId === where.retailerId);
        if (!row) {
          row = { id: uuid(60 + state.retailerCreditProfiles.length), ...create };
          state.retailerCreditProfiles.push(row);
        } else {
          Object.assign(row, update, { updatedAt: new Date() });
        }
        return clone(row);
      },
    },
    retailerPaymentMetric: {
      findFirst: async ({ where }: any = {}) => clone(state.retailerPaymentMetrics.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.retailerId || x.retailerId === where.retailerId)) ?? null),
    },
    retailerCreditOverride: {
      findMany: async ({ where }: any = {}) => state.retailerCreditOverrides.filter((row) => {
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
        const row = { id: uuid(70 + state.retailerCreditOverrides.length), createdAt: new Date(), updatedAt: new Date(), ...data };
        state.retailerCreditOverrides.push(row);
        return clone(row);
      },
      count: async ({ where }: any = {}) => state.retailerCreditOverrides.filter((row) => (!where?.organizationId || row.organizationId === where.organizationId)).length,
    },
    salesOrder: {
      findFirst: async ({ where, include, select }: any = {}) => {
        const row = state.salesOrders.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id) && (!where?.retailerId || x.retailerId === where.retailerId)) ?? null;
        if (!row) return null;
        if (include) {
          return {
            ...clone(row),
            items: state.salesOrderItems.filter((item) => item.salesOrderId === row.id).map(clone),
            statusHistory: state.salesOrderStatusHistory.filter((item) => item.salesOrderId === row.id).map(clone),
          };
        }
        return select ? pick(row, select) : clone(row);
      },
      findMany: async ({ where, include, select, orderBy }: any = {}) => sortRows(
        state.salesOrders.filter((row) => {
          if (where?.organizationId && row.organizationId !== where.organizationId) return false;
          if (where?.id?.in && !where.id.in.includes(row.id)) return false;
          if (where?.retailerId && row.retailerId !== where.retailerId) return false;
          if (where?.routeId && row.routeId !== where.routeId) return false;
          if (where?.deliveryCycleId && row.deliveryCycleId !== where.deliveryCycleId) return false;
          if (where?.status?.in && !where.status.in.includes(row.status)) return false;
          return true;
        }),
        orderBy,
      ).map((row) => {
        if (include) return { ...clone(row), items: state.salesOrderItems.filter((item) => item.salesOrderId === row.id).map(clone) };
        return select ? pick(row, select) : clone(row);
      }),
      update: async ({ where, data }: any) => {
        const row = state.salesOrders.find((x) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      count: async ({ where }: any = {}) => state.salesOrders.filter((row) => (!where?.organizationId || row.organizationId === where.organizationId)).length,
    },
    salesOrderItem: {
      findMany: async ({ where }: any = {}) => state.salesOrderItems.filter((row) => (!where?.organizationId || row.organizationId === where.organizationId) && (!where?.salesOrderId || row.salesOrderId === where.salesOrderId)).map(clone),
      update: async ({ where, data }: any) => {
        const row = state.salesOrderItems.find((x) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      deleteMany: async ({ where }: any) => {
        state.salesOrderItems = state.salesOrderItems.filter((x) => x.salesOrderId !== where.salesOrderId);
        return { count: 1 };
      },
      createMany: async ({ data }: any) => {
        for (const row of data) state.salesOrderItems.push({ id: uuid(80 + state.salesOrderItems.length), createdAt: new Date(), updatedAt: new Date(), ...row });
        return { count: data.length };
      },
    },
    salesOrderStatusHistory: {
      create: async ({ data }: any) => {
        state.salesOrderStatusHistory.push({ id: uuid(90 + state.salesOrderStatusHistory.length), changedAt: new Date(), ...data });
        return clone(state.salesOrderStatusHistory[state.salesOrderStatusHistory.length - 1]);
      },
    },
    demandSourceOrder: {
      findFirst: async () => null,
    },
    deliveryCycle: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.deliveryCycles.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id) && (!where?.cycleCode || x.cycleCode === where.cycleCode)) ?? null;
        return row ? (select ? pick(row, select) : clone(row)) : null;
      },
    },
    route: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.routes.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null;
        return row ? (select ? pick(row, select) : clone(row)) : null;
      },
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.routes.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id)));
        return rows.map((row) => (select ? pick(row, select) : clone(row)));
      },
    },
    dispatchTrip: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.dispatchTrips.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id)) ?? null;
        return row ? (select ? pick(row, select) : clone(row)) : null;
      },
      findMany: async ({ where, select }: any = {}) => {
        const rows = state.dispatchTrips.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id)));
        return rows.map((row) => (select ? pick(row, select) : clone(row)));
      },
      update: async ({ where, data }: any) => {
        const row = state.dispatchTrips.find((x) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      count: async () => state.dispatchTrips.length,
    },
    dispatchTripItem: { findMany: async () => [] },
    deliveryStop: {
      findMany: async ({ where }: any = {}) => state.deliveryStops.filter((row) => (!where?.organizationId || row.organizationId === where.organizationId) && (!where?.dispatchTripId || row.dispatchTripId === where.dispatchTripId) && (!where?.retailerId || row.retailerId === where.retailerId) && (!where?.status || row.status === where.status)).map(clone),
      create: async ({ data }: any) => {
        const row = { id: uuid(100 + state.deliveryStops.length), createdAt: new Date(), updatedAt: new Date(), ...data };
        state.deliveryStops.push(row);
        return clone(row);
      },
      count: async ({ where }: any = {}) => state.deliveryStops.filter((row) => (!where?.status || row.status === where.status) && (!where?.dispatchTripId || row.dispatchTripId === where.dispatchTripId)).length,
    },
    deliveryStopItem: {
      findMany: async () => [],
      createMany: async ({ data }: any) => {
        for (const row of data) state.deliveryStopItems.push({ id: uuid(110 + state.deliveryStopItems.length), createdAt: new Date(), updatedAt: new Date(), ...row });
        return { count: data.length };
      },
    },
    deliveryChallan: {
      findFirst: async ({ where }: any = {}) => clone(state.deliveryChallans.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.dispatchTripId || x.dispatchTripId === where.dispatchTripId)) ?? null),
    },
    salesInvoice: {
      findFirst: async ({ where, select }: any = {}) => {
        const row = state.salesInvoices.find((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id || x.id === where.id) && (!where?.retailerId || x.retailerId === where.retailerId) && (where?.salesOrderId === undefined || x.salesOrderId === where.salesOrderId) && (where?.dispatchTripId === undefined || x.dispatchTripId === where.dispatchTripId) && (!where?.status?.not || x.status !== where.status.not)) ?? null;
        return row ? (select ? pick(row, select) : clone(row)) : null;
      },
      findMany: async ({ where, select, orderBy }: any = {}) => sortRows(
        state.salesInvoices.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.salesOrderId || x.salesOrderId === where.salesOrderId)),
        orderBy,
      ).map((row) => (select ? pick(row, select) : clone(row))),
      create: async ({ data }: any) => {
        const row = { id: uuid(120 + state.salesInvoices.length), createdAt: new Date(), updatedAt: new Date(), journalEntryId: null, paidAt: null, dueBucket: 'current', autoReconciled: false, reminderEnabled: true, pdfUrl: null, ...data };
        state.salesInvoices.push(row);
        return clone(row);
      },
      update: async ({ where, data }: any) => {
        const row = state.salesInvoices.find((x) => x.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return clone(row);
      },
      count: async ({ where }: any = {}) => state.salesInvoices.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId)).length,
    },
    salesInvoiceItem: {
      createMany: async ({ data }: any) => {
        for (const row of data) state.salesInvoiceItems.push({ id: uuid(130 + state.salesInvoiceItems.length), createdAt: new Date(), updatedAt: new Date(), ...row });
        return { count: data.length };
      },
      findMany: async ({ where }: any = {}) => state.salesInvoiceItems.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.salesInvoiceId || x.salesInvoiceId === where.salesInvoiceId)).map(clone),
    },
    paymentAllocation: {
      findMany: async () => [],
      aggregate: async () => ({ _sum: { allocatedAmount: 0 } }),
    },
    productVariant: {
      findMany: async ({ where, select }: any = {}) => state.productVariants.filter((x) => (!where?.organizationId || x.organizationId === where.organizationId) && (!where?.id?.in || where.id.in.includes(x.id))).map((row) => (select ? pick(row, select) : clone(row))),
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
    prisma,
    services: { creditControlService, salesOrdersService, dispatchService, salesInvoicesService },
    mocks: { paymentMetricsService, retailerLedgerService, retailerFinanceService, accountingService },
  };
}

async function createApp(options?: Parameters<typeof createCreditOpsHarness>[0]) {
  const harness = createCreditOpsHarness(options);
  const moduleRef = await Test.createTestingModule({
    controllers: [CreditControlController, SalesOrdersController, DispatchController, SalesInvoicesController],
    providers: [
      CreditControlService,
      SalesOrdersService,
      DispatchService,
      SalesInvoicesService,
      { provide: PrismaService, useValue: harness.prisma },
      { provide: PaymentMetricsService, useValue: harness.mocks.paymentMetricsService },
      { provide: RetailerLedgerService, useValue: harness.mocks.retailerLedgerService },
      { provide: RetailerFinanceService, useValue: harness.mocks.retailerFinanceService },
      { provide: AccountingService, useValue: harness.mocks.accountingService },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate(context: any) {
        context.switchToHttp().getRequest().user = harness.actor;
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return { app, harness };
}

test('HTTP e2e: assisted order approval blocked without override', async (t) => {
  const { app, harness } = await createApp({
    creditLimit: 1000,
    currentOutstanding: 950,
    orderGrandTotal: 200,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
  });
  t.after(async () => app.close());

  const response = await request(app.getHttpServer())
    .post(`/api/v1/sales-orders/${IDS.order}/approve`)
    .send({ note: 'Approve assisted order' })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Credit approval required/);
  assert.equal(harness.state.salesOrders[0].status, 'pending');
});

test('HTTP e2e: dispatch start blocked by overdue credit policy', async (t) => {
  const { app, harness } = await createApp({
    creditLimit: 5000,
    currentOutstanding: 1000,
    overdueAmount: 600,
    orderGrandTotal: 300,
    managerApprovalRequired: false,
    allowDispatchWithOverdue: false,
    blockOrdersOnLimitExceed: false,
  });
  t.after(async () => app.close());

  harness.state.salesOrders[0].status = 'approved';
  harness.state.salesOrderItems[0].approvedQty = harness.state.salesOrderItems[0].orderedQty;

  const response = await request(app.getHttpServer())
    .post(`/api/v1/dispatch-trips/${IDS.trip}/start`)
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Credit policy blocked action|Credit approval required/);
  assert.equal(harness.state.dispatchTrips[0].status, 'loaded');
});

test('HTTP e2e: invoice generation blocked by credit policy without override', async (t) => {
  const { app, harness } = await createApp({
    creditLimit: 1000,
    currentOutstanding: 950,
    orderGrandTotal: 200,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
  });
  t.after(async () => app.close());

  harness.state.salesOrders[0].status = 'approved';
  harness.state.salesOrderItems[0].approvedQty = harness.state.salesOrderItems[0].orderedQty;

  const response = await request(app.getHttpServer())
    .post('/api/v1/sales-invoices/generate')
    .send({
      retailerId: IDS.retailer,
      salesOrderId: IDS.order,
      source: 'assisted_billing',
    })
    .expect(409);

  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Credit approval required/);
  assert.equal(harness.state.salesInvoices.length, 0);
});

test('HTTP e2e: successful override then approval, dispatch, and invoice generation path works', async (t) => {
  const { app, harness } = await createApp({
    creditLimit: 1000,
    currentOutstanding: 950,
    orderGrandTotal: 200,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
  });
  t.after(async () => app.close());

  const override = await request(app.getHttpServer())
    .post(`/api/v1/retailers/${IDS.retailer}/credit-overrides`)
    .send({
      salesOrderId: IDS.order,
      overrideType: 'credit_limit_exceed',
      requestedAmount: 1000,
      approvedAmount: 1000,
      reason: 'Manager approved extra temporary credit',
    })
    .expect(201);

  assert.equal(override.body.success, true);
  assert.equal(harness.state.retailerCreditOverrides.length, 1);

  const approved = await request(app.getHttpServer())
    .post(`/api/v1/sales-orders/${IDS.order}/approve`)
    .send({ note: 'Approve with override' })
    .expect(201);

  assert.equal(approved.body.success, true);
  assert.equal(harness.state.salesOrders[0].status, 'approved');

  const started = await request(app.getHttpServer())
    .post(`/api/v1/dispatch-trips/${IDS.trip}/start`)
    .expect(201);

  assert.equal(started.body.success, true);
  assert.equal(harness.state.dispatchTrips[0].status, 'dispatched');
  assert.equal(harness.state.salesOrders[0].status, 'dispatched');

  const invoice = await request(app.getHttpServer())
    .post('/api/v1/sales-invoices/generate')
    .send({
      retailerId: IDS.retailer,
      salesOrderId: IDS.order,
      source: 'assisted_billing',
    })
    .expect(201);

  assert.equal(invoice.body.success, true);
  assert.equal(harness.state.salesInvoices.length, 1);
  assert.equal(harness.state.salesInvoices[0].retailerId, IDS.retailer);
  assert.equal(harness.state.salesInvoices[0].paymentStatus, 'unpaid');
});
