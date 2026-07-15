import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { RetailerFinanceService } from '../../operations/payments/retailer-finance.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRetailerDocumentDto,
  CreateRetailerDto,
  QueryRetailersDto,
  UpdateOrderingModeDto,
  UpdateRetailerCreditSettingsDto,
  UpdateRetailerDto,
  UpdateRetailerRouteAssignmentDto,
  UpdateRetailerStatusDto,
} from './dto';

@Injectable()
export class RetailersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retailerFinanceService: RetailerFinanceService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateRetailerDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const duplicate = await this.prisma.retailer.findFirst({
      where: {
        organizationId: actor.organizationId,
        OR: [{ retailerCode: dto.retailerCode }, { mobile: dto.mobile }],
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException(
        'Retailer with same code or mobile already exists',
      );
    }

    const retailer = await this.prisma.retailer.create({
      data: {
        organizationId: actor.organizationId,
        retailerCode: dto.retailerCode,
        shopName: dto.shopName,
        ownerName: dto.ownerName,
        mobile: dto.mobile,
        alternateMobile: dto.alternateMobile,
        email: dto.email,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        locality: dto.locality,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        gstin: dto.gstin,
        pan: dto.pan,
        aadhaarNo: dto.aadhaarNo,
        creditLimit: dto.creditLimit,
        creditDays: dto.creditDays,
        assignedRouteId: dto.assignedRouteId,
        assignedSalespersonId: dto.assignedSalespersonId,
        preferredDeliveryStart: dto.preferredDeliveryStart,
        preferredDeliveryEnd: dto.preferredDeliveryEnd,
        retailerCategory: dto.retailerCategory,
        businessStatus: dto.businessStatus ?? 'active',
        shopPhotoUrl: dto.shopPhotoUrl,
        orderingMode: dto.orderingMode ?? 'self_service',
        isOrderingEnabled: dto.isOrderingEnabled ?? true,
        isBillingEnabled: dto.isBillingEnabled ?? true,
        openingBalance: dto.openingBalance ?? 0,
        notes: dto.notes,
      },
    });

    return {
      success: true,
      message: 'Retailer created successfully',
      data: retailer,
    };
  }

  async findAll(actor: AuthenticatedUser, query: QueryRetailersDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildRetailerWhere(actor, query);

    const [data, total] = await Promise.all([
      this.prisma.retailer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.retailer.count({ where }),
    ]);

    return {
      success: true,
      message: 'Retailers fetched successfully',
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(actor: AuthenticatedUser, id: string) {
    const retailer = await this.getAccessibleRetailerOrThrow(actor, id);

    const [documentsCount, orderCount, invoiceCount] = await Promise.all([
      this.prisma.retailerDocument.count({
        where: { organizationId: actor.organizationId, retailerId: id },
      }),
      this.prisma.salesOrder.count({
        where: { organizationId: actor.organizationId, retailerId: id },
      }),
      this.prisma.salesInvoice.count({
        where: { organizationId: actor.organizationId, retailerId: id },
      }),
    ]);

    return {
      success: true,
      message: 'Retailer fetched successfully',
      data: {
        ...retailer,
        metrics: {
          documentsCount,
          orderCount,
          invoiceCount,
        },
      },
    };
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateRetailerDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getRetailerOrThrow(actor.organizationId, id);

    if (dto.retailerCode || dto.mobile) {
      const duplicate = await this.prisma.retailer.findFirst({
        where: {
          organizationId: actor.organizationId,
          id: { not: id },
          OR: [
            ...(dto.retailerCode ? [{ retailerCode: dto.retailerCode }] : []),
            ...(dto.mobile ? [{ mobile: dto.mobile }] : []),
          ],
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException(
          'Another retailer already uses the same code or mobile number',
        );
      }
    }

    const retailer = await this.prisma.retailer.update({
      where: { id },
      data: dto,
    });

    return {
      success: true,
      message: 'Retailer updated successfully',
      data: retailer,
    };
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateRetailerStatusDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getRetailerOrThrow(actor.organizationId, id);

    const retailer = await this.prisma.retailer.update({
      where: { id },
      data: {
        businessStatus: dto.businessStatus,
      },
    });

    return {
      success: true,
      message: 'Retailer status updated successfully',
      data: retailer,
    };
  }

  async updateOrderingMode(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateOrderingModeDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getRetailerOrThrow(actor.organizationId, id);

    const retailer = await this.prisma.retailer.update({
      where: { id },
      data: {
        orderingMode: dto.orderingMode,
        isOrderingEnabled: dto.isOrderingEnabled,
        isBillingEnabled: dto.isBillingEnabled,
      },
    });

    return {
      success: true,
      message: 'Retailer ordering mode updated successfully',
      data: retailer,
    };
  }

  async updateCreditSettings(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateRetailerCreditSettingsDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getRetailerOrThrow(actor.organizationId, id);

    const retailer = await this.prisma.retailer.update({
      where: { id },
      data: {
        creditLimit: dto.creditLimit,
        creditDays: dto.creditDays,
      },
    });

    const existingProfile = await this.prisma.retailerCreditProfile.findFirst({
      where: { organizationId: actor.organizationId, retailerId: id },
    });

    await this.prisma.retailerCreditProfile.upsert({
      where: { retailerId: id },
      create: {
        organizationId: actor.organizationId,
        retailerId: id,
        creditLimit: dto.creditLimit,
        creditDays: dto.creditDays,
        warningThresholdPercent: existingProfile?.warningThresholdPercent ?? 80,
        blockOrdersOnLimitExceed: existingProfile?.blockOrdersOnLimitExceed ?? false,
        managerApprovalRequired: existingProfile?.managerApprovalRequired ?? true,
        allowDispatchWithOverdue: existingProfile?.allowDispatchWithOverdue ?? false,
        isCreditActive: existingProfile?.isCreditActive ?? true,
        availableCredit: existingProfile?.availableCredit ?? dto.creditLimit,
        usedCredit: existingProfile?.usedCredit ?? 0,
        currentOutstanding: existingProfile?.currentOutstanding ?? 0,
        overdueAmount: existingProfile?.overdueAmount ?? 0,
        riskLevel: existingProfile?.riskLevel ?? 'low',
        averagePaymentDays: existingProfile?.averagePaymentDays ?? null,
        lastPaymentDate: existingProfile?.lastPaymentDate ?? null,
        notes: existingProfile?.notes ?? null,
      },
      update: {
        creditLimit: dto.creditLimit,
        creditDays: dto.creditDays,
      },
    });

    return {
      success: true,
      message: 'Retailer credit settings updated successfully',
      data: retailer,
    };
  }

  async updateRouteAssignment(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateRetailerRouteAssignmentDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getRetailerOrThrow(actor.organizationId, id);

    const retailer = await this.prisma.retailer.update({
      where: { id },
      data: {
        assignedRouteId: dto.assignedRouteId,
        assignedSalespersonId: dto.assignedSalespersonId,
        preferredDeliveryStart: dto.preferredDeliveryStart,
        preferredDeliveryEnd: dto.preferredDeliveryEnd,
      },
    });

    return {
      success: true,
      message: 'Retailer route assignment updated successfully',
      data: retailer,
    };
  }

  async listDocuments(actor: AuthenticatedUser, id: string) {
    await this.getAccessibleRetailerOrThrow(actor, id);

    const documents = await this.prisma.retailerDocument.findMany({
      where: {
        organizationId: actor.organizationId,
        retailerId: id,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Retailer documents fetched successfully',
      data: documents,
    };
  }

  async createDocument(
    actor: AuthenticatedUser,
    id: string,
    dto: CreateRetailerDocumentDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getRetailerOrThrow(actor.organizationId, id);

    const document = await this.prisma.retailerDocument.create({
      data: {
        organizationId: actor.organizationId,
        retailerId: id,
        documentType: dto.documentType,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        remarks: dto.remarks,
      },
    });

    return {
      success: true,
      message: 'Retailer document created successfully',
      data: document,
    };
  }

  async deleteDocument(
    actor: AuthenticatedUser,
    id: string,
    documentId: string,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getRetailerOrThrow(actor.organizationId, id);

    const deleted = await this.prisma.retailerDocument.deleteMany({
      where: {
        id: documentId,
        organizationId: actor.organizationId,
        retailerId: id,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Retailer document not found');
    }

    return {
      success: true,
      message: 'Retailer document deleted successfully',
      data: { retailerId: id, documentId },
    };
  }

  async getLedgerSummary(actor: AuthenticatedUser, id: string) {
    const retailer = await this.getAccessibleRetailerOrThrow(actor, id);
    const [financialSummary, invoiceAgg, paymentAgg] = await Promise.all([
      this.retailerFinanceService.getRetailerFinancialSummary(actor, id),
      this.prisma.salesInvoice.aggregate({
        where: { organizationId: actor.organizationId, retailerId: id, status: { not: 'cancelled' } },
        _sum: { grandTotal: true, outstandingAmount: true },
        _count: { _all: true },
      }),
      this.prisma.paymentReceipt.aggregate({
        where: {
          organizationId: actor.organizationId,
          partyType: 'retailer',
          partyId: id,
          status: { not: 'cancelled' },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      success: true,
      message: 'Retailer ledger summary fetched successfully',
      data: {
        openingBalance: this.toNumber(retailer.openingBalance),
        totalInvoiced: this.toNumber(invoiceAgg._sum.grandTotal),
        totalCollected: this.toNumber(paymentAgg._sum.amount),
        outstandingAmount: this.toNumber(invoiceAgg._sum.outstandingAmount),
        openInvoiceCount: financialSummary.data.pendingInvoiceCount,
        invoiceCount: invoiceAgg._count._all,
        paymentCount: paymentAgg._count._all,
        ...financialSummary.data,
      },
    };
  }

  async getLedgerTransactions(actor: AuthenticatedUser, id: string) {
    await this.getAccessibleRetailerOrThrow(actor, id);
    const ledger = await this.retailerFinanceService.getRetailerLedgerEntries(actor, id, {
      page: 1,
      limit: 200,
    });
    return {
      success: true,
      message: 'Retailer ledger transactions fetched successfully',
      data: ledger.data,
    };
  }

  async getOutstanding(actor: AuthenticatedUser, id: string) {
    await this.getAccessibleRetailerOrThrow(actor, id);
    const invoices = await this.retailerFinanceService.getRetailerOutstandingInvoices(actor, id, {
      page: 1,
      limit: 200,
    });
    return {
      success: true,
      message: 'Retailer outstanding fetched successfully',
      data: {
        retailerId: id,
        totalOutstanding: invoices.data.reduce(
          (sum: number, invoice: any) => sum + Number(invoice.outstandingAmount ?? 0),
          0,
        ),
        invoices: invoices.data,
      },
    };
  }

  async getStatements(actor: AuthenticatedUser, id: string) {
    await this.getAccessibleRetailerOrThrow(actor, id);
    const [summary, transactions] = await Promise.all([
      this.getLedgerSummary(actor, id),
      this.getLedgerTransactions(actor, id),
    ]);
    return {
      success: true,
      message: 'Retailer statement fetched successfully',
      data: {
        summary: summary.data,
        transactions: transactions.data,
      },
    };
  }

  async getOrders(actor: AuthenticatedUser, id: string) {
    await this.getAccessibleRetailerOrThrow(actor, id);

    const orders = await this.prisma.salesOrder.findMany({
      where: { organizationId: actor.organizationId, retailerId: id },
      include: { items: true },
      orderBy: { orderDate: 'desc' },
      take: 50,
    });

    return {
      success: true,
      message: 'Retailer orders fetched successfully',
      data: orders,
    };
  }

  async getInvoices(actor: AuthenticatedUser, id: string) {
    await this.getAccessibleRetailerOrThrow(actor, id);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: { organizationId: actor.organizationId, retailerId: id },
      include: { items: true },
      orderBy: { invoiceDate: 'desc' },
      take: 50,
    });

    return {
      success: true,
      message: 'Retailer invoices fetched successfully',
      data: invoices,
    };
  }

  async getPayments(actor: AuthenticatedUser, id: string) {
    await this.getAccessibleRetailerOrThrow(actor, id);

    const payments = await this.prisma.paymentReceipt.findMany({
      where: {
        organizationId: actor.organizationId,
        partyType: 'retailer',
        partyId: id,
      },
      orderBy: { paymentDate: 'desc' },
      take: 50,
    });

    return {
      success: true,
      message: 'Retailer payments fetched successfully',
      data: payments,
    };
  }

  async getReturns(actor: AuthenticatedUser, id: string) {
    await this.getAccessibleRetailerOrThrow(actor, id);

    const returns = await this.prisma.salesReturn.findMany({
      where: { organizationId: actor.organizationId, retailerId: id },
      include: { items: true },
      orderBy: { returnDate: 'desc' },
      take: 50,
    });

    return {
      success: true,
      message: 'Retailer returns fetched successfully',
      data: returns,
    };
  }

  async getCrates(actor: AuthenticatedUser, id: string) {
    await this.getAccessibleRetailerOrThrow(actor, id);

    const crateTransactions = await this.prisma.crateTransaction.findMany({
      where: { organizationId: actor.organizationId, retailerId: id },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });

    return {
      success: true,
      message: 'Retailer crate transactions fetched successfully',
      data: crateTransactions,
    };
  }

  private buildRetailerWhere(
    actor: AuthenticatedUser,
    query: QueryRetailersDto,
  ): Prisma.RetailerWhereInput {
    const where: Prisma.RetailerWhereInput = {
      organizationId: actor.organizationId,
    };

    if (this.isRetailerUser(actor)) {
      where.id = actor.retailerId ?? undefined;
    }

    if (query.routeId) {
      where.assignedRouteId = query.routeId;
    }

    if (query.salespersonId) {
      where.assignedSalespersonId = query.salespersonId;
    }

    if (query.retailerCategory) {
      where.retailerCategory = query.retailerCategory;
    }

    if (query.businessStatus) {
      where.businessStatus = query.businessStatus;
    }

    if (query.orderingMode) {
      where.orderingMode = query.orderingMode;
    }

    if (query.isOrderingEnabled !== undefined) {
      where.isOrderingEnabled = query.isOrderingEnabled === 'true';
    }

    if (query.search) {
      where.OR = [
        { shopName: { contains: query.search, mode: 'insensitive' } },
        { retailerCode: { contains: query.search, mode: 'insensitive' } },
        { ownerName: { contains: query.search, mode: 'insensitive' } },
        { mobile: { contains: query.search, mode: 'insensitive' } },
        { locality: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async getAccessibleRetailerOrThrow(
    actor: AuthenticatedUser,
    retailerId: string,
  ) {
    this.assertAuthenticated(actor);
    this.assertRetailerAccess(actor, retailerId);
    return this.getRetailerOrThrow(actor.organizationId, retailerId);
  }

  private async getRetailerOrThrow(organizationId: string, retailerId: string) {
    const retailer = await this.prisma.retailer.findFirst({
      where: {
        id: retailerId,
        organizationId,
      },
    });

    if (!retailer) {
      throw new NotFoundException('Retailer not found');
    }

    return retailer;
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (this.isRetailerUser(actor)) {
      throw new ForbiddenException('Retailer users cannot perform this action');
    }
  }

  private assertRetailerAccess(actor: AuthenticatedUser, retailerId: string) {
    if (this.isRetailerUser(actor) && actor.retailerId !== retailerId) {
      throw new ForbiddenException('You can only access your own retailer data');
    }
  }

  private isRetailerUser(actor: AuthenticatedUser) {
    return actor.roles.includes('RETAILER') || actor.userType === 'retailer_user';
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value);
  }
}
