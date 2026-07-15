import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  InventoryBatch,
  Prisma,
  StockAdjustment,
  StockAdjustmentItem,
  StockMovement,
} from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateStockAdjustmentDto,
  QueryInventoryBatchesDto,
  QueryStockAdjustmentsDto,
  QueryStockMovementsDto,
  QueryStockOnHandDto,
  UpdateStockAdjustmentDto,
} from './dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getStockOnHand(actor: AuthenticatedUser, query: QueryStockOnHandDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const batches = await this.fetchBatches(actor.organizationId, {
      warehouseId: query.warehouseId,
      variantId: query.variantId,
      categoryId: query.categoryId,
      nearExpiry: query.nearExpiry === 'true',
    });

    const aggregated = await this.aggregateStock(actor.organizationId, batches);
    const data = query.lowStock === 'true'
      ? aggregated.filter((row) => row.totalAvailableQty <= 10)
      : aggregated;

    return {
      success: true,
      message: 'Stock on hand fetched successfully',
      data,
      meta: { total: data.length },
    };
  }

  async getBatches(actor: AuthenticatedUser, query: QueryInventoryBatchesDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = await this.buildBatchWhere(actor.organizationId, query);

    const [rows, total] = await Promise.all([
      this.prisma.inventoryBatch.findMany({
        where,
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventoryBatch.count({ where }),
    ]);

    return {
      success: true,
      message: 'Inventory batches fetched successfully',
      data: await this.enrichBatches(actor.organizationId, rows),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBatch(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const batch = await this.getBatchOrThrow(actor.organizationId, id);
    const enriched = await this.enrichBatches(actor.organizationId, [batch]);

    return {
      success: true,
      message: 'Inventory batch fetched successfully',
      data: enriched[0],
    };
  }

  async getStockMovements(actor: AuthenticatedUser, query: QueryStockMovementsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.StockMovementWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.variantId) where.variantId = query.variantId;
    if (query.movementType) where.movementType = query.movementType;
    if (query.referenceType) where.referenceType = query.referenceType;
    if (query.fromDate || query.toDate) {
      where.movementAt = {};
      if (query.fromDate) where.movementAt.gte = new Date(query.fromDate);
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.movementAt.lte = end;
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { movementAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      success: true,
      message: 'Stock movements fetched successfully',
      data: await this.enrichStockMovements(actor.organizationId, rows),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStockMovement(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const movement = await this.prisma.stockMovement.findFirst({
      where: { organizationId: actor.organizationId, id },
    });
    if (!movement) {
      throw new NotFoundException('Stock movement not found');
    }

    const enriched = await this.enrichStockMovements(actor.organizationId, [movement]);
    return {
      success: true,
      message: 'Stock movement fetched successfully',
      data: enriched[0],
    };
  }

  async createStockAdjustment(actor: AuthenticatedUser, dto: CreateStockAdjustmentDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    await this.getWarehouseOrThrow(actor.organizationId, dto.warehouseId);
    const preparedItems = await this.prepareAdjustmentItems(
      actor.organizationId,
      dto.warehouseId,
      dto.items,
    );
    const adjustmentNo = await this.generateAdjustmentNo(actor.organizationId);

    const adjustment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.stockAdjustment.create({
        data: {
          organizationId: actor.organizationId,
          adjustmentNo,
          warehouseId: dto.warehouseId,
          adjustmentDate: new Date(dto.adjustmentDate),
          reason: dto.reason,
          status: 'draft',
          remarks: dto.remarks,
        },
      });

      await tx.stockAdjustmentItem.createMany({
        data: preparedItems.map((item) => ({
          organizationId: actor.organizationId,
          stockAdjustmentId: created.id,
          variantId: item.variantId,
          inventoryBatchId: item.inventoryBatchId,
          systemQty: item.systemQty,
          physicalQty: item.physicalQty,
          diffQty: item.diffQty,
          unitCost: item.unitCost,
          remarks: item.remarks,
        })),
      });

      return created;
    });

    return this.getStockAdjustment(actor, adjustment.id);
  }

  async getStockAdjustments(actor: AuthenticatedUser, query: QueryStockAdjustmentsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.StockAdjustmentWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.status) where.status = query.status;
    if (query.fromDate || query.toDate) {
      where.adjustmentDate = {};
      if (query.fromDate) where.adjustmentDate.gte = new Date(query.fromDate);
      if (query.toDate) where.adjustmentDate.lte = new Date(query.toDate);
    }
    if (query.search) {
      where.OR = [
        { adjustmentNo: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.stockAdjustment.findMany({
        where,
        orderBy: { adjustmentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockAdjustment.count({ where }),
    ]);

    const warehouseIds = [...new Set(rows.map((row) => row.warehouseId))];
    const warehouses = warehouseIds.length
      ? await this.prisma.warehouse.findMany({
          where: { organizationId: actor.organizationId, id: { in: warehouseIds } },
          select: { id: true, code: true, name: true },
        })
      : [];
    const warehouseMap = new Map<string, any>(warehouses.map((row): [string, any] => [row.id, row]));

    return {
      success: true,
      message: 'Stock adjustments fetched successfully',
      data: rows.map((row) => ({
        ...row,
        warehouse: warehouseMap.get(row.warehouseId) ?? null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStockAdjustment(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const adjustment = await this.getAdjustmentOrThrow(actor.organizationId, id);
    const [items, warehouse] = await Promise.all([
      this.prisma.stockAdjustmentItem.findMany({
        where: { organizationId: actor.organizationId, stockAdjustmentId: id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.warehouse.findFirst({
        where: { organizationId: actor.organizationId, id: adjustment.warehouseId },
        select: { id: true, code: true, name: true, warehouseType: true },
      }),
    ]);

    return {
      success: true,
      message: 'Stock adjustment fetched successfully',
      data: {
        ...adjustment,
        warehouse,
        items: await this.enrichAdjustmentItems(actor.organizationId, items),
      },
    };
  }

  async updateStockAdjustment(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateStockAdjustmentDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const adjustment = await this.getAdjustmentOrThrow(actor.organizationId, id);
    this.assertAdjustmentMutable(adjustment.status);

    const warehouseId = dto.warehouseId ?? adjustment.warehouseId;
    await this.getWarehouseOrThrow(actor.organizationId, warehouseId);

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.items?.length) {
        const preparedItems = await this.prepareAdjustmentItems(
          actor.organizationId,
          warehouseId,
          dto.items,
        );

        await tx.stockAdjustmentItem.deleteMany({ where: { stockAdjustmentId: id } });
        await tx.stockAdjustmentItem.createMany({
          data: preparedItems.map((item) => ({
            organizationId: actor.organizationId,
            stockAdjustmentId: id,
            variantId: item.variantId,
            inventoryBatchId: item.inventoryBatchId,
            systemQty: item.systemQty,
            physicalQty: item.physicalQty,
            diffQty: item.diffQty,
            unitCost: item.unitCost,
            remarks: item.remarks,
          })),
        });
      }

      return tx.stockAdjustment.update({
        where: { id },
        data: {
          warehouseId,
          adjustmentDate: dto.adjustmentDate
            ? new Date(dto.adjustmentDate)
            : adjustment.adjustmentDate,
          reason: dto.reason ?? adjustment.reason,
          remarks: dto.remarks ?? adjustment.remarks,
        },
      });
    });

    return this.getStockAdjustment(actor, result.id);
  }

  async approveStockAdjustment(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const adjustment = await this.getAdjustmentOrThrow(actor.organizationId, id);
    this.assertAdjustmentMutable(adjustment.status);

    const updated = await this.prisma.stockAdjustment.update({
      where: { id },
      data: {
        status: 'approved',
        approvedByUserId: actor.id,
      },
    });

    return {
      success: true,
      message: 'Stock adjustment approved successfully',
      data: updated,
    };
  }

  async postStockAdjustment(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const adjustment = await this.getAdjustmentOrThrow(actor.organizationId, id);
    if (adjustment.status === 'posted') {
      throw new ConflictException('Stock adjustment already posted');
    }
    if (adjustment.status !== 'approved') {
      throw new BadRequestException('Stock adjustment must be approved before posting');
    }

    const items = await this.prisma.stockAdjustmentItem.findMany({
      where: { organizationId: actor.organizationId, stockAdjustmentId: id },
      orderBy: { createdAt: 'asc' },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const diffQty = this.toNumber(item.diffQty);
        if (diffQty === 0) continue;

        if (diffQty > 0) {
          await this.applyPositiveAdjustment(tx, actor.organizationId, adjustment, item, diffQty);
        } else {
          await this.applyNegativeAdjustment(tx, actor.organizationId, adjustment, item, Math.abs(diffQty));
        }
      }

      await tx.stockAdjustment.update({
        where: { id },
        data: { status: 'posted' },
      });
    });

    return this.getStockAdjustment(actor, id);
  }

  async getLowStockAlerts(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const stock = await this.getStockOnHand(actor, {
      page: 1,
      limit: 1000,
      lowStock: 'true',
    });

    return {
      success: true,
      message: 'Low stock alerts fetched successfully',
      data: stock.data,
    };
  }

  async getExpiringProductAlerts(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const batches = await this.fetchBatches(actor.organizationId, { nearExpiry: true });
    return {
      success: true,
      message: 'Expiring product alerts fetched successfully',
      data: await this.enrichBatches(actor.organizationId, batches),
    };
  }

  private async applyPositiveAdjustment(
    tx: Prisma.TransactionClient,
    organizationId: string,
    adjustment: StockAdjustment,
    item: StockAdjustmentItem,
    qty: number,
  ) {
    let batch: InventoryBatch | null = null;

    if (item.inventoryBatchId) {
      batch = await tx.inventoryBatch.findFirst({
        where: { id: item.inventoryBatchId, organizationId },
      });
    }

    if (batch) {
      batch = await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: {
          receivedQty: this.roundQty(this.toNumber(batch.receivedQty) + qty),
          availableQty: this.roundQty(this.toNumber(batch.availableQty) + qty),
          status: 'active',
        },
      });
    } else {
      batch = await tx.inventoryBatch.create({
        data: {
          organizationId,
          variantId: item.variantId,
          warehouseId: adjustment.warehouseId,
          batchNo: `ADJ-${adjustment.adjustmentNo}-${item.id.slice(0, 6)}`,
          receivedQty: qty,
          availableQty: qty,
          reservedQty: 0,
          damagedQty: 0,
          status: 'active',
        },
      });
    }

    await tx.stockMovement.create({
      data: {
        organizationId,
        movementNo: await this.generateMovementNo(tx, organizationId),
        warehouseId: adjustment.warehouseId,
        variantId: item.variantId,
        inventoryBatchId: batch.id,
        movementType: 'adjustment_in',
        referenceType: 'adjustment',
        referenceId: adjustment.id,
        qtyIn: qty,
        qtyOut: 0,
        unitCost: item.unitCost,
        movementAt: new Date(adjustment.adjustmentDate),
        remarks: item.remarks ?? adjustment.remarks,
      },
    });
  }

  private async applyNegativeAdjustment(
    tx: Prisma.TransactionClient,
    organizationId: string,
    adjustment: StockAdjustment,
    item: StockAdjustmentItem,
    qty: number,
  ) {
    let remaining = qty;

    const batches = item.inventoryBatchId
      ? await tx.inventoryBatch.findMany({
          where: {
            organizationId,
            id: item.inventoryBatchId,
            availableQty: { gt: 0 },
          },
        })
      : await tx.inventoryBatch.findMany({
          where: {
            organizationId,
            warehouseId: adjustment.warehouseId,
            variantId: item.variantId,
            availableQty: { gt: 0 },
          },
          orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
        });

    const totalAvailable = batches.reduce(
      (sum, batch) => sum + this.toNumber(batch.availableQty),
      0,
    );

    if (totalAvailable < qty) {
      throw new BadRequestException('Not enough stock available for adjustment out');
    }

    for (const batch of batches) {
      if (remaining <= 0) break;
      const available = this.toNumber(batch.availableQty);
      const deduct = Math.min(available, remaining);
      remaining = this.roundQty(remaining - deduct);

      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: {
          availableQty: this.roundQty(available - deduct),
          status: available - deduct <= 0 ? 'consumed' : batch.status,
        },
      });

      await tx.stockMovement.create({
        data: {
          organizationId,
          movementNo: await this.generateMovementNo(tx, organizationId),
          warehouseId: adjustment.warehouseId,
          variantId: item.variantId,
          inventoryBatchId: batch.id,
          movementType: 'adjustment_out',
          referenceType: 'adjustment',
          referenceId: adjustment.id,
          qtyIn: 0,
          qtyOut: deduct,
          unitCost: item.unitCost,
          movementAt: new Date(adjustment.adjustmentDate),
          remarks: item.remarks ?? adjustment.remarks,
        },
      });
    }
  }

  private async prepareAdjustmentItems(
    organizationId: string,
    warehouseId: string,
    rawItems: CreateStockAdjustmentDto['items'],
  ) {
    const prepared: Array<{
      variantId: string;
      inventoryBatchId?: string | null;
      systemQty: number;
      physicalQty: number;
      diffQty: number;
      unitCost: number;
      remarks?: string;
    }> = [];

    for (const item of rawItems) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { organizationId, id: item.variantId },
      });
      if (!variant) {
        throw new NotFoundException('Variant not found for stock adjustment item');
      }

      const sourceBatch = item.inventoryBatchId
        ? await this.prisma.inventoryBatch.findFirst({
            where: {
              organizationId,
              id: item.inventoryBatchId,
              warehouseId,
              variantId: item.variantId,
            },
          })
        : null;

      const systemQty = sourceBatch
        ? this.toNumber(sourceBatch.availableQty)
        : await this.getVariantWarehouseAvailableQty(organizationId, warehouseId, item.variantId);
      const physicalQty = this.roundQty(item.physicalQty);
      const diffQty = this.roundQty(physicalQty - systemQty);
      const unitCost = 0;

      prepared.push({
        variantId: item.variantId,
        inventoryBatchId: sourceBatch?.id ?? item.inventoryBatchId ?? null,
        systemQty: this.roundQty(systemQty),
        physicalQty,
        diffQty,
        unitCost,
        remarks: item.remarks,
      });
    }

    return prepared;
  }

  private async fetchBatches(
    organizationId: string,
    query: {
      warehouseId?: string;
      variantId?: string;
      categoryId?: string;
      nearExpiry?: boolean;
    },
  ) {
    const where: Prisma.InventoryBatchWhereInput = { organizationId };
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.variantId) where.variantId = query.variantId;
    if (query.categoryId) {
      const variants = await this.prisma.productVariant.findMany({
        where: {
          organizationId,
          product: { is: { categoryId: query.categoryId } },
        },
        select: { id: true },
      });
      where.variantId = { in: variants.map((row) => row.id) };
    }
    if (query.nearExpiry) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + 3);
      where.expiryDate = { lte: limitDate };
      where.availableQty = { gt: 0 };
    }

    return this.prisma.inventoryBatch.findMany({
      where,
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  private async buildBatchWhere(
    organizationId: string,
    query: QueryInventoryBatchesDto,
  ): Promise<Prisma.InventoryBatchWhereInput> {
    const where: Prisma.InventoryBatchWhereInput = { organizationId };
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.variantId) where.variantId = query.variantId;
    if (query.batchNo) where.batchNo = { contains: query.batchNo, mode: 'insensitive' };
    if (query.status) where.status = query.status;
    if (query.nearExpiry === 'true') {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + 3);
      where.expiryDate = { lte: limitDate };
    }
    if (query.categoryId) {
      const variants = await this.prisma.productVariant.findMany({
        where: {
          organizationId,
          product: { is: { categoryId: query.categoryId } },
        },
        select: { id: true },
      });
      where.variantId = { in: variants.map((row) => row.id) };
    }
    if (query.search) {
      where.OR = [
        { batchNo: { contains: query.search, mode: 'insensitive' } },
        { status: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private async aggregateStock(organizationId: string, batches: InventoryBatch[]) {
    const variantIds = [...new Set(batches.map((batch) => batch.variantId))];
    const warehouseIds = [...new Set(batches.map((batch) => batch.warehouseId))];

    const [variants, warehouses] = await Promise.all([
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
      warehouseIds.length
        ? this.prisma.warehouse.findMany({
            where: { organizationId, id: { in: warehouseIds } },
            select: { id: true, code: true, name: true },
          })
        : [],
    ]);

    const variantMap = new Map<string, any>(variants.map((row): [string, any] => [row.id, row]));
    const warehouseMap = new Map<string, any>(warehouses.map((row): [string, any] => [row.id, row]));
    const groupMap = new Map<string, any>();

    for (const batch of batches) {
      const key = `${batch.warehouseId}:${batch.variantId}`;
      const current = groupMap.get(key) ?? {
        warehouseId: batch.warehouseId,
        variantId: batch.variantId,
        warehouse: warehouseMap.get(batch.warehouseId) ?? null,
        variant: variantMap.has(batch.variantId)
          ? {
              id: variantMap.get(batch.variantId)?.id,
              sku: variantMap.get(batch.variantId)?.sku,
              variantName: variantMap.get(batch.variantId)?.variantName ?? null,
              productId: variantMap.get(batch.variantId)?.product.id,
              productName: variantMap.get(batch.variantId)?.product.name,
            }
          : null,
        batchCount: 0,
        totalReceivedQty: 0,
        totalAvailableQty: 0,
        totalReservedQty: 0,
        totalDamagedQty: 0,
        nearestExpiryDate: null as Date | null,
      };

      current.batchCount += 1;
      current.totalReceivedQty = this.roundQty(current.totalReceivedQty + this.toNumber(batch.receivedQty));
      current.totalAvailableQty = this.roundQty(current.totalAvailableQty + this.toNumber(batch.availableQty));
      current.totalReservedQty = this.roundQty(current.totalReservedQty + this.toNumber(batch.reservedQty));
      current.totalDamagedQty = this.roundQty(current.totalDamagedQty + this.toNumber(batch.damagedQty));
      if (batch.expiryDate && (!current.nearestExpiryDate || batch.expiryDate < current.nearestExpiryDate)) {
        current.nearestExpiryDate = batch.expiryDate;
      }

      groupMap.set(key, current);
    }

    return [...groupMap.values()];
  }

  private async enrichBatches(organizationId: string, batches: InventoryBatch[]) {
    const variantIds = [...new Set(batches.map((batch) => batch.variantId))];
    const warehouseIds = [...new Set(batches.map((batch) => batch.warehouseId))];

    const [variants, warehouses] = await Promise.all([
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
      warehouseIds.length
        ? this.prisma.warehouse.findMany({
            where: { organizationId, id: { in: warehouseIds } },
            select: { id: true, code: true, name: true, warehouseType: true },
          })
        : [],
    ]);

    const variantMap = new Map<string, any>(variants.map((row): [string, any] => [row.id, row]));
    const warehouseMap = new Map<string, any>(warehouses.map((row): [string, any] => [row.id, row]));

    return batches.map((batch) => ({
      ...batch,
      receivedQty: this.toNumber(batch.receivedQty),
      availableQty: this.toNumber(batch.availableQty),
      reservedQty: this.toNumber(batch.reservedQty),
      damagedQty: this.toNumber(batch.damagedQty),
      warehouse: warehouseMap.get(batch.warehouseId) ?? null,
      variant: variantMap.has(batch.variantId)
        ? {
            id: variantMap.get(batch.variantId)?.id,
            sku: variantMap.get(batch.variantId)?.sku,
            variantName: variantMap.get(batch.variantId)?.variantName ?? null,
            productId: variantMap.get(batch.variantId)?.product.id,
            productName: variantMap.get(batch.variantId)?.product.name,
          }
        : null,
    }));
  }

  private async enrichStockMovements(organizationId: string, movements: StockMovement[]) {
    const variantIds = [...new Set(movements.map((movement) => movement.variantId))];
    const warehouseIds = [...new Set(movements.map((movement) => movement.warehouseId))];

    const [variants, warehouses] = await Promise.all([
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
      warehouseIds.length
        ? this.prisma.warehouse.findMany({
            where: { organizationId, id: { in: warehouseIds } },
            select: { id: true, code: true, name: true },
          })
        : [],
    ]);

    const variantMap = new Map<string, any>(variants.map((row): [string, any] => [row.id, row]));
    const warehouseMap = new Map<string, any>(warehouses.map((row): [string, any] => [row.id, row]));

    return movements.map((movement) => ({
      ...movement,
      qtyIn: this.toNumber(movement.qtyIn),
      qtyOut: this.toNumber(movement.qtyOut),
      unitCost: this.toNumber(movement.unitCost),
      warehouse: warehouseMap.get(movement.warehouseId) ?? null,
      variant: variantMap.has(movement.variantId)
        ? {
            id: variantMap.get(movement.variantId)?.id,
            sku: variantMap.get(movement.variantId)?.sku,
            variantName: variantMap.get(movement.variantId)?.variantName ?? null,
            productId: variantMap.get(movement.variantId)?.product.id,
            productName: variantMap.get(movement.variantId)?.product.name,
          }
        : null,
    }));
  }

  private async enrichAdjustmentItems(organizationId: string, items: StockAdjustmentItem[]) {
    const variantIds = [...new Set(items.map((item) => item.variantId))];
    const batchIds = [
      ...new Set(items.map((item) => item.inventoryBatchId).filter((v): v is string => Boolean(v))),
    ];

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
            select: { id: true, batchNo: true, expiryDate: true },
          })
        : [],
    ]);

    const variantMap = new Map<string, any>(variants.map((row): [string, any] => [row.id, row]));
    const batchMap = new Map<string, any>(batches.map((row): [string, any] => [row.id, row]));

    return items.map((item) => ({
      ...item,
      systemQty: this.toNumber(item.systemQty),
      physicalQty: this.toNumber(item.physicalQty),
      diffQty: this.toNumber(item.diffQty),
      unitCost: this.toNumber(item.unitCost),
      batch: item.inventoryBatchId ? batchMap.get(item.inventoryBatchId) ?? null : null,
      variant: variantMap.has(item.variantId)
        ? {
            id: variantMap.get(item.variantId)?.id,
            sku: variantMap.get(item.variantId)?.sku,
            variantName: variantMap.get(item.variantId)?.variantName ?? null,
            productId: variantMap.get(item.variantId)?.product.id,
            productName: variantMap.get(item.variantId)?.product.name,
          }
        : null,
    }));
  }

  private async getVariantWarehouseAvailableQty(
    organizationId: string,
    warehouseId: string,
    variantId: string,
  ) {
    const batches = await this.prisma.inventoryBatch.findMany({
      where: { organizationId, warehouseId, variantId },
      select: { availableQty: true },
    });
    return this.roundQty(
      batches.reduce((sum, batch) => sum + this.toNumber(batch.availableQty), 0),
    );
  }

  private async getBatchOrThrow(organizationId: string, id: string) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: { id, organizationId },
    });
    if (!batch) throw new NotFoundException('Inventory batch not found');
    return batch;
  }

  private async getWarehouseOrThrow(organizationId: string, id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id, organizationId } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  private async getAdjustmentOrThrow(organizationId: string, id: string) {
    const adjustment = await this.prisma.stockAdjustment.findFirst({
      where: { id, organizationId },
    });
    if (!adjustment) throw new NotFoundException('Stock adjustment not found');
    return adjustment;
  }

  private assertAdjustmentMutable(status: string) {
    if (['approved', 'posted'].includes(status)) {
      throw new ConflictException(`Stock adjustment in status ${status} cannot be modified`);
    }
  }

  private async generateAdjustmentNo(organizationId: string) {
    const total = await this.prisma.stockAdjustment.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `ADJ-${datePart}-${String(total + 1).padStart(4, '0')}`;
  }

  private async generateMovementNo(tx: Prisma.TransactionClient, organizationId: string) {
    const total = await tx.stockMovement.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `SM-${datePart}-${String(total + 1).padStart(4, '0')}`;
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      throw new ForbiddenException('Retailer users cannot access inventory');
    }
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private roundQty(value: number) {
    return Number(value.toFixed(3));
  }
}
