import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InventoryBatch, Prisma, StockMovement } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportFilterDto } from './dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDailyPurchaseReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(filter, true);
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        organizationId: actor.organizationId,
        poDate: { gte: from, lte: to },
        ...(filter.supplierId ? { supplierId: filter.supplierId } : {}),
      },
      orderBy: { poDate: 'desc' },
    });

    const poIds = purchaseOrders.map((po) => po.id);
    const [suppliers, items, receipts] = await Promise.all([
      this.prisma.supplier.findMany({
        where: {
          organizationId: actor.organizationId,
          id: { in: [...new Set(purchaseOrders.map((po) => po.supplierId))] },
        },
        select: { id: true, supplierCode: true, name: true },
      }),
      poIds.length
        ? this.prisma.purchaseOrderItem.findMany({
            where: { organizationId: actor.organizationId, purchaseOrderId: { in: poIds } },
          })
        : [],
      poIds.length
        ? this.prisma.goodsReceipt.findMany({
            where: { organizationId: actor.organizationId, purchaseOrderId: { in: poIds } },
          })
        : [],
    ]);

    const supplierMap = new Map<string, any>(suppliers.map((supplier): [string, any] => [supplier.id, supplier]));
    const itemMap = new Map<string, { orderedQty: number; grandTotal: number }>();
    for (const item of items) {
      const current = itemMap.get(item.purchaseOrderId) ?? { orderedQty: 0, grandTotal: 0 };
      current.orderedQty = this.roundQty(current.orderedQty + this.toNumber(item.orderedQty));
      current.grandTotal = this.roundMoney(current.grandTotal + this.toNumber(item.lineTotal));
      itemMap.set(item.purchaseOrderId, current);
    }
    const receiptCountMap = new Map<string, number>();
    for (const receipt of receipts) {
      if (!receipt.purchaseOrderId) continue;
      receiptCountMap.set(receipt.purchaseOrderId, (receiptCountMap.get(receipt.purchaseOrderId) ?? 0) + 1);
    }

    const data = purchaseOrders.map((po) => ({
      ...po,
      subtotal: this.toNumber(po.subtotal),
      taxTotal: this.toNumber(po.taxTotal),
      grandTotal: this.toNumber(po.grandTotal),
      supplier: supplierMap.get(po.supplierId) ?? null,
      orderedQty: itemMap.get(po.id)?.orderedQty ?? 0,
      computedLineTotal: itemMap.get(po.id)?.grandTotal ?? 0,
      receiptCount: receiptCountMap.get(po.id) ?? 0,
    }));

    return {
      success: true,
      message: 'Daily purchase report fetched successfully',
      data,
      meta: this.buildReportMeta(filter, from, to),
    };
  }

  async getDailyDispatchReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(filter, true);
    const trips = await this.prisma.dispatchTrip.findMany({
      where: {
        organizationId: actor.organizationId,
        dispatchDate: { gte: from, lte: to },
        ...(filter.routeId ? { routeId: filter.routeId } : {}),
        ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}),
      },
      orderBy: { dispatchDate: 'desc' },
    });

    const tripIds = trips.map((trip) => trip.id);
    const routeIds = [...new Set(trips.map((trip) => trip.routeId))];
    const vehicleIds = [...new Set(trips.map((trip) => trip.vehicleId).filter((v): v is string => Boolean(v)))];
    const [items, stops, routes, vehicles] = await Promise.all([
      tripIds.length
        ? this.prisma.dispatchTripItem.findMany({
            where: { organizationId: actor.organizationId, dispatchTripId: { in: tripIds } },
          })
        : [],
      tripIds.length
        ? this.prisma.deliveryStop.findMany({
            where: { organizationId: actor.organizationId, dispatchTripId: { in: tripIds } },
          })
        : [],
      routeIds.length
        ? this.prisma.route.findMany({
            where: { organizationId: actor.organizationId, id: { in: routeIds } },
            select: { id: true, code: true, name: true },
          })
        : [],
      vehicleIds.length
        ? this.prisma.vehicle.findMany({
            where: { organizationId: actor.organizationId, id: { in: vehicleIds } },
            select: { id: true, vehicleNo: true, vehicleType: true },
          })
        : [],
    ]);

    const routeMap = new Map<string, any>(routes.map((route): [string, any] => [route.id, route]));
    const vehicleMap = new Map<string, any>(vehicles.map((vehicle): [string, any] => [vehicle.id, vehicle]));
    const itemSummary = new Map<string, { plannedQty: number; loadedQty: number }>();
    for (const item of items) {
      const current = itemSummary.get(item.dispatchTripId) ?? { plannedQty: 0, loadedQty: 0 };
      current.plannedQty = this.roundQty(current.plannedQty + this.toNumber(item.plannedQty));
      current.loadedQty = this.roundQty(current.loadedQty + this.toNumber(item.loadedQty));
      itemSummary.set(item.dispatchTripId, current);
    }
    const stopSummary = new Map<string, { totalStops: number; delivered: number; partial: number; pending: number; failed: number }>();
    for (const stop of stops) {
      const current = stopSummary.get(stop.dispatchTripId) ?? { totalStops: 0, delivered: 0, partial: 0, pending: 0, failed: 0 };
      current.totalStops += 1;
      if (stop.status === 'delivered') current.delivered += 1;
      else if (stop.status === 'partial') current.partial += 1;
      else if (stop.status === 'pending') current.pending += 1;
      else if (stop.status === 'failed' || stop.status === 'refused') current.failed += 1;
      stopSummary.set(stop.dispatchTripId, current);
    }

    return {
      success: true,
      message: 'Daily dispatch report fetched successfully',
      data: trips.map((trip) => ({
        ...trip,
        route: routeMap.get(trip.routeId) ?? null,
        vehicle: trip.vehicleId ? vehicleMap.get(trip.vehicleId) ?? null : null,
        plannedQty: itemSummary.get(trip.id)?.plannedQty ?? 0,
        loadedQty: itemSummary.get(trip.id)?.loadedQty ?? 0,
        stopSummary: stopSummary.get(trip.id) ?? { totalStops: 0, delivered: 0, partial: 0, pending: 0, failed: 0 },
      })),
      meta: this.buildReportMeta(filter, from, to),
    };
  }

  async getProductWiseSalesReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoices = await this.fetchSalesInvoices(actor.organizationId, filter);
    const invoiceIds = invoices.map((invoice) => invoice.id);
    const items = invoiceIds.length
      ? await this.prisma.salesInvoiceItem.findMany({
          where: {
            organizationId: actor.organizationId,
            salesInvoiceId: { in: invoiceIds },
            ...(filter.variantId ? { variantId: filter.variantId } : {}),
          },
        })
      : [];

    let filteredItems = items;
    if (filter.productId) {
      const variants = await this.prisma.productVariant.findMany({
        where: {
          organizationId: actor.organizationId,
          productId: filter.productId,
        },
        select: { id: true },
      });
      const allowedVariantIds = new Set(variants.map((variant) => variant.id));
      filteredItems = items.filter((item) => allowedVariantIds.has(item.variantId));
    }

    const grouped = new Map<string, { billedQty: number; taxAmount: number; salesAmount: number }>();
    for (const item of filteredItems) {
      const current = grouped.get(item.variantId) ?? { billedQty: 0, taxAmount: 0, salesAmount: 0 };
      current.billedQty = this.roundQty(current.billedQty + this.toNumber(item.billedQty));
      current.taxAmount = this.roundMoney(current.taxAmount + this.toNumber(item.taxAmount));
      current.salesAmount = this.roundMoney(current.salesAmount + this.toNumber(item.lineTotal));
      grouped.set(item.variantId, current);
    }

    const variants = [...grouped.keys()].length
      ? await this.prisma.productVariant.findMany({
          where: { organizationId: actor.organizationId, id: { in: [...grouped.keys()] } },
          select: {
            id: true,
            sku: true,
            variantName: true,
            product: { select: { id: true, name: true } },
          },
        })
      : [];
    const variantMap = new Map<string, any>(variants.map((variant): [string, any] => [variant.id, variant]));

    const data = [...grouped.entries()]
      .map(([variantId, totals]) => ({
        variantId,
        variant: variantMap.get(variantId) ?? null,
        billedQty: totals.billedQty,
        taxAmount: totals.taxAmount,
        salesAmount: totals.salesAmount,
      }))
      .sort((a, b) => b.salesAmount - a.salesAmount);

    return {
      success: true,
      message: 'Product-wise sales report fetched successfully',
      data,
      meta: this.buildReportMeta(filter),
    };
  }

  async getRetailerWiseSalesReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoices = await this.fetchSalesInvoices(actor.organizationId, filter);
    const grouped = new Map<string, { totalSales: number; outstandingAmount: number; invoiceCount: number }>();
    for (const invoice of invoices) {
      const current = grouped.get(invoice.retailerId) ?? { totalSales: 0, outstandingAmount: 0, invoiceCount: 0 };
      current.totalSales = this.roundMoney(current.totalSales + this.toNumber(invoice.grandTotal));
      current.outstandingAmount = this.roundMoney(current.outstandingAmount + this.toNumber(invoice.outstandingAmount));
      current.invoiceCount += 1;
      grouped.set(invoice.retailerId, current);
    }

    const retailers = [...grouped.keys()].length
      ? await this.prisma.retailer.findMany({
          where: { organizationId: actor.organizationId, id: { in: [...grouped.keys()] } },
          select: { id: true, retailerCode: true, shopName: true, mobile: true },
        })
      : [];
    const retailerMap = new Map<string, any>(retailers.map((retailer): [string, any] => [retailer.id, retailer]));

    return {
      success: true,
      message: 'Retailer-wise sales report fetched successfully',
      data: [...grouped.entries()]
        .map(([retailerId, totals]) => ({
          retailerId,
          retailer: retailerMap.get(retailerId) ?? null,
          ...totals,
        }))
        .sort((a, b) => b.totalSales - a.totalSales),
      meta: this.buildReportMeta(filter),
    };
  }

  async getRouteWiseSalesReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoices = await this.fetchSalesInvoices(actor.organizationId, filter);
    const tripIds = [...new Set(invoices.map((invoice) => invoice.dispatchTripId).filter((v): v is string => Boolean(v)))];
    const trips = tripIds.length
      ? await this.prisma.dispatchTrip.findMany({
          where: { organizationId: actor.organizationId, id: { in: tripIds } },
          select: { id: true, routeId: true },
        })
      : [];
    const tripRouteMap = new Map<string, string | null>(trips.map((trip): [string, string | null] => [trip.id, trip.routeId]));

    const grouped = new Map<string, { totalSales: number; outstandingAmount: number; invoiceCount: number }>();
    for (const invoice of invoices) {
      const routeId = invoice.dispatchTripId ? tripRouteMap.get(invoice.dispatchTripId) ?? 'UNASSIGNED' : 'UNASSIGNED';
      const current = grouped.get(routeId) ?? { totalSales: 0, outstandingAmount: 0, invoiceCount: 0 };
      current.totalSales = this.roundMoney(current.totalSales + this.toNumber(invoice.grandTotal));
      current.outstandingAmount = this.roundMoney(current.outstandingAmount + this.toNumber(invoice.outstandingAmount));
      current.invoiceCount += 1;
      grouped.set(routeId, current);
    }

    const routes = [...grouped.keys()].filter((routeId) => routeId !== 'UNASSIGNED').length
      ? await this.prisma.route.findMany({
          where: {
            organizationId: actor.organizationId,
            id: { in: [...grouped.keys()].filter((routeId) => routeId !== 'UNASSIGNED') },
          },
          select: { id: true, code: true, name: true },
        })
      : [];
    const routeMap = new Map<string, any>(routes.map((route): [string, any] => [route.id, route]));

    return {
      success: true,
      message: 'Route-wise sales report fetched successfully',
      data: [...grouped.entries()]
        .map(([routeId, totals]) => ({
          routeId: routeId === 'UNASSIGNED' ? null : routeId,
          route: routeId === 'UNASSIGNED' ? { code: null, name: 'Unassigned' } : routeMap.get(routeId) ?? null,
          ...totals,
        }))
        .sort((a, b) => b.totalSales - a.totalSales),
      meta: this.buildReportMeta(filter),
    };
  }

  async getStaffPerformanceReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(filter, false);
    const trips = await this.prisma.dispatchTrip.findMany({
      where: {
        organizationId: actor.organizationId,
        dispatchDate: { gte: from, lte: to },
        ...(filter.routeId ? { routeId: filter.routeId } : {}),
      },
      select: { id: true, driverEmployeeId: true, helperEmployeeId: true },
    });
    const tripIds = trips.map((trip) => trip.id);
    const stops = tripIds.length
      ? await this.prisma.deliveryStop.findMany({
          where: { organizationId: actor.organizationId, dispatchTripId: { in: tripIds } },
          select: { dispatchTripId: true, status: true },
        })
      : [];
    const collections = await this.prisma.paymentReceipt.findMany({
      where: {
        organizationId: actor.organizationId,
        paymentDate: { gte: from, lte: to },
        status: { not: 'cancelled' },
        ...(filter.staffId ? { collectedByEmployeeId: filter.staffId } : {}),
      },
      select: { collectedByEmployeeId: true, amount: true },
    });

    const employeeIds = [
      ...new Set(
        trips
          .flatMap((trip) => [trip.driverEmployeeId, trip.helperEmployeeId])
          .filter((v): v is string => Boolean(v)),
      ),
    ];
    const employees = employeeIds.length
      ? await this.prisma.employee.findMany({
          where: {
            organizationId: actor.organizationId,
            id: { in: employeeIds },
            ...(filter.staffId ? { id: filter.staffId } : {}),
          },
          select: { id: true, employeeCode: true, fullName: true, designation: true, mobile: true },
        })
      : [];
    const employeeMap = new Map<string, any>(employees.map((employee): [string, any] => [employee.id, employee]));

    const stopSummaryByTrip = new Map<string, { delivered: number; partial: number; pending: number; failed: number }>();
    for (const stop of stops) {
      const current = stopSummaryByTrip.get(stop.dispatchTripId) ?? { delivered: 0, partial: 0, pending: 0, failed: 0 };
      if (stop.status === 'delivered') current.delivered += 1;
      else if (stop.status === 'partial') current.partial += 1;
      else if (stop.status === 'pending') current.pending += 1;
      else if (stop.status === 'failed' || stop.status === 'refused') current.failed += 1;
      stopSummaryByTrip.set(stop.dispatchTripId, current);
    }

    const grouped = new Map<string, { tripCount: number; deliveredStops: number; partialStops: number; pendingStops: number; failedStops: number; collectionAmount: number }>();
    for (const trip of trips) {
      for (const employeeId of [trip.driverEmployeeId, trip.helperEmployeeId].filter((v): v is string => Boolean(v))) {
        if (filter.staffId && employeeId !== filter.staffId) continue;
        const current = grouped.get(employeeId) ?? { tripCount: 0, deliveredStops: 0, partialStops: 0, pendingStops: 0, failedStops: 0, collectionAmount: 0 };
        const summary = stopSummaryByTrip.get(trip.id) ?? { delivered: 0, partial: 0, pending: 0, failed: 0 };
        current.tripCount += 1;
        current.deliveredStops += summary.delivered;
        current.partialStops += summary.partial;
        current.pendingStops += summary.pending;
        current.failedStops += summary.failed;
        grouped.set(employeeId, current);
      }
    }

    for (const collection of collections) {
      if (!collection.collectedByEmployeeId) continue;
      if (filter.staffId && collection.collectedByEmployeeId !== filter.staffId) continue;
      const current = grouped.get(collection.collectedByEmployeeId) ?? { tripCount: 0, deliveredStops: 0, partialStops: 0, pendingStops: 0, failedStops: 0, collectionAmount: 0 };
      current.collectionAmount = this.roundMoney(current.collectionAmount + this.toNumber(collection.amount));
      grouped.set(collection.collectedByEmployeeId, current);
    }

    return {
      success: true,
      message: 'Staff performance report fetched successfully',
      data: [...grouped.entries()].map(([employeeId, summary]) => ({
        employeeId,
        employee: employeeMap.get(employeeId) ?? null,
        ...summary,
      })),
      meta: this.buildReportMeta(filter, from, to),
    };
  }

  async getCollectionReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(filter, false);
    const receipts = await this.prisma.paymentReceipt.findMany({
      where: {
        organizationId: actor.organizationId,
        paymentDate: { gte: from, lte: to },
        status: { not: 'cancelled' },
        ...(filter.staffId ? { collectedByEmployeeId: filter.staffId } : {}),
        ...(filter.retailerId ? { partyType: 'retailer', partyId: filter.retailerId } : {}),
        ...(filter.supplierId ? { partyType: 'supplier', partyId: filter.supplierId } : {}),
      },
      orderBy: { paymentDate: 'desc' },
    });

    const groupedByMode = new Map<string, number>();
    for (const receipt of receipts) {
      groupedByMode.set(
        receipt.paymentMode,
        this.roundMoney((groupedByMode.get(receipt.paymentMode) ?? 0) + this.toNumber(receipt.amount)),
      );
    }

    return {
      success: true,
      message: 'Collection report fetched successfully',
      data: {
        totalAmount: this.roundMoney(receipts.reduce((sum, receipt) => sum + this.toNumber(receipt.amount), 0)),
        receiptCount: receipts.length,
        byMode: [...groupedByMode.entries()].map(([paymentMode, amount]) => ({ paymentMode, amount })),
        rows: receipts.map((receipt) => ({
          ...receipt,
          amount: this.toNumber(receipt.amount),
        })),
      },
      meta: this.buildReportMeta(filter, from, to),
    };
  }

  async getOutstandingReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId: actor.organizationId,
        outstandingAmount: { gt: 0 },
        status: { in: ['posted', 'partial_paid'] },
        ...(filter.retailerId ? { retailerId: filter.retailerId } : {}),
      },
      orderBy: [{ dueDate: 'asc' }, { invoiceDate: 'asc' }],
    });

    const retailerIds = [...new Set(invoices.map((invoice) => invoice.retailerId))];
    const retailers = retailerIds.length
      ? await this.prisma.retailer.findMany({
          where: { organizationId: actor.organizationId, id: { in: retailerIds } },
          select: { id: true, retailerCode: true, shopName: true, mobile: true },
        })
      : [];
    const retailerMap = new Map<string, any>(retailers.map((retailer): [string, any] => [retailer.id, retailer]));

    return {
      success: true,
      message: 'Outstanding report fetched successfully',
      data: {
        totalOutstanding: this.roundMoney(invoices.reduce((sum, invoice) => sum + this.toNumber(invoice.outstandingAmount), 0)),
        rows: invoices.map((invoice) => ({
          ...invoice,
          grandTotal: this.toNumber(invoice.grandTotal),
          outstandingAmount: this.toNumber(invoice.outstandingAmount),
          retailer: retailerMap.get(invoice.retailerId) ?? null,
        })),
      },
      meta: this.buildReportMeta(filter),
    };
  }

  async getFastMovingProductsReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    const report = await this.getProductWiseSalesReport(actor, filter);
    return {
      ...report,
      message: 'Fast moving products report fetched successfully',
      data: [...report.data].sort((a, b) => b.billedQty - a.billedQty),
    };
  }

  async getSlowMovingProductsReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    const report = await this.getProductWiseSalesReport(actor, filter);
    return {
      ...report,
      message: 'Slow moving products report fetched successfully',
      data: [...report.data].sort((a, b) => a.billedQty - b.billedQty),
    };
  }

  async getProductExpiryReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const threshold = filter.toDate ? new Date(filter.toDate) : (() => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    })();

    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        organizationId: actor.organizationId,
        availableQty: { gt: 0 },
        expiryDate: { lte: threshold },
        ...(filter.variantId ? { variantId: filter.variantId } : {}),
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
    });

    const enriched = await this.enrichBatches(actor.organizationId, batches);
    return {
      success: true,
      message: 'Product expiry report fetched successfully',
      data: enriched,
      meta: this.buildReportMeta(filter, undefined, threshold),
    };
  }

  async getDamageReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(filter, false);
    const damagedStopItems = await this.prisma.deliveryStopItem.findMany({
      where: {
        organizationId: actor.organizationId,
        damagedQty: { gt: 0 },
        deliveryStop: {
          is: {
            ...(filter.routeId
              ? {
                  dispatchTrip: { is: { routeId: filter.routeId } },
                }
              : {}),
            ...(from || to
              ? {
                  actualArrivalAt: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                  },
                }
              : {}),
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const movements = await this.prisma.stockMovement.findMany({
      where: {
        organizationId: actor.organizationId,
        movementType: 'damage_out',
        ...(from || to
          ? {
              movementAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { movementAt: 'desc' },
    });

    return {
      success: true,
      message: 'Damage report fetched successfully',
      data: {
        deliveryDamage: await this.enrichStopItems(actor.organizationId, damagedStopItems),
        inventoryDamage: await this.enrichStockMovements(actor.organizationId, movements),
      },
      meta: this.buildReportMeta(filter, from, to),
    };
  }

  async getReturnReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(filter, false);
    const [salesReturns, supplierReturns] = await Promise.all([
      this.prisma.salesReturn.findMany({
        where: {
          organizationId: actor.organizationId,
          returnDate: { gte: from, lte: to },
          ...(filter.retailerId ? { retailerId: filter.retailerId } : {}),
        },
        include: { items: true },
        orderBy: { returnDate: 'desc' },
      }),
      this.prisma.supplierReturn.findMany({
        where: {
          organizationId: actor.organizationId,
          returnDate: { gte: from, lte: to },
          ...(filter.supplierId ? { supplierId: filter.supplierId } : {}),
        },
        include: { items: true },
        orderBy: { returnDate: 'desc' },
      }),
    ]);

    return {
      success: true,
      message: 'Return report fetched successfully',
      data: {
        salesReturns,
        supplierReturns,
      },
      meta: this.buildReportMeta(filter, from, to),
    };
  }

  async getCrateReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(filter, false);
    const transactions = await this.prisma.crateTransaction.findMany({
      where: {
        organizationId: actor.organizationId,
        transactionDate: { gte: from, lte: to },
        ...(filter.retailerId ? { retailerId: filter.retailerId } : {}),
      },
      orderBy: { transactionDate: 'desc' },
    });

    const retailerIds = [...new Set(transactions.map((row) => row.retailerId).filter((v): v is string => Boolean(v)))];
    const crateTypeIds = [...new Set(transactions.map((row) => row.crateTypeId))];
    const [retailers, crateTypes] = await Promise.all([
      retailerIds.length
        ? this.prisma.retailer.findMany({
            where: { organizationId: actor.organizationId, id: { in: retailerIds } },
            select: { id: true, retailerCode: true, shopName: true },
          })
        : [],
      crateTypeIds.length
        ? this.prisma.crateType.findMany({
            where: { organizationId: actor.organizationId, id: { in: crateTypeIds } },
            select: { id: true, code: true, name: true },
          })
        : [],
    ]);

    const retailerMap = new Map<string, any>(retailers.map((retailer): [string, any] => [retailer.id, retailer]));
    const crateMap = new Map<string, any>(crateTypes.map((crate): [string, any] => [crate.id, crate]));

    const grouped = new Map<string, { quantity: number }>();
    for (const row of transactions) {
      const key = `${row.retailerId ?? 'NONE'}:${row.crateTypeId}:${row.transactionType}`;
      const current = grouped.get(key) ?? { quantity: 0 };
      current.quantity += row.quantity;
      grouped.set(key, current);
    }

    return {
      success: true,
      message: 'Crate report fetched successfully',
      data: [...grouped.entries()].map(([key, value]) => {
        const [retailerId, crateTypeId, transactionType] = key.split(':');
        return {
          retailer: retailerId !== 'NONE' ? retailerMap.get(retailerId) ?? null : null,
          crateType: crateMap.get(crateTypeId) ?? null,
          transactionType,
          quantity: value.quantity,
        };
      }),
      meta: this.buildReportMeta(filter, from, to),
    };
  }

  async getProfitReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(filter, false);
    const [salesAgg, purchaseAgg, expenseAgg] = await Promise.all([
      this.prisma.salesInvoice.aggregate({
        where: {
          organizationId: actor.organizationId,
          invoiceDate: { gte: from, lte: to },
          status: { in: ['posted', 'partial_paid', 'paid'] },
        },
        _sum: { grandTotal: true },
      }),
      this.prisma.purchaseInvoice.aggregate({
        where: {
          organizationId: actor.organizationId,
          invoiceDate: { gte: from, lte: to },
          status: { in: ['approved', 'posted', 'paid'] },
        },
        _sum: { grandTotal: true },
      }),
      this.prisma.expenseEntry.aggregate({
        where: {
          organizationId: actor.organizationId,
          expenseDate: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
    ]);

    const grossSales = this.toNumber(salesAgg._sum.grandTotal);
    const purchaseCost = this.toNumber(purchaseAgg._sum.grandTotal);
    const expenses = this.toNumber(expenseAgg._sum.amount);
    const netProfit = this.roundMoney(grossSales - purchaseCost - expenses);

    return {
      success: true,
      message: 'Profit report fetched successfully',
      data: {
        grossSales,
        purchaseCost,
        expenses,
        netProfit,
      },
      meta: this.buildReportMeta(filter, from, to),
    };
  }

  async getInventoryMovementReport(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const { from, to } = this.resolveDateRange(filter, false);
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        organizationId: actor.organizationId,
        movementAt: { gte: from, lte: to },
        ...(filter.variantId ? { variantId: filter.variantId } : {}),
        ...(filter.routeId ? { referenceType: 'trip' } : {}),
      },
      orderBy: { movementAt: 'desc' },
    });

    return {
      success: true,
      message: 'Inventory movement report fetched successfully',
      data: await this.enrichStockMovements(actor.organizationId, movements),
      meta: this.buildReportMeta(filter, from, to),
    };
  }

  async getMonthlyBusinessSummary(actor: AuthenticatedUser, filter: ReportFilterDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const now = new Date();
    const end = filter.toDate ? new Date(filter.toDate) : now;
    const start = filter.fromDate ? new Date(filter.fromDate) : new Date(end.getFullYear(), end.getMonth() - 5, 1);

    const [orders, invoices, receipts, purchaseInvoices] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where: { organizationId: actor.organizationId, orderDate: { gte: start, lte: end } },
        select: { orderDate: true },
      }),
      this.prisma.salesInvoice.findMany({
        where: { organizationId: actor.organizationId, invoiceDate: { gte: start, lte: end } },
        select: { invoiceDate: true, grandTotal: true },
      }),
      this.prisma.paymentReceipt.findMany({
        where: {
          organizationId: actor.organizationId,
          paymentDate: { gte: start, lte: end },
          paymentDirection: 'inbound',
          status: { not: 'cancelled' },
        },
        select: { paymentDate: true, amount: true },
      }),
      this.prisma.purchaseInvoice.findMany({
        where: { organizationId: actor.organizationId, invoiceDate: { gte: start, lte: end } },
        select: { invoiceDate: true, grandTotal: true },
      }),
    ]);

    const buckets = new Map<string, { orderCount: number; sales: number; collections: number; purchases: number }>();
    const bucket = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    for (const order of orders) {
      const key = bucket(order.orderDate);
      const current = buckets.get(key) ?? { orderCount: 0, sales: 0, collections: 0, purchases: 0 };
      current.orderCount += 1;
      buckets.set(key, current);
    }
    for (const invoice of invoices) {
      const key = bucket(invoice.invoiceDate);
      const current = buckets.get(key) ?? { orderCount: 0, sales: 0, collections: 0, purchases: 0 };
      current.sales = this.roundMoney(current.sales + this.toNumber(invoice.grandTotal));
      buckets.set(key, current);
    }
    for (const receipt of receipts) {
      const key = bucket(receipt.paymentDate);
      const current = buckets.get(key) ?? { orderCount: 0, sales: 0, collections: 0, purchases: 0 };
      current.collections = this.roundMoney(current.collections + this.toNumber(receipt.amount));
      buckets.set(key, current);
    }
    for (const purchaseInvoice of purchaseInvoices) {
      const key = bucket(purchaseInvoice.invoiceDate);
      const current = buckets.get(key) ?? { orderCount: 0, sales: 0, collections: 0, purchases: 0 };
      current.purchases = this.roundMoney(current.purchases + this.toNumber(purchaseInvoice.grandTotal));
      buckets.set(key, current);
    }

    return {
      success: true,
      message: 'Monthly business summary fetched successfully',
      data: [...buckets.entries()]
        .map(([month, summary]) => ({ month, ...summary, net: this.roundMoney(summary.sales - summary.purchases) }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      meta: this.buildReportMeta(filter, start, end),
    };
  }

  private async fetchSalesInvoices(organizationId: string, filter: ReportFilterDto) {
    const { from, to } = this.resolveDateRange(filter, false);
    let tripIds: string[] | undefined;

    if (filter.routeId) {
      const trips = await this.prisma.dispatchTrip.findMany({
        where: { organizationId, routeId: filter.routeId },
        select: { id: true },
      });
      tripIds = trips.map((trip) => trip.id);
    }

    return this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        invoiceDate: { gte: from, lte: to },
        ...(filter.retailerId ? { retailerId: filter.retailerId } : {}),
        ...(tripIds ? { dispatchTripId: { in: tripIds } } : {}),
        status: { in: ['posted', 'partial_paid', 'paid'] },
      },
      orderBy: { invoiceDate: 'desc' },
    });
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
            select: { id: true, code: true, name: true },
          })
        : [],
    ]);
    const variantMap = new Map<string, any>(variants.map((variant): [string, any] => [variant.id, variant]));
    const warehouseMap = new Map<string, any>(warehouses.map((warehouse): [string, any] => [warehouse.id, warehouse]));

    return batches.map((batch) => ({
      ...batch,
      receivedQty: this.toNumber(batch.receivedQty),
      availableQty: this.toNumber(batch.availableQty),
      reservedQty: this.toNumber(batch.reservedQty),
      damagedQty: this.toNumber(batch.damagedQty),
      variant: variantMap.get(batch.variantId) ?? null,
      warehouse: warehouseMap.get(batch.warehouseId) ?? null,
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
    const variantMap = new Map<string, any>(variants.map((variant): [string, any] => [variant.id, variant]));
    const warehouseMap = new Map<string, any>(warehouses.map((warehouse): [string, any] => [warehouse.id, warehouse]));

    return movements.map((movement) => ({
      ...movement,
      qtyIn: this.toNumber(movement.qtyIn),
      qtyOut: this.toNumber(movement.qtyOut),
      unitCost: this.toNumber(movement.unitCost),
      variant: variantMap.get(movement.variantId) ?? null,
      warehouse: warehouseMap.get(movement.warehouseId) ?? null,
    }));
  }

  private async enrichStopItems(organizationId: string, items: Array<{ variantId: string; damagedQty: any; deliveryStopId: string } & Record<string, any>>) {
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
    const variantMap = new Map<string, any>(variants.map((variant): [string, any] => [variant.id, variant]));

    return items.map((item) => ({
      ...item,
      damagedQty: this.toNumber(item.damagedQty),
      variant: variantMap.get(item.variantId) ?? null,
    }));
  }

  private resolveDateRange(filter: ReportFilterDto, defaultToday: boolean) {
    if (filter.date) {
      const date = new Date(filter.date);
      return { from: this.startOfDay(date), to: this.endOfDay(date) };
    }

    if (filter.fromDate || filter.toDate) {
      const from = filter.fromDate
        ? this.startOfDay(new Date(filter.fromDate))
        : this.startOfDay(new Date());
      const to = filter.toDate
        ? this.endOfDay(new Date(filter.toDate))
        : this.endOfDay(from);
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

  private buildReportMeta(filter: ReportFilterDto, from?: Date, to?: Date) {
    return {
      format: filter.format ?? 'json',
      fromDate: from?.toISOString() ?? null,
      toDate: to?.toISOString() ?? null,
      filters: filter,
    };
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
