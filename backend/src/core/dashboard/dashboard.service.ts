import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DispatchTrip, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardQueryDto } from './dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(actor: AuthenticatedUser, query: DashboardQueryDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(query, true);
    const tripIds = await this.getTripIdsForRange(actor.organizationId, from, to, query.routeId);
    const summary = await this.buildSummary(actor.organizationId, from, to, tripIds, query.routeId);

    return {
      success: true,
      message: 'Dashboard summary fetched successfully',
      data: summary,
    };
  }

  async getMonthlySalesChart(actor: AuthenticatedUser, query: DashboardQueryDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const now = new Date();
    const end = query.toDate ? new Date(query.toDate) : now;
    const start = query.fromDate
      ? new Date(query.fromDate)
      : new Date(end.getFullYear(), end.getMonth() - 5, 1);

    const routeTripIds = query.routeId
      ? (
          await this.prisma.dispatchTrip.findMany({
            where: {
              organizationId: actor.organizationId,
              routeId: query.routeId,
            },
            select: { id: true },
          })
        ).map((trip) => trip.id)
      : undefined;

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId: actor.organizationId,
        invoiceDate: { gte: start, lte: end },
        ...(routeTripIds ? { dispatchTripId: { in: routeTripIds } } : {}),
      },
      select: {
        invoiceDate: true,
        grandTotal: true,
      },
      orderBy: { invoiceDate: 'asc' },
    });

    const buckets = new Map<string, number>();
    for (const invoice of invoices) {
      const key = `${invoice.invoiceDate.getFullYear()}-${String(invoice.invoiceDate.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, this.roundMoney((buckets.get(key) ?? 0) + this.toNumber(invoice.grandTotal)));
    }

    return {
      success: true,
      message: 'Monthly sales chart fetched successfully',
      data: [...buckets.entries()].map(([month, totalSales]) => ({ month, totalSales })),
    };
  }

  async getTopProducts(actor: AuthenticatedUser, query: DashboardQueryDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(query, false);
    const routeTripIds = query.routeId
      ? (
          await this.prisma.dispatchTrip.findMany({
            where: {
              organizationId: actor.organizationId,
              routeId: query.routeId,
            },
            select: { id: true },
          })
        ).map((trip) => trip.id)
      : undefined;

    const invoiceIds = (
      await this.prisma.salesInvoice.findMany({
        where: {
          organizationId: actor.organizationId,
          invoiceDate: { gte: from, lte: to },
          ...(routeTripIds ? { dispatchTripId: { in: routeTripIds } } : {}),
        },
        select: { id: true },
      })
    ).map((invoice) => invoice.id);

    const items = invoiceIds.length
      ? await this.prisma.salesInvoiceItem.findMany({
          where: {
            organizationId: actor.organizationId,
            salesInvoiceId: { in: invoiceIds },
          },
          select: {
            variantId: true,
            billedQty: true,
            lineTotal: true,
          },
        })
      : [];

    const grouped = new Map<string, { totalQty: number; totalSales: number }>();
    for (const item of items) {
      const current = grouped.get(item.variantId) ?? { totalQty: 0, totalSales: 0 };
      current.totalQty = this.roundQty(current.totalQty + this.toNumber(item.billedQty));
      current.totalSales = this.roundMoney(current.totalSales + this.toNumber(item.lineTotal));
      grouped.set(item.variantId, current);
    }

    const variants = await this.prisma.productVariant.findMany({
      where: {
        organizationId: actor.organizationId,
        id: { in: [...grouped.keys()] },
      },
      select: {
        id: true,
        sku: true,
        variantName: true,
        product: {
          select: { id: true, name: true },
        },
      },
    });
    const variantMap = new Map<string, any>(variants.map((variant) => [variant.id, variant]));

    const data = [...grouped.entries()]
      .map(([variantId, totals]) => ({
        variantId,
        totalQty: totals.totalQty,
        totalSales: totals.totalSales,
        variant: variantMap.get(variantId) ?? null,
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);

    return {
      success: true,
      message: 'Top products chart fetched successfully',
      data,
    };
  }

  async getTopRetailers(actor: AuthenticatedUser, query: DashboardQueryDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(query, false);
    const routeTripIds = query.routeId
      ? (
          await this.prisma.dispatchTrip.findMany({
            where: {
              organizationId: actor.organizationId,
              routeId: query.routeId,
            },
            select: { id: true },
          })
        ).map((trip) => trip.id)
      : undefined;

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId: actor.organizationId,
        invoiceDate: { gte: from, lte: to },
        ...(routeTripIds ? { dispatchTripId: { in: routeTripIds } } : {}),
      },
      select: {
        retailerId: true,
        grandTotal: true,
      },
    });

    const grouped = new Map<string, { totalSales: number; invoiceCount: number }>();
    for (const invoice of invoices) {
      const current = grouped.get(invoice.retailerId) ?? { totalSales: 0, invoiceCount: 0 };
      current.totalSales = this.roundMoney(current.totalSales + this.toNumber(invoice.grandTotal));
      current.invoiceCount += 1;
      grouped.set(invoice.retailerId, current);
    }

    const retailers = await this.prisma.retailer.findMany({
      where: {
        organizationId: actor.organizationId,
        id: { in: [...grouped.keys()] },
      },
      select: {
        id: true,
        retailerCode: true,
        shopName: true,
        mobile: true,
      },
    });
    const retailerMap = new Map<string, any>(retailers.map((retailer) => [retailer.id, retailer]));

    const data = [...grouped.entries()]
      .map(([retailerId, totals]) => ({
        retailerId,
        totalSales: totals.totalSales,
        invoiceCount: totals.invoiceCount,
        retailer: retailerMap.get(retailerId) ?? null,
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);

    return {
      success: true,
      message: 'Top retailers chart fetched successfully',
      data,
    };
  }

  async getDeliveryPerformance(actor: AuthenticatedUser, query: DashboardQueryDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(query, true);
    const tripIds = await this.getTripIdsForRange(actor.organizationId, from, to, query.routeId);

    const stops = tripIds.length
      ? await this.prisma.deliveryStop.findMany({
          where: {
            organizationId: actor.organizationId,
            dispatchTripId: { in: tripIds },
          },
          select: {
            status: true,
          },
        })
      : [];

    const counts = {
      pending: 0,
      delivered: 0,
      partial: 0,
      failed: 0,
      refused: 0,
    };

    for (const stop of stops) {
      if (stop.status in counts) {
        counts[stop.status as keyof typeof counts] += 1;
      }
    }

    const total = stops.length;
    const successRate = total
      ? this.roundMoney(((counts.delivered + counts.partial) / total) * 100)
      : 0;

    return {
      success: true,
      message: 'Delivery performance fetched successfully',
      data: {
        ...counts,
        totalStops: total,
        successRate,
      },
    };
  }

  async getStaffPerformance(actor: AuthenticatedUser, query: DashboardQueryDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(query, true);
    const trips = await this.prisma.dispatchTrip.findMany({
      where: {
        organizationId: actor.organizationId,
        dispatchDate: { gte: from, lte: to },
        ...(query.routeId ? { routeId: query.routeId } : {}),
      },
      select: {
        id: true,
        driverEmployeeId: true,
        helperEmployeeId: true,
        status: true,
      },
    });

    const tripIds = trips.map((trip) => trip.id);
    const stops = tripIds.length
      ? await this.prisma.deliveryStop.findMany({
          where: {
            organizationId: actor.organizationId,
            dispatchTripId: { in: tripIds },
          },
          select: {
            dispatchTripId: true,
            status: true,
          },
        })
      : [];

    const collections = await this.prisma.paymentReceipt.findMany({
      where: {
        organizationId: actor.organizationId,
        paymentDate: { gte: from, lte: to },
        status: { not: 'cancelled' },
      },
      select: {
        collectedByEmployeeId: true,
        amount: true,
      },
    });

    const employeeIds = [
      ...new Set(
        trips
          .flatMap((trip) => [trip.driverEmployeeId, trip.helperEmployeeId])
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const employees = employeeIds.length
      ? await this.prisma.employee.findMany({
          where: {
            organizationId: actor.organizationId,
            id: { in: employeeIds },
          },
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            designation: true,
            mobile: true,
          },
        })
      : [];
    const employeeMap = new Map<string, any>(employees.map((employee) => [employee.id, employee]));

    const stopCountByTrip = new Map<string, { delivered: number; pending: number; failed: number; partial: number }>();
    for (const stop of stops) {
      const current = stopCountByTrip.get(stop.dispatchTripId) ?? {
        delivered: 0,
        pending: 0,
        failed: 0,
        partial: 0,
      };
      if (stop.status === 'delivered') current.delivered += 1;
      else if (stop.status === 'partial') current.partial += 1;
      else if (stop.status === 'pending') current.pending += 1;
      else if (stop.status === 'failed' || stop.status === 'refused') current.failed += 1;
      stopCountByTrip.set(stop.dispatchTripId, current);
    }

    const summaryMap = new Map<
      string,
      {
        tripCount: number;
        deliveredStops: number;
        partialStops: number;
        pendingStops: number;
        failedStops: number;
        collectionAmount: number;
      }
    >();

    for (const trip of trips) {
      const involved = [trip.driverEmployeeId, trip.helperEmployeeId].filter(
        (value): value is string => Boolean(value),
      );
      for (const employeeId of involved) {
        const current = summaryMap.get(employeeId) ?? {
          tripCount: 0,
          deliveredStops: 0,
          partialStops: 0,
          pendingStops: 0,
          failedStops: 0,
          collectionAmount: 0,
        };
        const stopCounts = stopCountByTrip.get(trip.id) ?? {
          delivered: 0,
          partial: 0,
          pending: 0,
          failed: 0,
        };
        current.tripCount += 1;
        current.deliveredStops += stopCounts.delivered;
        current.partialStops += stopCounts.partial;
        current.pendingStops += stopCounts.pending;
        current.failedStops += stopCounts.failed;
        summaryMap.set(employeeId, current);
      }
    }

    for (const collection of collections) {
      if (!collection.collectedByEmployeeId) continue;
      const current = summaryMap.get(collection.collectedByEmployeeId) ?? {
        tripCount: 0,
        deliveredStops: 0,
        partialStops: 0,
        pendingStops: 0,
        failedStops: 0,
        collectionAmount: 0,
      };
      current.collectionAmount = this.roundMoney(
        current.collectionAmount + this.toNumber(collection.amount),
      );
      summaryMap.set(collection.collectedByEmployeeId, current);
    }

    const data = [...summaryMap.entries()].map(([employeeId, summary]) => ({
      employeeId,
      employee: employeeMap.get(employeeId) ?? null,
      ...summary,
    }));

    return {
      success: true,
      message: 'Staff performance fetched successfully',
      data,
    };
  }

  async getOwnerDashboard(actor: AuthenticatedUser, query: DashboardQueryDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const summary = await this.getSummary(actor, query);
    const [monthlySales, topProducts, topRetailers] = await Promise.all([
      this.getMonthlySalesChart(actor, query),
      this.getTopProducts(actor, query),
      this.getTopRetailers(actor, query),
    ]);

    return {
      success: true,
      message: 'Owner dashboard fetched successfully',
      data: {
        summary: summary.data,
        monthlySales: monthlySales.data,
        topProducts: topProducts.data,
        topRetailers: topRetailers.data,
      },
    };
  }

  async getOperationsDashboard(actor: AuthenticatedUser, query: DashboardQueryDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const summary = await this.getSummary(actor, query);
    const deliveryPerformance = await this.getDeliveryPerformance(actor, query);
    const pendingOrders = await this.prisma.salesOrder.count({
      where: {
        organizationId: actor.organizationId,
        status: 'pending',
      },
    });

    return {
      success: true,
      message: 'Operations dashboard fetched successfully',
      data: {
        summary: summary.data,
        pendingOrders,
        deliveryPerformance: deliveryPerformance.data,
      },
    };
  }

  async getFinanceDashboard(actor: AuthenticatedUser, query: DashboardQueryDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const summary = await this.getSummary(actor, query);
    const { from, to } = this.resolveDateRange(query, true);

    const collectionsByMode = await this.prisma.paymentReceipt.findMany({
      where: {
        organizationId: actor.organizationId,
        paymentDate: { gte: from, lte: to },
        status: { not: 'cancelled' },
      },
      select: {
        paymentMode: true,
        amount: true,
      },
    });

    const grouped = new Map<string, number>();
    for (const collection of collectionsByMode) {
      grouped.set(
        collection.paymentMode,
        this.roundMoney((grouped.get(collection.paymentMode) ?? 0) + this.toNumber(collection.amount)),
      );
    }

    return {
      success: true,
      message: 'Finance dashboard fetched successfully',
      data: {
        summary: summary.data,
        collectionByMode: [...grouped.entries()].map(([paymentMode, amount]) => ({ paymentMode, amount })),
      },
    };
  }

  async getDispatchDashboard(actor: AuthenticatedUser, query: DashboardQueryDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(query, true);
    const trips = await this.prisma.dispatchTrip.findMany({
      where: {
        organizationId: actor.organizationId,
        dispatchDate: { gte: from, lte: to },
        ...(query.routeId ? { routeId: query.routeId } : {}),
      },
      orderBy: { dispatchDate: 'desc' },
    });
    const performance = await this.getDeliveryPerformance(actor, query);

    return {
      success: true,
      message: 'Dispatch dashboard fetched successfully',
      data: {
        trips: await this.enrichTrips(actor.organizationId, trips),
        deliveryPerformance: performance.data,
      },
    };
  }

  async getRetailerDashboard(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);

    const retailerId = actor.retailerId!;
    const [latestOrder, recentInvoices, outstanding] = await Promise.all([
      this.prisma.salesOrder.findFirst({
        where: {
          organizationId: actor.organizationId,
          retailerId,
        },
        orderBy: { orderDate: 'desc' },
      }),
      this.prisma.salesInvoice.findMany({
        where: {
          organizationId: actor.organizationId,
          retailerId,
        },
        orderBy: { invoiceDate: 'desc' },
        take: 5,
      }),
      this.prisma.salesInvoice.aggregate({
        where: {
          organizationId: actor.organizationId,
          retailerId,
          status: { in: ['posted', 'partial_paid'] },
        },
        _sum: { outstandingAmount: true },
      }),
    ]);

    return {
      success: true,
      message: 'Retailer dashboard fetched successfully',
      data: {
        retailerId,
        latestOrder,
        recentInvoices: recentInvoices.map((invoice) => ({
          ...invoice,
          grandTotal: this.toNumber(invoice.grandTotal),
          outstandingAmount: this.toNumber(invoice.outstandingAmount),
        })),
        outstandingAmount: this.toNumber(outstanding._sum.outstandingAmount),
      },
    };
  }

  async getDriverDashboard(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    if (!actor.employeeId) {
      throw new ForbiddenException('Driver/staff dashboard requires employee context');
    }

    const today = this.startOfDay(new Date());
    const trips = await this.prisma.dispatchTrip.findMany({
      where: {
        organizationId: actor.organizationId,
        dispatchDate: today,
        OR: [
          { driverEmployeeId: actor.employeeId },
          { helperEmployeeId: actor.employeeId },
        ],
      },
      orderBy: { dispatchDate: 'desc' },
    });

    const tripIds = trips.map((trip) => trip.id);
    const stops = tripIds.length
      ? await this.prisma.deliveryStop.findMany({
          where: {
            organizationId: actor.organizationId,
            dispatchTripId: { in: tripIds },
          },
        })
      : [];
    const collections = await this.prisma.paymentReceipt.aggregate({
      where: {
        organizationId: actor.organizationId,
        collectedByEmployeeId: actor.employeeId,
        paymentDate: { gte: today, lte: this.endOfDay(today) },
        status: { not: 'cancelled' },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    return {
      success: true,
      message: 'Driver dashboard fetched successfully',
      data: {
        tripCount: trips.length,
        completedTrips: trips.filter((trip) => ['completed', 'reconciled'].includes(trip.status)).length,
        pendingStops: stops.filter((stop) => stop.status === 'pending').length,
        deliveredStops: stops.filter((stop) => stop.status === 'delivered').length,
        partialStops: stops.filter((stop) => stop.status === 'partial').length,
        failedStops: stops.filter((stop) => ['failed', 'refused'].includes(stop.status)).length,
        collectionAmount: this.toNumber(collections._sum.amount),
        collectionCount: collections._count._all,
        trips,
      },
    };
  }

  private async buildSummary(
    organizationId: string,
    from: Date,
    to: Date,
    tripIds: string[],
    routeId?: string,
  ) {
    const [salesAgg, ordersPending, orderCount, collectionsAgg, outstandingAgg, batches, invoices, stops, trips, grns] =
      await Promise.all([
        this.prisma.salesInvoice.aggregate({
          where: {
            organizationId,
            invoiceDate: { gte: from, lte: to },
            ...(routeId ? { dispatchTripId: { in: tripIds } } : {}),
          },
          _sum: { grandTotal: true },
          _count: { _all: true },
        }),
        this.prisma.salesOrder.count({
          where: {
            organizationId,
            status: 'pending',
            orderDate: { gte: from, lte: to },
            ...(routeId ? { routeId } : {}),
          },
        }),
        this.prisma.salesOrder.count({
          where: {
            organizationId,
            orderDate: { gte: from, lte: to },
            ...(routeId ? { routeId } : {}),
          },
        }),
        this.prisma.paymentReceipt.aggregate({
          where: {
            organizationId,
            paymentDate: { gte: from, lte: to },
            paymentDirection: 'inbound',
            status: { not: 'cancelled' },
            ...(routeId ? { dispatchTripId: { in: tripIds } } : {}),
          },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.salesInvoice.aggregate({
          where: {
            organizationId,
            status: { in: ['posted', 'partial_paid'] },
            ...(routeId ? { dispatchTripId: { in: tripIds } } : {}),
          },
          _sum: { outstandingAmount: true },
        }),
        this.prisma.inventoryBatch.findMany({
          where: {
            organizationId,
            availableQty: { gt: 0 },
          },
        }),
        this.prisma.salesInvoice.findMany({
          where: {
            organizationId,
            invoiceDate: { gte: from, lte: to },
            ...(routeId ? { dispatchTripId: { in: tripIds } } : {}),
          },
          select: {
            retailerId: true,
            grandTotal: true,
          },
        }),
        tripIds.length
          ? this.prisma.deliveryStop.findMany({
              where: {
                organizationId,
                dispatchTripId: { in: tripIds },
              },
              select: { status: true },
            })
          : [],
        tripIds.length
          ? this.prisma.dispatchTrip.findMany({
              where: {
                organizationId,
                id: { in: tripIds },
              },
              select: { id: true, status: true },
            })
          : [],
        this.prisma.goodsReceipt.count({
          where: {
            organizationId,
            receiptDate: { gte: from, lte: to },
          },
        }),
      ]);

    const variantIds = [...new Set(batches.map((batch) => batch.variantId))];
    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({
          where: {
            organizationId,
            id: { in: variantIds },
          },
          select: { id: true, distributorPrice: true },
        })
      : [];
    const variantMap = new Map<string, any>(variants.map((variant) => [variant.id, variant]));

    const stockValue = this.roundMoney(
      batches.reduce((sum, batch) => {
        const variant = variantMap.get(batch.variantId);
        return sum + this.toNumber(batch.availableQty) * this.toNumber(variant?.distributorPrice ?? 0);
      }, 0),
    );

    const stockByVariant = new Map<string, number>();
    for (const batch of batches) {
      stockByVariant.set(
        batch.variantId,
        this.roundQty((stockByVariant.get(batch.variantId) ?? 0) + this.toNumber(batch.availableQty)),
      );
    }
    const lowStockCount = [...stockByVariant.values()].filter((qty) => qty <= 10).length;

    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + 3);
    const expiringProductsCount = batches.filter(
      (batch) => batch.expiryDate && batch.expiryDate <= expiryThreshold,
    ).length;

    const topRetailersMap = new Map<string, number>();
    for (const invoice of invoices) {
      topRetailersMap.set(
        invoice.retailerId,
        this.roundMoney((topRetailersMap.get(invoice.retailerId) ?? 0) + this.toNumber(invoice.grandTotal)),
      );
    }

    const dailyBusinessSummary = {
      orderCount,
      invoiceCount: salesAgg._count._all,
      dispatchTripCount: trips.length,
      grnCount: grns,
      paymentCount: collectionsAgg._count._all,
    };

    return {
      todaySales: this.toNumber(salesAgg._sum.grandTotal),
      pendingDeliveries: stops.filter((stop) => stop.status === 'pending').length,
      ordersAwaitingApproval: ordersPending,
      cashCollection: this.toNumber(collectionsAgg._sum.amount),
      outstandingPayments: this.toNumber(outstandingAgg._sum.outstandingAmount),
      stockValue,
      lowStockCount,
      expiringProductsCount,
      dispatchTripCount: trips.length,
      completedTripCount: trips.filter((trip) => ['completed', 'reconciled'].includes(trip.status)).length,
      dailyBusinessSummary,
      topRetailerCount: topRetailersMap.size,
    };
  }

  private async getTripIdsForRange(
    organizationId: string,
    from: Date,
    to: Date,
    routeId?: string,
  ) {
    const trips = await this.prisma.dispatchTrip.findMany({
      where: {
        organizationId,
        dispatchDate: { gte: from, lte: to },
        ...(routeId ? { routeId } : {}),
      },
      select: { id: true },
    });
    return trips.map((trip) => trip.id);
  }

  private resolveDateRange(query: DashboardQueryDto, defaultToday: boolean) {
    if (query.date) {
      const date = new Date(query.date);
      return { from: this.startOfDay(date), to: this.endOfDay(date) };
    }

    if (query.fromDate || query.toDate) {
      const from = query.fromDate ? this.startOfDay(new Date(query.fromDate)) : this.startOfDay(new Date());
      const to = query.toDate ? this.endOfDay(new Date(query.toDate)) : this.endOfDay(from);
      return { from, to };
    }

    if (defaultToday) {
      const today = new Date();
      return { from: this.startOfDay(today), to: this.endOfDay(today) };
    }

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { from: this.startOfDay(start), to: this.endOfDay(end) };
  }

  private startOfDay(date: Date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private endOfDay(date: Date) {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      throw new ForbiddenException('Backoffice access required');
    }
  }

  private assertRetailer(actor: AuthenticatedUser) {
    if (!(actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') || !actor.retailerId) {
      throw new NotFoundException('Retailer dashboard is only available for retailer users');
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

  private async enrichTrips(organizationId: string, trips: DispatchTrip[]) {
    const routeIds = [...new Set(trips.map((trip) => trip.routeId))];
    const vehicleIds = [...new Set(trips.map((trip) => trip.vehicleId).filter((value): value is string => Boolean(value)))];

    const [routes, vehicles] = await Promise.all([
      routeIds.length
        ? this.prisma.route.findMany({
            where: { organizationId, id: { in: routeIds } },
            select: { id: true, code: true, name: true },
          })
        : [],
      vehicleIds.length
        ? this.prisma.vehicle.findMany({
            where: { organizationId, id: { in: vehicleIds } },
            select: { id: true, vehicleNo: true, vehicleType: true },
          })
        : [],
    ]);

    const routeMap = new Map<string, any>(routes.map((route): [string, any] => [route.id, route]));
    const vehicleMap = new Map<string, any>(vehicles.map((vehicle): [string, any] => [vehicle.id, vehicle]));

    return trips.map((trip) => ({
      ...trip,
      route: routeMap.get(trip.routeId) ?? null,
      vehicle: trip.vehicleId ? vehicleMap.get(trip.vehicleId) ?? null : null,
    }));
  }
}
