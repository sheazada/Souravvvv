import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AutoAllocatePaymentReceiptDto,
  CreatePaymentAllocationDto,
  PreviewPaymentAllocationDto,
  ReallocatePaymentReceiptDto,
} from './dto';

@Injectable()
export class PaymentAllocationService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(actor: AuthenticatedUser, dto: PreviewPaymentAllocationDto) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, dto.retailerId);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId: actor.organizationId,
        retailerId: dto.retailerId,
        outstandingAmount: { gt: 0 },
        status: { in: ['posted', 'partial_paid'] },
        ...(dto.selectedInvoiceIds?.length
          ? { id: { in: dto.selectedInvoiceIds } }
          : {}),
      },
      select: {
        id: true,
        invoiceNo: true,
        invoiceDate: true,
        dueDate: true,
        grandTotal: true,
        outstandingAmount: true,
      },
      orderBy: [{ dueDate: 'asc' }, { invoiceDate: 'asc' }],
    });

    const totalOutstanding = invoices.reduce(
      (sum, invoice) => sum + this.toNumber(invoice.outstandingAmount),
      0,
    );

    if (dto.allocationMode === 'advance') {
      return {
        success: true,
        message: 'Payment allocation preview generated successfully',
        data: {
          retailerId: dto.retailerId,
          amount: this.roundMoney(dto.amount),
          paymentContext: dto.paymentContext ?? null,
          allocationMode: dto.allocationMode,
          totalOutstanding: this.roundMoney(totalOutstanding),
          proposedAllocations: [],
          remainingUnallocatedAmount: this.roundMoney(dto.amount),
          projectedOutstandingAfterPayment: this.roundMoney(totalOutstanding),
        },
      };
    }

    let remaining = this.roundMoney(dto.amount);
    const proposedAllocations = invoices.map((invoice) => {
      const allocate = remaining > 0 ? Math.min(remaining, this.toNumber(invoice.outstandingAmount)) : 0;
      remaining = this.roundMoney(remaining - allocate);
      return {
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        grandTotal: this.toNumber(invoice.grandTotal),
        outstandingAmount: this.toNumber(invoice.outstandingAmount),
        proposedAmount: this.roundMoney(allocate),
      };
    });

    return {
      success: true,
      message: 'Payment allocation preview generated successfully',
      data: {
        retailerId: dto.retailerId,
        amount: this.roundMoney(dto.amount),
        paymentContext: dto.paymentContext ?? null,
        allocationMode: dto.allocationMode,
        totalOutstanding: this.roundMoney(totalOutstanding),
        proposedAllocations: proposedAllocations.filter((row) => row.proposedAmount > 0),
        remainingUnallocatedAmount: this.roundMoney(remaining),
        projectedOutstandingAfterPayment: this.roundMoney(Math.max(totalOutstanding - (dto.amount - remaining), 0)),
      },
    };
  }

  async createManualAllocation(
    actor: AuthenticatedUser,
    paymentReceiptId: string,
    dto: CreatePaymentAllocationDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    return {
      success: true,
      message: 'Manual payment allocation service contract is ready for orchestration use',
      data: {
        paymentReceiptId,
        dto,
      },
    };
  }

  async autoAllocateFifo(
    actor: AuthenticatedUser,
    paymentReceiptId: string,
    dto: AutoAllocatePaymentReceiptDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    return {
      success: true,
      message: 'Auto FIFO allocation service contract is ready for orchestration use',
      data: {
        paymentReceiptId,
        dto,
      },
    };
  }

  async reallocate(
    actor: AuthenticatedUser,
    paymentReceiptId: string,
    dto: ReallocatePaymentReceiptDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    return {
      success: true,
      message: 'Receipt reallocation service contract is ready for orchestration use',
      data: {
        paymentReceiptId,
        dto,
      },
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
