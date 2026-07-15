import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Retailer, Route } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreditControlService } from '../payments/credit-control.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAssistedSalesOrderDto,
  CreateSalesOrderDto,
  OrderActionDto,
  QuerySalesOrdersDto,
  UpdateSalesOrderDto,
} from './dto';

type OrderItemInput = {
  variantId: string;
  qty: number;
  remarks?: string;
};

type PreparedOrderItem = {
  variantId: string;
  orderedQty: number;
  approvedQty: number | null;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  remarks?: string;
};

type PreparedOrderPayload = {
  items: PreparedOrderItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
};

type AccessibleOrder = Prisma.SalesOrderGetPayload<{
  include: {
    items: true;
    statusHistory: true;
  };
}>;

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditControlService: CreditControlService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateSalesOrderDto) {
    this.assertAuthenticated(actor);

    if (this.isRetailerUser(actor)) {
      const retailerId = this.requireRetailerId(actor);
      return this.createOrder(actor, {
        ...dto,
        retailerId,
        source: 'retailer',
      });
    }

    return this.createOrder(actor, dto);
  }

  async createAssisted(
    actor: AuthenticatedUser,
    dto: CreateAssistedSalesOrderDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    return this.createOrder(actor, {
      ...dto,
      source: dto.source,
    });
  }

  async findAll(actor: AuthenticatedUser, query: QuerySalesOrdersDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildOrderWhere(actor, query);

    const [orders, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        include: {
          items: true,
          statusHistory: {
            orderBy: { changedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { orderDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    const enriched = await this.enrichOrders(actor.organizationId, orders);

    return {
      success: true,
      message: 'Sales orders fetched successfully',
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
    const order = await this.getAccessibleOrderOrThrow(actor, id);
    const [retailer, route, deliveryCycle, invoices, lockedConsolidation] =
      await Promise.all([
        this.prisma.retailer.findFirst({
          where: {
            id: order.retailerId,
            organizationId: actor.organizationId,
          },
          select: {
            id: true,
            retailerCode: true,
            shopName: true,
            ownerName: true,
            mobile: true,
            orderingMode: true,
          },
        }),
        order.routeId
          ? this.prisma.route.findFirst({
              where: {
                id: order.routeId,
                organizationId: actor.organizationId,
              },
              select: {
                id: true,
                code: true,
                name: true,
                deliveryShift: true,
              },
            })
          : null,
        this.prisma.deliveryCycle.findFirst({
          where: {
            id: order.deliveryCycleId,
            organizationId: actor.organizationId,
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
        this.prisma.salesInvoice.findMany({
          where: {
            organizationId: actor.organizationId,
            salesOrderId: id,
          },
          select: {
            id: true,
            invoiceNo: true,
            invoiceDate: true,
            status: true,
            grandTotal: true,
            outstandingAmount: true,
            source: true,
          },
          orderBy: { invoiceDate: 'desc' },
        }),
        this.prisma.demandSourceOrder.findFirst({
          where: {
            salesOrderId: id,
            demandConsolidation: {
              is: {
                organizationId: actor.organizationId,
                status: { in: ['approved', 'po_generated'] },
              },
            },
          },
          include: {
            demandConsolidation: {
              select: {
                id: true,
                consolidationNo: true,
                status: true,
                consolidationDate: true,
              },
            },
          },
        }),
      ]);

    const variantIds = [...new Set(order.items.map((item) => item.variantId))];
    const variants = await this.prisma.productVariant.findMany({
      where: {
        organizationId: actor.organizationId,
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
    });

    const variantMap = new Map<string, any>(variants.map((variant) => [variant.id, variant]));

    return {
      success: true,
      message: 'Sales order fetched successfully',
      data: {
        ...order,
        items: order.items.map((item) => ({
          ...item,
          variant: variantMap.get(item.variantId) ?? null,
        })),
        retailer,
        route,
        deliveryCycle,
        invoices,
        lockedConsolidation: lockedConsolidation?.demandConsolidation ?? null,
      },
    };
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateSalesOrderDto,
  ) {
    this.assertAuthenticated(actor);

    const order = await this.getAccessibleOrderOrThrow(actor, id);
    await this.ensureOrderMutable(actor, order, dto);

    const retailer = await this.resolveRetailerForOrder(
      actor,
      dto.retailerId ?? order.retailerId,
    );
    const routeId = dto.routeId ?? order.routeId ?? retailer.assignedRouteId ?? null;
    const requestedDeliveryDate =
      dto.requestedDeliveryDate ??
      (order.requestedDeliveryDate
        ? order.requestedDeliveryDate.toISOString().slice(0, 10)
        : undefined);
    const deliveryCycle = await this.resolveDeliveryCycle(
      actor.organizationId,
      routeId,
      requestedDeliveryDate,
    );

    const baseUpdate: Prisma.SalesOrderUncheckedUpdateInput = {
      routeId,
      deliveryCycleId: deliveryCycle.id,
      requestedDeliveryDate: requestedDeliveryDate
        ? new Date(requestedDeliveryDate)
        : order.requestedDeliveryDate,
      notes: dto.notes ?? order.notes,
    };

    if (!this.isRetailerUser(actor)) {
      Object.assign(baseUpdate, {
        retailerId: retailer.id,
        source: dto.source ?? order.source,
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let prepared: PreparedOrderPayload | null = null;
      const shouldRecalculateItems =
        Boolean(dto.items?.length) ||
        dto.retailerId !== undefined ||
        dto.routeId !== undefined ||
        dto.requestedDeliveryDate !== undefined;

      if (shouldRecalculateItems) {
        const recalculationItems = dto.items?.length
          ? dto.items.map((item) => ({
              variantId: item.variantId,
              qty: item.qty,
              remarks: item.remarks,
            }))
          : order.items.map((item) => ({
              variantId: item.variantId,
              qty: this.toNumber(item.orderedQty),
              remarks: item.remarks ?? undefined,
            }));

        prepared = await this.prepareOrderItems(
          actor.organizationId,
          retailer,
          routeId,
          requestedDeliveryDate,
          recalculationItems,
        );

        Object.assign(baseUpdate, {
          subtotal: prepared.subtotal,
          discountTotal: prepared.discountTotal,
          taxTotal: prepared.taxTotal,
          grandTotal: prepared.grandTotal,
        });
      }

      const updatedOrder = await tx.salesOrder.update({
        where: { id },
        data: baseUpdate,
      });

      if (prepared) {
        await tx.salesOrderItem.deleteMany({
          where: { salesOrderId: id },
        });

        await tx.salesOrderItem.createMany({
          data: prepared.items.map((item) => ({
            organizationId: actor.organizationId,
            salesOrderId: id,
            variantId: item.variantId,
            orderedQty: item.orderedQty,
            approvedQty: order.status === 'approved' ? item.orderedQty : null,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            lineTotal: item.lineTotal,
            remarks: item.remarks,
          })),
        });
      }

      await tx.salesOrderStatusHistory.create({
        data: {
          organizationId: actor.organizationId,
          salesOrderId: id,
          oldStatus: order.status,
          newStatus: updatedOrder.status,
          changedByUserId: actor.id,
          note: 'Sales order updated',
        },
      });

      return updatedOrder;
    });

    return this.findOne(actor, result.id);
  }

  async remove(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);

    const order = await this.getAccessibleOrderOrThrow(actor, id);
    await this.ensureOrderMutable(actor, order);

    await this.prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id },
        data: {
          status: 'cancelled',
        },
      });

      await tx.salesOrderStatusHistory.create({
        data: {
          organizationId: actor.organizationId,
          salesOrderId: id,
          oldStatus: order.status,
          newStatus: 'cancelled',
          changedByUserId: actor.id,
          note: 'Sales order cancelled',
        },
      });
    });

    return {
      success: true,
      message: 'Sales order cancelled successfully',
      data: { id },
    };
  }

  async approve(
    actor: AuthenticatedUser,
    id: string,
    dto: OrderActionDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const order = await this.getAccessibleOrderOrThrow(actor, id);
    if (order.status === 'cancelled') {
      throw new BadRequestException('Cancelled order cannot be approved');
    }

    await this.creditControlService.assertCreditAllowed(actor, order.retailerId, {
      context: 'order_approval',
      transactionAmount: this.toNumber(order.grandTotal),
      salesOrderId: order.id,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id },
        data: {
          status: 'approved',
          approvedByUserId: actor.id,
          approvedAt: new Date(),
        },
      });

      for (const item of order.items) {
        await tx.salesOrderItem.update({
          where: { id: item.id },
          data: {
            approvedQty: item.orderedQty,
          },
        });
      }

      await tx.salesOrderStatusHistory.create({
        data: {
          organizationId: actor.organizationId,
          salesOrderId: id,
          oldStatus: order.status,
          newStatus: 'approved',
          changedByUserId: actor.id,
          note: dto.note ?? 'Sales order approved',
        },
      });
    });

    return this.findOne(actor, id);
  }

  async reject(
    actor: AuthenticatedUser,
    id: string,
    dto: OrderActionDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const order = await this.getAccessibleOrderOrThrow(actor, id);
    await this.ensureOrderMutable(actor, order, dto);

    await this.prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id },
        data: {
          status: 'cancelled',
          notes: dto.reason
            ? `${order.notes ?? ''}${order.notes ? ' | ' : ''}Rejected: ${dto.reason}`
            : order.notes,
        },
      });

      await tx.salesOrderStatusHistory.create({
        data: {
          organizationId: actor.organizationId,
          salesOrderId: id,
          oldStatus: order.status,
          newStatus: 'cancelled',
          changedByUserId: actor.id,
          note: dto.reason ?? dto.note ?? 'Sales order rejected',
        },
      });
    });

    return {
      success: true,
      message: 'Sales order rejected successfully',
      data: { id },
    };
  }

  async cancel(
    actor: AuthenticatedUser,
    id: string,
    dto: OrderActionDto,
  ) {
    this.assertAuthenticated(actor);

    const order = await this.getAccessibleOrderOrThrow(actor, id);
    await this.ensureOrderMutable(actor, order, dto);

    await this.prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id },
        data: {
          status: 'cancelled',
          notes: dto.reason
            ? `${order.notes ?? ''}${order.notes ? ' | ' : ''}Cancelled: ${dto.reason}`
            : order.notes,
        },
      });

      await tx.salesOrderStatusHistory.create({
        data: {
          organizationId: actor.organizationId,
          salesOrderId: id,
          oldStatus: order.status,
          newStatus: 'cancelled',
          changedByUserId: actor.id,
          note: dto.reason ?? dto.note ?? 'Sales order cancelled',
        },
      });
    });

    return {
      success: true,
      message: 'Sales order cancelled successfully',
      data: { id },
    };
  }

  async duplicate(
    actor: AuthenticatedUser,
    id: string,
    dto: OrderActionDto,
  ) {
    this.assertAuthenticated(actor);

    const order = await this.getAccessibleOrderOrThrow(actor, id);
    const requestedDeliveryDate = order.requestedDeliveryDate
      ? order.requestedDeliveryDate.toISOString().slice(0, 10)
      : undefined;

    const payload: CreateSalesOrderDto = {
      retailerId: order.retailerId,
      routeId: order.routeId ?? undefined,
      requestedDeliveryDate,
      source: this.isRetailerUser(actor) ? 'retailer' : order.source,
      notes: dto.note ?? `Duplicate of ${order.orderNo}`,
      items: order.items.map((item) => ({
        variantId: item.variantId,
        qty: this.toNumber(item.orderedQty),
        remarks: item.remarks ?? undefined,
      })),
    };

    return this.create(actor, payload);
  }

  async recalculate(
    actor: AuthenticatedUser,
    id: string,
    dto: OrderActionDto,
  ) {
    this.assertAuthenticated(actor);

    const order = await this.getAccessibleOrderOrThrow(actor, id);
    await this.ensureOrderMutable(actor, order, dto);

    const updateDto: UpdateSalesOrderDto = {
      items: order.items.map((item) => ({
        variantId: item.variantId,
        qty: this.toNumber(item.orderedQty),
        remarks: item.remarks ?? undefined,
      })),
      notes: dto.note ?? order.notes ?? undefined,
    };

    return this.update(actor, id, updateDto);
  }

  async getMyOrders(actor: AuthenticatedUser, query: QuerySalesOrdersDto) {
    this.assertAuthenticated(actor);
    this.assertRetailerActor(actor);

    return this.findAll(actor, {
      ...query,
      retailerId: actor.retailerId ?? undefined,
    });
  }

  async getMyOrderById(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertRetailerActor(actor);

    return this.findOne(actor, id);
  }

  async repeatMyOrder(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertRetailerActor(actor);

    return this.duplicate(actor, id, {
      note: `Repeat order from ${id}`,
    });
  }

  private async createOrder(
    actor: AuthenticatedUser,
    dto: CreateSalesOrderDto | CreateAssistedSalesOrderDto,
  ) {
    const retailer = await this.resolveRetailerForOrder(actor, dto.retailerId);

    if (!retailer.isOrderingEnabled) {
      throw new ForbiddenException('Ordering is disabled for this retailer');
    }

    if (this.isRetailerUser(actor) && retailer.orderingMode === 'assisted') {
      throw new ForbiddenException(
        'This retailer is configured for assisted ordering only',
      );
    }

    const routeId = dto.routeId ?? retailer.assignedRouteId ?? null;
    const deliveryCycle = await this.resolveDeliveryCycle(
      actor.organizationId,
      routeId,
      dto.requestedDeliveryDate,
    );
    const prepared = await this.prepareOrderItems(
      actor.organizationId,
      retailer,
      routeId,
      dto.requestedDeliveryDate,
      dto.items.map((item) => ({
        variantId: item.variantId,
        qty: item.qty,
        remarks: item.remarks,
      })),
    );

    const orderNo = await this.generateOrderNo(actor.organizationId);
    const source = this.resolveSource(actor, dto.source);
    const enteredByEmployeeId = this.isRetailerUser(actor)
      ? null
      : actor.employeeId ??
        ('enteredByEmployeeId' in dto ? dto.enteredByEmployeeId ?? null : null);

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.salesOrder.create({
        data: {
          organizationId: actor.organizationId,
          orderNo,
          retailerId: retailer.id,
          routeId,
          deliveryCycleId: deliveryCycle.id,
          orderDate: new Date(),
          requestedDeliveryDate: dto.requestedDeliveryDate
            ? new Date(dto.requestedDeliveryDate)
            : deliveryCycle.deliveryDate,
          source,
          orderingModeSnapshot: retailer.orderingMode,
          enteredByUserId: actor.id,
          enteredByEmployeeId,
          status: 'pending',
          subtotal: prepared.subtotal,
          discountTotal: prepared.discountTotal,
          taxTotal: prepared.taxTotal,
          grandTotal: prepared.grandTotal,
          notes: dto.notes,
        },
      });

      await tx.salesOrderItem.createMany({
        data: prepared.items.map((item) => ({
          organizationId: actor.organizationId,
          salesOrderId: createdOrder.id,
          variantId: item.variantId,
          orderedQty: item.orderedQty,
          approvedQty: null,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
          remarks: item.remarks,
        })),
      });

      await tx.salesOrderStatusHistory.create({
        data: {
          organizationId: actor.organizationId,
          salesOrderId: createdOrder.id,
          oldStatus: null,
          newStatus: 'pending',
          changedByUserId: actor.id,
          note:
            source === 'retailer'
              ? 'Retailer order created'
              : 'Assisted order created by backoffice',
        },
      });

      return createdOrder;
    });

    return this.findOne(actor, order.id);
  }

  private async prepareOrderItems(
    organizationId: string,
    retailer: Retailer,
    routeId: string | null,
    requestedDeliveryDate: string | undefined,
    rawItems: OrderItemInput[],
  ): Promise<PreparedOrderPayload> {
    const mergedItems = this.mergeItems(rawItems);
    if (mergedItems.length === 0) {
      throw new BadRequestException('At least one order item is required');
    }

    const variants = await this.prisma.productVariant.findMany({
      where: {
        organizationId,
        id: { in: mergedItems.map((item) => item.variantId) },
        status: 'active',
      },
      include: {
        product: true,
      },
    });

    if (variants.length !== mergedItems.length) {
      throw new BadRequestException('One or more product variants are invalid');
    }

    const variantMap = new Map<string, any>(variants.map((variant) => [variant.id, variant]));
    const taxCodeIds = Array.from(
      new Set(
        variants
          .map((variant) => variant.product.taxCodeId)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const taxCodes = taxCodeIds.length
      ? await this.prisma.taxCode.findMany({
          where: {
            organizationId,
            id: { in: taxCodeIds },
          },
        })
      : [];
    const taxCodeMap = new Map<string, any>(taxCodes.map((taxCode) => [taxCode.id, taxCode]));

    const route = routeId
      ? await this.prisma.route.findFirst({
          where: {
            id: routeId,
            organizationId,
          },
        })
      : null;

    const effectiveDate = requestedDeliveryDate
      ? new Date(requestedDeliveryDate)
      : new Date();

    const items: PreparedOrderItem[] = [];
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    for (const item of mergedItems) {
      const variant = variantMap.get(item.variantId);
      if (!variant) {
        throw new BadRequestException('Variant not found for order item');
      }

      const effectivePrice = await this.resolveEffectivePrice({
        organizationId,
        retailer,
        route,
        variant,
        qty: item.qty,
        effectiveDate,
      });

      const taxRate = this.toNumber(
        variant.product.taxCodeId
          ? taxCodeMap.get(variant.product.taxCodeId)?.gstRate
          : 0,
      );
      const lineBase = this.roundMoney(effectivePrice * item.qty);
      const lineTax = this.roundMoney((lineBase * taxRate) / 100);
      const lineTotal = this.roundMoney(lineBase + lineTax);

      subtotal = this.roundMoney(subtotal + lineBase);
      discountTotal = this.roundMoney(discountTotal + 0);
      taxTotal = this.roundMoney(taxTotal + lineTax);
      grandTotal = this.roundMoney(grandTotal + lineTotal);

      items.push({
        variantId: variant.id,
        orderedQty: item.qty,
        approvedQty: null,
        unitPrice: effectivePrice,
        discountAmount: 0,
        taxRate,
        taxAmount: lineTax,
        lineTotal,
        remarks: item.remarks,
      });
    }

    return {
      items,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
    };
  }

  private async resolveEffectivePrice(params: {
    organizationId: string;
    retailer: Retailer;
    route: Route | null;
    variant: Prisma.ProductVariantGetPayload<{ include: { product: true } }>;
    qty: number;
    effectiveDate: Date;
  }) {
    const { organizationId, retailer, route, variant, qty, effectiveDate } = params;
    const validDate = new Date(effectiveDate.toISOString().slice(0, 10));

    const assignmentOr: Prisma.PriceBookAssignmentWhereInput[] = [];
    assignmentOr.push({ retailerId: retailer.id });

    if (route?.id) {
      assignmentOr.push({ routeId: route.id });
    }

    if (route?.areaId) {
      assignmentOr.push({ areaId: route.areaId });
    }

    if (retailer.retailerCategory) {
      assignmentOr.push({ retailerCategory: retailer.retailerCategory });
    }

    const assignments = await this.prisma.priceBookAssignment.findMany({
      where: {
        organizationId,
        AND: [
          { OR: assignmentOr },
          { validFrom: { lte: validDate } },
          { OR: [{ validTo: null }, { validTo: { gte: validDate } }] },
        ],
      },
      include: {
        priceBook: true,
      },
    });

    const defaultBooks = await this.prisma.priceBook.findMany({
      where: {
        organizationId,
        isActive: true,
        scopeType: 'default',
        AND: [
          { validFrom: { lte: validDate } },
          { OR: [{ validTo: null }, { validTo: { gte: validDate } }] },
        ],
      },
      orderBy: [{ priority: 'asc' }, { validFrom: 'desc' }],
    });

    const candidateBooks = [...assignments.map((item) => item.priceBook), ...defaultBooks]
      .filter((priceBook) => priceBook.isActive)
      .sort((a, b) => a.priority - b.priority)
      .filter(
        (priceBook, index, array) =>
          array.findIndex((candidate) => candidate.id === priceBook.id) === index,
      );

    for (const priceBook of candidateBooks) {
      const item = await this.prisma.priceBookItem.findFirst({
        where: {
          organizationId,
          priceBookId: priceBook.id,
          variantId: variant.id,
          validFrom: { lte: effectiveDate },
          OR: [{ validTo: null }, { validTo: { gte: effectiveDate } }],
          AND: [
            {
              OR: [{ minQty: null }, { minQty: { lte: qty } }],
            },
            {
              OR: [{ maxQty: null }, { maxQty: { gte: qty } }],
            },
          ],
        },
        orderBy: [{ validFrom: 'desc' }],
      });

      if (item) {
        return this.roundMoney(
          this.toNumber(item.offerPrice ?? item.basePrice ?? variant.offerPrice ?? variant.defaultRetailerPrice),
        );
      }
    }

    return this.roundMoney(
      this.toNumber(variant.offerPrice ?? variant.defaultRetailerPrice),
    );
  }

  private async resolveRetailerForOrder(
    actor: AuthenticatedUser,
    retailerId?: string,
  ) {
    this.assertAuthenticated(actor);

    const resolvedRetailerId = this.isRetailerUser(actor)
      ? this.requireRetailerId(actor)
      : retailerId;

    if (!resolvedRetailerId) {
      throw new BadRequestException('Retailer is required');
    }

    const retailer = await this.prisma.retailer.findFirst({
      where: {
        id: resolvedRetailerId,
        organizationId: actor.organizationId,
      },
    });

    if (!retailer) {
      throw new NotFoundException('Retailer not found');
    }

    if (this.isRetailerUser(actor) && actor.retailerId !== retailer.id) {
      throw new ForbiddenException('You can only place orders for your retailer');
    }

    return retailer;
  }

  private async resolveDeliveryCycle(
    organizationId: string,
    routeId: string | null,
    requestedDeliveryDate?: string,
  ) {
    if (requestedDeliveryDate) {
      const existing = await this.prisma.deliveryCycle.findFirst({
        where: {
          organizationId,
          deliveryDate: new Date(requestedDeliveryDate),
        },
        orderBy: [{ deliveryShift: 'asc' }],
      });

      if (existing) {
        return existing;
      }
    }

    const now = new Date();
    const upcomingCycle = await this.prisma.deliveryCycle.findFirst({
      where: {
        organizationId,
        status: { in: ['open', 'planned'] },
        deliveryDate: {
          gte: new Date(now.toISOString().slice(0, 10)),
        },
      },
      orderBy: [{ cutoffAt: 'asc' }, { deliveryDate: 'asc' }],
    });

    if (upcomingCycle && (!requestedDeliveryDate || upcomingCycle.deliveryDate.toISOString().slice(0, 10) === requestedDeliveryDate)) {
      return upcomingCycle;
    }

    const route = routeId
      ? await this.prisma.route.findFirst({
          where: {
            id: routeId,
            organizationId,
          },
        })
      : null;
    const cutoffTime = route?.defaultCutoffTime ?? '21:00';
    const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);

    const candidateDeliveryDate = requestedDeliveryDate
      ? new Date(requestedDeliveryDate)
      : (() => {
          const local = new Date();
          const target = new Date(local);
          const passedCutoff =
            local.getHours() > cutoffHour ||
            (local.getHours() === cutoffHour && local.getMinutes() >= cutoffMinute);
          target.setHours(0, 0, 0, 0);
          target.setDate(target.getDate() + (passedCutoff ? 2 : 1));
          return target;
        })();

    candidateDeliveryDate.setHours(0, 0, 0, 0);

    const orderDate = new Date(candidateDeliveryDate);
    orderDate.setDate(orderDate.getDate() - 1);
    orderDate.setHours(0, 0, 0, 0);

    const cutoffAt = new Date(orderDate);
    cutoffAt.setHours(cutoffHour, cutoffMinute, 0, 0);

    const cycleCode = `DC-${candidateDeliveryDate.toISOString().slice(0, 10)}-${(route?.deliveryShift ?? 'morning').toUpperCase()}`;

    const existingByCode = await this.prisma.deliveryCycle.findFirst({
      where: {
        organizationId,
        cycleCode,
      },
    });

    if (existingByCode) {
      return existingByCode;
    }

    return this.prisma.deliveryCycle.create({
      data: {
        organizationId,
        cycleCode,
        orderDate,
        deliveryDate: candidateDeliveryDate,
        deliveryShift: route?.deliveryShift ?? 'morning',
        cutoffAt,
        status: 'planned',
      },
    });
  }

  private async getAccessibleOrderOrThrow(
    actor: AuthenticatedUser,
    orderId: string,
  ) {
    this.assertAuthenticated(actor);

    const where: Prisma.SalesOrderWhereInput = {
      id: orderId,
      organizationId: actor.organizationId,
    };

    if (this.isRetailerUser(actor)) {
      where.retailerId = this.requireRetailerId(actor);
    }

    const order = await this.prisma.salesOrder.findFirst({
      where,
      include: {
        items: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found');
    }

    return order;
  }

  private async ensureOrderMutable(
    actor: AuthenticatedUser,
    order: AccessibleOrder,
    action?: OrderActionDto | UpdateSalesOrderDto,
  ) {
    const force = Boolean((action as any)?.force);
    if (force && !this.isRetailerUser(actor)) {
      return;
    }

    if (['dispatched', 'delivered', 'partial', 'cancelled'].includes(order.status)) {
      throw new BadRequestException(
        `Order in status ${order.status} cannot be modified`,
      );
    }

    if (this.isRetailerUser(actor) && order.status !== 'pending') {
      throw new ForbiddenException(
        'Retailer can only modify orders before approval',
      );
    }

    const lockedConsolidation = await this.prisma.demandSourceOrder.findFirst({
      where: {
        salesOrderId: order.id,
        demandConsolidation: {
          is: {
            organizationId: actor.organizationId,
            status: { in: ['approved', 'po_generated'] },
          },
        },
      },
      select: { salesOrderId: true },
    });

    if (lockedConsolidation) {
      throw new ConflictException(
        'Order is locked because it is part of an approved demand consolidation',
      );
    }
  }

  private buildOrderWhere(
    actor: AuthenticatedUser,
    query: QuerySalesOrdersDto,
  ): Prisma.SalesOrderWhereInput {
    const where: Prisma.SalesOrderWhereInput = {
      organizationId: actor.organizationId,
    };

    if (this.isRetailerUser(actor)) {
      where.retailerId = this.requireRetailerId(actor);
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.retailerId && !this.isRetailerUser(actor)) {
      where.retailerId = query.retailerId;
    }

    if (query.routeId) {
      where.routeId = query.routeId;
    }

    if (query.deliveryCycleId) {
      where.deliveryCycleId = query.deliveryCycleId;
    }

    if (query.fromDate || query.toDate) {
      where.orderDate = {};
      if (query.fromDate) {
        where.orderDate.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.orderDate.lte = end;
      }
    }

    if (query.search) {
      where.OR = [
        { orderNo: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async enrichOrders(
    organizationId: string,
    orders: Array<
      Prisma.SalesOrderGetPayload<{
        include: {
          items: true;
          statusHistory: true;
        };
      }>
    >,
  ) {
    const retailerIds = [...new Set(orders.map((order) => order.retailerId))];
    const routeIds = [
      ...new Set(
        orders
          .map((order) => order.routeId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const cycleIds = [...new Set(orders.map((order) => order.deliveryCycleId))];

    const [retailers, routes, cycles] = await Promise.all([
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
              deliveryShift: true,
            },
          })
        : [],
      cycleIds.length
        ? this.prisma.deliveryCycle.findMany({
            where: {
              organizationId,
              id: { in: cycleIds },
            },
            select: {
              id: true,
              cycleCode: true,
              deliveryDate: true,
              deliveryShift: true,
              status: true,
            },
          })
        : [],
    ]);

    const retailerMap = new Map<string, any>(retailers.map((retailer): [string, any] => [retailer.id, retailer]));
    const routeMap = new Map<string, any>(routes.map((route): [string, any] => [route.id, route]));
    const cycleMap = new Map<string, any>(cycles.map((cycle): [string, any] => [cycle.id, cycle]));

    return orders.map((order) => ({
      ...order,
      retailer: retailerMap.get(order.retailerId) ?? null,
      route: order.routeId ? routeMap.get(order.routeId) ?? null : null,
      deliveryCycle: cycleMap.get(order.deliveryCycleId) ?? null,
    }));
  }

  private resolveSource(actor: AuthenticatedUser, source?: string) {
    if (this.isRetailerUser(actor)) {
      return 'retailer';
    }

    if (source) {
      return source;
    }

    if (actor.roles.includes('SALESPERSON')) {
      return 'salesperson';
    }

    return 'admin';
  }

  private mergeItems(items: OrderItemInput[]) {
    const map = new Map<string, OrderItemInput>();

    for (const item of items) {
      if (item.qty <= 0) {
        throw new BadRequestException('Order quantity must be greater than zero');
      }

      const existing = map.get(item.variantId);
      if (existing) {
        existing.qty += item.qty;
        existing.remarks = existing.remarks ?? item.remarks;
      } else {
        map.set(item.variantId, { ...item });
      }
    }

    return [...map.values()];
  }

  private async generateOrderNo(organizationId: string) {
    const total = await this.prisma.salesOrder.count({
      where: { organizationId },
    });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `SO-${datePart}-${String(total + 1).padStart(4, '0')}`;
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

  private assertRetailerActor(actor: AuthenticatedUser) {
    if (!this.isRetailerUser(actor) || !actor.retailerId) {
      throw new ForbiddenException('Retailer login required');
    }
  }

  private requireRetailerId(actor: AuthenticatedUser) {
    if (!actor.retailerId) {
      throw new ForbiddenException('Retailer context is missing');
    }
    return actor.retailerId;
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

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }
}
