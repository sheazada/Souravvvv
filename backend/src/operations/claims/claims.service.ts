import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { RetailerCreditNotesService } from '../payments/retailer-credit-notes.service';
import { CreateClaimDto, CreateSalesReturnDto, QueryClaimsDto, QuerySalesReturnsDto } from './dto';

@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly creditNotesService?: RetailerCreditNotesService,
  ) {}

  async createSalesReturn(actor: AuthenticatedUser, dto: CreateSalesReturnDto) {
    this.assertAuthenticated(actor);

    const retailerId = this.isRetailerUser(actor) ? actor.retailerId! : dto.retailerId;
    if (!retailerId) {
      throw new BadRequestException('Retailer ID is required');
    }

    const returnNo = await this.generateReturnNo(actor.organizationId);
    const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const returnRow = await tx.salesReturn.create({
        data: {
          organizationId: actor.organizationId,
          returnNo,
          retailerId,
          salesInvoiceId: dto.salesInvoiceId ?? null,
          dispatchTripId: dto.dispatchTripId ?? null,
          returnType: dto.returnType,
          returnDate,
          source: this.isRetailerUser(actor) ? 'retailer' : 'backoffice',
          status: 'draft',
          remarks: dto.remarks,
        },
      });

      await tx.salesReturnItem.createMany({
        data: dto.items.map((item) => ({
          organizationId: actor.organizationId,
          salesReturnId: returnRow.id,
          variantId: item.variantId,
          inventoryBatchId: item.inventoryBatchId ?? null,
          returnQty: item.returnQty,
          reason: item.reason ?? dto.returnType,
          disposition: item.disposition ?? 'restock',
          creditAmount: item.creditAmount ?? 0,
        })),
      });

      return returnRow;
    });

    return this.findOneSalesReturn(actor, created.id);
  }

  async findAllSalesReturns(actor: AuthenticatedUser, query: QuerySalesReturnsDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.SalesReturnWhereInput = {
      organizationId: actor.organizationId,
    };

    if (this.isRetailerUser(actor)) {
      where.retailerId = actor.retailerId!;
    } else if (query.retailerId) {
      where.retailerId = query.retailerId;
    }

    if (query.status) where.status = query.status;
    if (query.returnType) where.returnType = query.returnType;
    if (query.search) {
      where.OR = [
        { returnNo: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.salesReturn.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: { returnDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salesReturn.count({ where }),
    ]);

    return {
      success: true,
      message: 'Sales returns fetched successfully',
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneSalesReturn(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);

    const row = await this.prisma.salesReturn.findFirst({
      where: {
        organizationId: actor.organizationId,
        id,
        ...(this.isRetailerUser(actor) ? { retailerId: actor.retailerId! } : {}),
      },
      include: {
        items: true,
      },
    });

    if (!row) {
      throw new NotFoundException('Sales return not found');
    }

    return {
      success: true,
      message: 'Sales return fetched successfully',
      data: row,
    };
  }

  async approveSalesReturn(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const row = await this.prisma.salesReturn.findFirst({
      where: { organizationId: actor.organizationId, id },
      include: { items: true },
    });

    if (!row) throw new NotFoundException('Sales return not found');
    if (row.status === 'approved' || row.status === 'settled') {
      throw new ConflictException('Sales return already approved or settled');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let totalCredit = 0;

      for (const item of row.items) {
        totalCredit += Number(item.creditAmount || 0);

        if (item.disposition === 'restock' && item.inventoryBatchId) {
          const batch = await tx.inventoryBatch.findFirst({
            where: { organizationId: actor.organizationId, id: item.inventoryBatchId },
          });
          if (batch) {
            await tx.inventoryBatch.update({
              where: { id: batch.id },
              data: {
                availableQty: { increment: item.returnQty },
              },
            });

            await tx.stockMovement.create({
              data: {
                organizationId: actor.organizationId,
                movementNo: `SM-RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                warehouseId: batch.warehouseId,
                variantId: item.variantId,
                inventoryBatchId: batch.id,
                movementType: 'return_in',
                referenceType: 'sales_return',
                referenceId: row.id,
                qtyIn: item.returnQty,
                qtyOut: 0,
                unitCost: 0,
              },
            });
          }
        }
      }

      const ret = await tx.salesReturn.update({
        where: { id },
        data: {
          status: 'approved',
          approvedByUserId: actor.id,
        },
        include: { items: true },
      });

      if (totalCredit > 0 && this.creditNotesService) {
        await this.creditNotesService
          .create(actor, {
            partyType: 'retailer',
            partyId: row.retailerId,
            retailerId: row.retailerId,
            relatedInvoiceId: row.salesInvoiceId ?? undefined,
            relatedReturnId: row.id,
            noteDate: new Date().toISOString(),
            amount: totalCredit,
            taxAmount: 0,
            status: 'posted',
            remarks: `Auto credit note for approved return ${row.returnNo}`,
          })
          .catch((e) => console.error('[approveSalesReturn] Auto credit note creation failed:', e));
      }

      return ret;
    });

    return {
      success: true,
      message: `Sales return ${updated.returnNo} approved successfully`,
      data: updated,
    };
  }

  async rejectSalesReturn(actor: AuthenticatedUser, id: string, remarks?: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const updated = await this.prisma.salesReturn.update({
      where: { id, organizationId: actor.organizationId },
      data: { status: 'rejected', remarks: remarks ?? 'Rejected by backoffice' },
      include: { items: true },
    });

    return {
      success: true,
      message: `Sales return ${updated.returnNo} rejected`,
      data: updated,
    };
  }

  async createClaim(actor: AuthenticatedUser, dto: CreateClaimDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const claimNo = `CLM-${Date.now().toString().slice(-6)}`;
    const created = await this.prisma.claim.create({
      data: {
        organizationId: actor.organizationId,
        claimNo,
        partyType: dto.partyType,
        partyId: dto.partyId ?? null,
        relatedReturnId: dto.relatedReturnId ?? null,
        claimType: dto.claimType,
        claimAmount: dto.claimAmount,
        status: 'pending',
        resolutionNotes: dto.resolutionNotes,
      },
    });

    return {
      success: true,
      message: `Claim ${claimNo} recorded successfully`,
      data: created,
    };
  }

  async findAllClaims(actor: AuthenticatedUser, query: QueryClaimsDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ClaimWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.partyType) where.partyType = query.partyType;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { claimNo: { contains: query.search, mode: 'insensitive' } },
        { resolutionNotes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.claim.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.claim.count({ where }),
    ]);

    return {
      success: true,
      message: 'Claims fetched successfully',
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approveClaim(actor: AuthenticatedUser, id: string, notes?: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const updated = await this.prisma.claim.update({
      where: { id, organizationId: actor.organizationId },
      data: {
        status: 'approved',
        resolutionNotes: notes ?? 'Claim approved and scheduled for settlement',
      },
    });

    return {
      success: true,
      message: `Claim ${updated.claimNo} approved successfully`,
      data: updated,
    };
  }

  private async generateReturnNo(organizationId: string) {
    const total = await this.prisma.salesReturn.count({ where: { organizationId } });
    return `SR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(total + 1).padStart(4, '0')}`;
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (this.isRetailerUser(actor)) {
      throw new ForbiddenException('Backoffice access required');
    }
  }

  private isRetailerUser(actor: AuthenticatedUser) {
    return actor.roles.includes('RETAILER') || actor.userType === 'retailer_user';
  }
}
