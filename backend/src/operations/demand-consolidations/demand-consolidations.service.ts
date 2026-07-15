import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DemandConsolidationItem, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDemandConsolidationDto,
  QueryDemandConsolidationsDto,
  UpdateDemandConsolidationDto,
  UpdateDemandConsolidationItemDto,
} from './dto';

type ConsolidationOrder = Prisma.SalesOrderGetPayload<{
  include: { items: true };
}>;

@Injectable()
export class DemandConsolidationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateDemandConsolidationDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const deliveryCycle = await this.getDeliveryCycleOrThrow(
      actor.organizationId,
      dto.deliveryCycleId,
    );

    const existing = await this.prisma.demandConsolidation.findFirst({
      where: {
        organizationId: actor.organizationId,
        deliveryCycleId: deliveryCycle.id,
      },
      select: { id: true, consolidationNo: true, status: true },
    });

    if (existing) {
      throw new ConflictException(
        `Demand consolidation already exists for this delivery cycle (${existing.consolidationNo})`,
      );
    }

    const orders = await this.getEligibleOrders(actor.organizationId, deliveryCycle.id, dto.includeStatuses);
    if (orders.length === 0) {
      throw new BadRequestException(
        'No eligible orders found for demand consolidation',
      );
    }

    const aggregatedItems = this.aggregateDemandItems(orders);
    if (aggregatedItems.length === 0) {
      throw new BadRequestException('No order items found to consolidate');
    }

    const consolidationNo = await this.generateConsolidationNo(actor.organizationId);

    const consolidation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.demandConsolidation.create({
        data: {
          organizationId: actor.organizationId,
          consolidationNo,
          deliveryCycleId: deliveryCycle.id,
          consolidationDate: new Date(),
          status: 'reviewed',
          notes: dto.notes,
          createdByUserId: actor.id,
        },
      });

      await tx.demandConsolidationItem.createMany({
        data: aggregatedItems.map((item) => ({
          organizationId: actor.organizationId,
          demandConsolidationId: created.id,
          variantId: item.variantId,
          totalOrderQty: item.totalOrderQty,
          totalApprovedQty: item.totalApprovedQty,
          bufferQty: item.bufferQty,
          finalProcurementQty: item.finalProcurementQty,
          remarks: item.remarks,
        })),
      });

      await tx.demandSourceOrder.createMany({
        data: orders.map((order) => ({
          demandConsolidationId: created.id,
          salesOrderId: order.id,
        })),
      });

      return created;
    });

    return this.findOne(actor, consolidation.id);
  }

  async findAll(actor: AuthenticatedUser, query: QueryDemandConsolidationsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.DemandConsolidationWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.deliveryCycleId) {
      where.deliveryCycleId = query.deliveryCycleId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.fromDate || query.toDate) {
      where.consolidationDate = {};
      if (query.fromDate) {
        where.consolidationDate.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.consolidationDate.lte = new Date(query.toDate);
      }
    }

    if (query.search) {
      where.OR = [
        { consolidationNo: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.demandConsolidation.findMany({
        where,
        orderBy: { consolidationDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.demandConsolidation.count({ where }),
    ]);

    const deliveryCycleIds = [...new Set(rows.map((row) => row.deliveryCycleId))];
    const cycles = deliveryCycleIds.length
      ? await this.prisma.deliveryCycle.findMany({
          where: {
            organizationId: actor.organizationId,
            id: { in: deliveryCycleIds },
          },
          select: {
            id: true,
            cycleCode: true,
            deliveryDate: true,
            deliveryShift: true,
            status: true,
          },
        })
      : [];
    const cycleMap = new Map<string, any>(cycles.map((cycle): [string, any] => [cycle.id, cycle]));

    return {
      success: true,
      message: 'Demand consolidations fetched successfully',
      data: rows.map((row) => ({
        ...row,
        deliveryCycle: cycleMap.get(row.deliveryCycleId) ?? null,
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

    const consolidation = await this.getConsolidationOrThrow(actor.organizationId, id);
    const [items, deliveryCycle, sourceOrderCount] = await Promise.all([
      this.prisma.demandConsolidationItem.findMany({
        where: {
          organizationId: actor.organizationId,
          demandConsolidationId: id,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.deliveryCycle.findFirst({
        where: {
          organizationId: actor.organizationId,
          id: consolidation.deliveryCycleId,
        },
        select: {
          id: true,
          cycleCode: true,
          orderDate: true,
          deliveryDate: true,
          deliveryShift: true,
          cutoffAt: true,
          status: true,
        },
      }),
      this.prisma.demandSourceOrder.count({
        where: {
          demandConsolidationId: id,
        },
      }),
    ]);

    const enrichedItems = await this.enrichDemandItems(actor.organizationId, items);
    const totals = this.buildDemandTotals(items);

    return {
      success: true,
      message: 'Demand consolidation fetched successfully',
      data: {
        ...consolidation,
        deliveryCycle,
        items: enrichedItems,
        totals,
        sourceOrderCount,
      },
    };
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateDemandConsolidationDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const consolidation = await this.getConsolidationOrThrow(actor.organizationId, id);
    this.assertMutableConsolidation(consolidation.status);

    const updated = await this.prisma.demandConsolidation.update({
      where: { id },
      data: {
        notes: dto.notes,
      },
    });

    return {
      success: true,
      message: 'Demand consolidation updated successfully',
      data: updated,
    };
  }

  async rebuild(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const consolidation = await this.getConsolidationOrThrow(actor.organizationId, id);
    this.assertMutableConsolidation(consolidation.status);

    const orders = await this.getEligibleOrders(
      actor.organizationId,
      consolidation.deliveryCycleId,
      ['approved'],
    );
    if (orders.length === 0) {
      throw new BadRequestException('No approved orders available to rebuild');
    }

    const aggregatedItems = this.aggregateDemandItems(orders);

    await this.prisma.$transaction(async (tx) => {
      await tx.demandConsolidationItem.deleteMany({
        where: { demandConsolidationId: id },
      });

      await tx.demandSourceOrder.deleteMany({
        where: { demandConsolidationId: id },
      });

      await tx.demandConsolidationItem.createMany({
        data: aggregatedItems.map((item) => ({
          organizationId: actor.organizationId,
          demandConsolidationId: id,
          variantId: item.variantId,
          totalOrderQty: item.totalOrderQty,
          totalApprovedQty: item.totalApprovedQty,
          bufferQty: item.bufferQty,
          finalProcurementQty: item.finalProcurementQty,
          remarks: item.remarks,
        })),
      });

      await tx.demandSourceOrder.createMany({
        data: orders.map((order) => ({
          demandConsolidationId: id,
          salesOrderId: order.id,
        })),
      });

      await tx.demandConsolidation.update({
        where: { id },
        data: {
          status: 'reviewed',
        },
      });
    });

    return this.findOne(actor, id);
  }

  async approve(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const consolidation = await this.getConsolidationOrThrow(actor.organizationId, id);
    if (consolidation.status === 'po_generated') {
      throw new ConflictException(
        'Consolidation already has a linked purchase-order workflow state',
      );
    }

    const itemCount = await this.prisma.demandConsolidationItem.count({
      where: { demandConsolidationId: id },
    });
    if (itemCount === 0) {
      throw new BadRequestException('Cannot approve empty demand consolidation');
    }

    const updated = await this.prisma.demandConsolidation.update({
      where: { id },
      data: {
        status: 'approved',
        approvedByUserId: actor.id,
        approvedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Demand consolidation approved successfully',
      data: updated,
    };
  }

  async getItems(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getConsolidationOrThrow(actor.organizationId, id);

    const items = await this.prisma.demandConsolidationItem.findMany({
      where: {
        organizationId: actor.organizationId,
        demandConsolidationId: id,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      message: 'Demand consolidation items fetched successfully',
      data: await this.enrichDemandItems(actor.organizationId, items),
    };
  }

  async updateItem(
    actor: AuthenticatedUser,
    id: string,
    itemId: string,
    dto: UpdateDemandConsolidationItemDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const consolidation = await this.getConsolidationOrThrow(actor.organizationId, id);
    this.assertMutableConsolidation(consolidation.status);

    const current = await this.prisma.demandConsolidationItem.findFirst({
      where: {
        id: itemId,
        organizationId: actor.organizationId,
        demandConsolidationId: id,
      },
    });

    if (!current) {
      throw new NotFoundException('Demand consolidation item not found');
    }

    const bufferQty = dto.bufferQty ?? this.toNumber(current.bufferQty);
    const finalProcurementQty =
      dto.finalProcurementQty ??
      this.roundQty(this.toNumber(current.totalApprovedQty) + bufferQty);

    const updated = await this.prisma.demandConsolidationItem.update({
      where: { id: itemId },
      data: {
        bufferQty,
        finalProcurementQty,
        remarks: dto.remarks ?? current.remarks,
      },
    });

    return {
      success: true,
      message: 'Demand consolidation item updated successfully',
      data: updated,
    };
  }

  async getSourceOrders(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getConsolidationOrThrow(actor.organizationId, id);

    const sourceOrders = await this.prisma.demandSourceOrder.findMany({
      where: { demandConsolidationId: id },
      include: {
        salesOrder: {
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const orders = sourceOrders.map((sourceOrder) => sourceOrder.salesOrder);
    const enrichedOrders = await this.enrichOrders(actor.organizationId, orders);

    return {
      success: true,
      message: 'Demand consolidation source orders fetched successfully',
      data: enrichedOrders,
    };
  }

  async getProductWiseSummary(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getConsolidationOrThrow(actor.organizationId, id);

    const items = await this.prisma.demandConsolidationItem.findMany({
      where: {
        organizationId: actor.organizationId,
        demandConsolidationId: id,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      message: 'Product-wise demand summary fetched successfully',
      data: await this.enrichDemandItems(actor.organizationId, items),
      totals: this.buildDemandTotals(items),
    };
  }

  async getRouteWiseSummary(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getConsolidationOrThrow(actor.organizationId, id);

    const sourceOrders = await this.prisma.demandSourceOrder.findMany({
      where: { demandConsolidationId: id },
      include: {
        salesOrder: {
          include: { items: true },
        },
      },
    });

    const routeIds = [
      ...new Set(
        sourceOrders
          .map((row) => row.salesOrder.routeId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const routes = routeIds.length
      ? await this.prisma.route.findMany({
          where: {
            organizationId: actor.organizationId,
            id: { in: routeIds },
          },
          select: {
            id: true,
            code: true,
            name: true,
            areaId: true,
          },
        })
      : [];
    const routeMap = new Map<string, any>(routes.map((route): [string, any] => [route.id, route]));

    const summaryMap = new Map<
      string,
      {
        routeId: string;
        routeCode: string | null;
        routeName: string | null;
        retailerCount: number;
        orderCount: number;
        totalOrderedQty: number;
        totalApprovedQty: number;
      }
    >();

    for (const sourceOrder of sourceOrders) {
      const order = sourceOrder.salesOrder;
      const routeId = order.routeId ?? 'UNASSIGNED';
      const current = summaryMap.get(routeId) ?? {
        routeId,
        routeCode: routeId === 'UNASSIGNED' ? null : routeMap.get(routeId)?.code ?? null,
        routeName: routeId === 'UNASSIGNED' ? 'Unassigned' : routeMap.get(routeId)?.name ?? null,
        retailerCount: 0,
        orderCount: 0,
        totalOrderedQty: 0,
        totalApprovedQty: 0,
      };

      current.orderCount += 1;
      current.totalOrderedQty = this.roundQty(
        current.totalOrderedQty +
          order.items.reduce(
            (sum, item) => sum + this.toNumber(item.orderedQty),
            0,
          ),
      );
      current.totalApprovedQty = this.roundQty(
        current.totalApprovedQty +
          order.items.reduce(
            (sum, item) =>
              sum + this.toNumber(item.approvedQty ?? item.orderedQty),
            0,
          ),
      );

      summaryMap.set(routeId, current);
    }

    for (const key of summaryMap.keys()) {
      const relatedOrders = sourceOrders.filter(
        (row) => (row.salesOrder.routeId ?? 'UNASSIGNED') === key,
      );
      const uniqueRetailers = new Set(relatedOrders.map((row) => row.salesOrder.retailerId));
      const current = summaryMap.get(key);
      if (current) {
        current.retailerCount = uniqueRetailers.size;
      }
    }

    return {
      success: true,
      message: 'Route-wise demand summary fetched successfully',
      data: [...summaryMap.values()],
    };
  }

  async getAreaWiseSummary(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getConsolidationOrThrow(actor.organizationId, id);

    const routeSummaryResponse = await this.getRouteWiseSummary(actor, id);
    const routeSummary = routeSummaryResponse.data as Array<{
      routeId: string;
      totalOrderedQty: number;
      totalApprovedQty: number;
      orderCount: number;
      retailerCount: number;
    }>;

    const routeIds = routeSummary
      .map((row) => row.routeId)
      .filter((value) => value !== 'UNASSIGNED');
    const routes = routeIds.length
      ? await this.prisma.route.findMany({
          where: {
            organizationId: actor.organizationId,
            id: { in: routeIds },
          },
          select: {
            id: true,
            areaId: true,
          },
        })
      : [];
    const areaIds = [
      ...new Set(
        routes
          .map((route) => route.areaId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const areas = areaIds.length
      ? await this.prisma.area.findMany({
          where: {
            organizationId: actor.organizationId,
            id: { in: areaIds },
          },
          select: {
            id: true,
            code: true,
            name: true,
          },
        })
      : [];

    const routeToArea = new Map<string, any>(routes.map((route): [string, any] => [route.id, route.areaId]));
    const areaMap = new Map<string, any>(areas.map((area): [string, any] => [area.id, area]));

    const summaryMap = new Map<
      string,
      {
        areaId: string | null;
        areaCode: string | null;
        areaName: string;
        routeCount: number;
        retailerCount: number;
        orderCount: number;
        totalOrderedQty: number;
        totalApprovedQty: number;
      }
    >();

    for (const routeRow of routeSummary) {
      const mappedAreaId = routeRow.routeId === 'UNASSIGNED' ? null : routeToArea.get(routeRow.routeId) ?? null;
      const areaKey = mappedAreaId ?? 'UNASSIGNED';
      const area = mappedAreaId ? areaMap.get(mappedAreaId) : null;
      const current = summaryMap.get(areaKey) ?? {
        areaId: mappedAreaId,
        areaCode: area?.code ?? null,
        areaName: area?.name ?? 'Unassigned',
        routeCount: 0,
        retailerCount: 0,
        orderCount: 0,
        totalOrderedQty: 0,
        totalApprovedQty: 0,
      };

      current.routeCount += 1;
      current.retailerCount += routeRow.retailerCount;
      current.orderCount += routeRow.orderCount;
      current.totalOrderedQty = this.roundQty(
        current.totalOrderedQty + routeRow.totalOrderedQty,
      );
      current.totalApprovedQty = this.roundQty(
        current.totalApprovedQty + routeRow.totalApprovedQty,
      );

      summaryMap.set(areaKey, current);
    }

    return {
      success: true,
      message: 'Area-wise demand summary fetched successfully',
      data: [...summaryMap.values()],
    };
  }

  async export(actor: AuthenticatedUser, id: string, format: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const consolidation = await this.findOne(actor, id);
    const productSummary = await this.getProductWiseSummary(actor, id);

    return {
      success: true,
      message: 'Demand consolidation export payload generated successfully',
      data: {
        format,
        fileName: `${consolidation.data.consolidationNo}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`,
        consolidation: consolidation.data,
        productSummary: productSummary.data,
      },
    };
  }

  async shareWhatsApp(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const consolidation = await this.findOne(actor, id);
    const items = consolidation.data.items as Array<{
      variant: { productName: string; variantName: string | null; sku: string } | null;
      finalProcurementQty: number | string;
    }>;

    const lines = items.map((item, index) => {
      const label = item.variant
        ? `${item.variant.productName}${item.variant.variantName ? ` - ${item.variant.variantName}` : ''}`
        : 'Unknown Variant';
      return `${index + 1}. ${label}: ${item.finalProcurementQty}`;
    });

    return {
      success: true,
      message: 'WhatsApp share payload generated successfully',
      data: {
        demandConsolidationId: id,
        messageText: [
          `Demand Consolidation ${consolidation.data.consolidationNo}`,
          `Delivery Date: ${consolidation.data.deliveryCycle?.deliveryDate ?? ''}`,
          ...lines,
        ].join('\n'),
      },
    };
  }

  private async getEligibleOrders(
    organizationId: string,
    deliveryCycleId: string,
    includeStatuses?: string[],
  ) {
    const statuses = includeStatuses?.length ? includeStatuses : ['approved'];

    return this.prisma.salesOrder.findMany({
      where: {
        organizationId,
        deliveryCycleId,
        status: { in: statuses },
      },
      include: {
        items: true,
      },
      orderBy: { orderDate: 'asc' },
    });
  }

  private aggregateDemandItems(orders: ConsolidationOrder[]) {
    const map = new Map<
      string,
      {
        variantId: string;
        totalOrderQty: number;
        totalApprovedQty: number;
        bufferQty: number;
        finalProcurementQty: number;
        remarks: string | null;
      }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const current = map.get(item.variantId) ?? {
          variantId: item.variantId,
          totalOrderQty: 0,
          totalApprovedQty: 0,
          bufferQty: 0,
          finalProcurementQty: 0,
          remarks: null,
        };

        current.totalOrderQty = this.roundQty(
          current.totalOrderQty + this.toNumber(item.orderedQty),
        );
        current.totalApprovedQty = this.roundQty(
          current.totalApprovedQty +
            this.toNumber(item.approvedQty ?? item.orderedQty),
        );
        current.finalProcurementQty = current.totalApprovedQty;

        map.set(item.variantId, current);
      }
    }

    return [...map.values()];
  }

  private async enrichDemandItems(
    organizationId: string,
    items: DemandConsolidationItem[],
  ) {
    const variantIds = [...new Set(items.map((item) => item.variantId))];
    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({
          where: {
            organizationId,
            id: { in: variantIds },
          },
          select: {
            id: true,
            sku: true,
            variantName: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : [];
    const variantMap = new Map<string, any>(variants.map((variant): [string, any] => [variant.id, variant]));

    return items.map((item) => ({
      ...item,
      totalOrderQty: this.toNumber(item.totalOrderQty),
      totalApprovedQty: this.toNumber(item.totalApprovedQty),
      bufferQty: this.toNumber(item.bufferQty),
      finalProcurementQty: this.toNumber(item.finalProcurementQty),
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

  private buildDemandTotals(
    items: DemandConsolidationItem[],
  ) {
    return items.reduce(
      (acc, item) => {
        acc.totalOrderQty = this.roundQty(
          acc.totalOrderQty + this.toNumber(item.totalOrderQty),
        );
        acc.totalApprovedQty = this.roundQty(
          acc.totalApprovedQty + this.toNumber(item.totalApprovedQty),
        );
        acc.totalBufferQty = this.roundQty(
          acc.totalBufferQty + this.toNumber(item.bufferQty),
        );
        acc.totalFinalProcurementQty = this.roundQty(
          acc.totalFinalProcurementQty + this.toNumber(item.finalProcurementQty),
        );
        return acc;
      },
      {
        totalOrderQty: 0,
        totalApprovedQty: 0,
        totalBufferQty: 0,
        totalFinalProcurementQty: 0,
      },
    );
  }

  private async enrichOrders(
    organizationId: string,
    orders: ConsolidationOrder[],
  ) {
    const retailerIds = [...new Set(orders.map((order) => order.retailerId))];
    const routeIds = [
      ...new Set(
        orders
          .map((order) => order.routeId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const [retailers, routes] = await Promise.all([
      retailerIds.length
        ? this.prisma.retailer.findMany({
            where: {
              organizationId,
              id: { in: retailerIds },
            },
            select: {
              id: true,
              retailerCode: true,
              shopName: true,
              ownerName: true,
              mobile: true,
            },
          })
        : [],
      routeIds.length
        ? this.prisma.route.findMany({
            where: {
              organizationId,
              id: { in: routeIds },
            },
            select: {
              id: true,
              code: true,
              name: true,
            },
          })
        : [],
    ]);

    const retailerMap = new Map<string, any>(retailers.map((retailer): [string, any] => [retailer.id, retailer]));
    const routeMap = new Map<string, any>(routes.map((route): [string, any] => [route.id, route]));

    return orders.map((order) => ({
      ...order,
      retailer: retailerMap.get(order.retailerId) ?? null,
      route: order.routeId ? routeMap.get(order.routeId) ?? null : null,
    }));
  }

  private async getConsolidationOrThrow(organizationId: string, id: string) {
    const consolidation = await this.prisma.demandConsolidation.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!consolidation) {
      throw new NotFoundException('Demand consolidation not found');
    }

    return consolidation;
  }

  private async getDeliveryCycleOrThrow(organizationId: string, id: string) {
    const deliveryCycle = await this.prisma.deliveryCycle.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!deliveryCycle) {
      throw new NotFoundException('Delivery cycle not found');
    }

    return deliveryCycle;
  }

  private assertMutableConsolidation(status: string) {
    if (['approved', 'po_generated'].includes(status)) {
      throw new ConflictException(
        'Approved or PO-generated demand consolidations cannot be modified',
      );
    }
  }

  private async generateConsolidationNo(organizationId: string) {
    const total = await this.prisma.demandConsolidation.count({
      where: { organizationId },
    });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `DCON-${datePart}-${String(total + 1).padStart(4, '0')}`;
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      throw new ForbiddenException('Retailer users cannot access demand consolidation');
    }
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) {
      return 0;
    }
    return Number(value);
  }

  private roundQty(value: number) {
    return Number(value.toFixed(3));
  }
}
