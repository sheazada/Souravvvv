import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CrateTransaction, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCrateTransactionDto,
  QueryCrateBalancesDto,
  QueryCrateTransactionsDto,
} from './dto';

@Injectable()
export class CratesService {
  constructor(private readonly prisma: PrismaService) {}

  async findTransactions(actor: AuthenticatedUser, query: QueryCrateTransactionsDto) {
    this.assertAuthenticated(actor);
    this.assertBackofficeOrRetailerAccess(actor, query.retailerId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.CrateTransactionWhereInput = {
      organizationId: actor.organizationId,
    };

    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      where.retailerId = actor.retailerId;
    } else if (query.retailerId) {
      where.retailerId = query.retailerId;
    }

    if (query.crateTypeId) where.crateTypeId = query.crateTypeId;
    if (query.dispatchTripId) where.dispatchTripId = query.dispatchTripId;
    if (query.transactionType) where.transactionType = query.transactionType;

    if (query.fromDate || query.toDate) {
      where.transactionDate = {};
      if (query.fromDate) where.transactionDate.gte = new Date(query.fromDate);
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.transactionDate.lte = end;
      }
    }

    if (query.search) {
      where.OR = [
        { remarks: { contains: query.search, mode: 'insensitive' } },
        { referenceType: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.crateTransaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.crateTransaction.count({ where }),
    ]);

    const enriched = await this.enrichTransactions(actor.organizationId, rows);

    return {
      success: true,
      message: 'Crate transactions fetched successfully',
      data: enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBalances(actor: AuthenticatedUser, query: QueryCrateBalancesDto) {
    this.assertAuthenticated(actor);
    this.assertBackofficeOrRetailerAccess(actor, query.retailerId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.CrateBalanceSnapshotWhereInput = {
      organizationId: actor.organizationId,
    };

    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      where.retailerId = actor.retailerId!;
    } else if (query.retailerId) {
      where.retailerId = query.retailerId;
    }

    if (query.crateTypeId) where.crateTypeId = query.crateTypeId;

    if (query.balanceDate) {
      const target = new Date(query.balanceDate);
      target.setHours(0, 0, 0, 0);
      where.balanceDate = target;
    }

    const [rows, total] = await Promise.all([
      this.prisma.crateBalanceSnapshot.findMany({
        where,
        orderBy: [{ retailerId: 'asc' }, { crateTypeId: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.crateBalanceSnapshot.count({ where }),
    ]);

    const retailerIds = [...new Set(rows.map((r) => r.retailerId))];
    const crateTypeIds = [...new Set(rows.map((r) => r.crateTypeId))];
    const [retailers, crateTypes] = await Promise.all([
      retailerIds.length
        ? this.prisma.retailer.findMany({
            where: { organizationId: actor.organizationId, id: { in: retailerIds } },
            select: { id: true, retailerCode: true, shopName: true, mobile: true },
          })
        : [],
      crateTypeIds.length
        ? this.prisma.crateType.findMany({
            where: { organizationId: actor.organizationId, id: { in: crateTypeIds } },
            select: { id: true, code: true, name: true, depositValue: true },
          })
        : [],
    ]);

    const retailerMap = new Map<string, any>(retailers.map((r): [string, any] => [r.id, r]));
    const crateTypeMap = new Map<string, any>(crateTypes.map((c): [string, any] => [c.id, c]));

    const enriched = rows.map((row) => {
      const crateType = crateTypeMap.get(row.crateTypeId) ?? null;
      const depositRate = crateType?.depositValue ? Number(crateType.depositValue) : 0;
      const totalLiability = Math.round((row.closingQty * depositRate + Number.EPSILON) * 100) / 100;

      return {
        ...row,
        retailer: retailerMap.get(row.retailerId) ?? null,
        crateType,
        depositRate,
        totalLiability,
      };
    });

    return {
      success: true,
      message: 'Crate balance snapshots fetched successfully',
      data: enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createTransaction(actor: AuthenticatedUser, dto: CreateCrateTransactionDto) {
    this.assertAuthenticated(actor);
    this.assertBackofficeOrStaff(actor);

    const crateType = await this.prisma.crateType.findFirst({
      where: { organizationId: actor.organizationId, id: dto.crateTypeId },
    });
    if (!crateType) throw new NotFoundException('Crate type not found');

    if (dto.retailerId) {
      const retailer = await this.prisma.retailer.findFirst({
        where: { organizationId: actor.organizationId, id: dto.retailerId },
      });
      if (!retailer) throw new NotFoundException('Retailer not found');
    }

    if (dto.dispatchTripId) {
      const trip = await this.prisma.dispatchTrip.findFirst({
        where: { organizationId: actor.organizationId, id: dto.dispatchTripId },
      });
      if (!trip) throw new NotFoundException('Dispatch trip not found');
    }

    const txDate = dto.transactionDate ? new Date(dto.transactionDate) : new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.crateTransaction.create({
        data: {
          organizationId: actor.organizationId,
          crateTypeId: dto.crateTypeId,
          retailerId: dto.retailerId ?? null,
          dispatchTripId: dto.dispatchTripId ?? null,
          deliveryStopId: dto.deliveryStopId ?? null,
          transactionType: dto.transactionType,
          quantity: dto.quantity,
          transactionDate: txDate,
          referenceType: dto.referenceType ?? null,
          referenceId: dto.referenceId ?? null,
          remarks: dto.remarks ?? null,
        },
      });

      if (dto.retailerId) {
        await this.syncSnapshotForDate(tx, actor.organizationId, dto.retailerId, dto.crateTypeId, txDate);
      }

      return entry;
    });

    return {
      success: true,
      message: 'Crate transaction created successfully',
      data: created,
    };
  }

  async recalculateBalances(actor: AuthenticatedUser, retailerId?: string, targetDate?: string) {
    this.assertAuthenticated(actor);
    this.assertBackofficeOrStaff(actor);

    const date = targetDate ? new Date(targetDate) : new Date();
    date.setHours(0, 0, 0, 0);

    const whereRetailer: Prisma.RetailerWhereInput = {
      organizationId: actor.organizationId,
      businessStatus: 'active',
    };
    if (retailerId) whereRetailer.id = retailerId;

    const retailers = await this.prisma.retailer.findMany({
      where: whereRetailer,
      select: { id: true },
    });
    const crateTypes = await this.prisma.crateType.findMany({
      where: { organizationId: actor.organizationId, isActive: true },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const ret of retailers) {
        for (const ct of crateTypes) {
          await this.syncSnapshotForDate(tx, actor.organizationId, ret.id, ct.id, date);
        }
      }
    });

    return {
      success: true,
      message: 'Crate balances recalculated successfully',
    };
  }

  async export(actor: AuthenticatedUser, format: string, query: QueryCrateTransactionsDto) {
    const response = await this.findTransactions(actor, { ...query, limit: 500, page: 1 });
    return {
      success: true,
      message: 'Crate export payload generated successfully',
      data: {
        format,
        fileName: `crate-transactions-${Date.now()}.${format === 'xlsx' ? 'xlsx' : format === 'print' ? 'html' : 'pdf'}`,
        transactions: response.data,
      },
    };
  }

  private async syncSnapshotForDate(
    tx: Prisma.TransactionClient,
    organizationId: string,
    retailerId: string,
    crateTypeId: string,
    targetDate: Date,
  ) {
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const allPrior = await tx.crateTransaction.findMany({
      where: {
        organizationId,
        retailerId,
        crateTypeId,
        transactionDate: { lte: dayEnd },
      },
    });

    let issuedQty = 0;
    let returnedQty = 0;
    let damagedQty = 0;
    let missingQty = 0;

    for (const item of allPrior) {
      if (item.transactionType === 'issue') issuedQty += item.quantity;
      else if (item.transactionType === 'return') returnedQty += item.quantity;
      else if (item.transactionType === 'damage') damagedQty += item.quantity;
      else if (item.transactionType === 'missing') missingQty += item.quantity;
    }

    const closingQty = Math.max(issuedQty - returnedQty - damagedQty - missingQty, 0);

    await tx.crateBalanceSnapshot.upsert({
      where: {
        organizationId_balanceDate_retailerId_crateTypeId: {
          organizationId,
          balanceDate: dayStart,
          retailerId,
          crateTypeId,
        },
      },
      update: {
        issuedQty,
        returnedQty,
        damagedQty,
        missingQty,
        closingQty,
      },
      create: {
        organizationId,
        balanceDate: dayStart,
        retailerId,
        crateTypeId,
        openingQty: 0,
        issuedQty,
        returnedQty,
        damagedQty,
        missingQty,
        closingQty,
      },
    });
  }

  private async enrichTransactions(organizationId: string, rows: CrateTransaction[]) {
    const retailerIds = [...new Set(rows.map((r) => r.retailerId).filter((v): v is string => Boolean(v)))];
    const crateTypeIds = [...new Set(rows.map((r) => r.crateTypeId))];
    const tripIds = [...new Set(rows.map((r) => r.dispatchTripId).filter((v): v is string => Boolean(v)))];

    const [retailers, crateTypes, trips] = await Promise.all([
      retailerIds.length
        ? this.prisma.retailer.findMany({
            where: { organizationId, id: { in: retailerIds } },
            select: { id: true, retailerCode: true, shopName: true },
          })
        : [],
      crateTypeIds.length
        ? this.prisma.crateType.findMany({
            where: { organizationId, id: { in: crateTypeIds } },
            select: { id: true, code: true, name: true, depositValue: true },
          })
        : [],
      tripIds.length
        ? this.prisma.dispatchTrip.findMany({
            where: { organizationId, id: { in: tripIds } },
            select: { id: true, tripNo: true, dispatchDate: true },
          })
        : [],
    ]);

    const retailerMap = new Map<string, any>(retailers.map((r): [string, any] => [r.id, r]));
    const crateTypeMap = new Map<string, any>(crateTypes.map((c): [string, any] => [c.id, c]));
    const tripMap = new Map<string, any>(trips.map((t): [string, any] => [t.id, t]));

    return rows.map((row) => ({
      ...row,
      retailer: row.retailerId ? retailerMap.get(row.retailerId) ?? null : null,
      crateType: crateTypeMap.get(row.crateTypeId) ?? null,
      dispatchTrip: row.dispatchTripId ? tripMap.get(row.dispatchTripId) ?? null : null,
    }));
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackofficeOrStaff(actor: AuthenticatedUser) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      throw new ForbiddenException('Retailer accounts cannot record container issue/return transactions');
    }
  }

  private assertBackofficeOrRetailerAccess(actor: AuthenticatedUser, targetRetailerId?: string) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      if (targetRetailerId && targetRetailerId !== actor.retailerId) {
        throw new ForbiddenException('You can only access your own container balances');
      }
    }
  }
}
