import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DemandConsolidationItem, Prisma, PurchaseOrderItem } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePurchaseOrderDto,
  CreatePurchaseOrderFromDemandDto,
  QueryPurchaseOrdersDto,
  UpdatePurchaseOrderDemandExtrasDto,
  UpdatePurchaseOrderDto,
} from './dto';

type PreparedPurchaseOrderItem = {
  variantId: string;
  orderedQty: number;
  demandQty: number;
  extraQty: number;
  unitCost: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
};

type PreparedPurchaseOrderPayload = {
  items: PreparedPurchaseOrderItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
};

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreatePurchaseOrderDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const supplier = await this.getSupplierOrThrow(actor.organizationId, dto.supplierId);
    if (!supplier.isActive) {
      throw new ForbiddenException('Supplier is inactive');
    }

    if (dto.demandConsolidationId) {
      await this.getDemandConsolidationOrThrow(actor.organizationId, dto.demandConsolidationId);
    }

    const prepared = await this.prepareManualItems(actor.organizationId, dto.items);
    const poNo = await this.generatePoNo(actor.organizationId);

    const purchaseOrder = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          organizationId: actor.organizationId,
          poNo,
          supplierId: supplier.id,
          demandConsolidationId: dto.demandConsolidationId,
          poDate: new Date(dto.poDate),
          expectedReceiptDate: dto.expectedReceiptDate ? new Date(dto.expectedReceiptDate) : null,
          status: 'draft',
          subtotal: prepared.subtotal,
          taxTotal: prepared.taxTotal,
          grandTotal: prepared.grandTotal,
          remarks: dto.remarks,
        },
      });

      await tx.purchaseOrderItem.createMany({
        data: prepared.items.map((item) => ({
          organizationId: actor.organizationId,
          purchaseOrderId: created.id,
          variantId: item.variantId,
          orderedQty: item.orderedQty,
          demandQty: item.demandQty,
          extraQty: item.extraQty,
          unitCost: item.unitCost,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
        })),
      });

      return created;
    });

    return this.findOne(actor, purchaseOrder.id);
  }

  async createFromDemand(actor: AuthenticatedUser, dto: CreatePurchaseOrderFromDemandDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const supplier = await this.getSupplierOrThrow(actor.organizationId, dto.supplierId);
    if (!supplier.isActive) {
      throw new ForbiddenException('Supplier is inactive');
    }

    const consolidation = await this.getDemandConsolidationOrThrow(
      actor.organizationId,
      dto.demandConsolidationId,
    );

    if (!['reviewed', 'approved', 'po_generated'].includes(consolidation.status)) {
      throw new BadRequestException(
        'Demand consolidation must be reviewed or approved before PO generation',
      );
    }

    const existingPo = await this.prisma.purchaseOrder.findFirst({
      where: {
        organizationId: actor.organizationId,
        demandConsolidationId: consolidation.id,
        status: { not: 'cancelled' },
      },
      select: { id: true, poNo: true },
    });

    if (existingPo) {
      throw new ConflictException(
        `Purchase order ${existingPo.poNo} already exists for this demand consolidation`,
      );
    }

    const consolidationItems = await this.prisma.demandConsolidationItem.findMany({
      where: {
        organizationId: actor.organizationId,
        demandConsolidationId: consolidation.id,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!consolidationItems.length) {
      throw new BadRequestException('Demand consolidation has no items');
    }

    const prepared = await this.prepareDemandItems(
      actor.organizationId,
      consolidationItems,
      dto.items,
    );
    const poNo = await this.generatePoNo(actor.organizationId);

    const purchaseOrder = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          organizationId: actor.organizationId,
          poNo,
          supplierId: supplier.id,
          demandConsolidationId: consolidation.id,
          poDate: new Date(),
          expectedReceiptDate: consolidation.consolidationDate,
          status: 'draft',
          subtotal: prepared.subtotal,
          taxTotal: prepared.taxTotal,
          grandTotal: prepared.grandTotal,
          remarks:
            dto.remarks ??
            `Generated from demand consolidation ${consolidation.consolidationNo}`,
        },
      });

      await tx.purchaseOrderItem.createMany({
        data: prepared.items.map((item) => ({
          organizationId: actor.organizationId,
          purchaseOrderId: created.id,
          variantId: item.variantId,
          orderedQty: item.orderedQty,
          demandQty: item.demandQty,
          extraQty: item.extraQty,
          unitCost: item.unitCost,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
        })),
      });

      await tx.demandConsolidation.update({
        where: { id: consolidation.id },
        data: { status: 'po_generated' },
      });

      return created;
    });

    return this.findOne(actor, purchaseOrder.id);
  }

  async findAll(actor: AuthenticatedUser, query: QueryPurchaseOrdersDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.PurchaseOrderWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.status) where.status = query.status;

    if (query.extraQtyAuditState) {
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - 7);

      const auditWhere: Prisma.AuditLogWhereInput = {
        organizationId: actor.organizationId,
        entityType: 'purchase_order',
        action: 'update_demand_extras',
      };

      if (query.extraQtyAuditState === 'recently_changed') {
        auditWhere.createdAt = { gte: recentCutoff };
      }

      const auditRows = await this.prisma.auditLog.findMany({
        where: auditWhere,
        select: { entityId: true },
      });
      const auditedPurchaseOrderIds = [
        ...new Set(auditRows.map((row) => row.entityId).filter((value): value is string => Boolean(value))),
      ];

      if (query.extraQtyAuditState === 'recently_changed') {
        where.id = { in: auditedPurchaseOrderIds };
      } else if (query.extraQtyAuditState === 'never_changed' && auditedPurchaseOrderIds.length) {
        where.id = { notIn: auditedPurchaseOrderIds };
      }
    }

    if (query.fromDate || query.toDate) {
      where.poDate = {};
      if (query.fromDate) where.poDate.gte = new Date(query.fromDate);
      if (query.toDate) where.poDate.lte = new Date(query.toDate);
    }

    if (query.search) {
      where.OR = [
        { poNo: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        orderBy: { poDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    const supplierIds = [...new Set(rows.map((row) => row.supplierId))];
    const consolidationIds = [
      ...new Set(rows.map((row) => row.demandConsolidationId).filter((v): v is string => Boolean(v))),
    ];
    const purchaseOrderIds = rows.map((row) => row.id);

    const [suppliers, consolidations, auditLogs] = await Promise.all([
      supplierIds.length
        ? this.prisma.supplier.findMany({
            where: { organizationId: actor.organizationId, id: { in: supplierIds } },
            select: { id: true, supplierCode: true, name: true },
          })
        : [],
      consolidationIds.length
        ? this.prisma.demandConsolidation.findMany({
            where: { organizationId: actor.organizationId, id: { in: consolidationIds } },
            select: { id: true, consolidationNo: true, status: true },
          })
        : [],
      purchaseOrderIds.length
        ? this.prisma.auditLog.findMany({
            where: {
              organizationId: actor.organizationId,
              entityType: 'purchase_order',
              entityId: { in: purchaseOrderIds },
              action: 'update_demand_extras',
            },
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  userType: true,
                  mobile: true,
                },
              },
            },
          })
        : [],
    ]);

    const supplierMap = new Map<string, any>(suppliers.map((row): [string, any] => [row.id, row]));
    const consolidationMap = new Map<string, any>(consolidations.map((row): [string, any] => [row.id, row]));
    const latestAuditByPo = new Map<string, any>();
    for (const row of auditLogs) {
      if (!row.entityId || latestAuditByPo.has(row.entityId)) continue;
      latestAuditByPo.set(row.entityId, row);
    }

    return {
      success: true,
      message: 'Purchase orders fetched successfully',
      data: rows.map((row) => ({
        ...row,
        supplier: supplierMap.get(row.supplierId) ?? null,
        demandConsolidation: row.demandConsolidationId
          ? consolidationMap.get(row.demandConsolidationId) ?? null
          : null,
        latestDemandExtraAudit: latestAuditByPo.has(row.id)
          ? this.serializeDemandExtraAuditSummary(latestAuditByPo.get(row.id))
          : null,
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

    const purchaseOrder = await this.getPurchaseOrderOrThrow(actor.organizationId, id);
    const [items, supplier, demandConsolidation, receiptSummary, auditLogs] = await Promise.all([
      this.prisma.purchaseOrderItem.findMany({
        where: { organizationId: actor.organizationId, purchaseOrderId: id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.supplier.findFirst({
        where: { organizationId: actor.organizationId, id: purchaseOrder.supplierId },
        select: {
          id: true,
          supplierCode: true,
          name: true,
          contactPerson: true,
          mobile: true,
          paymentTermsDays: true,
          isActive: true,
        },
      }),
      purchaseOrder.demandConsolidationId
        ? this.prisma.demandConsolidation.findFirst({
            where: {
              organizationId: actor.organizationId,
              id: purchaseOrder.demandConsolidationId,
            },
            select: {
              id: true,
              consolidationNo: true,
              status: true,
              consolidationDate: true,
            },
          })
        : null,
      this.getReceiptSummary(actor.organizationId, id),
      this.prisma.auditLog.findMany({
        where: {
          organizationId: actor.organizationId,
          entityType: 'purchase_order',
          entityId: id,
          action: 'update_demand_extras',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              userType: true,
              mobile: true,
            },
          },
        },
      }),
    ]);

    const enrichedItems = await this.enrichPoItems(actor.organizationId, items);
    const variantMap = new Map(
      enrichedItems.map((item): [string, typeof enrichedItems[number]] => [item.variantId, item]),
    );

    return {
      success: true,
      message: 'Purchase order fetched successfully',
      data: {
        ...purchaseOrder,
        supplier,
        demandConsolidation,
        items: enrichedItems,
        receiptSummary,
        auditTrail: auditLogs.map((row) => this.serializeDemandExtraAudit(row, variantMap)),
      },
    };
  }

  async getItems(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getPurchaseOrderOrThrow(actor.organizationId, id);

    const items = await this.prisma.purchaseOrderItem.findMany({
      where: { organizationId: actor.organizationId, purchaseOrderId: id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      message: 'Purchase order items fetched successfully',
      data: await this.enrichPoItems(actor.organizationId, items),
    };
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdatePurchaseOrderDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const purchaseOrder = await this.getPurchaseOrderOrThrow(actor.organizationId, id);
    this.assertPoMutable(purchaseOrder.status);

    const supplier = await this.getSupplierOrThrow(
      actor.organizationId,
      dto.supplierId ?? purchaseOrder.supplierId,
    );

    const baseUpdate: Prisma.PurchaseOrderUpdateInput = {
      supplierId: supplier.id,
      poDate: dto.poDate ? new Date(dto.poDate) : purchaseOrder.poDate,
      expectedReceiptDate:
        dto.expectedReceiptDate !== undefined
          ? dto.expectedReceiptDate
            ? new Date(dto.expectedReceiptDate)
            : null
          : purchaseOrder.expectedReceiptDate,
      remarks: dto.remarks ?? purchaseOrder.remarks,
      demandConsolidationId:
        dto.demandConsolidationId !== undefined
          ? dto.demandConsolidationId
          : purchaseOrder.demandConsolidationId,
    };

    const result = await this.prisma.$transaction(async (tx) => {
      let prepared: PreparedPurchaseOrderPayload | null = null;

      if (dto.items?.length) {
        prepared = await this.prepareManualItems(actor.organizationId, dto.items);
        Object.assign(baseUpdate, {
          subtotal: prepared.subtotal,
          taxTotal: prepared.taxTotal,
          grandTotal: prepared.grandTotal,
        });
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: baseUpdate,
      });

      if (prepared) {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });

        await tx.purchaseOrderItem.createMany({
          data: prepared.items.map((item) => ({
            organizationId: actor.organizationId,
            purchaseOrderId: id,
            variantId: item.variantId,
            orderedQty: item.orderedQty,
            demandQty: item.demandQty,
            extraQty: item.extraQty,
            unitCost: item.unitCost,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            lineTotal: item.lineTotal,
          })),
        });
      }

      return updated;
    });

    return this.findOne(actor, result.id);
  }

  async updateDemandExtras(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdatePurchaseOrderDemandExtrasDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const purchaseOrder = await this.getPurchaseOrderOrThrow(actor.organizationId, id);
    if (!purchaseOrder.demandConsolidationId) {
      throw new BadRequestException('Only demand-generated purchase orders support extra procurement editing');
    }
    if (purchaseOrder.status !== 'draft') {
      throw new ConflictException('Only draft demand-generated purchase orders can update extra procurement quantities');
    }

    const existingItems = await this.prisma.purchaseOrderItem.findMany({
      where: { organizationId: actor.organizationId, purchaseOrderId: id },
      orderBy: { createdAt: 'asc' },
    });

    if (!existingItems.length) {
      throw new BadRequestException('Purchase order has no items to update');
    }

    const prepared = this.prepareDemandExtraUpdates(existingItems, dto.items);
    const changedItems = prepared.items
      .map((item) => {
        const existing = existingItems.find((row) => row.variantId === item.variantId);
        return {
          variantId: item.variantId,
          demandQty: item.demandQty,
          beforeExtraQty: this.roundQty(this.toNumber(existing?.extraQty)),
          afterExtraQty: item.extraQty,
          beforeOrderedQty: this.roundQty(this.toNumber(existing?.orderedQty)),
          afterOrderedQty: item.orderedQty,
        };
      })
      .filter((item) => Math.abs(item.beforeExtraQty - item.afterExtraQty) > 0.0001);

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          subtotal: prepared.subtotal,
          taxTotal: prepared.taxTotal,
          grandTotal: prepared.grandTotal,
        },
      });

      for (const item of prepared.items) {
        await tx.purchaseOrderItem.updateMany({
          where: {
            organizationId: actor.organizationId,
            purchaseOrderId: id,
            variantId: item.variantId,
          },
          data: {
            orderedQty: item.orderedQty,
            extraQty: item.extraQty,
            taxAmount: item.taxAmount,
            lineTotal: item.lineTotal,
          },
        });
      }

      if (changedItems.length) {
        await tx.auditLog.create({
          data: {
            organizationId: actor.organizationId,
            userId: actor.id,
            module: 'procurement',
            entityType: 'purchase_order',
            entityId: id,
            action: 'update_demand_extras',
            beforeJson: {
              items: changedItems.map((item) => ({
                variantId: item.variantId,
                demandQty: item.demandQty,
                extraQty: item.beforeExtraQty,
                orderedQty: item.beforeOrderedQty,
              })),
            } as Prisma.InputJsonValue,
            afterJson: {
              items: changedItems.map((item) => ({
                variantId: item.variantId,
                demandQty: item.demandQty,
                extraQty: item.afterExtraQty,
                orderedQty: item.afterOrderedQty,
              })),
            } as Prisma.InputJsonValue,
          },
        });
      }
    });

    return this.findOne(actor, id);
  }

  async approve(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const purchaseOrder = await this.getPurchaseOrderOrThrow(actor.organizationId, id);
    if (purchaseOrder.status === 'cancelled') {
      throw new BadRequestException('Cancelled PO cannot be approved');
    }
    if (['partial', 'received', 'closed'].includes(purchaseOrder.status)) {
      throw new BadRequestException('Received PO cannot be approved again');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'approved',
        approvedByUserId: actor.id,
        approvedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Purchase order approved successfully',
      data: updated,
    };
  }

  async cancel(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const purchaseOrder = await this.getPurchaseOrderOrThrow(actor.organizationId, id);
    this.assertPoMutable(purchaseOrder.status);

    const grnCount = await this.prisma.goodsReceipt.count({
      where: {
        organizationId: actor.organizationId,
        purchaseOrderId: id,
        status: { in: ['approved', 'posted'] },
      },
    });

    if (grnCount > 0) {
      throw new ConflictException('Cannot cancel PO after GRN approval/posting');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return {
      success: true,
      message: 'Purchase order cancelled successfully',
      data: updated,
    };
  }

  private async prepareManualItems(
    organizationId: string,
    rawItems: CreatePurchaseOrderDto['items'],
  ): Promise<PreparedPurchaseOrderPayload> {
    if (!rawItems.length) {
      throw new BadRequestException('At least one purchase order item is required');
    }

    const merged = new Map<string, { orderedQty: number; unitCost: number; taxRate: number }>();
    for (const item of rawItems) {
      if (item.orderedQty <= 0) {
        throw new BadRequestException('Ordered quantity must be greater than zero');
      }
      const existing = merged.get(item.variantId);
      if (existing) {
        existing.orderedQty += item.orderedQty;
        existing.unitCost = item.unitCost;
        existing.taxRate = item.taxRate;
      } else {
        merged.set(item.variantId, {
          orderedQty: item.orderedQty,
          unitCost: item.unitCost,
          taxRate: item.taxRate,
        });
      }
    }

    const variantIds = [...merged.keys()];
    const variants = await this.prisma.productVariant.findMany({
      where: {
        organizationId,
        id: { in: variantIds },
        status: 'active',
      },
      select: { id: true },
    });

    if (variants.length !== variantIds.length) {
      throw new BadRequestException('One or more purchase order variants are invalid');
    }

    let subtotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;
    const items: PreparedPurchaseOrderItem[] = [];

    for (const [variantId, item] of merged.entries()) {
      const lineBase = this.roundMoney(item.orderedQty * item.unitCost);
      const taxAmount = this.roundMoney((lineBase * item.taxRate) / 100);
      const lineTotal = this.roundMoney(lineBase + taxAmount);
      subtotal = this.roundMoney(subtotal + lineBase);
      taxTotal = this.roundMoney(taxTotal + taxAmount);
      grandTotal = this.roundMoney(grandTotal + lineTotal);
      items.push({
        variantId,
        orderedQty: this.roundQty(item.orderedQty),
        demandQty: 0,
        extraQty: 0,
        unitCost: this.roundMoney(item.unitCost),
        taxRate: this.roundMoney(item.taxRate),
        taxAmount,
        lineTotal,
      });
    }

    return { items, subtotal, taxTotal, grandTotal };
  }

  private async prepareDemandItems(
    organizationId: string,
    items: DemandConsolidationItem[],
    extraItems?: Array<{ variantId: string; extraQty?: number }>,
  ): Promise<PreparedPurchaseOrderPayload> {
    const variantIds = [...new Set(items.map((item) => item.variantId))];
    const extraMap = new Map<string, number>();

    for (const item of extraItems ?? []) {
      const extraQty = this.roundQty(this.toNumber(item.extraQty));
      if (extraQty < 0) {
        throw new BadRequestException('Extra procurement quantity cannot be negative');
      }
      extraMap.set(item.variantId, this.roundQty((extraMap.get(item.variantId) ?? 0) + extraQty));
    }

    for (const extraVariantId of extraMap.keys()) {
      if (!variantIds.includes(extraVariantId)) {
        throw new BadRequestException('Extra procurement item must belong to the demand consolidation');
      }
    }

    const variants = await this.prisma.productVariant.findMany({
      where: { organizationId, id: { in: variantIds } },
      include: { product: true },
    });

    const taxCodeIds = [
      ...new Set(
        variants
          .map((variant) => variant.product.taxCodeId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const taxCodes = taxCodeIds.length
      ? await this.prisma.taxCode.findMany({
          where: { organizationId, id: { in: taxCodeIds } },
        })
      : [];
    const taxCodeMap = new Map<string, any>(taxCodes.map((row): [string, any] => [row.id, row]));
    const variantMap = new Map<string, any>(variants.map((variant): [string, any] => [variant.id, variant]));

    let subtotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;
    const prepared: PreparedPurchaseOrderItem[] = [];

    for (const item of items) {
      const variant = variantMap.get(item.variantId);
      if (!variant) {
        throw new BadRequestException('Demand consolidation contains invalid variant');
      }

      const demandQty = this.roundQty(this.toNumber(item.finalProcurementQty));
      const extraQty = this.roundQty(extraMap.get(item.variantId) ?? 0);
      const orderedQty = this.roundQty(demandQty + extraQty);
      if (orderedQty <= 0) continue;

      const unitCost = this.roundMoney(this.toNumber(variant.distributorPrice));
      const taxRate = this.roundMoney(
        this.toNumber(
          variant.product.taxCodeId
            ? taxCodeMap.get(variant.product.taxCodeId)?.gstRate
            : 0,
        ),
      );
      const lineBase = this.roundMoney(orderedQty * unitCost);
      const lineTax = this.roundMoney((lineBase * taxRate) / 100);
      const lineTotal = this.roundMoney(lineBase + lineTax);
      subtotal = this.roundMoney(subtotal + lineBase);
      taxTotal = this.roundMoney(taxTotal + lineTax);
      grandTotal = this.roundMoney(grandTotal + lineTotal);

      prepared.push({
        variantId: item.variantId,
        orderedQty,
        demandQty,
        extraQty,
        unitCost,
        taxRate,
        taxAmount: lineTax,
        lineTotal,
      });
    }

    if (!prepared.length) {
      throw new BadRequestException('No final procurement or extra quantity available for PO generation');
    }

    return { items: prepared, subtotal, taxTotal, grandTotal };
  }

  private async enrichPoItems(organizationId: string, items: PurchaseOrderItem[]) {
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
    const variantMap = new Map<string, any>(variants.map((row): [string, any] => [row.id, row]));

    return items.map((item) => ({
      ...item,
      orderedQty: this.toNumber(item.orderedQty),
      demandQty: this.toNumber((item as PurchaseOrderItem & { demandQty?: Prisma.Decimal | number | string | null }).demandQty),
      extraQty: this.toNumber((item as PurchaseOrderItem & { extraQty?: Prisma.Decimal | number | string | null }).extraQty),
      unitCost: this.toNumber(item.unitCost),
      taxRate: this.toNumber(item.taxRate),
      taxAmount: this.toNumber(item.taxAmount),
      lineTotal: this.toNumber(item.lineTotal),
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

  private prepareDemandExtraUpdates(
    items: PurchaseOrderItem[],
    rawUpdates: UpdatePurchaseOrderDemandExtrasDto['items'],
  ): PreparedPurchaseOrderPayload {
    const variantIds = new Set(items.map((item) => item.variantId));
    const extraMap = new Map<string, number>();

    for (const item of rawUpdates) {
      if (!variantIds.has(item.variantId)) {
        throw new BadRequestException('Extra procurement item must belong to the purchase order');
      }

      const extraQty = this.roundQty(this.toNumber(item.extraQty));
      if (extraQty < 0) {
        throw new BadRequestException('Extra procurement quantity cannot be negative');
      }

      extraMap.set(item.variantId, extraQty);
    }

    let subtotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;
    const prepared: PreparedPurchaseOrderItem[] = [];

    for (const item of items) {
      const demandQty = this.roundQty(
        this.toNumber((item as PurchaseOrderItem & { demandQty?: Prisma.Decimal | number | string | null }).demandQty),
      );
      const currentExtraQty = this.roundQty(
        this.toNumber((item as PurchaseOrderItem & { extraQty?: Prisma.Decimal | number | string | null }).extraQty),
      );
      const extraQty = extraMap.has(item.variantId) ? this.roundQty(extraMap.get(item.variantId) ?? 0) : currentExtraQty;
      const orderedQty = this.roundQty(demandQty + extraQty);
      const unitCost = this.roundMoney(this.toNumber(item.unitCost));
      const taxRate = this.roundMoney(this.toNumber(item.taxRate));
      const lineBase = this.roundMoney(orderedQty * unitCost);
      const taxAmount = this.roundMoney((lineBase * taxRate) / 100);
      const lineTotal = this.roundMoney(lineBase + taxAmount);

      subtotal = this.roundMoney(subtotal + lineBase);
      taxTotal = this.roundMoney(taxTotal + taxAmount);
      grandTotal = this.roundMoney(grandTotal + lineTotal);

      prepared.push({
        variantId: item.variantId,
        orderedQty,
        demandQty,
        extraQty,
        unitCost,
        taxRate,
        taxAmount,
        lineTotal,
      });
    }

    return { items: prepared, subtotal, taxTotal, grandTotal };
  }

  private serializeDemandExtraAuditSummary(row: any) {
    const beforeItems = this.getAuditItems((row?.beforeJson as { items?: unknown } | null | undefined)?.items);
    const afterItems = this.getAuditItems((row?.afterJson as { items?: unknown } | null | undefined)?.items);

    return {
      id: row.id,
      action: row.action,
      changedAt: row.createdAt,
      changedBy: row.user
        ? {
            id: row.user.id,
            fullName: row.user.fullName,
            userType: row.user.userType,
            mobile: row.user.mobile,
          }
        : null,
      changedItemCount: afterItems.length,
      totalExtraQtyBefore: this.roundQty(beforeItems.reduce((sum, item) => sum + item.extraQty, 0)),
      totalExtraQtyAfter: this.roundQty(afterItems.reduce((sum, item) => sum + item.extraQty, 0)),
      totalOrderedQtyBefore: this.roundQty(beforeItems.reduce((sum, item) => sum + item.orderedQty, 0)),
      totalOrderedQtyAfter: this.roundQty(afterItems.reduce((sum, item) => sum + item.orderedQty, 0)),
    };
  }

  private serializeDemandExtraAudit(
    row: any,
    variantMap: Map<string, any>,
  ) {
    const beforeItems = this.getAuditItems((row?.beforeJson as { items?: unknown } | null | undefined)?.items);
    const afterItems = this.getAuditItems((row?.afterJson as { items?: unknown } | null | undefined)?.items);
    const beforeMap = new Map(beforeItems.map((item): [string, any] => [item.variantId, item]));

    return {
      id: row.id,
      action: row.action,
      changedAt: row.createdAt,
      changedBy: row.user
        ? {
            id: row.user.id,
            fullName: row.user.fullName,
            userType: row.user.userType,
            mobile: row.user.mobile,
          }
        : null,
      items: afterItems.map((item) => ({
        variantId: item.variantId,
        demandQty: item.demandQty,
        beforeExtraQty: this.roundQty(this.toNumber(beforeMap.get(item.variantId)?.extraQty)),
        afterExtraQty: this.roundQty(this.toNumber(item.extraQty)),
        beforeOrderedQty: this.roundQty(this.toNumber(beforeMap.get(item.variantId)?.orderedQty)),
        afterOrderedQty: this.roundQty(this.toNumber(item.orderedQty)),
        variant: variantMap.has(item.variantId)
          ? {
              id: variantMap.get(item.variantId)?.variant?.id ?? null,
              sku: variantMap.get(item.variantId)?.variant?.sku ?? null,
              variantName: variantMap.get(item.variantId)?.variant?.variantName ?? null,
              productId: variantMap.get(item.variantId)?.variant?.productId ?? null,
              productName: variantMap.get(item.variantId)?.variant?.productName ?? null,
            }
          : null,
      })),
    };
  }

  private getAuditItems(value: unknown) {
    if (!Array.isArray(value)) {
      return [] as Array<{ variantId: string; demandQty: number; extraQty: number; orderedQty: number }>;
    }

    return value
      .map((item) => {
        const row = item as Record<string, unknown>;
        if (typeof row.variantId !== 'string') {
          return null;
        }
        return {
          variantId: row.variantId,
          demandQty: this.roundQty(this.toNumber(row.demandQty as number | string | null | undefined)),
          extraQty: this.roundQty(this.toNumber(row.extraQty as number | string | null | undefined)),
          orderedQty: this.roundQty(this.toNumber(row.orderedQty as number | string | null | undefined)),
        };
      })
      .filter((item): item is { variantId: string; demandQty: number; extraQty: number; orderedQty: number } => Boolean(item));
  }

  private async getReceiptSummary(organizationId: string, purchaseOrderId: string) {
    const receiptIds = await this.prisma.goodsReceipt.findMany({
      where: { organizationId, purchaseOrderId },
      select: { id: true, status: true },
    });

    if (!receiptIds.length) {
      return {
        receiptCount: 0,
        postedReceiptCount: 0,
        totalReceivedQty: 0,
        totalAcceptedQty: 0,
        totalRejectedQty: 0,
      };
    }

    const receiptItems = await this.prisma.goodsReceiptItem.findMany({
      where: {
        organizationId,
        goodsReceiptId: { in: receiptIds.map((row) => row.id) },
      },
    });

    return {
      receiptCount: receiptIds.length,
      postedReceiptCount: receiptIds.filter((row) => row.status === 'posted').length,
      totalReceivedQty: this.roundQty(
        receiptItems.reduce((sum, item) => sum + this.toNumber(item.receivedQty), 0),
      ),
      totalAcceptedQty: this.roundQty(
        receiptItems.reduce((sum, item) => sum + this.toNumber(item.acceptedQty), 0),
      ),
      totalRejectedQty: this.roundQty(
        receiptItems.reduce((sum, item) => sum + this.toNumber(item.rejectedQty), 0),
      ),
    };
  }

  private async getPurchaseOrderOrThrow(organizationId: string, id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
    });
    if (!purchaseOrder) throw new NotFoundException('Purchase order not found');
    return purchaseOrder;
  }

  private async getSupplierOrThrow(organizationId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  private async getDemandConsolidationOrThrow(organizationId: string, id: string) {
    const consolidation = await this.prisma.demandConsolidation.findFirst({
      where: { id, organizationId },
    });
    if (!consolidation) throw new NotFoundException('Demand consolidation not found');
    return consolidation;
  }

  private assertPoMutable(status: string) {
    if (['partial', 'received', 'closed', 'cancelled'].includes(status)) {
      throw new ConflictException(`Purchase order in status ${status} cannot be modified`);
    }
  }

  private async generatePoNo(organizationId: string) {
    const total = await this.prisma.purchaseOrder.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PO-${datePart}-${String(total + 1).padStart(4, '0')}`;
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      throw new ForbiddenException('Retailer users cannot access purchase orders');
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
