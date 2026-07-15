import {
  BadRequestException,
  ConflictException,
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
  CheckRetailerCreditDto,
  CreateRetailerCreditOverrideDto,
  QueryRetailerCreditHistoryDto,
  QueryRetailerCreditOverridesDto,
  UpsertRetailerCreditProfileDto,
} from './dto';

@Injectable()
export class CreditControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentMetricsService: PaymentMetricsService,
  ) {}

  async getCreditProfile(actor: AuthenticatedUser, retailerId: string) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);
    await this.paymentMetricsService.refreshRetailerMetrics(actor, retailerId);

    const [retailer, profile, metric] = await Promise.all([
      this.prisma.retailer.findFirst({
        where: { organizationId: actor.organizationId, id: retailerId },
        select: {
          id: true,
          retailerCode: true,
          shopName: true,
          creditLimit: true,
          creditDays: true,
          businessStatus: true,
        },
      }),
      this.prisma.retailerCreditProfile.findFirst({
        where: { organizationId: actor.organizationId, retailerId },
      }),
      this.prisma.retailerPaymentMetric.findFirst({
        where: { organizationId: actor.organizationId, retailerId },
      }),
    ]);

    if (!retailer) throw new NotFoundException('Retailer not found');

    return {
      success: true,
      message: 'Retailer credit profile fetched successfully',
      data: {
        retailer,
        profile,
        metric,
      },
    };
  }

  async upsertCreditProfile(actor: AuthenticatedUser, retailerId: string, dto: UpsertRetailerCreditProfileDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId: actor.organizationId, id: retailerId },
      select: { id: true },
    });
    if (!retailer) throw new NotFoundException('Retailer not found');

    await this.paymentMetricsService.refreshRetailerMetrics(actor, retailerId);
    const existing = await this.prisma.retailerCreditProfile.findFirst({
      where: { organizationId: actor.organizationId, retailerId },
    });

    await this.prisma.retailer.update({
      where: { id: retailerId },
      data: {
        creditLimit: dto.creditLimit,
        creditDays: dto.creditDays,
      },
    });

    const profile = await this.prisma.retailerCreditProfile.upsert({
      where: { retailerId },
      create: {
        organizationId: actor.organizationId,
        retailerId,
        creditLimit: dto.creditLimit,
        creditDays: dto.creditDays,
        warningThresholdPercent: dto.warningThresholdPercent,
        blockOrdersOnLimitExceed: dto.blockOrdersOnLimitExceed,
        managerApprovalRequired: dto.managerApprovalRequired,
        allowDispatchWithOverdue: dto.allowDispatchWithOverdue,
        isCreditActive: dto.isCreditActive,
        notes: dto.notes,
        availableCredit: existing?.availableCredit ?? dto.creditLimit,
        usedCredit: existing?.usedCredit ?? 0,
        currentOutstanding: existing?.currentOutstanding ?? 0,
        overdueAmount: existing?.overdueAmount ?? 0,
        riskLevel: existing?.riskLevel ?? 'low',
        averagePaymentDays: existing?.averagePaymentDays ?? null,
        lastPaymentDate: existing?.lastPaymentDate ?? null,
      },
      update: {
        creditLimit: dto.creditLimit,
        creditDays: dto.creditDays,
        warningThresholdPercent: dto.warningThresholdPercent,
        blockOrdersOnLimitExceed: dto.blockOrdersOnLimitExceed,
        managerApprovalRequired: dto.managerApprovalRequired,
        allowDispatchWithOverdue: dto.allowDispatchWithOverdue,
        isCreditActive: dto.isCreditActive,
        notes: dto.notes,
      },
    });

    await this.paymentMetricsService.refreshRetailerCreditCache(actor, retailerId);

    return {
      success: true,
      message: 'Retailer credit profile updated successfully',
      data: profile,
    };
  }

  async checkCredit(actor: AuthenticatedUser, retailerId: string, dto: CheckRetailerCreditDto) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const decision = await this.evaluateCreditDecision(actor.organizationId, retailerId, dto);
    return {
      success: true,
      message: 'Retailer credit check completed successfully',
      data: decision,
    };
  }

  async assertCreditAllowed(actor: AuthenticatedUser, retailerId: string, dto: CheckRetailerCreditDto) {
    const result = await this.evaluateCreditDecision(actor.organizationId, retailerId, dto);
    if (result.decision === 'blocked') {
      throw new ConflictException(`Credit policy blocked action: ${result.reasons.join(', ')}`);
    }
    if (result.decision === 'manager_approval_required') {
      throw new ConflictException(`Credit approval required: ${result.reasons.join(', ')}`);
    }
    return result;
  }

  async getCreditOverrides(
    actor: AuthenticatedUser,
    retailerId: string,
    query: QueryRetailerCreditOverridesDto,
  ) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.RetailerCreditOverrideWhereInput = {
      organizationId: actor.organizationId,
      retailerId,
    };

    if (query.status) where.status = query.status;
    if (query.overrideType) where.overrideType = query.overrideType;
    if (query.fromDate || query.toDate) {
      where.approvedAt = {};
      if (query.fromDate) where.approvedAt.gte = new Date(query.fromDate);
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.approvedAt.lte = end;
      }
    }
    if (query.search) {
      where.OR = [{ reason: { contains: query.search, mode: 'insensitive' } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.retailerCreditOverride.findMany({
        where,
        orderBy: { approvedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.retailerCreditOverride.count({ where }),
    ]);

    return {
      success: true,
      message: 'Retailer credit overrides fetched successfully',
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createCreditOverride(
    actor: AuthenticatedUser,
    retailerId: string,
    dto: CreateRetailerCreditOverrideDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId: actor.organizationId, id: retailerId },
      select: { id: true },
    });
    if (!retailer) throw new NotFoundException('Retailer not found');

    if (dto.salesOrderId) {
      const order = await this.prisma.salesOrder.findFirst({
        where: { organizationId: actor.organizationId, id: dto.salesOrderId, retailerId },
        select: { id: true },
      });
      if (!order) throw new NotFoundException('Sales order not found for override');
    }

    const override = await this.prisma.retailerCreditOverride.create({
      data: {
        organizationId: actor.organizationId,
        retailerId,
        salesOrderId: dto.salesOrderId,
        overrideType: dto.overrideType,
        requestedAmount: dto.requestedAmount,
        approvedAmount: dto.approvedAmount,
        reason: dto.reason,
        status: 'approved',
        approvedByUserId: actor.id,
        approvedAt: new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        remarks: dto.remarks,
      },
    });

    return {
      success: true,
      message: 'Retailer credit override created successfully',
      data: override,
    };
  }

  async getCreditHistory(actor: AuthenticatedUser, retailerId: string, query: QueryRetailerCreditHistoryDto) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const [profile, metric, overrides] = await Promise.all([
      this.prisma.retailerCreditProfile.findFirst({
        where: { organizationId: actor.organizationId, retailerId },
      }),
      this.prisma.retailerPaymentMetric.findFirst({
        where: { organizationId: actor.organizationId, retailerId },
      }),
      this.prisma.retailerCreditOverride.findMany({
        where: {
          organizationId: actor.organizationId,
          retailerId,
          ...(query.fromDate || query.toDate
            ? {
                approvedAt: {
                  ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
                  ...(query.toDate
                    ? {
                        lte: (() => {
                          const end = new Date(query.toDate!);
                          end.setHours(23, 59, 59, 999);
                          return end;
                        })(),
                      }
                    : {}),
                },
              }
            : {}),
        },
        orderBy: { approvedAt: 'desc' },
      }),
    ]);

    const items = [
      ...(profile
        ? [{
            type: 'profile',
            at: profile.updatedAt,
            details: {
              creditLimit: this.toNumber(profile.creditLimit),
              creditDays: profile.creditDays,
              warningThresholdPercent: this.toNumber(profile.warningThresholdPercent),
              blockOrdersOnLimitExceed: profile.blockOrdersOnLimitExceed,
              managerApprovalRequired: profile.managerApprovalRequired,
              allowDispatchWithOverdue: profile.allowDispatchWithOverdue,
              isCreditActive: profile.isCreditActive,
              notes: profile.notes,
            },
          }]
        : []),
      ...(metric && query.includeThresholdAlerts !== false
        ? [{
            type: 'metric_snapshot',
            at: metric.updatedAt,
            details: {
              currentOutstanding: this.toNumber(metric.currentOutstanding),
              overdueAmount: this.toNumber(metric.overdueAmount),
              pendingInvoiceCount: metric.pendingInvoiceCount,
              riskLevel: metric.riskLevel,
              riskScore: this.toNumber(metric.riskScore),
            },
          }]
        : []),
      ...(query.includeOverrides === false
        ? []
        : overrides.map((override) => ({
            type: 'override',
            at: override.approvedAt,
            details: override,
          }))),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      success: true,
      message: 'Retailer credit history fetched successfully',
      data: items,
    };
  }

  private async evaluateCreditDecision(
    organizationId: string,
    retailerId: string,
    dto: CheckRetailerCreditDto,
  ) {
    await this.paymentMetricsService.refreshRetailerMetrics({ organizationId }, retailerId);

    const [retailer, profile, metric] = await Promise.all([
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
    ]);

    if (!retailer) throw new NotFoundException('Retailer not found');

    const transactionAmount = dto.transactionAmount ?? (await this.resolveTransactionAmount(organizationId, retailerId, dto));
    const creditLimit = this.toNumber(profile?.creditLimit ?? retailer.creditLimit);
    const warningThresholdPercent = this.toNumber(profile?.warningThresholdPercent ?? 80);
    const currentOutstanding = this.toNumber(metric?.currentOutstanding ?? profile?.currentOutstanding);
    const overdueAmount = this.toNumber(metric?.overdueAmount ?? profile?.overdueAmount);
    const projectedOutstanding = this.roundMoney(currentOutstanding + transactionAmount);
    const usedCredit = projectedOutstanding;
    const availableCreditAfterTransaction = this.roundMoney(Math.max(creditLimit - usedCredit, 0));
    const usagePercentAfter = creditLimit > 0
      ? this.roundMoney((usedCredit / creditLimit) * 100)
      : usedCredit > 0
        ? 100
        : 0;
    const creditDays = profile?.creditDays ?? retailer.creditDays;
    const isCreditActive = profile?.isCreditActive ?? true;
    const blockOrdersOnLimitExceed = profile?.blockOrdersOnLimitExceed ?? false;
    const managerApprovalRequired = profile?.managerApprovalRequired ?? true;
    const allowDispatchWithOverdue = profile?.allowDispatchWithOverdue ?? false;
    const exceedAmount = this.roundMoney(Math.max(projectedOutstanding - creditLimit, 0));
    const activeOverrides = await this.findActiveOverrides(organizationId, retailerId, dto);

    const reasons: string[] = [];
    let decision: 'allowed' | 'warning' | 'manager_approval_required' | 'blocked' = 'allowed';
    let requiresOverride = false;

    if (!isCreditActive) {
      decision = 'blocked';
      reasons.push('credit_inactive');
    }

    if (overdueAmount > 0 && !allowDispatchWithOverdue) {
      const overdueOverride = activeOverrides.find((row) => row.overrideType === 'overdue_dispatch');
      if (!overdueOverride) {
        reasons.push('overdue_dispatch_restricted');
        if (decision !== 'blocked') {
          decision = managerApprovalRequired ? 'manager_approval_required' : 'blocked';
          requiresOverride = managerApprovalRequired;
        }
      } else {
        reasons.push('overdue_dispatch_override_applied');
      }
    }

    if (exceedAmount > 0) {
      const creditOverride = activeOverrides.find((row) =>
        row.overrideType === 'credit_limit_exceed' || row.overrideType === 'temporary_credit_extension',
      );
      const overrideAmount = this.toNumber(creditOverride?.approvedAmount ?? creditOverride?.requestedAmount);
      if (!creditOverride || overrideAmount + 0.001 < exceedAmount) {
        reasons.push('credit_limit_exceed');
        if (decision !== 'blocked') {
          if (managerApprovalRequired) {
            decision = 'manager_approval_required';
            requiresOverride = true;
          } else if (blockOrdersOnLimitExceed) {
            decision = 'blocked';
          } else {
            decision = 'warning';
          }
        }
      } else {
        reasons.push('credit_override_applied');
      }
    }

    if (decision === 'allowed' && usagePercentAfter >= warningThresholdPercent) {
      decision = 'warning';
      reasons.push('credit_usage_above_warning_threshold');
    }

    return {
      retailerId,
      retailerName: retailer.shopName,
      context: dto.context,
      transactionAmount: this.roundMoney(transactionAmount),
      decision,
      reasons,
      creditLimit: this.roundMoney(creditLimit),
      creditDays,
      currentOutstanding: this.roundMoney(currentOutstanding),
      projectedOutstanding: this.roundMoney(projectedOutstanding),
      availableCreditAfterTransaction,
      overdueAmount: this.roundMoney(overdueAmount),
      warningThresholdPercent: this.roundMoney(warningThresholdPercent),
      usagePercentAfter: this.roundMoney(usagePercentAfter),
      exceedAmount,
      requiresOverride,
      canApproveOrder: ['allowed', 'warning'].includes(decision),
      canDispatch: ['allowed', 'warning'].includes(decision),
      activeOverrideIds: activeOverrides.map((row) => row.id),
      activeOverrides,
    };
  }

  private async resolveTransactionAmount(
    organizationId: string,
    retailerId: string,
    dto: CheckRetailerCreditDto,
  ) {
    if (dto.salesOrderId) {
      const order = await this.prisma.salesOrder.findFirst({
        where: { organizationId, id: dto.salesOrderId, retailerId },
        select: { grandTotal: true },
      });
      if (!order) throw new NotFoundException('Sales order not found for credit check');
      return this.toNumber(order.grandTotal);
    }

    if (dto.salesInvoiceId) {
      const invoice = await this.prisma.salesInvoice.findFirst({
        where: { organizationId, id: dto.salesInvoiceId, retailerId },
        select: { grandTotal: true, outstandingAmount: true },
      });
      if (!invoice) throw new NotFoundException('Sales invoice not found for credit check');
      return this.toNumber(invoice.outstandingAmount || invoice.grandTotal);
    }

    if (dto.dispatchTripId) {
      const stops = await this.prisma.deliveryStop.findMany({
        where: { organizationId, dispatchTripId: dto.dispatchTripId, retailerId },
        select: { salesOrderId: true },
      });
      const orderIds = stops.map((stop) => stop.salesOrderId).filter((v): v is string => Boolean(v));
      if (orderIds.length) {
        const orders = await this.prisma.salesOrder.findMany({
          where: { organizationId, id: { in: orderIds }, retailerId },
          select: { grandTotal: true },
        });
        return this.roundMoney(orders.reduce((sum, order) => sum + this.toNumber(order.grandTotal), 0));
      }
    }

    return 0;
  }

  private async findActiveOverrides(
    organizationId: string,
    retailerId: string,
    dto: CheckRetailerCreditDto,
  ) {
    const now = new Date();
    return this.prisma.retailerCreditOverride.findMany({
      where: {
        organizationId,
        retailerId,
        status: 'approved',
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
          ...(dto.salesOrderId
            ? [{ OR: [{ salesOrderId: null }, { salesOrderId: dto.salesOrderId }] }]
            : []),
        ],
      },
      orderBy: { approvedAt: 'desc' },
    });
  }

  private async ensureRetailerAccessible(actor: AuthenticatedUser, retailerId: string) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      if (actor.retailerId !== retailerId) {
        throw new ForbiddenException('You can only access your own retailer credit data');
      }
    }

    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId: actor.organizationId, id: retailerId },
      select: { id: true },
    });
    if (!retailer) throw new NotFoundException('Retailer not found');
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      throw new ForbiddenException('Backoffice access required');
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
