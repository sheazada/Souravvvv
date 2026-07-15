import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GoodsReceipt, GoodsReceiptItem, InventoryBatch, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateGoodsReceiptDto,
  QueryGoodsReceiptsDto,
  UpdateGoodsReceiptDto,
} from './dto';

type PreparedGrnItem = {
  purchaseOrderItemId?: string | null;
  variantId: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  excessQty: number;
  shortQty: number;
  batchNo?: string | null;
  manufacturingDate?: Date | null;
  expiryDate?: Date | null;
  unitCost: number;
  remarks?: string | null;
};

@Injectable()
export class GoodsReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateGoodsReceiptDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const supplier = await this.getSupplierOrThrow(actor.organizationId, dto.supplierId);
    const warehouse = await this.getWarehouseOrThrow(actor.organizationId, dto.warehouseId);
    const purchaseOrder = dto.purchaseOrderId
      ? await this.getPurchaseOrderOrThrow(actor.organizationId, dto.purchaseOrderId)
      : null;

    if (purchaseOrder && purchaseOrder.supplierId !== supplier.id) {
      throw new BadRequestException('PO supplier does not match GRN supplier');
    }

    const preparedItems = await this.prepareGrnItems(
      actor.organizationId,
      dto.items,
      purchaseOrder?.id ?? null,
    );
    const grnNo = await this.generateGrnNo(actor.organizationId);

    const receipt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.goodsReceipt.create({
        data: {
          organizationId: actor.organizationId,
          grnNo,
          supplierId: supplier.id,
          purchaseOrderId: purchaseOrder?.id ?? null,
          warehouseId: warehouse.id,
          receiptDate: new Date(dto.receiptDate),
          supplierChallanNo: dto.supplierChallanNo,
          vehicleNo: dto.vehicleNo,
          status: 'draft',
          remarks: dto.remarks,
          receivedByEmployeeId: dto.receivedByEmployeeId,
        },
      });

      await tx.goodsReceiptItem.createMany({
        data: preparedItems.map((item) => ({
          organizationId: actor.organizationId,
          goodsReceiptId: created.id,
          purchaseOrderItemId: item.purchaseOrderItemId ?? null,
          variantId: item.variantId,
          orderedQty: item.orderedQty,
          receivedQty: item.receivedQty,
          acceptedQty: item.acceptedQty,
          rejectedQty: item.rejectedQty,
          excessQty: item.excessQty,
          shortQty: item.shortQty,
          batchNo: item.batchNo ?? null,
          manufacturingDate: item.manufacturingDate ?? null,
          expiryDate: item.expiryDate ?? null,
          unitCost: item.unitCost,
          remarks: item.remarks ?? null,
        })),
      });

      return created;
    });

    return this.findOne(actor, receipt.id);
  }

  async findAll(actor: AuthenticatedUser, query: QueryGoodsReceiptsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.GoodsReceiptWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.purchaseOrderId) where.purchaseOrderId = query.purchaseOrderId;
    if (query.status) where.status = query.status;
    if (query.fromDate || query.toDate) {
      where.receiptDate = {};
      if (query.fromDate) where.receiptDate.gte = new Date(query.fromDate);
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.receiptDate.lte = end;
      }
    }
    if (query.search) {
      where.OR = [
        { grnNo: { contains: query.search, mode: 'insensitive' } },
        { supplierChallanNo: { contains: query.search, mode: 'insensitive' } },
        { vehicleNo: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where,
        orderBy: { receiptDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);

    const supplierIds = [...new Set(rows.map((row) => row.supplierId))];
    const purchaseOrderIds = [
      ...new Set(rows.map((row) => row.purchaseOrderId).filter((v): v is string => Boolean(v))),
    ];
    const warehouseIds = [...new Set(rows.map((row) => row.warehouseId))];

    const [suppliers, purchaseOrders, warehouses] = await Promise.all([
      supplierIds.length
        ? this.prisma.supplier.findMany({
            where: { organizationId: actor.organizationId, id: { in: supplierIds } },
            select: { id: true, supplierCode: true, name: true },
          })
        : [],
      purchaseOrderIds.length
        ? this.prisma.purchaseOrder.findMany({
            where: { organizationId: actor.organizationId, id: { in: purchaseOrderIds } },
            select: { id: true, poNo: true, status: true },
          })
        : [],
      warehouseIds.length
        ? this.prisma.warehouse.findMany({
            where: { organizationId: actor.organizationId, id: { in: warehouseIds } },
            select: { id: true, code: true, name: true },
          })
        : [],
    ]);

    const supplierMap = new Map<string, any>(suppliers.map((row): [string, any] => [row.id, row]));
    const poMap = new Map<string, any>(purchaseOrders.map((row): [string, any] => [row.id, row]));
    const warehouseMap = new Map<string, any>(warehouses.map((row): [string, any] => [row.id, row]));

    return {
      success: true,
      message: 'Goods receipts fetched successfully',
      data: rows.map((row) => ({
        ...row,
        supplier: supplierMap.get(row.supplierId) ?? null,
        purchaseOrder: row.purchaseOrderId ? poMap.get(row.purchaseOrderId) ?? null : null,
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

  async findOne(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const receipt = await this.getReceiptOrThrow(actor.organizationId, id);
    const [items, supplier, warehouse, purchaseOrder] = await Promise.all([
      this.prisma.goodsReceiptItem.findMany({
        where: { organizationId: actor.organizationId, goodsReceiptId: id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.supplier.findFirst({
        where: { organizationId: actor.organizationId, id: receipt.supplierId },
        select: {
          id: true,
          supplierCode: true,
          name: true,
          contactPerson: true,
          mobile: true,
        },
      }),
      this.prisma.warehouse.findFirst({
        where: { organizationId: actor.organizationId, id: receipt.warehouseId },
        select: { id: true, code: true, name: true, warehouseType: true },
      }),
      receipt.purchaseOrderId
        ? this.prisma.purchaseOrder.findFirst({
            where: { organizationId: actor.organizationId, id: receipt.purchaseOrderId },
            select: { id: true, poNo: true, status: true },
          })
        : null,
    ]);

    return {
      success: true,
      message: 'Goods receipt fetched successfully',
      data: {
        ...receipt,
        supplier,
        warehouse,
        purchaseOrder,
        items: await this.enrichReceiptItems(actor.organizationId, items),
      },
    };
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateGoodsReceiptDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const receipt = await this.getReceiptOrThrow(actor.organizationId, id);
    this.assertReceiptMutable(receipt.status);

    const supplier = await this.getSupplierOrThrow(
      actor.organizationId,
      dto.supplierId ?? receipt.supplierId,
    );
    const warehouse = await this.getWarehouseOrThrow(
      actor.organizationId,
      dto.warehouseId ?? receipt.warehouseId,
    );
    const purchaseOrder =
      dto.purchaseOrderId !== undefined
        ? dto.purchaseOrderId
          ? await this.getPurchaseOrderOrThrow(actor.organizationId, dto.purchaseOrderId)
          : null
        : receipt.purchaseOrderId
          ? await this.getPurchaseOrderOrThrow(actor.organizationId, receipt.purchaseOrderId)
          : null;

    if (purchaseOrder && purchaseOrder.supplierId !== supplier.id) {
      throw new BadRequestException('PO supplier does not match GRN supplier');
    }

    const baseUpdate: Prisma.GoodsReceiptUpdateInput = {
      supplierId: supplier.id,
      purchaseOrderId: purchaseOrder?.id ?? null,
      warehouseId: warehouse.id,
      receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : receipt.receiptDate,
      supplierChallanNo:
        dto.supplierChallanNo !== undefined ? dto.supplierChallanNo : receipt.supplierChallanNo,
      vehicleNo: dto.vehicleNo !== undefined ? dto.vehicleNo : receipt.vehicleNo,
      remarks: dto.remarks !== undefined ? dto.remarks : receipt.remarks,
      receivedByEmployeeId:
        dto.receivedByEmployeeId !== undefined
          ? dto.receivedByEmployeeId
          : receipt.receivedByEmployeeId,
    };

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.items?.length) {
        const preparedItems = await this.prepareGrnItems(
          actor.organizationId,
          dto.items,
          purchaseOrder?.id ?? null,
        );

        await tx.goodsReceiptItem.deleteMany({ where: { goodsReceiptId: id } });
        await tx.goodsReceiptItem.createMany({
          data: preparedItems.map((item) => ({
            organizationId: actor.organizationId,
            goodsReceiptId: id,
            purchaseOrderItemId: item.purchaseOrderItemId ?? null,
            variantId: item.variantId,
            orderedQty: item.orderedQty,
            receivedQty: item.receivedQty,
            acceptedQty: item.acceptedQty,
            rejectedQty: item.rejectedQty,
            excessQty: item.excessQty,
            shortQty: item.shortQty,
            batchNo: item.batchNo ?? null,
            manufacturingDate: item.manufacturingDate ?? null,
            expiryDate: item.expiryDate ?? null,
            unitCost: item.unitCost,
            remarks: item.remarks ?? null,
          })),
        });
      }

      return tx.goodsReceipt.update({
        where: { id },
        data: baseUpdate,
      });
    });

    return this.findOne(actor, result.id);
  }

  async approve(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const receipt = await this.getReceiptOrThrow(actor.organizationId, id);
    if (receipt.status === 'posted') {
      throw new ConflictException('Posted GRN cannot be approved again');
    }
    if (receipt.status === 'cancelled') {
      throw new BadRequestException('Cancelled GRN cannot be approved');
    }

    const updated = await this.prisma.goodsReceipt.update({
      where: { id },
      data: {
        status: 'approved',
        approvedByUserId: actor.id,
        approvedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Goods receipt approved successfully',
      data: updated,
    };
  }

  async post(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const receipt = await this.getReceiptOrThrow(actor.organizationId, id);
    if (receipt.status === 'posted') {
      throw new ConflictException('Goods receipt already posted');
    }
    if (receipt.status !== 'approved') {
      throw new BadRequestException('Goods receipt must be approved before posting');
    }

    const items = await this.prisma.goodsReceiptItem.findMany({
      where: { organizationId: actor.organizationId, goodsReceiptId: id },
      orderBy: { createdAt: 'asc' },
    });
    if (!items.length) {
      throw new BadRequestException('GRN has no items to post');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const acceptedQty = this.toNumber(item.acceptedQty);
        if (acceptedQty <= 0) continue;

        let batch = await this.findMatchingBatch(
          tx,
          actor.organizationId,
          receipt.warehouseId,
          item,
        );

        if (batch) {
          batch = await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: {
              receivedQty: this.roundQty(this.toNumber(batch.receivedQty) + acceptedQty),
              availableQty: this.roundQty(this.toNumber(batch.availableQty) + acceptedQty),
              manufacturingDate: item.manufacturingDate ?? batch.manufacturingDate,
              expiryDate: item.expiryDate ?? batch.expiryDate,
              status: 'active',
            },
          });
        } else {
          batch = await tx.inventoryBatch.create({
            data: {
              organizationId: actor.organizationId,
              variantId: item.variantId,
              warehouseId: receipt.warehouseId,
              goodsReceiptItemId: item.id,
              batchNo: item.batchNo ?? `GRN-${receipt.grnNo}`,
              manufacturingDate: item.manufacturingDate,
              expiryDate: item.expiryDate,
              receivedQty: acceptedQty,
              availableQty: acceptedQty,
              reservedQty: 0,
              damagedQty: 0,
              status: 'active',
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            organizationId: actor.organizationId,
            movementNo: await this.generateMovementNo(tx, actor.organizationId),
            warehouseId: receipt.warehouseId,
            variantId: item.variantId,
            inventoryBatchId: batch.id,
            movementType: 'grn_in',
            referenceType: 'grn',
            referenceId: receipt.id,
            qtyIn: acceptedQty,
            qtyOut: 0,
            unitCost: item.unitCost,
            movementAt: receipt.receiptDate,
            remarks: item.remarks ?? receipt.remarks,
          },
        });
      }

      await tx.goodsReceipt.update({
        where: { id },
        data: { status: 'posted' },
      });
    });

    if (receipt.purchaseOrderId) {
      await this.syncPurchaseOrderReceiptStatus(actor.organizationId, receipt.purchaseOrderId);
    }

    return this.findOne(actor, id);
  }

  async getComparison(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getReceiptOrThrow(actor.organizationId, id);

    const items = await this.prisma.goodsReceiptItem.findMany({
      where: { organizationId: actor.organizationId, goodsReceiptId: id },
      orderBy: { createdAt: 'asc' },
    });
    const enriched = await this.enrichReceiptItems(actor.organizationId, items);

    const totals = items.reduce(
      (acc, item) => {
        acc.orderedQty = this.roundQty(acc.orderedQty + this.toNumber(item.orderedQty));
        acc.receivedQty = this.roundQty(acc.receivedQty + this.toNumber(item.receivedQty));
        acc.acceptedQty = this.roundQty(acc.acceptedQty + this.toNumber(item.acceptedQty));
        acc.rejectedQty = this.roundQty(acc.rejectedQty + this.toNumber(item.rejectedQty));
        acc.shortQty = this.roundQty(acc.shortQty + this.toNumber(item.shortQty));
        acc.excessQty = this.roundQty(acc.excessQty + this.toNumber(item.excessQty));
        return acc;
      },
      {
        orderedQty: 0,
        receivedQty: 0,
        acceptedQty: 0,
        rejectedQty: 0,
        shortQty: 0,
        excessQty: 0,
      },
    );

    return {
      success: true,
      message: 'GRN comparison fetched successfully',
      data: { items: enriched, totals },
    };
  }

  async export(actor: AuthenticatedUser, id: string, format: string) {
    const receipt = await this.findOne(actor, id);
    return {
      success: true,
      message: 'Goods receipt export payload generated successfully',
      data: {
        format,
        fileName: `${receipt.data.grnNo}.${format === 'xlsx' ? 'xlsx' : format === 'print' ? 'html' : 'pdf'}`,
        goodsReceipt: receipt.data,
      },
    };
  }

  private async prepareGrnItems(
    organizationId: string,
    rawItems: CreateGoodsReceiptDto['items'],
    purchaseOrderId: string | null,
  ): Promise<PreparedGrnItem[]> {
    if (!rawItems.length) {
      throw new BadRequestException('At least one GRN item is required');
    }

    const poItems = purchaseOrderId
      ? await this.prisma.purchaseOrderItem.findMany({
          where: { organizationId, purchaseOrderId },
        })
      : [];
    const poItemMap = new Map(poItems.map((item) => [item.id, item]));
    const poVariantMap = new Map(poItems.map((item) => [item.variantId, item]));

    const variantIds = [...new Set(rawItems.map((item) => item.variantId))];
    const variants = await this.prisma.productVariant.findMany({
      where: { organizationId, id: { in: variantIds } },
      include: { product: true },
    });

    if (variants.length !== variantIds.length) {
      throw new BadRequestException('One or more GRN variants are invalid');
    }

    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

    return rawItems.map((item) => {
      const variant = variantMap.get(item.variantId);
      if (!variant) throw new BadRequestException('Variant not found for GRN item');

      const relatedPoItem = item.purchaseOrderItemId
        ? poItemMap.get(item.purchaseOrderItemId)
        : purchaseOrderId
          ? poVariantMap.get(item.variantId)
          : null;

      if (purchaseOrderId && !relatedPoItem) {
        throw new BadRequestException(`No matching PO item found for variant ${item.variantId}`);
      }

      if (item.receivedQty <= 0) {
        throw new BadRequestException('Received quantity must be greater than zero');
      }
      if (item.acceptedQty < 0 || item.rejectedQty < 0) {
        throw new BadRequestException('Accepted/rejected quantity cannot be negative');
      }

      const receivedQty = this.roundQty(item.receivedQty);
      const acceptedQty = this.roundQty(item.acceptedQty);
      const rejectedQty = this.roundQty(item.rejectedQty);

      if (this.roundQty(acceptedQty + rejectedQty) !== receivedQty) {
        throw new BadRequestException(
          'Accepted quantity plus rejected quantity must equal received quantity',
        );
      }

      if (variant.product.isBatchTracked && !item.batchNo) {
        throw new BadRequestException('Batch number is required for batch-tracked items');
      }
      if (variant.product.isExpiryTracked && !item.expiryDate) {
        throw new BadRequestException('Expiry date is required for expiry-tracked items');
      }

      const orderedQty = this.roundQty(
        relatedPoItem ? this.toNumber(relatedPoItem.orderedQty) : item.orderedQty,
      );
      const shortQty = this.roundQty(Math.max(orderedQty - receivedQty, 0));
      const excessQty = this.roundQty(Math.max(receivedQty - orderedQty, 0));

      return {
        purchaseOrderItemId: relatedPoItem?.id ?? item.purchaseOrderItemId ?? null,
        variantId: item.variantId,
        orderedQty,
        receivedQty,
        acceptedQty,
        rejectedQty,
        excessQty,
        shortQty,
        batchNo: item.batchNo ?? null,
        manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        unitCost: this.roundMoney(
          relatedPoItem ? this.toNumber(relatedPoItem.unitCost) : item.unitCost,
        ),
        remarks: item.remarks ?? null,
      };
    });
  }

  private async enrichReceiptItems(organizationId: string, items: GoodsReceiptItem[]) {
    const variantIds = [...new Set(items.map((item) => item.variantId))];
    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({
          where: { organizationId, id: { in: variantIds } },
          select: {
            id: true,
            sku: true,
            variantName: true,
            product: { select: { id: true, name: true } },
          },
        })
      : [];
    const variantMap = new Map(variants.map((row) => [row.id, row]));

    return items.map((item) => ({
      ...item,
      orderedQty: this.toNumber(item.orderedQty),
      receivedQty: this.toNumber(item.receivedQty),
      acceptedQty: this.toNumber(item.acceptedQty),
      rejectedQty: this.toNumber(item.rejectedQty),
      excessQty: this.toNumber(item.excessQty),
      shortQty: this.toNumber(item.shortQty),
      unitCost: this.toNumber(item.unitCost),
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

  private async syncPurchaseOrderReceiptStatus(organizationId: string, purchaseOrderId: string) {
    const poItems = await this.prisma.purchaseOrderItem.findMany({
      where: { organizationId, purchaseOrderId },
    });

    const receiptItems = await this.prisma.goodsReceiptItem.findMany({
      where: {
        organizationId,
        purchaseOrderItemId: { in: poItems.map((item) => item.id) },
        goodsReceipt: { is: { status: 'posted' } },
      },
      include: { goodsReceipt: true },
    });

    const acceptedByPoItem = new Map<string, number>();
    for (const item of receiptItems) {
      const key = item.purchaseOrderItemId;
      if (!key) continue;
      acceptedByPoItem.set(
        key,
        this.roundQty((acceptedByPoItem.get(key) ?? 0) + this.toNumber(item.acceptedQty)),
      );
    }

    const allReceived = poItems.every(
      (item) => (acceptedByPoItem.get(item.id) ?? 0) >= this.toNumber(item.orderedQty),
    );
    const anyReceived = [...acceptedByPoItem.values()].some((qty) => qty > 0);

    await this.prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: allReceived ? 'received' : anyReceived ? 'partial' : 'approved',
      },
    });
  }

  private async findMatchingBatch(
    tx: Prisma.TransactionClient,
    organizationId: string,
    warehouseId: string,
    item: GoodsReceiptItem,
  ): Promise<InventoryBatch | null> {
    return tx.inventoryBatch.findFirst({
      where: {
        organizationId,
        warehouseId,
        variantId: item.variantId,
        batchNo: item.batchNo ?? `GRN-${item.goodsReceiptId}`,
      },
    });
  }

  private async getReceiptOrThrow(organizationId: string, id: string): Promise<GoodsReceipt> {
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: { id, organizationId },
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found');
    return receipt;
  }

  private async getSupplierOrThrow(organizationId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, organizationId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  private async getWarehouseOrThrow(organizationId: string, id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id, organizationId } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  private async getPurchaseOrderOrThrow(organizationId: string, id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
    });
    if (!purchaseOrder) throw new NotFoundException('Purchase order not found');
    return purchaseOrder;
  }

  private assertReceiptMutable(status: string) {
    if (['approved', 'posted', 'cancelled'].includes(status)) {
      throw new ConflictException(`Goods receipt in status ${status} cannot be modified`);
    }
  }

  private async generateGrnNo(organizationId: string) {
    const total = await this.prisma.goodsReceipt.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `GRN-${datePart}-${String(total + 1).padStart(4, '0')}`;
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
      throw new ForbiddenException('Retailer users cannot access goods receipts');
    }
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }

  private roundQty(value: number) {
    return Number(value.toFixed(3));
  }
}
