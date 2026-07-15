import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  DeliveryChallan,
  DeliveryStop,
  DeliveryStopItem,
  DispatchTrip,
  DispatchTripItem,
  InventoryBatch,
  Prisma,
  SalesOrder,
} from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreditControlService } from '../payments/credit-control.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssignDispatchResourcesDto,
  CreateDispatchTripDto,
  GenerateDispatchTripDto,
  QueryDispatchTripsDto,
} from './dto';

type TripOrder = Prisma.SalesOrderGetPayload<{
  include: {
    items: true;
  };
}>;

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditControlService: CreditControlService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateDispatchTripDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    return this.createTrip(actor, {
      deliveryCycleId: dto.deliveryCycleId,
      routeId: dto.routeId,
      vehicleId: dto.vehicleId,
      driverEmployeeId: dto.driverEmployeeId,
      helperEmployeeId: dto.helperEmployeeId,
      dispatchDate: dto.dispatchDate,
      plannedStartAt: dto.plannedStartAt,
      notes: dto.notes,
    });
  }

  async generate(actor: AuthenticatedUser, dto: GenerateDispatchTripDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    return this.createTrip(actor, {
      deliveryCycleId: dto.deliveryCycleId,
      routeId: dto.routeId,
      vehicleId: dto.vehicleId,
      driverEmployeeId: dto.driverEmployeeId,
      helperEmployeeId: dto.helperEmployeeId,
      dispatchDate: dto.dispatchDate ?? new Date().toISOString().slice(0, 10),
      plannedStartAt: undefined,
      notes: 'Generated from route and delivery cycle',
    });
  }

  async findAll(actor: AuthenticatedUser, query: QueryDispatchTripsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.DispatchTripWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.routeId) where.routeId = query.routeId;
    if (query.deliveryCycleId) where.deliveryCycleId = query.deliveryCycleId;
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.status) where.status = query.status;
    if (query.dispatchDate) where.dispatchDate = new Date(query.dispatchDate);
    if (query.search) {
      where.OR = [
        { tripNo: { contains: query.search, mode: 'insensitive' } },
        { loadingSheetNo: { contains: query.search, mode: 'insensitive' } },
        { challanNo: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.dispatchTrip.findMany({
        where,
        orderBy: { dispatchDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dispatchTrip.count({ where }),
    ]);

    return {
      success: true,
      message: 'Dispatch trips fetched successfully',
      data: await this.enrichTrips(actor.organizationId, rows),
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
    const trip = await this.getAccessibleTripOrThrow(actor, id);

    const [items, stops, challan, cycle, route, vehicle, driver, helper] = await Promise.all([
      this.prisma.dispatchTripItem.findMany({
        where: { organizationId: actor.organizationId, dispatchTripId: id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.deliveryStop.findMany({
        where: { organizationId: actor.organizationId, dispatchTripId: id },
        orderBy: { stopSequence: 'asc' },
      }),
      this.prisma.deliveryChallan.findFirst({
        where: { organizationId: actor.organizationId, dispatchTripId: id },
      }),
      this.prisma.deliveryCycle.findFirst({
        where: { organizationId: actor.organizationId, id: trip.deliveryCycleId },
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
      this.prisma.route.findFirst({
        where: { organizationId: actor.organizationId, id: trip.routeId },
        select: { id: true, code: true, name: true, deliveryShift: true, areaId: true },
      }),
      trip.vehicleId
        ? this.prisma.vehicle.findFirst({
            where: { organizationId: actor.organizationId, id: trip.vehicleId },
            select: { id: true, vehicleNo: true, vehicleType: true },
          })
        : null,
      trip.driverEmployeeId
        ? this.prisma.employee.findFirst({
            where: { organizationId: actor.organizationId, id: trip.driverEmployeeId },
            select: { id: true, employeeCode: true, fullName: true, mobile: true },
          })
        : null,
      trip.helperEmployeeId
        ? this.prisma.employee.findFirst({
            where: { organizationId: actor.organizationId, id: trip.helperEmployeeId },
            select: { id: true, employeeCode: true, fullName: true, mobile: true },
          })
        : null,
    ]);

    return {
      success: true,
      message: 'Dispatch trip fetched successfully',
      data: {
        ...trip,
        items: await this.enrichTripItems(actor.organizationId, items),
        stops: await this.enrichStops(actor.organizationId, stops),
        challan,
        deliveryCycle: cycle,
        route,
        vehicle,
        driver,
        helper,
      },
    };
  }

  async assignResources(
    actor: AuthenticatedUser,
    id: string,
    dto: AssignDispatchResourcesDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const trip = await this.getTripOrThrow(actor.organizationId, id);
    if (['completed', 'reconciled', 'cancelled'].includes(trip.status)) {
      throw new ConflictException('Cannot reassign completed/cancelled dispatch trip');
    }

    if (dto.vehicleId) {
      await this.getVehicleOrThrow(actor.organizationId, dto.vehicleId);
    }
    if (dto.driverEmployeeId) {
      await this.getEmployeeOrThrow(actor.organizationId, dto.driverEmployeeId);
    }
    if (dto.helperEmployeeId) {
      await this.getEmployeeOrThrow(actor.organizationId, dto.helperEmployeeId);
    }

    const updated = await this.prisma.dispatchTrip.update({
      where: { id },
      data: {
        vehicleId: dto.vehicleId ?? trip.vehicleId,
        driverEmployeeId: dto.driverEmployeeId ?? trip.driverEmployeeId,
        helperEmployeeId: dto.helperEmployeeId ?? trip.helperEmployeeId,
      },
    });

    return {
      success: true,
      message: 'Dispatch resources assigned successfully',
      data: updated,
    };
  }

  async start(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    let trip = await this.getTripOrThrow(actor.organizationId, id);
    if (trip.status === 'cancelled') {
      throw new ConflictException('Cancelled trip cannot be started');
    }

    if (trip.status === 'planned') {
      await this.generateLoadingSheet(actor, id);
      trip = await this.getTripOrThrow(actor.organizationId, id);
    }

    if (!trip.challanNo) {
      await this.generateChallan(actor, id);
      trip = await this.getTripOrThrow(actor.organizationId, id);
    }

    if (!['loaded', 'dispatched', 'in_transit'].includes(trip.status)) {
      throw new BadRequestException('Trip must be loaded before it can be started');
    }

    const stopsForCredit = await this.prisma.deliveryStop.findMany({
      where: { organizationId: actor.organizationId, dispatchTripId: id },
      orderBy: { stopSequence: 'asc' },
    });
    const stopOrderIds = stopsForCredit
      .map((stop) => stop.salesOrderId)
      .filter((value): value is string => Boolean(value));
    const stopOrders = stopOrderIds.length
      ? await this.prisma.salesOrder.findMany({
          where: { organizationId: actor.organizationId, id: { in: stopOrderIds } },
          select: { id: true, grandTotal: true },
        })
      : [];
    const stopOrderMap = new Map<string, any>(stopOrders.map((order): [string, any] => [order.id, order]));

    for (const stop of stopsForCredit) {
      await this.creditControlService.assertCreditAllowed(actor, stop.retailerId, {
        context: 'dispatch_release',
        transactionAmount: this.toNumber(stop.salesOrderId ? stopOrderMap.get(stop.salesOrderId)?.grandTotal : 0),
        salesOrderId: stop.salesOrderId ?? undefined,
        dispatchTripId: id,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.dispatchTrip.update({
        where: { id },
        data: {
          status: 'dispatched',
          actualStartAt: trip.actualStartAt ?? new Date(),
        },
      });

      const stops = await tx.deliveryStop.findMany({
        where: { dispatchTripId: id },
      });

      for (const stop of stops) {
        if (!stop.salesOrderId) continue;
        const order = await tx.salesOrder.findFirst({ where: { id: stop.salesOrderId } });
        if (order && ['approved', 'packed'].includes(order.status)) {
          await tx.salesOrder.update({
            where: { id: order.id },
            data: { status: 'dispatched' },
          });
          await tx.salesOrderStatusHistory.create({
            data: {
              organizationId: actor.organizationId,
              salesOrderId: order.id,
              oldStatus: order.status,
              newStatus: 'dispatched',
              changedByUserId: actor.id,
              note: `Dispatched through trip ${trip.tripNo}`,
            },
          });
        }
      }
    });

    return this.findOne(actor, id);
  }

  async complete(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const trip = await this.getTripOrThrow(actor.organizationId, id);
    if (trip.status === 'cancelled') {
      throw new ConflictException('Cancelled trip cannot be completed');
    }

    const pendingStops = await this.prisma.deliveryStop.count({
      where: {
        organizationId: actor.organizationId,
        dispatchTripId: id,
        status: 'pending',
      },
    });

    if (pendingStops > 0) {
      throw new ConflictException('All delivery stops must be closed before trip completion');
    }

    const updated = await this.prisma.dispatchTrip.update({
      where: { id },
      data: {
        status: 'completed',
        actualEndAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Dispatch trip completed successfully',
      data: updated,
    };
  }

  async getStops(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    await this.getAccessibleTripOrThrow(actor, id);

    const stops = await this.prisma.deliveryStop.findMany({
      where: { organizationId: actor.organizationId, dispatchTripId: id },
      orderBy: { stopSequence: 'asc' },
    });

    return {
      success: true,
      message: 'Dispatch trip stops fetched successfully',
      data: await this.enrichStops(actor.organizationId, stops),
    };
  }

  async getLoadingSheet(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    await this.getAccessibleTripOrThrow(actor, id);

    const trip = await this.getTripOrThrow(actor.organizationId, id);
    const items = await this.prisma.dispatchTripItem.findMany({
      where: { organizationId: actor.organizationId, dispatchTripId: id },
      orderBy: { createdAt: 'asc' },
    });

    const enrichedItems = await this.enrichTripItems(actor.organizationId, items);
    const stockContext = await this.buildLoadingSheetStockContext(actor.organizationId, items);

    return {
      success: true,
      message: 'Loading sheet fetched successfully',
      data: {
        tripId: id,
        tripNo: trip.tripNo,
        loadingSheetNo: trip.loadingSheetNo,
        status: trip.status,
        items: enrichedItems.map((item) => ({
          ...item,
          stockOnHand: stockContext.get(item.variantId) ?? 0,
        })),
      },
    };
  }

  async generateLoadingSheet(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const trip = await this.getTripOrThrow(actor.organizationId, id);
    if (['dispatched', 'in_transit', 'completed', 'reconciled', 'cancelled'].includes(trip.status)) {
      throw new ConflictException('Loading sheet cannot be generated for current trip status');
    }

    const items = await this.prisma.dispatchTripItem.findMany({
      where: { organizationId: actor.organizationId, dispatchTripId: id },
      orderBy: { createdAt: 'asc' },
    });
    if (!items.length) {
      throw new BadRequestException('Dispatch trip has no planned items');
    }

    const currentLoaded = items.every((item) => this.toNumber(item.loadedQty) >= this.toNumber(item.plannedQty));
    if (trip.status === 'loaded' && currentLoaded) {
      return this.getLoadingSheet(actor, id);
    }

    const loadingSheetNo = trip.loadingSheetNo ?? (await this.generateLoadingSheetNo(actor.organizationId));

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const plannedQty = this.toNumber(item.plannedQty);
        if (plannedQty <= 0) continue;

        const batches = await tx.inventoryBatch.findMany({
          where: {
            organizationId: actor.organizationId,
            warehouseId: item.sourceWarehouseId,
            variantId: item.variantId,
            availableQty: { gt: 0 },
          },
          orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
        });

        const totalAvailable = batches.reduce(
          (sum, batch) => sum + this.toNumber(batch.availableQty),
          0,
        );
        if (totalAvailable < plannedQty) {
          throw new BadRequestException('Insufficient stock available for dispatch loading');
        }

        let remaining = plannedQty;
        let firstBatchId: string | null = null;

        for (const batch of batches) {
          if (remaining <= 0) break;
          const available = this.toNumber(batch.availableQty);
          const consume = Math.min(available, remaining);
          remaining = this.roundQty(remaining - consume);
          if (!firstBatchId) firstBatchId = batch.id;

          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: {
              availableQty: this.roundQty(available - consume),
              status: available - consume <= 0 ? 'consumed' : batch.status,
            },
          });

          await tx.stockMovement.create({
            data: {
              organizationId: actor.organizationId,
              movementNo: await this.generateMovementNo(tx, actor.organizationId),
              warehouseId: item.sourceWarehouseId,
              variantId: item.variantId,
              inventoryBatchId: batch.id,
              movementType: 'dispatch_out',
              referenceType: 'trip',
              referenceId: id,
              qtyIn: 0,
              qtyOut: consume,
              movementAt: new Date(),
              remarks: `Dispatch loading for trip ${trip.tripNo}`,
            },
          });
        }

        await tx.dispatchTripItem.update({
          where: { id: item.id },
          data: {
            loadedQty: plannedQty,
            inventoryBatchId: firstBatchId,
          },
        });
      }

      const stopItems = await tx.deliveryStopItem.findMany({
        where: {
          organizationId: actor.organizationId,
          deliveryStop: { is: { dispatchTripId: id } },
        },
      });

      for (const stopItem of stopItems) {
        await tx.deliveryStopItem.update({
          where: { id: stopItem.id },
          data: {
            loadedQty: stopItem.orderedQty,
          },
        });
      }

      const stops = await tx.deliveryStop.findMany({ where: { dispatchTripId: id } });
      for (const stop of stops) {
        if (!stop.salesOrderId) continue;
        const order = await tx.salesOrder.findFirst({ where: { id: stop.salesOrderId } });
        if (order && order.status === 'approved') {
          await tx.salesOrder.update({
            where: { id: order.id },
            data: { status: 'packed' },
          });
          await tx.salesOrderStatusHistory.create({
            data: {
              organizationId: actor.organizationId,
              salesOrderId: order.id,
              oldStatus: order.status,
              newStatus: 'packed',
              changedByUserId: actor.id,
              note: `Packed for trip ${trip.tripNo}`,
            },
          });
        }
      }

      await tx.dispatchTrip.update({
        where: { id },
        data: {
          status: 'loaded',
          loadingSheetNo,
        },
      });
    });

    return this.getLoadingSheet(actor, id);
  }

  async generateChallan(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const trip = await this.getTripOrThrow(actor.organizationId, id);
    if (trip.status === 'cancelled') {
      throw new ConflictException('Cancelled trip cannot generate challan');
    }

    const existing = await this.prisma.deliveryChallan.findFirst({
      where: { organizationId: actor.organizationId, dispatchTripId: id },
    });
    if (existing) {
      return this.getChallan(actor, id);
    }

    const challanNo = await this.generateChallanNo(actor.organizationId);

    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryChallan.create({
        data: {
          organizationId: actor.organizationId,
          challanNo,
          dispatchTripId: id,
          issueDate: new Date(),
          status: 'generated',
        },
      });

      await tx.dispatchTrip.update({
        where: { id },
        data: { challanNo },
      });
    });

    return this.getChallan(actor, id);
  }

  async getChallan(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    await this.getAccessibleTripOrThrow(actor, id);

    const challan = await this.prisma.deliveryChallan.findFirst({
      where: { organizationId: actor.organizationId, dispatchTripId: id },
    });
    if (!challan) {
      throw new NotFoundException('Delivery challan not found for trip');
    }

    const trip = await this.findOne(actor, id);

    return {
      success: true,
      message: 'Delivery challan fetched successfully',
      data: {
        challan,
        trip: trip.data,
      },
    };
  }

  private async createTrip(
    actor: AuthenticatedUser,
    dto: {
      deliveryCycleId: string;
      routeId: string;
      vehicleId?: string;
      driverEmployeeId?: string;
      helperEmployeeId?: string;
      dispatchDate: string;
      plannedStartAt?: string;
      notes?: string;
    },
  ) {
    const cycle = await this.getDeliveryCycleOrThrow(actor.organizationId, dto.deliveryCycleId);
    const route = await this.getRouteOrThrow(actor.organizationId, dto.routeId);
    if (dto.vehicleId) await this.getVehicleOrThrow(actor.organizationId, dto.vehicleId);
    if (dto.driverEmployeeId) await this.getEmployeeOrThrow(actor.organizationId, dto.driverEmployeeId);
    if (dto.helperEmployeeId) await this.getEmployeeOrThrow(actor.organizationId, dto.helperEmployeeId);

    const existingTrip = await this.prisma.dispatchTrip.findFirst({
      where: {
        organizationId: actor.organizationId,
        deliveryCycleId: dto.deliveryCycleId,
        routeId: dto.routeId,
        status: { not: 'cancelled' },
      },
      select: { id: true, tripNo: true },
    });
    if (existingTrip) {
      throw new ConflictException(`Dispatch trip ${existingTrip.tripNo} already exists for this cycle and route`);
    }

    const orders = await this.prisma.salesOrder.findMany({
      where: {
        organizationId: actor.organizationId,
        deliveryCycleId: dto.deliveryCycleId,
        routeId: dto.routeId,
        status: { in: ['approved', 'packed'] },
      },
      include: { items: true },
      orderBy: { orderDate: 'asc' },
    });

    if (!orders.length) {
      throw new BadRequestException('No approved or packed orders found for this route and cycle');
    }

    const mainWarehouse = await this.resolveSourceWarehouse(actor.organizationId);
    const tripNo = await this.generateTripNo(actor.organizationId);
    const routeRetailers = await this.prisma.routeRetailer.findMany({
      where: {
        organizationId: actor.organizationId,
        routeId: dto.routeId,
        retailerId: { in: orders.map((order) => order.retailerId) },
      },
    });
    const stopSequenceMap = new Map<string, any>(routeRetailers.map((row): [string, any] => [row.retailerId, row.stopSequence]));

    const aggregatedTripItems = this.aggregateTripItems(orders);

    const createdTrip = await this.prisma.$transaction(async (tx) => {
      const trip = await tx.dispatchTrip.create({
        data: {
          organizationId: actor.organizationId,
          tripNo,
          deliveryCycleId: cycle.id,
          routeId: route.id,
          vehicleId: dto.vehicleId ?? null,
          driverEmployeeId: dto.driverEmployeeId ?? null,
          helperEmployeeId: dto.helperEmployeeId ?? null,
          dispatchDate: new Date(dto.dispatchDate),
          plannedStartAt: dto.plannedStartAt ? new Date(dto.plannedStartAt) : null,
          status: 'planned',
          totalStops: orders.length,
          notes: dto.notes,
        },
      });

      await tx.dispatchTripItem.createMany({
        data: aggregatedTripItems.map((item) => ({
          organizationId: actor.organizationId,
          dispatchTripId: trip.id,
          variantId: item.variantId,
          plannedQty: item.plannedQty,
          loadedQty: 0,
          sourceWarehouseId: mainWarehouse.id,
        })),
      });

      const sortedOrders = [...orders].sort((a, b) => {
        const seqA = stopSequenceMap.get(a.retailerId) ?? Number.MAX_SAFE_INTEGER;
        const seqB = stopSequenceMap.get(b.retailerId) ?? Number.MAX_SAFE_INTEGER;
        if (seqA !== seqB) return seqA - seqB;
        return a.orderDate.getTime() - b.orderDate.getTime();
      });

      for (let index = 0; index < sortedOrders.length; index += 1) {
        const order = sortedOrders[index];
        const stop = await tx.deliveryStop.create({
          data: {
            organizationId: actor.organizationId,
            dispatchTripId: trip.id,
            retailerId: order.retailerId,
            salesOrderId: order.id,
            stopSequence: index + 1,
            status: 'pending',
            notes: `Created from order ${order.orderNo}`,
          },
        });

        await tx.deliveryStopItem.createMany({
          data: order.items.map((item) => ({
            organizationId: actor.organizationId,
            deliveryStopId: stop.id,
            salesOrderItemId: item.id,
            variantId: item.variantId,
            orderedQty: item.approvedQty ?? item.orderedQty,
            loadedQty: 0,
            deliveredQty: 0,
            returnedQty: 0,
            damagedQty: 0,
            refusedQty: 0,
            unitPrice: item.unitPrice,
            taxAmount: item.taxAmount,
            lineTotal: item.lineTotal,
          })),
        });
      }

      return trip;
    });

    return this.findOne(actor, createdTrip.id);
  }

  private aggregateTripItems(orders: TripOrder[]) {
    const map = new Map<string, { variantId: string; plannedQty: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const plannedQty = this.toNumber(item.approvedQty ?? item.orderedQty);
        const current = map.get(item.variantId) ?? { variantId: item.variantId, plannedQty: 0 };
        current.plannedQty = this.roundQty(current.plannedQty + plannedQty);
        map.set(item.variantId, current);
      }
    }
    return [...map.values()];
  }

  private async enrichTrips(organizationId: string, trips: DispatchTrip[]) {
    const routeIds = [...new Set(trips.map((trip) => trip.routeId))];
    const cycleIds = [...new Set(trips.map((trip) => trip.deliveryCycleId))];
    const vehicleIds = [...new Set(trips.map((trip) => trip.vehicleId).filter((v): v is string => Boolean(v)))];

    const [routes, cycles, vehicles] = await Promise.all([
      routeIds.length
        ? this.prisma.route.findMany({
            where: { organizationId, id: { in: routeIds } },
            select: { id: true, code: true, name: true, deliveryShift: true },
          })
        : [],
      cycleIds.length
        ? this.prisma.deliveryCycle.findMany({
            where: { organizationId, id: { in: cycleIds } },
            select: { id: true, cycleCode: true, deliveryDate: true, deliveryShift: true },
          })
        : [],
      vehicleIds.length
        ? this.prisma.vehicle.findMany({
            where: { organizationId, id: { in: vehicleIds } },
            select: { id: true, vehicleNo: true, vehicleType: true },
          })
        : [],
    ]);

    const routeMap = new Map<string, any>(routes.map((row): [string, any] => [row.id, row]));
    const cycleMap = new Map<string, any>(cycles.map((row): [string, any] => [row.id, row]));
    const vehicleMap = new Map<string, any>(vehicles.map((row): [string, any] => [row.id, row]));

    return trips.map((trip) => ({
      ...trip,
      route: routeMap.get(trip.routeId) ?? null,
      deliveryCycle: cycleMap.get(trip.deliveryCycleId) ?? null,
      vehicle: trip.vehicleId ? vehicleMap.get(trip.vehicleId) ?? null : null,
    }));
  }

  private async enrichTripItems(organizationId: string, items: DispatchTripItem[]) {
    const variantIds = [...new Set(items.map((item) => item.variantId))];
    const warehouseIds = [...new Set(items.map((item) => item.sourceWarehouseId))];

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

    return items.map((item) => ({
      ...item,
      plannedQty: this.toNumber(item.plannedQty),
      loadedQty: this.toNumber(item.loadedQty),
      warehouse: warehouseMap.get(item.sourceWarehouseId) ?? null,
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

  private async enrichStops(organizationId: string, stops: DeliveryStop[]) {
    const retailerIds = [...new Set(stops.map((stop) => stop.retailerId))];
    const orderIds = [...new Set(stops.map((stop) => stop.salesOrderId).filter((v): v is string => Boolean(v)))];
    const stopIds = stops.map((stop) => stop.id);

    const [retailers, orders, stopItems] = await Promise.all([
      retailerIds.length
        ? this.prisma.retailer.findMany({
            where: { organizationId, id: { in: retailerIds } },
            select: {
              id: true,
              retailerCode: true,
              shopName: true,
              ownerName: true,
              mobile: true,
              locality: true,
            },
          })
        : [],
      orderIds.length
        ? this.prisma.salesOrder.findMany({
            where: { organizationId, id: { in: orderIds } },
            select: { id: true, orderNo: true, status: true, source: true },
          })
        : [],
      stopIds.length
        ? this.prisma.deliveryStopItem.findMany({
            where: { organizationId, deliveryStopId: { in: stopIds } },
            orderBy: { createdAt: 'asc' },
          })
        : [],
    ]);

    const retailerMap = new Map<string, any>(retailers.map((row): [string, any] => [row.id, row]));
    const orderMap = new Map<string, any>(orders.map((row): [string, any] => [row.id, row]));
    const itemsByStop = new Map<string, DeliveryStopItem[]>();
    for (const item of stopItems) {
      const list = itemsByStop.get(item.deliveryStopId) ?? [];
      list.push(item);
      itemsByStop.set(item.deliveryStopId, list);
    }

    const enrichedStopItems = await this.enrichDeliveryStopItems(organizationId, stopItems);
    const enrichedByStop = new Map<string, typeof enrichedStopItems>();
    for (const item of enrichedStopItems) {
      const list = enrichedByStop.get(item.deliveryStopId) ?? [];
      list.push(item);
      enrichedByStop.set(item.deliveryStopId, list);
    }

    return stops.map((stop) => ({
      ...stop,
      retailer: retailerMap.get(stop.retailerId) ?? null,
      salesOrder: stop.salesOrderId ? orderMap.get(stop.salesOrderId) ?? null : null,
      items: enrichedByStop.get(stop.id) ?? [],
    }));
  }

  private async enrichDeliveryStopItems(organizationId: string, items: DeliveryStopItem[]) {
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
      loadedQty: this.toNumber(item.loadedQty),
      deliveredQty: this.toNumber(item.deliveredQty),
      returnedQty: this.toNumber(item.returnedQty),
      damagedQty: this.toNumber(item.damagedQty),
      refusedQty: this.toNumber(item.refusedQty),
      unitPrice: this.toNumber(item.unitPrice),
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

  private async buildLoadingSheetStockContext(organizationId: string, items: DispatchTripItem[]) {
    const map = new Map<string, number>();
    for (const item of items) {
      const batches = await this.prisma.inventoryBatch.findMany({
        where: {
          organizationId,
          warehouseId: item.sourceWarehouseId,
          variantId: item.variantId,
        },
        select: { availableQty: true },
      });
      map.set(
        item.variantId,
        this.roundQty(
          batches.reduce((sum, batch) => sum + this.toNumber(batch.availableQty), 0),
        ),
      );
    }
    return map;
  }

  private async resolveSourceWarehouse(organizationId: string) {
    const warehouse =
      (await this.prisma.warehouse.findFirst({
        where: { organizationId, warehouseType: 'main', isActive: true },
      })) ??
      (await this.prisma.warehouse.findFirst({
        where: { organizationId, isActive: true },
      }));

    if (!warehouse) {
      throw new NotFoundException('No active warehouse found for dispatch loading');
    }

    return warehouse;
  }

  private async getAccessibleTripOrThrow(actor: AuthenticatedUser, id: string) {
    const trip = await this.getTripOrThrow(actor.organizationId, id);
    if (!this.isBackoffice(actor)) {
      if (!actor.employeeId || ![trip.driverEmployeeId, trip.helperEmployeeId].includes(actor.employeeId)) {
        throw new ForbiddenException('You are not assigned to this trip');
      }
    }
    return trip;
  }

  private async getTripOrThrow(organizationId: string, id: string): Promise<DispatchTrip> {
    const trip = await this.prisma.dispatchTrip.findFirst({
      where: { id, organizationId },
    });
    if (!trip) throw new NotFoundException('Dispatch trip not found');
    return trip;
  }

  private async getDeliveryCycleOrThrow(organizationId: string, id: string) {
    const cycle = await this.prisma.deliveryCycle.findFirst({
      where: { id, organizationId },
    });
    if (!cycle) throw new NotFoundException('Delivery cycle not found');
    return cycle;
  }

  private async getRouteOrThrow(organizationId: string, id: string) {
    const route = await this.prisma.route.findFirst({ where: { id, organizationId } });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }

  private async getVehicleOrThrow(organizationId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, organizationId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  private async getEmployeeOrThrow(organizationId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id, organizationId } });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  private async generateTripNo(organizationId: string) {
    const total = await this.prisma.dispatchTrip.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `TRIP-${datePart}-${String(total + 1).padStart(4, '0')}`;
  }

  private async generateLoadingSheetNo(organizationId: string) {
    const total = await this.prisma.dispatchTrip.count({
      where: { organizationId, loadingSheetNo: { not: null } },
    });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `LOAD-${datePart}-${String(total + 1).padStart(4, '0')}`;
  }

  private async generateChallanNo(organizationId: string) {
    const total = await this.prisma.deliveryChallan.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `CHL-${datePart}-${String(total + 1).padStart(4, '0')}`;
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
    if (!this.hasPrivilegedOpsAccess(actor)) {
      throw new ForbiddenException('Operations/admin access required');
    }
  }

  private isBackoffice(actor: AuthenticatedUser) {
    return this.hasPrivilegedOpsAccess(actor);
  }

  private hasPrivilegedOpsAccess(actor: AuthenticatedUser) {
    return (
      actor.roles.includes('OWNER') ||
      actor.roles.includes('OPERATIONS_ADMIN') ||
      actor.roles.includes('ACCOUNTANT') ||
      actor.userType === 'owner' ||
      actor.userType === 'ops_admin' ||
      actor.userType === 'accountant'
    );
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private roundQty(value: number) {
    return Number(value.toFixed(3));
  }
}
