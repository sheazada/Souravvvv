import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DeliveryStop, DeliveryStopItem, DispatchTrip, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SalesInvoicesService } from '../sales-invoices/sales-invoices.service';
import {
  CreateCollectionEntryDto,
  CreateCrateEntryDto,
  CreateProofOfDeliveryDto,
  UpdateDeliveryStopStatusDto,
} from './dto';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    @Inject(forwardRef(() => SalesInvoicesService))
    private readonly salesInvoicesService?: SalesInvoicesService,
  ) {}

  async getStop(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    const stop = await this.getAccessibleStopOrThrow(actor, id);
    return this.buildStopResponse(actor.organizationId, stop);
  }

  async updateStopStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateDeliveryStopStatusDto,
  ) {
    this.assertAuthenticated(actor);
    const stop = await this.getAccessibleStopOrThrow(actor, id);
    if (['completed', 'reconciled', 'cancelled'].includes((await this.getTripOrThrow(actor.organizationId, stop.dispatchTripId)).status)) {
      throw new ConflictException('Cannot update stop for completed/reconciled/cancelled trip');
    }

    const items = await this.prisma.deliveryStopItem.findMany({
      where: { organizationId: actor.organizationId, deliveryStopId: id },
      orderBy: { createdAt: 'asc' },
    });
    if (!items.length) {
      throw new BadRequestException('Delivery stop has no items');
    }

    const itemUpdates: Map<string, any> = dto.items?.length
      ? new Map<string, any>(dto.items.map((item): [string, any] => [item.variantId, item]))
      : new Map<string, any>();

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const update = itemUpdates.get(item.variantId);
        const loadedQty = this.toNumber(item.loadedQty || item.orderedQty);
        let deliveredQty = this.toNumber(item.deliveredQty);
        let returnedQty = this.toNumber(item.returnedQty);
        let damagedQty = this.toNumber(item.damagedQty);
        let refusedQty = this.toNumber(item.refusedQty);

        if (dto.status === 'delivered') {
          deliveredQty = update ? this.roundQty(update.deliveredQty) : loadedQty;
          returnedQty = update ? this.roundQty(update.returnedQty ?? 0) : 0;
          damagedQty = update ? this.roundQty(update.damagedQty ?? 0) : 0;
          refusedQty = 0;
        } else if (dto.status === 'partial') {
          if (!update) {
            throw new BadRequestException('Partial delivery requires item updates');
          }
          deliveredQty = this.roundQty(update.deliveredQty);
          returnedQty = this.roundQty(update.returnedQty ?? Math.max(loadedQty - deliveredQty, 0));
          damagedQty = this.roundQty(update.damagedQty ?? 0);
          refusedQty = 0;
        } else if (dto.status === 'refused') {
          deliveredQty = 0;
          returnedQty = 0;
          damagedQty = 0;
          refusedQty = loadedQty;
        } else if (dto.status === 'failed') {
          deliveredQty = 0;
          returnedQty = loadedQty;
          damagedQty = 0;
          refusedQty = 0;
        }

        const totalHandled = this.roundQty(deliveredQty + returnedQty + damagedQty + refusedQty);
        if (totalHandled > loadedQty + 0.001) {
          throw new BadRequestException('Delivery quantities exceed loaded quantity');
        }

        const estimatedTaxRate = this.estimateTaxRate(item);
        const base = this.roundMoney(this.toNumber(item.unitPrice) * deliveredQty);
        const lineTax = this.roundMoney((base * estimatedTaxRate) / 100);
        const lineTotal = this.roundMoney(base + lineTax);

        await tx.deliveryStopItem.update({
          where: { id: item.id },
          data: {
            deliveredQty,
            returnedQty,
            damagedQty,
            refusedQty,
            taxAmount: lineTax,
            lineTotal,
          },
        });
      }

      await tx.deliveryStop.update({
        where: { id },
        data: {
          status: dto.status,
          actualArrivalAt: dto.actualArrivalAt ? new Date(dto.actualArrivalAt) : stop.actualArrivalAt ?? new Date(),
          actualDepartureAt: dto.actualDepartureAt ? new Date(dto.actualDepartureAt) : stop.actualDepartureAt ?? new Date(),
          failureReason: dto.failureReason ?? stop.failureReason,
          notes: dto.notes ?? stop.notes,
        },
      });

      if (stop.salesOrderId) {
        const salesOrder = await tx.salesOrder.findFirst({ where: { id: stop.salesOrderId } });
        if (salesOrder) {
          const mappedStatus = this.mapStopStatusToOrderStatus(dto.status);
          if (mappedStatus && salesOrder.status !== mappedStatus) {
            await tx.salesOrder.update({
              where: { id: salesOrder.id },
              data: { status: mappedStatus },
            });
            await tx.salesOrderStatusHistory.create({
              data: {
                organizationId: actor.organizationId,
                salesOrderId: salesOrder.id,
                oldStatus: salesOrder.status,
                newStatus: mappedStatus,
                changedByUserId: actor.id,
                note: `Updated from delivery stop ${id}`,
              },
            });
          }
        }
      }
    });

    if (this.salesInvoicesService) {
      const invoices = await this.prisma.salesInvoice.findMany({
        where: {
          organizationId: actor.organizationId,
          retailerId: stop.retailerId,
          status: { in: ['draft', 'posted'] },
          paymentStatus: 'unpaid',
          OR: [
            ...(stop.salesOrderId ? [{ salesOrderId: stop.salesOrderId }] : []),
            { dispatchTripId: stop.dispatchTripId },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const invoice of invoices) {
        if (dto.status === 'failed' || dto.status === 'refused') {
          try {
            await this.salesInvoicesService.cancel(actor, invoice.id);
          } catch {
            // Ignore if cannot cancel (e.g. allocated payments)
          }
        } else if (dto.status === 'partial' || dto.status === 'delivered') {
          try {
            await this.salesInvoicesService.recomputeFromDelivery(actor, invoice.id, {
              reason: `Recomputed upon delivery stop status ${dto.status}`,
              applyImmediately: true,
            });
          } catch {
            if (dto.status === 'partial') {
              try {
                await this.salesInvoicesService.cancel(actor, invoice.id);
              } catch {
                // Ignore
              }
            }
          }
        }
      }
    }

    return this.getStop(actor, id);
  }

  async addCollection(
    actor: AuthenticatedUser,
    stopId: string,
    dto: CreateCollectionEntryDto,
  ) {
    this.assertAuthenticated(actor);
    await this.getAccessibleStopOrThrow(actor, stopId);
    return this.paymentsService.recordDeliveryStopCollection(actor, stopId, dto);
  }

  async addCrateTransaction(
    actor: AuthenticatedUser,
    stopId: string,
    dto: CreateCrateEntryDto,
  ) {
    this.assertAuthenticated(actor);
    const stop = await this.getAccessibleStopOrThrow(actor, stopId);

    const trip = await this.getTripOrThrow(actor.organizationId, stop.dispatchTripId);
    const transaction = await this.prisma.crateTransaction.create({
      data: {
        organizationId: actor.organizationId,
        crateTypeId: dto.crateTypeId,
        retailerId: stop.retailerId,
        dispatchTripId: trip.id,
        deliveryStopId: stop.id,
        transactionType: dto.transactionType,
        quantity: dto.quantity,
        transactionDate: new Date(),
        referenceType: 'stop',
        referenceId: stop.id,
        remarks: dto.remarks,
      },
    });

    await this.prisma.deliveryStop.update({
      where: { id: stop.id },
      data: {
        cratesIssued:
          dto.transactionType === 'issue'
            ? stop.cratesIssued + dto.quantity
            : stop.cratesIssued,
        emptyCratesReceived:
          dto.transactionType === 'return'
            ? stop.emptyCratesReceived + dto.quantity
            : stop.emptyCratesReceived,
      },
    });

    return {
      success: true,
      message: 'Crate transaction recorded successfully',
      data: transaction,
    };
  }

  async addProofOfDelivery(
    actor: AuthenticatedUser,
    stopId: string,
    dto: CreateProofOfDeliveryDto,
  ) {
    this.assertAuthenticated(actor);
    const stop = await this.getAccessibleStopOrThrow(actor, stopId);

    const attachments = [] as Array<{ fileName: string; fileUrl: string; mimeType: string; metaJson: Record<string, unknown> }>;
    if (dto.signatureUrl) {
      attachments.push({
        fileName: this.fileNameFromUrl(dto.signatureUrl, 'signature.txt'),
        fileUrl: dto.signatureUrl,
        mimeType: 'text/plain',
        metaJson: { kind: 'signature', recipientName: dto.recipientName ?? null },
      });
    }
    if (dto.photoUrl) {
      attachments.push({
        fileName: this.fileNameFromUrl(dto.photoUrl, 'photo.txt'),
        fileUrl: dto.photoUrl,
        mimeType: 'text/plain',
        metaJson: { kind: 'photo', recipientName: dto.recipientName ?? null },
      });
    }

    if (attachments.length) {
      await this.prisma.fileAttachment.createMany({
        data: attachments.map((attachment) => ({
          organizationId: actor.organizationId,
          entityType: 'delivery_stop',
          entityId: stop.id,
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          mimeType: attachment.mimeType,
          metaJson: attachment.metaJson as Prisma.InputJsonValue,
        })),
      });
    }

    const notePrefix = dto.recipientName ? `Recipient: ${dto.recipientName}` : 'Proof of delivery added';
    await this.prisma.deliveryStop.update({
      where: { id: stop.id },
      data: {
        notes: `${stop.notes ?? ''}${stop.notes ? ' | ' : ''}${notePrefix}${dto.notes ? ` | ${dto.notes}` : ''}`,
      },
    });

    return this.getStop(actor, stopId);
  }

  async getMyTripsToday(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertStaff(actor);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trips = await this.prisma.dispatchTrip.findMany({
      where: {
        organizationId: actor.organizationId,
        dispatchDate: today,
        OR: [
          { driverEmployeeId: actor.employeeId ?? undefined },
          { helperEmployeeId: actor.employeeId ?? undefined },
        ],
      },
      orderBy: { dispatchDate: 'desc' },
    });

    return {
      success: true,
      message: 'Today trips fetched successfully',
      data: trips,
    };
  }

  async getMyTrip(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertStaff(actor);
    const trip = await this.getAccessibleTripOrThrow(actor, id);

    return {
      success: true,
      message: 'Trip fetched successfully',
      data: trip,
    };
  }

  async getMyTripStops(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertStaff(actor);
    await this.getAccessibleTripOrThrow(actor, id);

    const stops = await this.prisma.deliveryStop.findMany({
      where: { organizationId: actor.organizationId, dispatchTripId: id },
      orderBy: { stopSequence: 'asc' },
    });

    return {
      success: true,
      message: 'Trip stops fetched successfully',
      data: await this.enrichStops(actor.organizationId, stops),
    };
  }

  async getCollectionSummary(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertStaff(actor);

    const payments = await this.prisma.paymentReceipt.findMany({
      where: {
        organizationId: actor.organizationId,
        collectedByUserId: actor.id,
        status: { not: 'cancelled' },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const totalAmount = payments.reduce((sum, payment) => sum + this.toNumber(payment.amount), 0);

    return {
      success: true,
      message: 'Collection summary fetched successfully',
      data: {
        totalCount: payments.length,
        totalAmount: this.roundMoney(totalAmount),
        payments,
      },
    };
  }

  private async buildStopResponse(organizationId: string, stop: DeliveryStop) {
    const [retailer, salesOrder, trip, items, attachments] = await Promise.all([
      this.prisma.retailer.findFirst({
        where: { organizationId, id: stop.retailerId },
        select: {
          id: true,
          retailerCode: true,
          shopName: true,
          ownerName: true,
          mobile: true,
          locality: true,
        },
      }),
      stop.salesOrderId
        ? this.prisma.salesOrder.findFirst({
            where: { organizationId, id: stop.salesOrderId },
            select: { id: true, orderNo: true, status: true, source: true },
          })
        : null,
      this.prisma.dispatchTrip.findFirst({
        where: { organizationId, id: stop.dispatchTripId },
        select: { id: true, tripNo: true, status: true, dispatchDate: true },
      }),
      this.prisma.deliveryStopItem.findMany({
        where: { organizationId, deliveryStopId: stop.id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.fileAttachment.findMany({
        where: { organizationId, entityType: 'delivery_stop', entityId: stop.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      success: true,
      message: 'Delivery stop fetched successfully',
      data: {
        ...stop,
        retailer,
        salesOrder,
        trip,
        items: await this.enrichStopItems(organizationId, items),
        attachments,
      },
    };
  }

  private async enrichStops(organizationId: string, stops: DeliveryStop[]) {
    const retailerIds = [...new Set(stops.map((stop) => stop.retailerId))];
    const stopIds = stops.map((stop) => stop.id);
    const salesOrderIds = [...new Set(stops.map((stop) => stop.salesOrderId).filter((v): v is string => Boolean(v)))];

    const [retailers, orders, items] = await Promise.all([
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
      salesOrderIds.length
        ? this.prisma.salesOrder.findMany({
            where: { organizationId, id: { in: salesOrderIds } },
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
    for (const item of items) {
      const list = itemsByStop.get(item.deliveryStopId) ?? [];
      list.push(item);
      itemsByStop.set(item.deliveryStopId, list);
    }

    const enrichedItems = await this.enrichStopItems(organizationId, items);
    const enrichedByStop = new Map<string, typeof enrichedItems>();
    for (const item of enrichedItems) {
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

  private async enrichStopItems(organizationId: string, items: DeliveryStopItem[]) {
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

  private estimateTaxRate(item: DeliveryStopItem) {
    const loadedQty = this.toNumber(item.loadedQty || item.orderedQty);
    const lineBase = this.toNumber(item.unitPrice) * loadedQty;
    if (lineBase <= 0) return 0;
    return this.roundMoney((this.toNumber(item.taxAmount) / lineBase) * 100);
  }

  private mapStopStatusToOrderStatus(status: string) {
    if (status === 'delivered') return 'delivered';
    if (status === 'partial') return 'partial';
    if (status === 'failed' || status === 'refused') return 'cancelled';
    return null;
  }

  private async findLatestInvoiceForStop(organizationId: string, stop: DeliveryStop) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: {
        organizationId,
        retailerId: stop.retailerId,
        OR: [
          ...(stop.salesOrderId ? [{ salesOrderId: stop.salesOrderId }] : []),
          { dispatchTripId: stop.dispatchTripId },
        ],
        status: { in: ['draft', 'posted', 'partial_paid'] },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return invoice?.id;
  }

  private async getAccessibleStopOrThrow(actor: AuthenticatedUser, id: string) {
    const stop = await this.getStopOrThrow(actor.organizationId, id);
    const trip = await this.getTripOrThrow(actor.organizationId, stop.dispatchTripId);

    if (!this.isBackoffice(actor)) {
      if (!actor.employeeId || ![trip.driverEmployeeId, trip.helperEmployeeId].includes(actor.employeeId)) {
        throw new ForbiddenException('You are not assigned to this trip');
      }
    }

    return stop;
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

  private async getStopOrThrow(organizationId: string, id: string): Promise<DeliveryStop> {
    const stop = await this.prisma.deliveryStop.findFirst({
      where: { id, organizationId },
    });
    if (!stop) throw new NotFoundException('Delivery stop not found');
    return stop;
  }

  private async getTripOrThrow(organizationId: string, id: string): Promise<DispatchTrip> {
    const trip = await this.prisma.dispatchTrip.findFirst({
      where: { id, organizationId },
    });
    if (!trip) throw new NotFoundException('Dispatch trip not found');
    return trip;
  }

  private async generateReceiptNo(organizationId: string) {
    const total = await this.prisma.paymentReceipt.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `RCPT-${datePart}-${String(total + 1).padStart(4, '0')}`;
  }

  private fileNameFromUrl(url: string, fallback: string) {
    try {
      const parsed = new URL(url);
      const last = parsed.pathname.split('/').filter(Boolean).pop();
      if (last) return last;
      return fallback;
    } catch {
      const token = createHash('sha1').update(url).digest('hex').slice(0, 8);
      return `${token}-${fallback}`;
    }
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertStaff(actor: AuthenticatedUser) {
    if (this.hasPrivilegedOpsAccess(actor)) {
      return;
    }
    if (!actor.employeeId) {
      throw new ForbiddenException('Staff access required');
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

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }
}
