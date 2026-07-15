import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, SupplierReturn, SupplierReturnItem } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSupplierReturnDto,
  QuerySupplierReturnsDto,
  SupplierReturnItemDto,
  UpdateSupplierReturnDto,
} from './dto';

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actor: AuthenticatedUser, query: QuerySupplierReturnsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.SupplierReturnWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.goodsReceiptId) where.goodsReceiptId = query.goodsReceiptId;
    if (query.status) where.status = query.status;

    if (query.fromDate || query.toDate) {
      where.returnDate = {};
      if (query.fromDate) where.returnDate.gte = new Date(query.fromDate);
      if (query.toDate) where.returnDate.lte = new Date(query.toDate);
    }

    if (query.search) {
      where.OR = [
        { supplierReturnNo: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
        { debitNoteNo: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.supplierReturn.findMany({
        where,
        orderBy: { returnDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplierReturn.count({ where }),
    ]);

    const enriched = await this.enrichReturns(actor.organizationId, rows);

    return {
      success: true,
      message: 'Supplier returns fetched successfully',
      data: enriched,
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

    const supplierReturn = await this.getReturnOrThrow(actor.organizationId, id);
    const [items, supplier, goodsReceipt] = await Promise.all([
      this.prisma.supplierReturnItem.findMany({
        where: { organizationId: actor.organizationId, supplierReturnId: id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.supplier.findFirst({
        where: { organizationId: actor.organizationId, id: supplierReturn.supplierId },
        select: { id: true, supplierCode: true, name: true, contactPerson: true, mobile: true },
      }),
      supplierReturn.goodsReceiptId
        ? this.prisma.goodsReceipt.findFirst({
            where: { organizationId: actor.organizationId, id: supplierReturn.goodsReceiptId },
            select: { id: true, grnNo: true, receiptDate: true, status: true },
          })
        : null,
    ]);

    return {
      success: true,
      message: 'Supplier return fetched successfully',
      data: {
        ...supplierReturn,
        supplier,
        goodsReceipt,
        items: await this.enrichItems(actor.organizationId, items),
      },
    };
  }

  async create(actor: AuthenticatedUser, dto: CreateSupplierReturnDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const supplier = await this.getSupplierOrThrow(actor.organizationId, dto.supplierId);
    if (!supplier.isActive) {
      throw new ForbiddenException('Supplier is inactive');
    }

    if (dto.goodsReceiptId) {
      const grn = await this.prisma.goodsReceipt.findFirst({
        where: { organizationId: actor.organizationId, id: dto.goodsReceiptId },
      });
      if (!grn) throw new NotFoundException('Goods receipt not found');
      if (grn.supplierId !== supplier.id) {
        throw new BadRequestException('Goods receipt supplier does not match return supplier');
      }
    }

    const prepared = await this.prepareItems(actor.organizationId, dto.items);

    const created = await this.prisma.$transaction(async (tx) => {
      const ret = await tx.supplierReturn.create({
        data: {
          organizationId: actor.organizationId,
          supplierReturnNo: dto.supplierReturnNo.trim(),
          supplierId: supplier.id,
          goodsReceiptId: dto.goodsReceiptId ?? null,
          returnDate: new Date(dto.returnDate),
          reason: dto.reason ?? null,
          debitNoteNo: dto.debitNoteNo ?? null,
          status: 'draft',
          remarks: dto.remarks ?? null,
        },
      });

      await tx.supplierReturnItem.createMany({
        data: prepared.map((line) => ({
          organizationId: actor.organizationId,
          supplierReturnId: ret.id,
          inventoryBatchId: line.inventoryBatchId ?? null,
          variantId: line.variantId,
          returnQty: line.returnQty,
          unitCost: line.unitCost,
          reason: line.reason ?? null,
        })),
      });

      return ret;
    });

    return this.findOne(actor, created.id);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateSupplierReturnDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const supplierReturn = await this.getReturnOrThrow(actor.organizationId, id);
    if (supplierReturn.status !== 'draft') {
      throw new ConflictException('Only draft supplier returns can be updated');
    }

    const supplierId = dto.supplierId ?? supplierReturn.supplierId;
    const supplier = await this.getSupplierOrThrow(actor.organizationId, supplierId);

    const goodsReceiptId = dto.goodsReceiptId !== undefined ? dto.goodsReceiptId : supplierReturn.goodsReceiptId;
    if (goodsReceiptId) {
      const grn = await this.prisma.goodsReceipt.findFirst({
        where: { organizationId: actor.organizationId, id: goodsReceiptId },
      });
      if (!grn) throw new NotFoundException('Goods receipt not found');
      if (grn.supplierId !== supplier.id) {
        throw new BadRequestException('Goods receipt supplier does not match return supplier');
      }
    }

    const baseUpdate: Prisma.SupplierReturnUpdateInput = {
      supplierReturnNo: dto.supplierReturnNo !== undefined ? dto.supplierReturnNo.trim() : supplierReturn.supplierReturnNo,
      supplierId: supplier.id,
      goodsReceiptId: goodsReceiptId ?? null,
      returnDate: dto.returnDate ? new Date(dto.returnDate) : supplierReturn.returnDate,
      reason: dto.reason !== undefined ? dto.reason : supplierReturn.reason,
      debitNoteNo: dto.debitNoteNo !== undefined ? dto.debitNoteNo : supplierReturn.debitNoteNo,
      remarks: dto.remarks !== undefined ? dto.remarks : supplierReturn.remarks,
    };

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.items && dto.items.length > 0) {
        const prepared = await this.prepareItems(actor.organizationId, dto.items);

        await tx.supplierReturnItem.deleteMany({ where: { supplierReturnId: id } });
        await tx.supplierReturnItem.createMany({
          data: prepared.map((line) => ({
            organizationId: actor.organizationId,
            supplierReturnId: id,
            inventoryBatchId: line.inventoryBatchId ?? null,
            variantId: line.variantId,
            returnQty: line.returnQty,
            unitCost: line.unitCost,
            reason: line.reason ?? null,
          })),
        });
      }

      return tx.supplierReturn.update({
        where: { id },
        data: baseUpdate,
      });
    });

    return this.findOne(actor, result.id);
  }

  async approve(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const supplierReturn = await this.getReturnOrThrow(actor.organizationId, id);
    if (supplierReturn.status === 'posted' || supplierReturn.status === 'approved') {
      throw new ConflictException('Supplier return already approved or posted');
    }
    if (supplierReturn.status === 'cancelled') {
      throw new BadRequestException('Cancelled supplier return cannot be approved');
    }

    const updated = await this.prisma.supplierReturn.update({
      where: { id },
      data: { status: 'approved' },
    });

    return {
      success: true,
      message: 'Supplier return approved successfully',
      data: updated,
    };
  }

  async post(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const supplierReturn = await this.getReturnOrThrow(actor.organizationId, id);
    if (supplierReturn.status === 'posted') {
      throw new ConflictException('Supplier return already posted');
    }
    if (supplierReturn.status === 'cancelled') {
      throw new BadRequestException('Cancelled supplier return cannot be posted');
    }

    const items = await this.prisma.supplierReturnItem.findMany({
      where: { organizationId: actor.organizationId, supplierReturnId: id },
      orderBy: { createdAt: 'asc' },
    });
    if (!items.length) {
      throw new BadRequestException('Supplier return has no items to post');
    }

    const debitNoteNo = supplierReturn.debitNoteNo ?? `SDN-${Date.now().toString().slice(-6)}`;

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const returnQty = this.toNumber(item.returnQty);
        if (returnQty <= 0) continue;

        if (item.inventoryBatchId) {
          const batch = await tx.inventoryBatch.findFirst({
            where: { organizationId: actor.organizationId, id: item.inventoryBatchId },
          });
          if (batch) {
            const currentAvailable = this.toNumber(batch.availableQty);
            if (currentAvailable < returnQty - 0.001) {
              throw new BadRequestException(`Batch available stock (${currentAvailable}) is less than return quantity (${returnQty})`);
            }
            await tx.inventoryBatch.update({
              where: { id: batch.id },
              data: {
                availableQty: this.roundQty(Math.max(currentAvailable - returnQty, 0)),
              },
            });

            await tx.stockMovement.create({
              data: {
                organizationId: actor.organizationId,
                movementNo: await this.generateMovementNo(tx, actor.organizationId),
                warehouseId: batch.warehouseId,
                variantId: item.variantId,
                inventoryBatchId: batch.id,
                movementType: 'return_out',
                referenceType: 'supplier_return',
                referenceId: id,
                qtyIn: 0,
                qtyOut: returnQty,
                unitCost: item.unitCost,
                movementAt: supplierReturn.returnDate,
                remarks: item.reason ?? supplierReturn.reason ?? 'Supplier return out',
              },
            });
          }
        }
      }

      await tx.supplierReturn.update({
        where: { id },
        data: {
          status: 'posted',
          debitNoteNo,
        },
      });
    });

    return this.findOne(actor, id);
  }

  async export(actor: AuthenticatedUser, id: string, format: string) {
    const returnResponse = await this.findOne(actor, id);
    return {
      success: true,
      message: 'Supplier return export payload generated successfully',
      data: {
        format,
        fileName: `${returnResponse.data.supplierReturnNo}.${format === 'xlsx' ? 'xlsx' : format === 'print' ? 'html' : 'pdf'}`,
        supplierReturn: returnResponse.data,
      },
    };
  }

  private async prepareItems(organizationId: string, items: SupplierReturnItemDto[]) {
    if (!items.length) {
      throw new BadRequestException('At least one return item is required');
    }

    const variantIds = [...new Set(items.map((i) => i.variantId))];
    const variants = await this.prisma.productVariant.findMany({
      where: { organizationId, id: { in: variantIds } },
      select: { id: true },
    });
    if (variants.length !== variantIds.length) {
      throw new BadRequestException('One or more return variants are invalid');
    }

    return items.map((item) => {
      if (item.returnQty <= 0) {
        throw new BadRequestException('Return quantity must be greater than zero');
      }
      return {
        inventoryBatchId: item.inventoryBatchId ?? null,
        variantId: item.variantId,
        returnQty: this.roundQty(item.returnQty),
        unitCost: this.roundMoney(item.unitCost),
        reason: item.reason ?? null,
      };
    });
  }

  private async enrichReturns(organizationId: string, returns: SupplierReturn[]) {
    const supplierIds = [...new Set(returns.map((ret) => ret.supplierId))];
    const grnIds = [...new Set(returns.map((ret) => ret.goodsReceiptId).filter((v): v is string => Boolean(v)))];

    const [suppliers, grns] = await Promise.all([
      supplierIds.length
        ? this.prisma.supplier.findMany({
            where: { organizationId, id: { in: supplierIds } },
            select: { id: true, supplierCode: true, name: true },
          })
        : [],
      grnIds.length
        ? this.prisma.goodsReceipt.findMany({
            where: { organizationId, id: { in: grnIds } },
            select: { id: true, grnNo: true, receiptDate: true, status: true },
          })
        : [],
    ]);

    const supplierMap = new Map<string, any>(suppliers.map((s): [string, any] => [s.id, s]));
    const grnMap = new Map<string, any>(grns.map((g): [string, any] => [g.id, g]));

    return returns.map((ret) => ({
      ...ret,
      supplier: supplierMap.get(ret.supplierId) ?? null,
      goodsReceipt: ret.goodsReceiptId ? grnMap.get(ret.goodsReceiptId) ?? null : null,
    }));
  }

  private async enrichItems(organizationId: string, items: SupplierReturnItem[]) {
    const variantIds = [...new Set(items.map((item) => item.variantId))];
    const batchIds = [...new Set(items.map((item) => item.inventoryBatchId).filter((v): v is string => Boolean(v)))];

    const [variants, batches] = await Promise.all([
      variantIds.length
        ? this.prisma.productVariant.findMany({
            where: { organizationId, id: { in: variantIds } },
            select: {
              id: true,
              sku: true,
              variantName: true,
              product: { select: { id: true, name: true } },
            },
          })
        : [],
      batchIds.length
        ? this.prisma.inventoryBatch.findMany({
            where: { organizationId, id: { in: batchIds } },
            select: { id: true, batchNo: true, availableQty: true },
          })
        : [],
    ]);

    const variantMap = new Map<string, any>(variants.map((v): [string, any] => [v.id, v]));
    const batchMap = new Map<string, any>(batches.map((b): [string, any] => [b.id, b]));

    return items.map((item) => ({
      ...item,
      returnQty: this.toNumber(item.returnQty),
      unitCost: this.toNumber(item.unitCost),
      lineTotal: this.roundMoney(this.toNumber(item.returnQty) * this.toNumber(item.unitCost)),
      variant: variantMap.has(item.variantId)
        ? {
            id: variantMap.get(item.variantId)?.id,
            sku: variantMap.get(item.variantId)?.sku,
            variantName: variantMap.get(item.variantId)?.variantName ?? null,
            productId: variantMap.get(item.variantId)?.product.id,
            productName: variantMap.get(item.variantId)?.product.name,
          }
        : null,
      batch: item.inventoryBatchId ? batchMap.get(item.inventoryBatchId) ?? null : null,
    }));
  }

  private async getReturnOrThrow(organizationId: string, id: string) {
    const ret = await this.prisma.supplierReturn.findFirst({
      where: { organizationId, id },
    });
    if (!ret) throw new NotFoundException('Supplier return not found');
    return ret;
  }

  private async getSupplierOrThrow(organizationId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { organizationId, id: supplierId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  private async generateMovementNo(tx: Prisma.TransactionClient, organizationId: string) {
    const count = await tx.stockMovement.count({ where: { organizationId } });
    return `SM-${Date.now()}-${count + 1}`;
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      throw new ForbiddenException('Retailer users cannot access supplier returns');
    }
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private roundMoney(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  private roundQty(val: number): number {
    return Math.round((val + Number.EPSILON) * 1000) / 1000;
  }
}
