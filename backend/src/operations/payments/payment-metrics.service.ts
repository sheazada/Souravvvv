import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async refreshRetailerMetrics(
    context: AuthenticatedUser | { organizationId: string },
    retailerId: string,
  ) {
    const organizationId = this.getOrganizationId(context);

    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId, id: retailerId },
      select: {
        id: true,
        creditLimit: true,
        creditDays: true,
      },
    });

    if (!retailer) {
      throw new UnauthorizedException('Retailer context is invalid for metrics refresh');
    }

    const existingProfile = await this.prisma.retailerCreditProfile.findFirst({
      where: { organizationId, retailerId },
      select: {
        creditLimit: true,
        creditDays: true,
        warningThresholdPercent: true,
        blockOrdersOnLimitExceed: true,
        managerApprovalRequired: true,
        allowDispatchWithOverdue: true,
        isCreditActive: true,
        notes: true,
      },
    });

    const invoiceRows = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        retailerId,
        status: { not: 'cancelled' },
      },
      select: {
        id: true,
        invoiceDate: true,
        dueDate: true,
        grandTotal: true,
        outstandingAmount: true,
        status: true,
      },
    });

    const confirmedReceipts = await this.prisma.paymentReceipt.findMany({
      where: {
        organizationId,
        partyType: 'retailer',
        partyId: retailerId,
        status: 'confirmed',
      },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
      },
      orderBy: { paymentDate: 'desc' },
    });

    const allocations = await this.prisma.paymentAllocation.findMany({
      where: {
        organizationId,
        salesInvoice: {
          is: {
            retailerId,
          },
        },
        paymentReceipt: {
          is: {
            partyType: 'retailer',
            partyId: retailerId,
            status: 'confirmed',
          },
        },
      },
      include: {
        salesInvoice: {
          select: {
            id: true,
            invoiceDate: true,
          },
        },
        paymentReceipt: {
          select: {
            id: true,
            paymentDate: true,
          },
        },
      },
    });

    const currentOutstanding = this.roundMoney(
      invoiceRows
        .filter((invoice) => ['posted', 'partial_paid', 'paid'].includes(invoice.status))
        .reduce((sum, invoice) => sum + this.toNumber(invoice.outstandingAmount), 0),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueAmount = this.roundMoney(
      invoiceRows
        .filter(
          (invoice) =>
            this.toNumber(invoice.outstandingAmount) > 0 &&
            Boolean(invoice.dueDate) &&
            new Date(invoice.dueDate as Date).getTime() < today.getTime(),
        )
        .reduce((sum, invoice) => sum + this.toNumber(invoice.outstandingAmount), 0),
    );

    const pendingInvoiceCount = invoiceRows.filter(
      (invoice) => this.toNumber(invoice.outstandingAmount) > 0 && ['posted', 'partial_paid', 'paid'].includes(invoice.status),
    ).length;

    const lastPaymentDate = confirmedReceipts[0]?.paymentDate ?? null;

    const averagePaymentDays = allocations.length
      ? this.roundMoney(
          allocations.reduce((sum, allocation) => {
            const invoiceDate = allocation.salesInvoice?.invoiceDate;
            const paymentDate = allocation.paymentReceipt?.paymentDate;
            if (!invoiceDate || !paymentDate) return sum;
            const diff = Math.max(
              0,
              Math.floor(
                (new Date(paymentDate).getTime() - new Date(invoiceDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            );
            return sum + diff;
          }, 0) / allocations.length,
        )
      : null;

    const totalInvoiceCount = invoiceRows.length;
    const fullyPaidInvoiceCount = invoiceRows.filter(
      (invoice) => this.toNumber(invoice.outstandingAmount) <= 0,
    ).length;
    const collectionSuccessRate = totalInvoiceCount
      ? this.roundMoney((fullyPaidInvoiceCount / totalInvoiceCount) * 100)
      : null;

    const creditLimit = this.toNumber(existingProfile?.creditLimit ?? retailer.creditLimit);
    const creditDays = existingProfile?.creditDays ?? retailer.creditDays;
    const usedCredit = this.roundMoney(currentOutstanding);
    const availableCredit = this.roundMoney(Math.max(creditLimit - usedCredit, 0));
    const usagePercent = creditLimit > 0 ? (usedCredit / creditLimit) * 100 : usedCredit > 0 ? 100 : 0;
    const riskScore = this.roundMoney(
      usagePercent + (overdueAmount > 0 ? 30 : 0) + Math.min(pendingInvoiceCount * 2, 20),
    );

    let riskLevel = 'low';
    if (overdueAmount > 0 || usagePercent >= 100) {
      riskLevel = 'high';
    } else if (usagePercent >= 80 || pendingInvoiceCount >= 5) {
      riskLevel = 'medium';
    }

    const profile = await this.prisma.retailerCreditProfile.upsert({
      where: { retailerId },
      create: {
        organizationId,
        retailerId,
        creditLimit,
        creditDays,
        warningThresholdPercent: existingProfile?.warningThresholdPercent ?? 80,
        blockOrdersOnLimitExceed: existingProfile?.blockOrdersOnLimitExceed ?? false,
        managerApprovalRequired: existingProfile?.managerApprovalRequired ?? true,
        allowDispatchWithOverdue: existingProfile?.allowDispatchWithOverdue ?? false,
        isCreditActive: existingProfile?.isCreditActive ?? true,
        notes: existingProfile?.notes ?? null,
        availableCredit,
        usedCredit,
        currentOutstanding,
        overdueAmount,
        riskLevel,
        averagePaymentDays,
        lastPaymentDate,
      },
      update: {
        creditLimit,
        creditDays,
        availableCredit,
        usedCredit,
        currentOutstanding,
        overdueAmount,
        riskLevel,
        averagePaymentDays,
        lastPaymentDate,
      },
    });

    const metric = await this.prisma.retailerPaymentMetric.upsert({
      where: { retailerId },
      create: {
        organizationId,
        retailerId,
        currentOutstanding,
        overdueAmount,
        pendingInvoiceCount,
        lastPaymentDate,
        averagePaymentDays,
        collectionSuccessRate,
        riskScore,
        riskLevel,
      },
      update: {
        currentOutstanding,
        overdueAmount,
        pendingInvoiceCount,
        lastPaymentDate,
        averagePaymentDays,
        collectionSuccessRate,
        riskScore,
        riskLevel,
      },
    });

    return {
      success: true,
      message: 'Retailer payment metrics refreshed successfully',
      data: {
        retailerId,
        currentOutstanding,
        overdueAmount,
        pendingInvoiceCount,
        lastPaymentDate,
        averagePaymentDays,
        collectionSuccessRate,
        riskScore,
        riskLevel,
        availableCredit,
        usedCredit,
        creditLimit,
        profile,
        metric,
      },
    };
  }

  async refreshRetailerCreditCache(
    context: AuthenticatedUser | { organizationId: string },
    retailerId: string,
  ) {
    return this.refreshRetailerMetrics(context, retailerId);
  }

  async refreshAfterReceipt(
    context: AuthenticatedUser | { organizationId: string },
    retailerId: string,
  ) {
    return this.refreshRetailerMetrics(context, retailerId);
  }

  async refreshAfterInvoice(
    context: AuthenticatedUser | { organizationId: string },
    retailerId: string,
  ) {
    return this.refreshRetailerMetrics(context, retailerId);
  }

  async refreshAfterCreditNote(
    context: AuthenticatedUser | { organizationId: string },
    retailerId: string,
  ) {
    return this.refreshRetailerMetrics(context, retailerId);
  }

  async refreshAfterDebitNote(
    context: AuthenticatedUser | { organizationId: string },
    retailerId: string,
  ) {
    return this.refreshRetailerMetrics(context, retailerId);
  }

  private getOrganizationId(context?: AuthenticatedUser | { organizationId: string }) {
    if (!context?.organizationId) {
      throw new UnauthorizedException('Organization context required');
    }
    return context.organizationId;
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }
}
