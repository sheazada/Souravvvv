// @ts-nocheck
import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication, Type } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../src/common/interfaces/authenticated-user.interface';
import { RetailerNoteThresholdCache } from '../../src/core/settings/retailer-note-thresholds';
import { AccountingService } from '../../src/finance/accounting/accounting.service';
import { PrismaService } from '../../src/prisma/prisma.service';

export const IDS = {
  org: '20000000-0000-4000-8000-000000000001',
  user: '20000000-0000-4000-8000-000000000002',
  retailer: '20000000-0000-4000-8000-000000000003',
  route: '20000000-0000-4000-8000-000000000004',
  cycle: '20000000-0000-4000-8000-000000000005',
  order: '20000000-0000-4000-8000-000000000006',
  orderItem: '20000000-0000-4000-8000-000000000007',
  trip: '20000000-0000-4000-8000-000000000008',
  stop: '20000000-0000-4000-8000-000000000009',
  challan: '20000000-0000-4000-8000-000000000010',
  product: '20000000-0000-4000-8000-000000000011',
  variant: '20000000-0000-4000-8000-000000000012',
  invoice: '20000000-0000-4000-8000-000000000013',
  draftInvoice: '20000000-0000-4000-8000-000000000014',
  postedInvoice: '20000000-0000-4000-8000-000000000015',
  variant2: '20000000-0000-4000-8000-000000000016',
  product2: '20000000-0000-4000-8000-000000000017',
  draftItem1: '20000000-0000-4000-8000-000000000018',
  draftItem2: '20000000-0000-4000-8000-000000000019',
  postedItem1: '20000000-0000-4000-8000-000000000020',
  journalEntry: '20000000-0000-4000-8000-000000000021',
  otherRetailer: '20000000-0000-4000-8000-000000000022',
  otherPartialInvoice: '20000000-0000-4000-8000-000000000023',
  otherPaidInvoice: '20000000-0000-4000-8000-000000000024',
};

let prismaSingleton: PrismaClient | null = null;

export function ensureTestDatabaseUrl() {
  if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
    const candidateDirs = [
      path.resolve(__dirname, '../..'),
      path.resolve(__dirname, '../../..'),
      process.cwd(),
    ];
    for (const dir of candidateDirs) {
      for (const envFile of ['.env.test', '.env']) {
        const envPath = path.join(dir, envFile);
        if (fs.existsSync(envPath)) {
          const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
          for (const line of lines) {
            const match = line.match(/^(TEST_DATABASE_URL|DATABASE_URL)=(.+)$/);
            if (match && match[2] && !process.env[match[1]]) {
              process.env[match[1]] = match[2].trim();
            }
          }
        }
      }
    }
  }
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is required for Prisma-backed e2e tests. Example: postgresql://postgres:postgres@localhost:5432/dairy_erp_test',
    );
  }
  process.env.DATABASE_URL = url;
  return url;
}

export async function getPrisma() {
  ensureTestDatabaseUrl();
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient();
    await prismaSingleton.$connect();
  }
  return prismaSingleton;
}

export async function disconnectPrisma() {
  if (prismaSingleton) {
    await prismaSingleton.$disconnect();
    prismaSingleton = null;
  }
}

export function createActor(): AuthenticatedUser {
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

export async function resetPrismaTestDb(prisma: PrismaClient) {
  RetailerNoteThresholdCache.invalidate(IDS.org);
  RetailerNoteThresholdCache.resetDebugCounters();
  await prisma.paymentGatewayWebhook.deleteMany();
  await prisma.fileAttachment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.syncEvent.deleteMany();
  await prisma.accountJournalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.retailerWalletTransaction.deleteMany();
  await prisma.retailerAdvanceWallet.deleteMany();
  await prisma.retailerLedgerEntry.deleteMany();
  await prisma.retailerPaymentReminder.deleteMany();
  await prisma.retailerPaymentIntentInvoice.deleteMany();
  await prisma.paymentAllocation.deleteMany();
  await prisma.paymentReceipt.deleteMany();
  await prisma.retailerPaymentIntent.deleteMany();
  await prisma.retailerDebitNote.deleteMany();
  await prisma.creditNote.deleteMany();
  await prisma.salesInvoiceItem.deleteMany();
  await prisma.salesInvoice.deleteMany();
  await prisma.crateBalanceSnapshot.deleteMany();
  await prisma.crateTransaction.deleteMany();
  await prisma.deliveryChallan.deleteMany();
  await prisma.deliveryStopItem.deleteMany();
  await prisma.deliveryStop.deleteMany();
  await prisma.dispatchTripItem.deleteMany();
  await prisma.dispatchTrip.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockAdjustmentItem.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.supplierReturnItem.deleteMany();
  await prisma.supplierReturn.deleteMany();
  await prisma.purchaseInvoiceItem.deleteMany();
  await prisma.purchaseInvoice.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.demandSourceOrder.deleteMany();
  await prisma.demandConsolidationItem.deleteMany();
  await prisma.demandConsolidation.deleteMany();
  await prisma.inventoryBatch.deleteMany();
  await prisma.goodsReceiptItem.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.salesOrderStatusHistory.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.retailerCreditOverride.deleteMany();
  await prisma.retailerPaymentMetric.deleteMany();
  await prisma.retailerCreditProfile.deleteMany();
  await prisma.routeRetailer.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.account.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.taxCode.deleteMany();
  await prisma.crateType.deleteMany();
  await prisma.deliveryCycle.deleteMany();
  await prisma.route.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.area.deleteMany();
  await prisma.retailer.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

export async function seedBaseFixture(prisma: PrismaClient) {
  await prisma.organization.create({
    data: {
      id: IDS.org,
      name: 'Test Org',
      timezone: 'Asia/Kolkata',
      currencyCode: 'INR',
    },
  });

  await prisma.user.create({
    data: {
      id: IDS.user,
      organizationId: IDS.org,
      fullName: 'Owner User',
      mobile: '9999999999',
      userType: 'owner',
      isActive: true,
    },
  });

  await prisma.retailer.createMany({
    data: [
      {
        id: IDS.retailer,
        organizationId: IDS.org,
        retailerCode: 'RET-001',
        shopName: 'Retailer One',
        mobile: '9999999999',
        creditLimit: 5000,
        creditDays: 7,
        businessStatus: 'active',
        orderingMode: 'assisted',
        isOrderingEnabled: true,
        isBillingEnabled: true,
        openingBalance: 0,
      },
      {
        id: IDS.otherRetailer,
        organizationId: IDS.org,
        retailerCode: 'RET-002',
        shopName: 'Retailer Two',
        mobile: '8888888888',
        creditLimit: 4000,
        creditDays: 7,
        businessStatus: 'active',
        orderingMode: 'assisted',
        isOrderingEnabled: true,
        isBillingEnabled: true,
        openingBalance: 0,
      },
    ],
  });

  await prisma.route.create({
    data: {
      id: IDS.route,
      organizationId: IDS.org,
      code: 'R1',
      name: 'Main Route',
      deliveryShift: 'morning',
      defaultCutoffTime: '21:00',
      isActive: true,
    },
  });

  await prisma.deliveryCycle.create({
    data: {
      id: IDS.cycle,
      organizationId: IDS.org,
      cycleCode: 'DC-001',
      orderDate: new Date('2026-07-10T00:00:00.000Z'),
      deliveryDate: new Date('2026-07-11T00:00:00.000Z'),
      deliveryShift: 'morning',
      cutoffAt: new Date('2026-07-10T21:00:00.000Z'),
      status: 'open',
    },
  });

  await prisma.product.create({
    data: {
      id: IDS.product,
      organizationId: IDS.org,
      productCode: 'PROD-001',
      name: 'Sudha Milk',
      status: 'active',
    },
  });

  await prisma.productVariant.create({
    data: {
      id: IDS.variant,
      organizationId: IDS.org,
      productId: IDS.product,
      sku: 'SKU-001',
      variantName: '500 ml',
      mrp: 80,
      distributorPrice: 80,
      defaultRetailerPrice: 80,
      status: 'active',
    },
  });

  await prisma.product.create({
    data: {
      id: IDS.product2,
      organizationId: IDS.org,
      productCode: 'PROD-002',
      name: 'Sudha Curd',
      status: 'active',
    },
  });

  await prisma.productVariant.create({
    data: {
      id: IDS.variant2,
      organizationId: IDS.org,
      productId: IDS.product2,
      sku: 'SKU-002',
      variantName: '1 Ltr',
      mrp: 80,
      distributorPrice: 80,
      defaultRetailerPrice: 80,
      status: 'active',
    },
  });

  await prisma.account.createMany({
    data: [
      {
        id: '20000000-0000-4000-8000-000000000101',
        organizationId: IDS.org,
        accountCode: '1100',
        accountName: 'Retailer Receivables',
        accountType: 'asset',
        isControlAccount: false,
        isActive: true,
      },
      {
        id: '20000000-0000-4000-8000-000000000102',
        organizationId: IDS.org,
        accountCode: '4100',
        accountName: 'Sales Revenue',
        accountType: 'income',
        isControlAccount: false,
        isActive: true,
      },
      {
        id: '20000000-0000-4000-8000-000000000103',
        organizationId: IDS.org,
        accountCode: '1300',
        accountName: 'Cash In Hand',
        accountType: 'asset',
        isControlAccount: false,
        isActive: true,
      },
      {
        id: '20000000-0000-4000-8000-000000000104',
        organizationId: IDS.org,
        accountCode: '1310',
        accountName: 'Bank Clearing',
        accountType: 'asset',
        isControlAccount: false,
        isActive: true,
      },
    ],
  });
}

export async function seedPaymentsFixture(prisma: PrismaClient) {
  await seedBaseFixture(prisma);

  await prisma.salesInvoice.create({
    data: {
      id: IDS.invoice,
      organizationId: IDS.org,
      invoiceNo: 'INV-001',
      retailerId: IDS.retailer,
      invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
      dueDate: new Date('2026-07-17T00:00:00.000Z'),
      source: 'assisted_billing',
      createdByUserId: IDS.user,
      status: 'posted',
      paymentStatus: 'unpaid',
      subtotal: 800,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal: 800,
      outstandingAmount: 800,
    },
  });
}

export async function seedInvoiceRevisionFixture(prisma: PrismaClient) {
  await seedBaseFixture(prisma);

  await prisma.salesInvoice.create({
    data: {
      id: IDS.draftInvoice,
      organizationId: IDS.org,
      invoiceNo: 'INV-DRAFT-001',
      retailerId: IDS.retailer,
      invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
      dueDate: new Date('2026-07-17T00:00:00.000Z'),
      source: 'assisted_billing',
      createdByUserId: IDS.user,
      status: 'draft',
      paymentStatus: 'unpaid',
      subtotal: 1600,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal: 1600,
      outstandingAmount: 1600,
      remarks: 'Draft invoice',
    },
  });

  await prisma.salesInvoiceItem.createMany({
    data: [
      {
        id: IDS.draftItem1,
        organizationId: IDS.org,
        salesInvoiceId: IDS.draftInvoice,
        variantId: IDS.variant,
        billedQty: 10,
        unitPrice: 80,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: 800,
      },
      {
        id: IDS.draftItem2,
        organizationId: IDS.org,
        salesInvoiceId: IDS.draftInvoice,
        variantId: IDS.variant2,
        billedQty: 10,
        unitPrice: 80,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: 800,
      },
    ],
  });

  await prisma.salesInvoice.create({
    data: {
      id: IDS.postedInvoice,
      organizationId: IDS.org,
      invoiceNo: 'INV-POSTED-001',
      retailerId: IDS.retailer,
      invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
      dueDate: new Date('2026-07-17T00:00:00.000Z'),
      source: 'assisted_billing',
      createdByUserId: IDS.user,
      status: 'posted',
      paymentStatus: 'unpaid',
      subtotal: 1600,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal: 1600,
      outstandingAmount: 1600,
      remarks: 'Posted invoice',
      journalEntryId: IDS.journalEntry,
    },
  });

  await prisma.salesInvoiceItem.create({
    data: {
      id: IDS.postedItem1,
      organizationId: IDS.org,
      salesInvoiceId: IDS.postedInvoice,
      variantId: IDS.variant,
      billedQty: 20,
      unitPrice: 80,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      lineTotal: 1600,
    },
  });
}

export async function seedRetailerNotesFixture(prisma: PrismaClient) {
  await seedBaseFixture(prisma);

  await prisma.salesInvoice.createMany({
    data: [
      {
        id: IDS.invoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-PARTIAL-001',
        retailerId: IDS.retailer,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        source: 'assisted_billing',
        createdByUserId: IDS.user,
        status: 'partial_paid',
        paymentStatus: 'partial_paid',
        subtotal: 1000,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: 1000,
        outstandingAmount: 400,
        paidAt: null,
      },
      {
        id: IDS.postedInvoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-PAID-001',
        retailerId: IDS.retailer,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        source: 'assisted_billing',
        createdByUserId: IDS.user,
        status: 'paid',
        paymentStatus: 'paid',
        subtotal: 800,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: 800,
        outstandingAmount: 0,
        paidAt: new Date('2026-07-10T12:00:00.000Z'),
      },
      {
        id: IDS.otherPartialInvoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-PARTIAL-002',
        retailerId: IDS.otherRetailer,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        source: 'assisted_billing',
        createdByUserId: IDS.user,
        status: 'partial_paid',
        paymentStatus: 'partial_paid',
        subtotal: 900,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: 900,
        outstandingAmount: 250,
        paidAt: null,
      },
      {
        id: IDS.otherPaidInvoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-PAID-002',
        retailerId: IDS.otherRetailer,
        invoiceDate: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-17T00:00:00.000Z'),
        source: 'assisted_billing',
        createdByUserId: IDS.user,
        status: 'paid',
        paymentStatus: 'paid',
        subtotal: 700,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: 700,
        outstandingAmount: 0,
        paidAt: new Date('2026-07-10T14:00:00.000Z'),
      },
    ],
  });

  await prisma.retailerCreditProfile.create({
    data: {
      organizationId: IDS.org,
      retailerId: IDS.retailer,
      creditLimit: 5000,
      creditDays: 7,
      warningThresholdPercent: 80,
      blockOrdersOnLimitExceed: false,
      managerApprovalRequired: true,
      allowDispatchWithOverdue: false,
      availableCredit: 4600,
      usedCredit: 400,
      currentOutstanding: 400,
      overdueAmount: 0,
      riskLevel: 'low',
      isCreditActive: true,
    },
  });

  await prisma.retailerPaymentMetric.create({
    data: {
      organizationId: IDS.org,
      retailerId: IDS.retailer,
      currentOutstanding: 400,
      overdueAmount: 0,
      pendingInvoiceCount: 1,
      riskLevel: 'low',
      riskScore: 20,
    },
  });
}

export async function seedCreditOpsFixture(prisma: PrismaClient, options?: {
  creditLimit?: number;
  currentOutstanding?: number;
  overdueAmount?: number;
  managerApprovalRequired?: boolean;
  blockOrdersOnLimitExceed?: boolean;
  allowDispatchWithOverdue?: boolean;
}) {
  const cfg = {
    creditLimit: 10000,
    currentOutstanding: 0,
    overdueAmount: 0,
    managerApprovalRequired: true,
    blockOrdersOnLimitExceed: true,
    allowDispatchWithOverdue: false,
    ...options,
  };

  await seedBaseFixture(prisma);

  await prisma.retailer.update({
    where: { id: IDS.retailer },
    data: {
      creditLimit: cfg.creditLimit,
      creditDays: 7,
      assignedRouteId: IDS.route,
    },
  });

  await prisma.retailerCreditProfile.create({
    data: {
      organizationId: IDS.org,
      retailerId: IDS.retailer,
      creditLimit: cfg.creditLimit,
      creditDays: 7,
      warningThresholdPercent: 80,
      blockOrdersOnLimitExceed: cfg.blockOrdersOnLimitExceed,
      managerApprovalRequired: cfg.managerApprovalRequired,
      allowDispatchWithOverdue: cfg.allowDispatchWithOverdue,
      availableCredit: Math.max(cfg.creditLimit - cfg.currentOutstanding, 0),
      usedCredit: cfg.currentOutstanding,
      currentOutstanding: cfg.currentOutstanding,
      overdueAmount: cfg.overdueAmount,
      riskLevel: cfg.overdueAmount > 0 ? 'high' : 'medium',
      averagePaymentDays: 8,
      lastPaymentDate: new Date('2026-07-08T00:00:00.000Z'),
      isCreditActive: true,
    },
  });

  await prisma.retailerPaymentMetric.create({
    data: {
      organizationId: IDS.org,
      retailerId: IDS.retailer,
      currentOutstanding: cfg.currentOutstanding,
      overdueAmount: cfg.overdueAmount,
      pendingInvoiceCount: cfg.currentOutstanding > 0 ? 2 : 0,
      lastPaymentDate: new Date('2026-07-08T00:00:00.000Z'),
      averagePaymentDays: 8,
      collectionSuccessRate: 75,
      riskScore: cfg.overdueAmount > 0 ? 90 : 45,
      riskLevel: cfg.overdueAmount > 0 ? 'high' : 'medium',
    },
  });

  if (cfg.currentOutstanding > 0) {
    await prisma.salesInvoice.create({
      data: {
        id: IDS.invoice,
        organizationId: IDS.org,
        invoiceNo: 'INV-CREDIT-OPS-001',
        retailerId: IDS.retailer,
        invoiceDate: new Date('2026-07-01T00:00:00.000Z'),
        dueDate: cfg.overdueAmount > 0 ? new Date('2026-06-15T00:00:00.000Z') : new Date('2026-08-01T00:00:00.000Z'),
        source: 'assisted_billing',
        createdByUserId: IDS.user,
        status: 'posted',
        paymentStatus: 'unpaid',
        subtotal: cfg.currentOutstanding,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: cfg.currentOutstanding,
        outstandingAmount: cfg.currentOutstanding,
      },
    });
  }

  await prisma.salesOrder.create({
    data: {
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
      status: 'pending',
      subtotal: 200,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal: 200,
      notes: 'Assisted order',
    },
  });

  await prisma.salesOrderItem.create({
    data: {
      id: IDS.orderItem,
      organizationId: IDS.org,
      salesOrderId: IDS.order,
      variantId: IDS.variant,
      orderedQty: 10,
      approvedQty: null,
      unitPrice: 80,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      lineTotal: 200,
    },
  });

  await prisma.dispatchTrip.create({
    data: {
      id: IDS.trip,
      organizationId: IDS.org,
      tripNo: 'TRIP-001',
      deliveryCycleId: IDS.cycle,
      routeId: IDS.route,
      dispatchDate: new Date('2026-07-11T00:00:00.000Z'),
      status: 'loaded',
      loadingSheetNo: 'LOAD-001',
      challanNo: 'CHL-001',
      totalStops: 1,
    },
  });

  await prisma.deliveryChallan.create({
    data: {
      id: IDS.challan,
      organizationId: IDS.org,
      challanNo: 'CHL-001',
      dispatchTripId: IDS.trip,
      issueDate: new Date('2026-07-11T00:00:00.000Z'),
      status: 'generated',
    },
  });

  await prisma.deliveryStop.create({
    data: {
      id: IDS.stop,
      organizationId: IDS.org,
      dispatchTripId: IDS.trip,
      retailerId: IDS.retailer,
      salesOrderId: IDS.order,
      stopSequence: 1,
      status: 'pending',
      notes: 'Created from order SO-001',
    },
  });
}

export async function createPrismaBackedApp(options: {
  controllers: Type<any>[];
  providers: any[];
  actor?: AuthenticatedUser;
}) {
  const actor = options.actor ?? createActor();
  const prisma = await getPrisma();
  let journalSequence = 1;

  const nextVoucherNo = (prefix: string) => `${prefix}-${String(journalSequence++).padStart(6, '0')}`;

  const accountingService = {
    postPaymentReceipt: async () => ({ success: true, id: 'journal-stub-payment' }),
    reversePaymentReceipt: async () => ({ success: true, id: 'journal-stub-payment-reversal' }),
    postSalesInvoice: async () => ({ success: true, id: 'journal-stub-sales' }),
    reverseSalesInvoice: async () => ({ success: true, id: 'journal-stub-sales-reversal' }),
    createJournalEntry: async (currentActor: AuthenticatedUser, payload: any) => {
      const entryId = randomUUID();
      await prisma.journalEntry.create({
        data: {
          id: entryId,
          organizationId: currentActor?.organizationId ?? actor.organizationId,
          voucherNo: nextVoucherNo('JRN'),
          voucherType: payload.voucherType,
          entryDate: new Date(payload.entryDate),
          postingDate: new Date(payload.postingDate ?? payload.entryDate),
          referenceType: payload.referenceType ?? null,
          referenceId: payload.referenceId ?? null,
          narration: payload.narration ?? null,
          status: 'posted',
          postedByUserId: currentActor?.id ?? actor.id,
        },
      });

      if (Array.isArray(payload.lines) && payload.lines.length > 0) {
        await prisma.accountJournalLine.createMany({
          data: payload.lines.map((line: any) => ({
            id: randomUUID(),
            organizationId: currentActor?.organizationId ?? actor.organizationId,
            journalEntryId: entryId,
            accountId: line.accountId,
            retailerId: line.retailerId ?? null,
            supplierId: line.supplierId ?? null,
            routeId: line.routeId ?? null,
            debitAmount: line.debitAmount ?? 0,
            creditAmount: line.creditAmount ?? 0,
            lineNarration: line.lineNarration ?? null,
          })),
        });
      }

      return { success: true, id: entryId };
    },
    reverseJournalEntry: async (currentActor: AuthenticatedUser, originalJournalEntryId: string, reason?: string) => {
      const entryId = randomUUID();
      await prisma.journalEntry.create({
        data: {
          id: entryId,
          organizationId: currentActor?.organizationId ?? actor.organizationId,
          voucherNo: nextVoucherNo('RVJ'),
          voucherType: 'reversal',
          entryDate: new Date(),
          postingDate: new Date(),
          referenceType: 'journal_reversal',
          referenceId: originalJournalEntryId,
          narration: reason ?? 'Journal reversal',
          status: 'posted',
          postedByUserId: currentActor?.id ?? actor.id,
        },
      });
      return { success: true, id: entryId };
    },
  };

  const moduleRef = await Test.createTestingModule({
    controllers: options.controllers,
    providers: [
      ...options.providers,
      { provide: PrismaService, useValue: prisma },
      {
        provide: AccountingService,
        useValue: accountingService,
      },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate(context: any) {
        context.switchToHttp().getRequest().user = actor;
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  return { app, prisma, actor };
}
