import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentMetricsService } from './payment-metrics.service';
import {
  QueryRetailerLedgerDto,
  QueryRetailerOutstandingInvoicesDto,
  QueryRetailerStatementsDto,
} from './dto';
import { RetailerLedgerService } from './retailer-ledger.service';

@Injectable()
export class RetailerFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentMetricsService: PaymentMetricsService,
    private readonly retailerLedgerService: RetailerLedgerService,
  ) {}

  async getRetailerFinancialDashboard(actor: AuthenticatedUser, retailerId: string) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);
    await this.paymentMetricsService.refreshRetailerMetrics(actor, retailerId);

    const [summary, pendingInvoices, recentLedger, recentReceipts, reminders] = await Promise.all([
      this.buildFinancialSummary(actor.organizationId, retailerId),
      this.fetchOutstandingInvoices(actor.organizationId, retailerId, { limit: 5 }),
      this.prisma.retailerLedgerEntry.findMany({
        where: { organizationId: actor.organizationId, retailerId },
        orderBy: [{ entryDate: 'desc' }, { entryTime: 'desc' }],
        take: 10,
      }),
      this.prisma.paymentReceipt.findMany({
        where: {
          organizationId: actor.organizationId,
          partyType: 'retailer',
          partyId: retailerId,
          status: { not: 'cancelled' },
        },
        orderBy: { paymentDate: 'desc' },
        take: 5,
      }),
      this.prisma.retailerPaymentReminder.findMany({
        where: {
          organizationId: actor.organizationId,
          retailerId,
          status: { in: ['pending', 'failed'] },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
    ]);

    return {
      success: true,
      message: 'Retailer financial dashboard fetched successfully',
      data: {
        ...summary,
        pendingInvoices,
        recentLedgerEntries: recentLedger.map((entry) => this.serializeLedgerEntry(entry)),
        recentReceipts: recentReceipts.map((receipt) => this.serializeReceipt(receipt)),
        reminders,
      },
    };
  }

  async getMyFinancialDashboard(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);
    return this.getRetailerFinancialDashboard(actor, actor.retailerId!);
  }

  async getRetailerFinancialSummary(actor: AuthenticatedUser, retailerId: string) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);
    await this.paymentMetricsService.refreshRetailerMetrics(actor, retailerId);

    return {
      success: true,
      message: 'Retailer financial summary fetched successfully',
      data: await this.buildFinancialSummary(actor.organizationId, retailerId),
    };
  }

  async getRetailerLedgerEntries(
    actor: AuthenticatedUser,
    retailerId: string,
    query: QueryRetailerLedgerDto,
  ) {
    return this.retailerLedgerService.getLedgerEntries(actor, retailerId, query);
  }

  async getRetailerLedgerEntryById(actor: AuthenticatedUser, retailerId: string, entryId: string) {
    return this.retailerLedgerService.getLedgerEntryById(actor, retailerId, entryId);
  }

  async getMyLedger(actor: AuthenticatedUser, query: QueryRetailerLedgerDto) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);
    return this.retailerLedgerService.getLedgerEntries(actor, actor.retailerId!, query);
  }

  async exportRetailerLedger(
    actor: AuthenticatedUser,
    retailerId: string,
    query: QueryRetailerStatementsDto,
  ) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const ledger = await this.retailerLedgerService.getLedgerEntries(actor, retailerId, {
      page: 1,
      limit: 500,
      fromDate: query.fromDate,
      toDate: query.toDate,
      search: undefined,
      sort: undefined,
      transactionType: undefined,
      referenceType: undefined,
    });

    return {
      success: true,
      message: 'Retailer ledger export payload generated successfully',
      data: {
        format: query.format ?? 'json',
        retailerId,
        fileName: `retailer-ledger-${retailerId}.${this.extensionForFormat(query.format)}`,
        ledger: ledger.data,
      },
    };
  }

  async exportMyLedger(actor: AuthenticatedUser, query: QueryRetailerStatementsDto) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);
    return this.exportRetailerLedger(actor, actor.retailerId!, query);
  }

  async getRetailerOutstandingInvoices(
    actor: AuthenticatedUser,
    retailerId: string,
    query: QueryRetailerOutstandingInvoicesDto,
  ) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const invoices = await this.fetchOutstandingInvoices(actor.organizationId, retailerId, {
      includeOverdueOnly: query.includeOverdueOnly,
      includeCurrentOnly: query.includeCurrentOnly,
      search: query.search,
      sort: query.sort,
      limit: query.limit,
      page: query.page,
    });

    return {
      success: true,
      message: 'Retailer outstanding invoices fetched successfully',
      data: invoices,
    };
  }

  async getRetailerOutstandingAging(actor: AuthenticatedUser, retailerId: string) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId: actor.organizationId,
        retailerId,
        outstandingAmount: { gt: 0 },
        status: { in: ['posted', 'partial_paid'] },
      },
      select: {
        id: true,
        outstandingAmount: true,
        dueDate: true,
      },
    });

    const buckets = {
      current: { count: 0, amount: 0 },
      '1_30': { count: 0, amount: 0 },
      '31_60': { count: 0, amount: 0 },
      '61_90': { count: 0, amount: 0 },
      '90_plus': { count: 0, amount: 0 },
      no_due_date: { count: 0, amount: 0 },
    };

    for (const invoice of invoices) {
      const bucket = this.resolveAgingBucket(invoice.dueDate);
      buckets[bucket].count += 1;
      buckets[bucket].amount = this.roundMoney(
        buckets[bucket].amount + this.toNumber(invoice.outstandingAmount),
      );
    }

    return {
      success: true,
      message: 'Retailer outstanding aging fetched successfully',
      data: buckets,
    };
  }

  async getMyOutstandingInvoices(actor: AuthenticatedUser, query: QueryRetailerOutstandingInvoicesDto) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);
    return this.getRetailerOutstandingInvoices(actor, actor.retailerId!, query);
  }

  async getMyDues(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);
    await this.paymentMetricsService.refreshRetailerMetrics(actor, actor.retailerId!);

    const [summary, invoices, wallet] = await Promise.all([
      this.buildFinancialSummary(actor.organizationId, actor.retailerId!),
      this.fetchOutstandingInvoices(actor.organizationId, actor.retailerId!, { limit: 100, page: 1 }),
      this.prisma.retailerAdvanceWallet.findFirst({
        where: { organizationId: actor.organizationId, retailerId: actor.retailerId! },
      }),
    ]);

    return {
      success: true,
      message: 'Retailer dues fetched successfully',
      data: {
        totalOutstanding: summary.currentOutstanding,
        invoices: invoices.map((invoice) => ({
          id: invoice.invoiceId,
          invoiceNo: invoice.invoiceNo,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          grandTotal: invoice.grandTotal,
          outstandingAmount: invoice.outstandingAmount,
          status: invoice.paymentStatus,
        })),
        summary,
        wallet: wallet
          ? {
              availableBalance: this.toNumber(wallet.availableBalance),
              lockedBalance: this.toNumber(wallet.lockedBalance),
              lastUpdatedAt: wallet.lastUpdatedAt,
            }
          : null,
      },
    };
  }

  async getRetailerAccountStatement(
    actor: AuthenticatedUser,
    retailerId: string,
    query: QueryRetailerStatementsDto,
  ) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const [summary, ledger] = await Promise.all([
      this.buildFinancialSummary(actor.organizationId, retailerId),
      this.retailerLedgerService.getLedgerEntries(actor, retailerId, {
        page: 1,
        limit: 500,
        fromDate: query.fromDate,
        toDate: query.toDate,
      }),
    ]);

    return {
      success: true,
      message: 'Retailer account statement fetched successfully',
      data: {
        format: query.format ?? 'json',
        summary,
        ledger: ledger.data,
      },
    };
  }

  async getRetailerOutstandingStatement(
    actor: AuthenticatedUser,
    retailerId: string,
    query: QueryRetailerStatementsDto,
  ) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    return {
      success: true,
      message: 'Retailer outstanding statement fetched successfully',
      data: {
        format: query.format ?? 'json',
        summary: await this.buildFinancialSummary(actor.organizationId, retailerId),
        invoices: await this.fetchOutstandingInvoices(actor.organizationId, retailerId, {
          limit: 500,
          page: 1,
        }),
      },
    };
  }

  async getRetailerPaymentHistoryStatement(
    actor: AuthenticatedUser,
    retailerId: string,
    query: QueryRetailerStatementsDto,
  ) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const receipts = await this.prisma.paymentReceipt.findMany({
      where: {
        organizationId: actor.organizationId,
        partyType: 'retailer',
        partyId: retailerId,
        status: { not: 'cancelled' },
        ...(query.fromDate || query.toDate
          ? {
              paymentDate: {
                ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
                ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
              },
            }
          : {}),
      },
      orderBy: { paymentDate: 'desc' },
    });

    return {
      success: true,
      message: 'Retailer payment history statement fetched successfully',
      data: {
        format: query.format ?? 'json',
        receipts: receipts.map((receipt) => this.serializeReceipt(receipt)),
      },
    };
  }

  async getRetailerPassbookStatement(
    actor: AuthenticatedUser,
    retailerId: string,
    query: QueryRetailerStatementsDto,
  ) {
    return this.exportRetailerLedger(actor, retailerId, query);
  }

  async getMyAccountStatement(actor: AuthenticatedUser, query: QueryRetailerStatementsDto) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);
    return this.getRetailerAccountStatement(actor, actor.retailerId!, query);
  }

  async getMyOutstandingStatement(actor: AuthenticatedUser, query: QueryRetailerStatementsDto) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);
    return this.getRetailerOutstandingStatement(actor, actor.retailerId!, query);
  }

  async getMyPassbookStatement(actor: AuthenticatedUser, query: QueryRetailerStatementsDto) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);
    return this.getRetailerPassbookStatement(actor, actor.retailerId!, query);
  }

  private async buildFinancialSummary(organizationId: string, retailerId: string) {
    const [retailer, profile, metric, pendingInvoices] = await Promise.all([
      this.prisma.retailer.findFirst({
        where: { organizationId, id: retailerId },
        select: {
          id: true,
          shopName: true,
          creditLimit: true,
          creditDays: true,
        },
      }),
      this.prisma.retailerCreditProfile.findFirst({
        where: { organizationId, retailerId },
      }),
      this.prisma.retailerPaymentMetric.findFirst({
        where: { organizationId, retailerId },
      }),
      this.prisma.salesInvoice.findMany({
        where: {
          organizationId,
          retailerId,
          outstandingAmount: { gt: 0 },
          status: { in: ['posted', 'partial_paid'] },
        },
        select: {
          id: true,
          dueDate: true,
          outstandingAmount: true,
        },
      }),
    ]);

    if (!retailer) {
      throw new NotFoundException('Retailer not found');
    }

    const totalCreditLimit = this.toNumber(profile?.creditLimit ?? retailer.creditLimit);
    const currentOutstanding = this.toNumber(metric?.currentOutstanding ?? profile?.currentOutstanding);
    const overdueAmount = this.toNumber(metric?.overdueAmount ?? profile?.overdueAmount);
    const usedCredit = this.toNumber(profile?.usedCredit ?? currentOutstanding);
    const availableCredit = this.roundMoney(
      this.toNumber(profile?.availableCredit ?? Math.max(totalCreditLimit - usedCredit, 0)),
    );
    const pendingInvoiceCount = metric?.pendingInvoiceCount ?? pendingInvoices.length;
    const warningThresholdPercent = this.toNumber(profile?.warningThresholdPercent ?? 80);
    const creditUsagePercent = totalCreditLimit > 0
      ? this.roundMoney((usedCredit / totalCreditLimit) * 100)
      : usedCredit > 0
        ? 100
        : 0;
    const upcomingDueAmount = this.roundMoney(
      pendingInvoices
        .filter((invoice) => invoice.dueDate && new Date(invoice.dueDate).getTime() >= this.startOfToday().getTime())
        .reduce((sum, invoice) => sum + this.toNumber(invoice.outstandingAmount), 0),
    );
    const orderBlocked = Boolean(
      profile?.blockOrdersOnLimitExceed && usedCredit > totalCreditLimit,
    );
    const dispatchBlocked = Boolean(
      (profile?.blockOrdersOnLimitExceed && usedCredit > totalCreditLimit) ||
        (!profile?.allowDispatchWithOverdue && overdueAmount > 0),
    );

    return {
      retailerId,
      retailerName: retailer.shopName,
      currentOutstanding: this.roundMoney(currentOutstanding),
      totalCreditLimit: this.roundMoney(totalCreditLimit),
      usedCredit: this.roundMoney(usedCredit),
      availableCredit,
      overdueAmount: this.roundMoney(overdueAmount),
      pendingInvoiceCount,
      upcomingDueAmount,
      lastPaymentDate: metric?.lastPaymentDate ?? profile?.lastPaymentDate ?? null,
      averagePaymentDays: this.toNumber(metric?.averagePaymentDays ?? profile?.averagePaymentDays),
      riskLevel: metric?.riskLevel ?? profile?.riskLevel ?? 'low',
      warningThresholdPercent: this.roundMoney(warningThresholdPercent),
      creditUsagePercent,
      orderBlocked,
      dispatchBlocked,
    };
  }

  private async fetchOutstandingInvoices(
    organizationId: string,
    retailerId: string,
    options: {
      includeOverdueOnly?: boolean;
      includeCurrentOnly?: boolean;
      search?: string;
      sort?: string;
      limit?: number;
      page?: number;
    },
  ) {
    const today = this.startOfToday();
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const where: Prisma.SalesInvoiceWhereInput = {
      organizationId,
      retailerId,
      outstandingAmount: { gt: 0 },
      status: { in: ['posted', 'partial_paid'] },
    };

    if (options.includeOverdueOnly) {
      where.dueDate = { lt: today };
    }
    if (options.includeCurrentOnly) {
      where.OR = [{ dueDate: null }, { dueDate: { gte: today } }];
    }
    if (options.search) {
      where.invoiceNo = { contains: options.search, mode: 'insensitive' };
    }

    const orderBy =
      options.sort === 'invoiceDate:desc'
        ? [{ invoiceDate: 'desc' as const }]
        : options.sort === 'invoiceDate:asc'
          ? [{ invoiceDate: 'asc' as const }]
          : options.sort === 'dueDate:desc'
            ? [{ dueDate: 'desc' as const }, { invoiceDate: 'desc' as const }]
            : [{ dueDate: 'asc' as const }, { invoiceDate: 'asc' as const }];

    const invoices = await this.prisma.salesInvoice.findMany({
      where,
      select: {
        id: true,
        invoiceNo: true,
        invoiceDate: true,
        dueDate: true,
        grandTotal: true,
        outstandingAmount: true,
        paymentStatus: true,
        dueBucket: true,
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    return invoices.map((invoice) => {
      const daysOverdue = invoice.dueDate
        ? Math.max(
            0,
            Math.floor(
              (today.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24),
            ),
          )
        : 0;

      return {
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        grandTotal: this.toNumber(invoice.grandTotal),
        outstandingAmount: this.toNumber(invoice.outstandingAmount),
        paymentStatus: invoice.paymentStatus,
        daysOverdue,
        dueBucket: invoice.dueBucket ?? this.resolveAgingBucket(invoice.dueDate),
        eligibleForPayNow: this.toNumber(invoice.outstandingAmount) > 0,
      };
    });
  }

  private resolveAgingBucket(dueDate?: Date | null) {
    if (!dueDate) return 'no_due_date';
    const today = this.startOfToday();
    const diffDays = Math.floor((today.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'current';
    if (diffDays <= 30) return '1_30';
    if (diffDays <= 60) return '31_60';
    if (diffDays <= 90) return '61_90';
    return '90_plus';
  }

  private extensionForFormat(format?: string) {
    if (format === 'pdf') return 'pdf';
    if (format === 'xlsx') return 'xlsx';
    if (format === 'print') return 'html';
    return 'json';
  }

  private startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private serializeLedgerEntry(entry: any) {
    return {
      ...entry,
      debitAmount: this.toNumber(entry.debitAmount),
      creditAmount: this.toNumber(entry.creditAmount),
      runningBalance: this.toNumber(entry.runningBalance),
    };
  }

  private serializeReceipt(receipt: any) {
    return {
      ...receipt,
      amount: this.toNumber(receipt.amount),
      unallocatedAmount: this.toNumber(receipt.unallocatedAmount),
    };
  }

  private async ensureRetailerAccessible(actor: AuthenticatedUser, retailerId: string) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      if (actor.retailerId !== retailerId) {
        throw new ForbiddenException('You can only access your own retailer finance data');
      }
    }

    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId: actor.organizationId, id: retailerId },
      select: { id: true },
    });

    if (!retailer) {
      throw new NotFoundException('Retailer not found');
    }
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertRetailer(actor: AuthenticatedUser) {
    if (!actor.retailerId || !(actor.roles.includes('RETAILER') || actor.userType === 'retailer_user')) {
      throw new ForbiddenException('Retailer access required');
    }
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }
}
