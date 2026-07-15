import assert from 'node:assert/strict';
import test from 'node:test';
import { CreditControlService } from '../src/operations/payments/credit-control.service';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';

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

function createService(options?: {
  creditLimit?: number;
  currentOutstanding?: number;
  overdueAmount?: number;
  managerApprovalRequired?: boolean;
  blockOrdersOnLimitExceed?: boolean;
  allowDispatchWithOverdue?: boolean;
  isCreditActive?: boolean;
  warningThresholdPercent?: number;
  overrides?: any[];
  orderGrandTotal?: number;
  invoiceOutstanding?: number;
  dispatchOrderGrandTotal?: number;
}) {
  const settings = {
    creditLimit: 50000,
    currentOutstanding: 0,
    overdueAmount: 0,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
    allowDispatchWithOverdue: false,
    isCreditActive: true,
    warningThresholdPercent: 80,
    overrides: [],
    orderGrandTotal: 0,
    invoiceOutstanding: 0,
    dispatchOrderGrandTotal: 0,
    ...options,
  };

  const prisma = {
    retailer: {
      findFirst: async () => ({
        id: 'ret-1',
        shopName: 'Retailer One',
        creditLimit: settings.creditLimit,
        creditDays: 7,
      }),
    },
    retailerCreditProfile: {
      findFirst: async () => ({
        retailerId: 'ret-1',
        creditLimit: settings.creditLimit,
        creditDays: 7,
        warningThresholdPercent: settings.warningThresholdPercent,
        blockOrdersOnLimitExceed: settings.blockOrdersOnLimitExceed,
        managerApprovalRequired: settings.managerApprovalRequired,
        allowDispatchWithOverdue: settings.allowDispatchWithOverdue,
        isCreditActive: settings.isCreditActive,
        currentOutstanding: settings.currentOutstanding,
        overdueAmount: settings.overdueAmount,
      }),
      upsert: async ({ create, update }: any) => ({ ...create, ...update }),
    },
    retailerPaymentMetric: {
      findFirst: async () => ({
        retailerId: 'ret-1',
        currentOutstanding: settings.currentOutstanding,
        overdueAmount: settings.overdueAmount,
        pendingInvoiceCount: 2,
        riskLevel: 'medium',
        riskScore: 42,
      }),
    },
    salesOrder: {
      findFirst: async () => ({ id: 'so-1', grandTotal: settings.orderGrandTotal || settings.dispatchOrderGrandTotal, retailerId: 'ret-1' }),
    },
    salesInvoice: {
      findFirst: async () => ({ id: 'inv-1', grandTotal: settings.invoiceOutstanding, outstandingAmount: settings.invoiceOutstanding, retailerId: 'ret-1' }),
    },
    deliveryStop: {
      findMany: async () => [{ salesOrderId: 'so-1' }],
    },
    retailerCreditOverride: {
      findMany: async () => settings.overrides,
      create: async ({ data }: any) => data,
      count: async () => settings.overrides.length,
    },
  } as any;

  const paymentMetricsService = {
    refreshRetailerMetrics: async () => ({ success: true }),
    refreshRetailerCreditCache: async () => ({ success: true }),
  } as any;

  return new CreditControlService(prisma, paymentMetricsService);
}

test('order approval blocked by credit limit exceed', async () => {
  const service = createService({
    creditLimit: 10000,
    currentOutstanding: 9500,
    orderGrandTotal: 1000,
    managerApprovalRequired: false,
    blockOrdersOnLimitExceed: true,
  });

  await assert.rejects(
    () => service.assertCreditAllowed(createActor(), 'ret-1', {
      context: 'order_approval',
      transactionAmount: 1000,
      salesOrderId: 'so-1',
    }),
    /Credit policy blocked action/,
  );
});

test('dispatch blocked by overdue when overdue dispatch not allowed', async () => {
  const service = createService({
    creditLimit: 50000,
    currentOutstanding: 10000,
    overdueAmount: 2500,
    dispatchOrderGrandTotal: 2000,
    allowDispatchWithOverdue: false,
    managerApprovalRequired: false,
  });

  await assert.rejects(
    () => service.assertCreditAllowed(createActor(), 'ret-1', {
      context: 'dispatch_release',
      dispatchTripId: 'trip-1',
      salesOrderId: 'so-1',
      transactionAmount: 2000,
    }),
    /Credit policy blocked action|Credit approval required/,
  );
});

test('credit override allows action over limit', async () => {
  const service = createService({
    creditLimit: 10000,
    currentOutstanding: 9800,
    orderGrandTotal: 700,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
    overrides: [
      {
        id: 'ovr-1',
        overrideType: 'credit_limit_exceed',
        approvedAmount: 1000,
        requestedAmount: 1000,
        status: 'approved',
        expiresAt: null,
        salesOrderId: 'so-1',
        approvedAt: new Date(),
      },
    ],
  });

  const result = await service.assertCreditAllowed(createActor(), 'ret-1', {
    context: 'order_approval',
    transactionAmount: 700,
    salesOrderId: 'so-1',
  });

  assert.equal(result.decision, 'warning');
  assert.ok(result.reasons.includes('credit_override_applied'));
});

test('invoice posting blocked without override when manager approval required', async () => {
  const service = createService({
    creditLimit: 12000,
    currentOutstanding: 11800,
    invoiceOutstanding: 600,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
  });

  await assert.rejects(
    () => service.assertCreditAllowed(createActor(), 'ret-1', {
      context: 'invoice_posting',
      salesInvoiceId: 'inv-1',
      transactionAmount: 600,
    }),
    /Credit approval required/,
  );
});
