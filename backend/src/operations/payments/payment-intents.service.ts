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
import { CancelPaymentIntentDto, CreatePaymentIntentDto, QueryPaymentIntentsDto } from './dto';

@Injectable()
export class PaymentIntentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreatePaymentIntentDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.createInternal(actor, dto, dto.retailerId);
  }

  async createMy(actor: AuthenticatedUser, dto: CreatePaymentIntentDto) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);

    if (dto.retailerId !== actor.retailerId) {
      throw new ForbiddenException('Retailer payment intent must belong to your own account');
    }

    return this.createInternal(actor, dto, actor.retailerId!);
  }

  async findAll(actor: AuthenticatedUser, query: QueryPaymentIntentsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.RetailerPaymentIntentWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.retailerId) where.retailerId = query.retailerId;
    if (query.status) where.status = query.status;
    if (query.gatewayName) where.gatewayName = query.gatewayName;
    if (query.paymentContext) where.paymentContext = query.paymentContext;
    if (query.fromDate || query.toDate) {
      where.initiatedAt = {};
      if (query.fromDate) where.initiatedAt.gte = new Date(query.fromDate);
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.initiatedAt.lte = end;
      }
    }
    if (query.search) {
      where.OR = [
        { intentNo: { contains: query.search, mode: 'insensitive' } },
        { gatewayOrderId: { contains: query.search, mode: 'insensitive' } },
        { gatewayPaymentId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.retailerPaymentIntent.findMany({
        where,
        include: {
          invoiceLinks: {
            include: {
              salesInvoice: {
                select: {
                  id: true,
                  invoiceNo: true,
                  invoiceDate: true,
                  grandTotal: true,
                  outstandingAmount: true,
                },
              },
            },
          },
          paymentReceipts: {
            select: {
              id: true,
              receiptNo: true,
              status: true,
              amount: true,
              paymentDate: true,
            },
          },
        },
        orderBy: { initiatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.retailerPaymentIntent.count({ where }),
    ]);

    return {
      success: true,
      message: 'Payment intents fetched successfully',
      data: rows.map((row) => this.serializeIntent(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    return {
      success: true,
      message: 'Payment intent fetched successfully',
      data: await this.getIntentDetail(actor.organizationId, id),
    };
  }

  async findMyOne(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);

    const intent = await this.getIntentDetail(actor.organizationId, id);
    if (intent.retailerId !== actor.retailerId) {
      throw new ForbiddenException('You can only access your own payment intents');
    }

    return {
      success: true,
      message: 'Retailer payment intent fetched successfully',
      data: intent,
    };
  }

  async cancel(actor: AuthenticatedUser, id: string, dto: CancelPaymentIntentDto) {
    this.assertAuthenticated(actor);

    const intent = await this.getIntentOrThrow(actor.organizationId, id);
    if (this.isRetailer(actor) && intent.retailerId !== actor.retailerId) {
      throw new ForbiddenException('You can only cancel your own payment intent');
    }
    if (!['initiated', 'pending'].includes(intent.status)) {
      throw new ConflictException('Only initiated or pending intents can be cancelled');
    }

    const updated = await this.prisma.retailerPaymentIntent.update({
      where: { id },
      data: {
        status: 'cancelled',
        failureReason: dto.reason ?? intent.failureReason,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Payment intent cancelled successfully',
      data: updated,
    };
  }

  async expire(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const intent = await this.getIntentOrThrow(actor.organizationId, id);
    if (['success', 'cancelled', 'expired'].includes(intent.status)) {
      return {
        success: true,
        message: 'Payment intent already closed',
        data: intent,
      };
    }

    const updated = await this.prisma.retailerPaymentIntent.update({
      where: { id },
      data: {
        status: 'expired',
        expiresAt: intent.expiresAt ?? new Date(),
      },
    });

    return {
      success: true,
      message: 'Payment intent expired successfully',
      data: updated,
    };
  }

  async getReconciliationStatus(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const [intent, receipts, webhooks] = await Promise.all([
      this.getIntentOrThrow(actor.organizationId, id),
      this.prisma.paymentReceipt.findMany({
        where: { organizationId: actor.organizationId, paymentIntentId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentGatewayWebhook.findMany({
        where: {
          organizationId: actor.organizationId,
          OR: [{ externalReference: id }],
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      success: true,
      message: 'Payment intent reconciliation status fetched successfully',
      data: {
        intent: this.serializeIntent(intent),
        receipts: receipts.map((receipt) => ({
          ...receipt,
          amount: this.toNumber(receipt.amount),
          unallocatedAmount: this.toNumber(receipt.unallocatedAmount),
        })),
        webhooks,
      },
    };
  }

  async markWebhookSuccess(
    organizationId: string,
    id: string,
    payload: {
      gatewayName: string;
      gatewayOrderId?: string | null;
      gatewayPaymentId?: string | null;
      gatewaySignature?: string | null;
      paidAt?: Date;
    },
  ) {
    const intent = await this.getIntentOrThrow(organizationId, id);
    return this.prisma.retailerPaymentIntent.update({
      where: { id },
      data: {
        status: 'success',
        gatewayName: payload.gatewayName,
        gatewayOrderId: payload.gatewayOrderId ?? intent.gatewayOrderId,
        gatewayPaymentId: payload.gatewayPaymentId ?? intent.gatewayPaymentId,
        gatewaySignature: payload.gatewaySignature ?? intent.gatewaySignature,
        completedAt: payload.paidAt ?? new Date(),
      },
    });
  }

  async markWebhookFailure(
    organizationId: string,
    id: string,
    payload: { gatewayName: string; reason?: string | null },
  ) {
    await this.getIntentOrThrow(organizationId, id);
    return this.prisma.retailerPaymentIntent.update({
      where: { id },
      data: {
        status: 'failed',
        gatewayName: payload.gatewayName,
        failureReason: payload.reason ?? 'Gateway failure',
        completedAt: new Date(),
      },
    });
  }

  private async createInternal(actor: AuthenticatedUser, dto: CreatePaymentIntentDto, retailerId: string) {
    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId: actor.organizationId, id: retailerId },
      select: { id: true, shopName: true },
    });
    if (!retailer) throw new NotFoundException('Retailer not found');

    const resolvedLinks = await this.resolveIntentInvoiceLinks(actor.organizationId, retailerId, dto);
    const effectiveAmount = this.resolveIntentAmount(dto, resolvedLinks);
    const intentNo = await this.generateIntentNo(actor.organizationId);
    const gatewayOrderId = `${(dto.gatewayName ?? 'gateway').toUpperCase()}-${intentNo}`;

    const intent = await this.prisma.$transaction(async (tx) => {
      const created = await tx.retailerPaymentIntent.create({
        data: {
          organizationId: actor.organizationId,
          retailerId,
          intentNo,
          paymentContext: dto.paymentContext,
          amount: effectiveAmount,
          gatewayName: dto.gatewayName,
          gatewayOrderId,
          paymentLinkUrl: `/api/v1/payment-intents/${intentNo}/checkout`,
          dynamicQrPayload: `DD-INTENT:${intentNo}`,
          status: 'initiated',
          createdByUserId: actor.id,
        },
      });

      if (resolvedLinks.length) {
        await tx.retailerPaymentIntentInvoice.createMany({
          data: resolvedLinks.map((link) => ({
            paymentIntentId: created.id,
            salesInvoiceId: link.salesInvoiceId,
            targetAmount: link.targetAmount,
          })),
        });
      }

      return created;
    });

    return {
      success: true,
      message: 'Payment intent created successfully',
      data: await this.getIntentDetail(actor.organizationId, intent.id),
    };
  }

  private async resolveIntentInvoiceLinks(
    organizationId: string,
    retailerId: string,
    dto: CreatePaymentIntentDto,
  ) {
    if (dto.selectedInvoices?.length) {
      const invoiceIds = dto.selectedInvoices.map((row) => row.invoiceId);
      const invoices = await this.prisma.salesInvoice.findMany({
        where: {
          organizationId,
          retailerId,
          id: { in: invoiceIds },
          outstandingAmount: { gt: 0 },
          status: { in: ['posted', 'partial_paid'] },
        },
        select: { id: true, outstandingAmount: true, invoiceNo: true },
      });

      if (invoices.length !== invoiceIds.length) {
        throw new BadRequestException('One or more selected invoices are invalid or not payable');
      }

      const map = new Map(invoices.map((invoice) => [invoice.id, invoice]));
      return dto.selectedInvoices.map((row) => {
        const invoice = map.get(row.invoiceId)!;
        if (row.targetAmount > this.toNumber(invoice.outstandingAmount) + 0.001) {
          throw new BadRequestException(`Target amount exceeds outstanding for invoice ${invoice.invoiceNo}`);
        }
        return {
          salesInvoiceId: row.invoiceId,
          targetAmount: this.roundMoney(row.targetAmount),
        };
      });
    }

    if (dto.paymentContext === 'full_outstanding') {
      const invoices = await this.prisma.salesInvoice.findMany({
        where: {
          organizationId,
          retailerId,
          outstandingAmount: { gt: 0 },
          status: { in: ['posted', 'partial_paid'] },
        },
        select: { id: true, outstandingAmount: true },
        orderBy: [{ dueDate: 'asc' }, { invoiceDate: 'asc' }],
      });
      return invoices.map((invoice) => ({
        salesInvoiceId: invoice.id,
        targetAmount: this.roundMoney(this.toNumber(invoice.outstandingAmount)),
      }));
    }

    return [] as Array<{ salesInvoiceId: string; targetAmount: number }>;
  }

  private resolveIntentAmount(
    dto: CreatePaymentIntentDto,
    links: Array<{ salesInvoiceId: string; targetAmount: number }>,
  ) {
    if (dto.paymentContext === 'full_outstanding' && links.length) {
      return this.roundMoney(links.reduce((sum, row) => sum + row.targetAmount, 0));
    }

    const linkedTotal = this.roundMoney(links.reduce((sum, row) => sum + row.targetAmount, 0));
    if (linkedTotal > dto.amount + 0.001) {
      throw new BadRequestException('Selected invoice target total exceeds intent amount');
    }

    return this.roundMoney(dto.amount);
  }

  private async getIntentDetail(organizationId: string, id: string) {
    const intent = await this.prisma.retailerPaymentIntent.findFirst({
      where: { organizationId, id },
      include: {
        invoiceLinks: {
          include: {
            salesInvoice: {
              select: {
                id: true,
                invoiceNo: true,
                invoiceDate: true,
                grandTotal: true,
                outstandingAmount: true,
              },
            },
          },
        },
        paymentReceipts: {
          select: {
            id: true,
            receiptNo: true,
            status: true,
            amount: true,
            paymentDate: true,
            paymentMode: true,
          },
        },
      },
    });

    if (!intent) throw new NotFoundException('Payment intent not found');
    return this.serializeIntent(intent);
  }

  private async getIntentOrThrow(organizationId: string, id: string) {
    const intent = await this.prisma.retailerPaymentIntent.findFirst({
      where: { organizationId, id },
    });
    if (!intent) throw new NotFoundException('Payment intent not found');
    return intent;
  }

  private async generateIntentNo(organizationId: string) {
    const total = await this.prisma.retailerPaymentIntent.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PINT-${datePart}-${String(total + 1).padStart(4, '0')}`;
  }

  private serializeIntent(intent: any) {
    return {
      ...intent,
      amount: this.toNumber(intent.amount),
      invoiceLinks: intent.invoiceLinks?.map((row: any) => ({
        ...row,
        targetAmount: this.toNumber(row.targetAmount),
        salesInvoice: row.salesInvoice
          ? {
              ...row.salesInvoice,
              grandTotal: this.toNumber(row.salesInvoice.grandTotal),
              outstandingAmount: this.toNumber(row.salesInvoice.outstandingAmount),
            }
          : null,
      })) ?? [],
      paymentReceipts: intent.paymentReceipts?.map((receipt: any) => ({
        ...receipt,
        amount: this.toNumber(receipt.amount),
      })) ?? [],
    };
  }

  private isRetailer(actor: AuthenticatedUser) {
    return actor.roles.includes('RETAILER') || actor.userType === 'retailer_user';
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (this.isRetailer(actor)) {
      throw new ForbiddenException('Backoffice access required');
    }
  }

  private assertRetailer(actor: AuthenticatedUser) {
    if (!actor.retailerId || !this.isRetailer(actor)) {
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
