import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DeliveryStopItem, Prisma, SalesInvoice, SalesInvoiceItem, SalesOrderItem } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AccountingService } from '../../finance/accounting/accounting.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditControlService } from '../payments/credit-control.service';
import { PaymentMetricsService } from '../payments/payment-metrics.service';
import { RetailerFinanceService } from '../payments/retailer-finance.service';
import { RetailerLedgerService } from '../payments/retailer-ledger.service';
import {
  CancelAndRegenerateSalesInvoiceDto,
  CreateAssistedSalesInvoiceDto,
  DeleteDraftSalesInvoiceDto,
  GenerateSalesInvoiceDto,
  PreviewSalesInvoiceRevisionDto,
  QuerySalesInvoicesDto,
  RecomputeSalesInvoiceFromDeliveryDto,
  ReviseSalesInvoiceDto,
  SalesInvoiceRevisionItemDto,
  UpdateDraftSalesInvoiceDto,
} from './dto';

type InvoiceLine = {
  variantId: string;
  billedQty: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  deliveryStopItemId?: string | null;
};

@Injectable()
export class SalesInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
    private readonly retailerLedgerService: RetailerLedgerService,
    private readonly paymentMetricsService: PaymentMetricsService,
    private readonly retailerFinanceService: RetailerFinanceService,
    private readonly creditControlService: CreditControlService,
  ) {}

  async findAll(actor: AuthenticatedUser, query: QuerySalesInvoicesDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = await this.buildInvoiceWhere(actor, query);

    const [rows, total] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where,
        orderBy: { invoiceDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salesInvoice.count({ where }),
    ]);

    return {
      success: true,
      message: 'Sales invoices fetched successfully',
      data: await this.enrichInvoices(actor.organizationId, rows),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async generate(actor: AuthenticatedUser, dto: GenerateSalesInvoiceDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.createInvoice(actor, dto, dto.source ?? 'auto_delivery');
  }

  async createAssisted(actor: AuthenticatedUser, dto: CreateAssistedSalesInvoiceDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.createInvoice(actor, dto, 'assisted_billing');
  }

  async findOne(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    const invoice = await this.getAccessibleInvoiceOrThrow(actor, id);

    const [items, retailer, salesOrder, trip, allocations] = await Promise.all([
      this.prisma.salesInvoiceItem.findMany({
        where: { organizationId: actor.organizationId, salesInvoiceId: id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.retailer.findFirst({
        where: { organizationId: actor.organizationId, id: invoice.retailerId },
        select: {
          id: true,
          retailerCode: true,
          shopName: true,
          ownerName: true,
          mobile: true,
          orderingMode: true,
        },
      }),
      invoice.salesOrderId
        ? this.prisma.salesOrder.findFirst({
            where: { organizationId: actor.organizationId, id: invoice.salesOrderId },
            select: { id: true, orderNo: true, status: true, source: true },
          })
        : null,
      invoice.dispatchTripId
        ? this.prisma.dispatchTrip.findFirst({
            where: { organizationId: actor.organizationId, id: invoice.dispatchTripId },
            select: { id: true, tripNo: true, status: true, dispatchDate: true },
          })
        : null,
      this.prisma.paymentAllocation.findMany({
        where: { organizationId: actor.organizationId, salesInvoiceId: id },
        include: {
          paymentReceipt: {
            select: {
              id: true,
              receiptNo: true,
              amount: true,
              paymentDate: true,
              paymentMode: true,
              status: true,
            },
          },
        },
        orderBy: { allocationDate: 'desc' },
      }),
    ]);

    return {
      success: true,
      message: 'Sales invoice fetched successfully',
      data: {
        ...invoice,
        items: await this.enrichInvoiceItems(actor.organizationId, items),
        retailer,
        salesOrder,
        dispatchTrip: trip,
        allocations: allocations.map((allocation) => ({
          ...allocation,
          allocatedAmount: this.toNumber(allocation.allocatedAmount),
        })),
      },
    };
  }

  async updateDraft(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateDraftSalesInvoiceDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoice = await this.getInvoiceOrThrow(actor.organizationId, id);
    await this.assertDraftEditable(actor.organizationId, invoice);

    const lineContext = await this.buildRevisionLinesFromManualInput(
      actor.organizationId,
      dto.items,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.salesInvoiceItem.deleteMany({
        where: { organizationId: actor.organizationId, salesInvoiceId: id },
      });

      const header = await tx.salesInvoice.update({
        where: { id },
        data: {
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : invoice.invoiceDate,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : invoice.dueDate,
          subtotal: lineContext.subtotal,
          discountTotal: lineContext.discountTotal,
          taxTotal: lineContext.taxTotal,
          grandTotal: lineContext.grandTotal,
          outstandingAmount: lineContext.grandTotal,
          remarks: dto.remarks ?? invoice.remarks,
        },
      });

      await tx.salesInvoiceItem.createMany({
        data: lineContext.lines.map((line) => ({
          organizationId: actor.organizationId,
          salesInvoiceId: id,
          deliveryStopItemId: line.deliveryStopItemId ?? null,
          variantId: line.variantId,
          billedQty: line.billedQty,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          taxRate: line.taxRate,
          taxAmount: line.taxAmount,
          lineTotal: line.lineTotal,
        })),
      });

      return header;
    });

    return this.findOne(actor, updated.id);
  }

  async deleteDraft(
    actor: AuthenticatedUser,
    id: string,
    dto: DeleteDraftSalesInvoiceDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoice = await this.getInvoiceOrThrow(actor.organizationId, id);
    await this.assertDraftEditable(actor.organizationId, invoice);

    await this.prisma.salesInvoice.delete({ where: { id } });

    return {
      success: true,
      message: 'Draft sales invoice deleted successfully',
      data: {
        id,
        invoiceNo: invoice.invoiceNo,
        reason: dto.reason,
      },
    };
  }

  async previewRevision(
    actor: AuthenticatedUser,
    id: string,
    dto: PreviewSalesInvoiceRevisionDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoice = await this.getInvoiceOrThrow(actor.organizationId, id);
    const lineContext = dto.revisionMode === 'from_delivery_actuals'
      ? await this.buildRevisionLinesFromDeliveryActuals(
          actor.organizationId,
          invoice.retailerId,
          invoice.salesOrderId,
          invoice.dispatchTripId,
        )
      : await this.buildRevisionLinesFromManualInput(actor.organizationId, dto.items ?? []);

    const currentGrandTotal = this.toNumber(invoice.grandTotal);
    const revisedGrandTotal = lineContext.grandTotal;
    const deltaAmount = this.roundMoney(revisedGrandTotal - currentGrandTotal);

    const allocationTotal = await this.prisma.paymentAllocation.aggregate({
      where: { organizationId: actor.organizationId, salesInvoiceId: id },
      _sum: { allocatedAmount: true },
    });
    const allocatedAmount = this.toNumber(allocationTotal._sum.allocatedAmount);

    let financialAction = 'draft_update';
    let allowed = true;
    const blockingReasons: string[] = [];

    if (invoice.status === 'draft') {
      financialAction = 'draft_update';
    } else if (invoice.status === 'posted' && invoice.paymentStatus === 'unpaid' && allocatedAmount <= 0) {
      financialAction = 'cancel_and_regenerate';
    } else if (['partial_paid', 'paid'].includes(invoice.paymentStatus) || allocatedAmount > 0) {
      financialAction = deltaAmount < 0 ? 'credit_note_required' : 'debit_note_required';
      allowed = false;
      blockingReasons.push('invoice_has_payment_or_settlement_history');
    } else {
      financialAction = 'blocked';
      allowed = false;
      blockingReasons.push('invoice_state_not_revisable');
    }

    return {
      success: true,
      message: 'Sales invoice revision preview generated successfully',
      data: {
        invoiceId: id,
        currentGrandTotal,
        revisedGrandTotal,
        deltaAmount,
        financialAction,
        allowed,
        portalImpact: {
          retailerInvoicesUpdated: true,
          retailerDuesUpdated: true,
          ledgerUpdated: invoice.status !== 'draft',
        },
        blockingReasons,
        revisedLines: lineContext.lines,
      },
    };
  }

  async revisePostedUnpaid(
    actor: AuthenticatedUser,
    id: string,
    dto: ReviseSalesInvoiceDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoice = await this.getInvoiceOrThrow(actor.organizationId, id);
    await this.assertPostedUnpaidRevisable(actor.organizationId, invoice);

    const lineContext = dto.revisionMode === 'from_delivery_actuals'
      ? await this.buildRevisionLinesFromDeliveryActuals(
          actor.organizationId,
          invoice.retailerId,
          invoice.salesOrderId,
          invoice.dispatchTripId,
        )
      : await this.buildRevisionLinesFromManualInput(actor.organizationId, dto.items ?? []);

    const replacementInvoiceNo = await this.generateReplacementInvoiceNo(
      actor.organizationId,
      invoice.invoiceNo,
    );

    const replacement = await this.prisma.$transaction(async (tx) => {
      await tx.salesInvoice.update({
        where: { id },
        data: {
          status: 'cancelled',
          outstandingAmount: 0,
          paymentStatus: 'unpaid',
          remarks: this.appendReason(invoice.remarks, `Revised: ${dto.reason}`),
        },
      });

      const created = await tx.salesInvoice.create({
        data: {
          organizationId: actor.organizationId,
          invoiceNo: replacementInvoiceNo,
          retailerId: invoice.retailerId,
          salesOrderId: invoice.salesOrderId,
          dispatchTripId: invoice.dispatchTripId,
          invoiceDate: dto.newInvoiceDate ? new Date(dto.newInvoiceDate) : invoice.invoiceDate,
          dueDate: dto.newDueDate ? new Date(dto.newDueDate) : invoice.dueDate,
          source: invoice.source,
          createdByUserId: actor.id,
          status: 'posted',
          paymentStatus: 'unpaid',
          subtotal: lineContext.subtotal,
          discountTotal: lineContext.discountTotal,
          taxTotal: lineContext.taxTotal,
          grandTotal: lineContext.grandTotal,
          outstandingAmount: lineContext.grandTotal,
          remarks: this.appendReason(invoice.remarks, `Replacement for ${invoice.invoiceNo}: ${dto.reason}`),
        },
      });

      await tx.salesInvoiceItem.createMany({
        data: lineContext.lines.map((line) => ({
          organizationId: actor.organizationId,
          salesInvoiceId: created.id,
          deliveryStopItemId: line.deliveryStopItemId ?? null,
          variantId: line.variantId,
          billedQty: line.billedQty,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          taxRate: line.taxRate,
          taxAmount: line.taxAmount,
          lineTotal: line.lineTotal,
        })),
      });

      return created;
    });

    await this.cancelInvoiceFinancially(actor, invoice, dto.reason);
    await this.postReplacementInvoiceFinancially(actor, replacement);

    return {
      success: true,
      message: 'Sales invoice revised successfully',
      data: {
        originalInvoiceId: invoice.id,
        replacementInvoiceId: replacement.id,
        originalStatus: 'cancelled',
        replacementStatus: replacement.status,
        deltaAmount: this.roundMoney(lineContext.grandTotal - this.toNumber(invoice.grandTotal)),
      },
    };
  }

  async cancelAndRegenerate(
    actor: AuthenticatedUser,
    id: string,
    dto: CancelAndRegenerateSalesInvoiceDto,
  ) {
    const mapped: ReviseSalesInvoiceDto = {
      revisionMode: dto.source === 'delivery_actuals' ? 'from_delivery_actuals' : 'manual',
      reason: dto.reason,
      items: dto.items,
    };

    return this.revisePostedUnpaid(actor, id, mapped);
  }

  async recomputeFromDelivery(
    actor: AuthenticatedUser,
    id: string,
    dto: RecomputeSalesInvoiceFromDeliveryDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoice = await this.getInvoiceOrThrow(actor.organizationId, id);

    if (invoice.status === 'draft') {
      const lineContext = await this.buildRevisionLinesFromDeliveryActuals(
        actor.organizationId,
        invoice.retailerId,
        invoice.salesOrderId,
        invoice.dispatchTripId,
      );

      if (!dto.applyImmediately) {
        return this.previewRevision(actor, id, {
          revisionMode: 'from_delivery_actuals',
          reason: dto.reason,
        });
      }

      return this.updateDraft(actor, id, {
        invoiceDate: invoice.invoiceDate.toISOString(),
        dueDate: invoice.dueDate?.toISOString(),
        remarks: this.appendReason(invoice.remarks, `Recomputed from delivery: ${dto.reason}`),
        items: lineContext.lines.map((line) => ({
          deliveryStopItemId: line.deliveryStopItemId ?? undefined,
          variantId: line.variantId,
          billedQty: line.billedQty,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          taxRate: line.taxRate,
        })),
      });
    }

    if (invoice.status === 'posted' && invoice.paymentStatus === 'unpaid') {
      if (!dto.applyImmediately) {
        return this.previewRevision(actor, id, {
          revisionMode: 'from_delivery_actuals',
          reason: dto.reason,
        });
      }

      return this.revisePostedUnpaid(actor, id, {
        revisionMode: 'from_delivery_actuals',
        reason: dto.reason,
      });
    }

    throw new ConflictException(
      'Invoice cannot be recomputed directly after payment activity; use credit/debit note workflow',
    );
  }

  async getRevisionHistory(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    const invoice = await this.getAccessibleInvoiceOrThrow(actor, id);

    const related = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId: actor.organizationId,
        retailerId: invoice.retailerId,
        OR: [
          ...(invoice.salesOrderId ? [{ salesOrderId: invoice.salesOrderId }] : []),
          ...(invoice.dispatchTripId ? [{ dispatchTripId: invoice.dispatchTripId }] : []),
          { id: invoice.id },
        ],
      },
      orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        invoiceNo: true,
        status: true,
        paymentStatus: true,
        invoiceDate: true,
        grandTotal: true,
        outstandingAmount: true,
        remarks: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      message: 'Sales invoice revision history fetched successfully',
      data: related.map((row) => ({
        ...row,
        grandTotal: this.toNumber(row.grandTotal),
        outstandingAmount: this.toNumber(row.outstandingAmount),
      })),
    };
  }

  async post(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoice = await this.getInvoiceOrThrow(actor.organizationId, id);
    if (invoice.status === 'cancelled') {
      throw new ConflictException('Cancelled invoice cannot be posted');
    }
    if (invoice.status === 'posted' || invoice.status === 'partial_paid' || invoice.status === 'paid') {
      if (!invoice.journalEntryId) {
        await this.accountingService.postSalesInvoice(actor, id);
      }
      await this.retailerLedgerService.postInvoiceDebit(actor, {
        retailerId: invoice.retailerId,
        invoiceId: invoice.id,
        amount: this.toNumber(invoice.grandTotal),
        entryDate: invoice.invoiceDate,
        remarks: `Invoice ${invoice.invoiceNo} posted`,
        createdByUserId: actor.id,
      });
      await this.paymentMetricsService.refreshAfterInvoice(actor, invoice.retailerId);
      return {
        success: true,
        message: 'Invoice already posted',
        data: invoice,
      };
    }

    await this.creditControlService.assertCreditAllowed(actor, invoice.retailerId, {
      context: 'invoice_posting',
      transactionAmount: this.toNumber(invoice.outstandingAmount || invoice.grandTotal),
      salesInvoiceId: invoice.id,
      dispatchTripId: invoice.dispatchTripId ?? undefined,
      salesOrderId: invoice.salesOrderId ?? undefined,
    });

    const updated = await this.prisma.salesInvoice.update({
      where: { id },
      data: { status: 'posted' },
    });

    await this.retailerLedgerService.postInvoiceDebit(actor, {
      retailerId: updated.retailerId,
      invoiceId: updated.id,
      amount: this.toNumber(updated.grandTotal),
      entryDate: updated.invoiceDate,
      remarks: `Invoice ${updated.invoiceNo} posted`,
      createdByUserId: actor.id,
    });
    await this.accountingService.postSalesInvoice(actor, updated.id);
    await this.paymentMetricsService.refreshAfterInvoice(actor, updated.retailerId);

    return {
      success: true,
      message: 'Sales invoice posted successfully',
      data: updated,
    };
  }

  async cancel(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoice = await this.getInvoiceOrThrow(actor.organizationId, id);
    if (invoice.status === 'cancelled') {
      return {
        success: true,
        message: 'Invoice already cancelled',
        data: invoice,
      };
    }

    const allocationTotal = await this.prisma.paymentAllocation.aggregate({
      where: { organizationId: actor.organizationId, salesInvoiceId: id },
      _sum: { allocatedAmount: true },
    });
    if (this.toNumber(allocationTotal._sum.allocatedAmount) > 0) {
      throw new ConflictException('Cannot cancel invoice with payment allocations');
    }

    const updated = await this.prisma.salesInvoice.update({
      where: { id },
      data: {
        status: 'cancelled',
        outstandingAmount: 0,
        paymentStatus: 'unpaid',
      },
    });

    await this.retailerLedgerService.reverseInvoicePosting(actor, {
      retailerId: updated.retailerId,
      invoiceId: updated.id,
      amount: this.toNumber(updated.grandTotal),
      entryDate: new Date(),
      remarks: `Invoice ${updated.invoiceNo} cancelled`,
      createdByUserId: actor.id,
    });
    if (invoice.journalEntryId) {
      await this.accountingService.reverseSalesInvoice(actor, id, 'Sales invoice cancelled');
    }
    await this.paymentMetricsService.refreshAfterInvoice(actor, updated.retailerId);

    return {
      success: true,
      message: 'Sales invoice cancelled successfully',
      data: updated,
    };
  }

  async export(actor: AuthenticatedUser, id: string, format: string) {
    const invoice = await this.findOne(actor, id);
    return {
      success: true,
      message: 'Sales invoice export payload generated successfully',
      data: {
        format,
        fileName: `${invoice.data.invoiceNo}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`,
        invoice: invoice.data,
      },
    };
  }

  async shareWhatsApp(actor: AuthenticatedUser, id: string) {
    const invoice = await this.findOne(actor, id);
    return {
      success: true,
      message: 'Sales invoice WhatsApp payload generated successfully',
      data: {
        salesInvoiceId: id,
        messageText: [
          `Invoice ${invoice.data.invoiceNo}`,
          `Retailer: ${invoice.data.retailer?.shopName ?? ''}`,
          `Amount: ₹${this.toNumber(invoice.data.grandTotal).toFixed(2)}`,
          `Outstanding: ₹${this.toNumber(invoice.data.outstandingAmount).toFixed(2)}`,
        ].join('\n'),
      },
    };
  }

  async getMyInvoices(actor: AuthenticatedUser, query: QuerySalesInvoicesDto) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);
    return this.findAll(actor, { ...query, retailerId: actor.retailerId ?? undefined });
  }

  async getMyInvoiceById(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);
    return this.findOne(actor, id);
  }

  async getMyDues(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);
    return this.retailerFinanceService.getMyDues(actor);
  }

  private async createInvoice(
    actor: AuthenticatedUser,
    dto: GenerateSalesInvoiceDto,
    source: string,
  ) {
    const retailer = await this.getRetailerOrThrow(actor.organizationId, dto.retailerId);
    if (!retailer.isBillingEnabled) {
      throw new ForbiddenException('Billing is disabled for this retailer');
    }

    const order = dto.salesOrderId
      ? await this.getSalesOrderOrThrow(actor.organizationId, dto.salesOrderId)
      : null;
    const trip = dto.dispatchTripId
      ? await this.getDispatchTripOrThrow(actor.organizationId, dto.dispatchTripId)
      : null;

    if (!order && !trip) {
      throw new BadRequestException('Sales order or dispatch trip is required for invoice generation');
    }
    if (order && order.retailerId !== retailer.id) {
      throw new BadRequestException('Sales order retailer does not match invoice retailer');
    }

    const existing = await this.prisma.salesInvoice.findFirst({
      where: {
        organizationId: actor.organizationId,
        retailerId: retailer.id,
        salesOrderId: order?.id ?? undefined,
        dispatchTripId: trip?.id ?? undefined,
        status: { not: 'cancelled' },
      },
      select: { id: true, invoiceNo: true },
    });

    if (existing) {
      throw new ConflictException(`Invoice ${existing.invoiceNo} already exists for this context`);
    }

    const lineContext = await this.buildInvoiceLines(actor.organizationId, retailer.id, order?.id ?? null, trip?.id ?? null);
    if (!lineContext.lines.length) {
      throw new BadRequestException('No deliverable/billable items found for invoice generation');
    }

    await this.creditControlService.assertCreditAllowed(actor, retailer.id, {
      context: 'invoice_posting',
      transactionAmount: lineContext.grandTotal,
      salesOrderId: order?.id ?? undefined,
      dispatchTripId: trip?.id ?? undefined,
    });

    const invoiceNo = await this.generateInvoiceNo(actor.organizationId);
    const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();
    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : (() => {
          const date = new Date(invoiceDate);
          date.setDate(date.getDate() + (retailer.creditDays ?? 0));
          return date;
        })();

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.salesInvoice.create({
        data: {
          organizationId: actor.organizationId,
          invoiceNo,
          retailerId: retailer.id,
          salesOrderId: order?.id ?? null,
          dispatchTripId: trip?.id ?? null,
          invoiceDate,
          dueDate,
          source,
          createdByUserId: actor.id,
          status: 'posted',
          paymentStatus: 'unpaid',
          subtotal: lineContext.subtotal,
          discountTotal: lineContext.discountTotal,
          taxTotal: lineContext.taxTotal,
          grandTotal: lineContext.grandTotal,
          outstandingAmount: lineContext.grandTotal,
          remarks: dto.remarks,
        },
      });

      await tx.salesInvoiceItem.createMany({
        data: lineContext.lines.map((line) => ({
          organizationId: actor.organizationId,
          salesInvoiceId: created.id,
          deliveryStopItemId: line.deliveryStopItemId ?? null,
          variantId: line.variantId,
          billedQty: line.billedQty,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          taxRate: line.taxRate,
          taxAmount: line.taxAmount,
          lineTotal: line.lineTotal,
        })),
      });

      return created;
    });

    await this.retailerLedgerService.postInvoiceDebit(actor, {
      retailerId: invoice.retailerId,
      invoiceId: invoice.id,
      amount: this.toNumber(invoice.grandTotal),
      entryDate: invoice.invoiceDate,
      remarks: `Invoice ${invoice.invoiceNo} created`,
      createdByUserId: actor.id,
    });
    await this.accountingService.postSalesInvoice(actor, invoice.id);
    await this.paymentMetricsService.refreshAfterInvoice(actor, invoice.retailerId);

    return this.findOne(actor, invoice.id);
  }

  private async assertDraftEditable(organizationId: string, invoice: SalesInvoice) {
    if (invoice.status !== 'draft') {
      throw new ConflictException('Only draft invoices can be edited or deleted directly');
    }

    const allocationAgg = await this.prisma.paymentAllocation.aggregate({
      where: { organizationId, salesInvoiceId: invoice.id },
      _sum: { allocatedAmount: true },
    });

    if (this.toNumber(allocationAgg._sum.allocatedAmount) > 0) {
      throw new ConflictException('Draft invoice cannot be edited because payment allocation exists');
    }

    if (invoice.journalEntryId) {
      throw new ConflictException('Draft invoice cannot be edited because journal posting already exists');
    }
  }

  private async assertPostedUnpaidRevisable(organizationId: string, invoice: SalesInvoice) {
    if (invoice.paymentStatus !== 'unpaid') {
      throw new ConflictException('Invoice with payment activity must use note-based adjustment flow');
    }

    if (invoice.status !== 'posted') {
      throw new ConflictException('Only posted unpaid invoices can be revised through replacement flow');
    }

    const allocationAgg = await this.prisma.paymentAllocation.aggregate({
      where: { organizationId, salesInvoiceId: invoice.id },
      _sum: { allocatedAmount: true },
    });

    if (this.toNumber(allocationAgg._sum.allocatedAmount) > 0) {
      throw new ConflictException('Invoice with payment allocations cannot be revised directly');
    }
  }

  private async buildRevisionLinesFromManualInput(
    organizationId: string,
    items: SalesInvoiceRevisionItemDto[],
  ) {
    if (!items.length) {
      throw new BadRequestException('At least one revision item is required for manual invoice revision');
    }

    const variantIds = [...new Set(items.map((item) => item.variantId))];
    const variants = await this.prisma.productVariant.findMany({
      where: {
        organizationId,
        id: { in: variantIds },
      },
      select: {
        id: true,
      },
    });

    if (variants.length !== variantIds.length) {
      throw new BadRequestException('One or more invoice revision variants are invalid');
    }

    const lines: InvoiceLine[] = items.map((item) => {
      const billedQty = this.roundQty(item.billedQty);
      const unitPrice = this.roundMoney(item.unitPrice);
      const discountAmount = this.roundMoney(item.discountAmount ?? 0);
      const taxRate = this.roundMoney(item.taxRate ?? 0);
      const lineBase = this.roundMoney(unitPrice * billedQty);
      const taxableBase = this.roundMoney(Math.max(lineBase - discountAmount, 0));
      const taxAmount = this.roundMoney((taxableBase * taxRate) / 100);
      const lineTotal = this.roundMoney(taxableBase + taxAmount);

      return {
        deliveryStopItemId: item.deliveryStopItemId ?? null,
        variantId: item.variantId,
        billedQty,
        unitPrice,
        discountAmount,
        taxRate,
        taxAmount,
        lineTotal,
      };
    }).filter((line) => line.billedQty > 0);

    if (!lines.length) {
      throw new BadRequestException('At least one positive billed quantity line is required');
    }

    return this.recalculateRevisionTotals(lines);
  }

  private async buildRevisionLinesFromDeliveryActuals(
    organizationId: string,
    retailerId: string,
    salesOrderId?: string | null,
    dispatchTripId?: string | null,
  ) {
    const lineContext = await this.buildInvoiceLines(
      organizationId,
      retailerId,
      salesOrderId ?? null,
      dispatchTripId ?? null,
    );

    if (!lineContext.lines.length) {
      throw new BadRequestException('No actual delivered lines available for invoice recomputation');
    }

    return lineContext;
  }

  private recalculateRevisionTotals(lines: InvoiceLine[]) {
    const subtotal = this.roundMoney(lines.reduce((sum, line) => sum + this.roundMoney(line.unitPrice * line.billedQty), 0));
    const discountTotal = this.roundMoney(lines.reduce((sum, line) => sum + line.discountAmount, 0));
    const taxTotal = this.roundMoney(lines.reduce((sum, line) => sum + line.taxAmount, 0));
    const grandTotal = this.roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));

    return {
      lines,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
    };
  }

  private async cancelInvoiceFinancially(
    actor: AuthenticatedUser,
    invoice: SalesInvoice,
    reason: string,
  ) {
    await this.retailerLedgerService.reverseInvoicePosting(actor, {
      retailerId: invoice.retailerId,
      invoiceId: invoice.id,
      amount: this.toNumber(invoice.grandTotal),
      entryDate: new Date(),
      remarks: `Invoice ${invoice.invoiceNo} revised/cancelled: ${reason}`,
      createdByUserId: actor.id,
    });

    if (invoice.journalEntryId) {
      await this.accountingService.reverseSalesInvoice(actor, invoice.id, `Invoice revised: ${reason}`);
    }
  }

  private async postReplacementInvoiceFinancially(
    actor: AuthenticatedUser,
    invoice: SalesInvoice,
  ) {
    await this.retailerLedgerService.postInvoiceDebit(actor, {
      retailerId: invoice.retailerId,
      invoiceId: invoice.id,
      amount: this.toNumber(invoice.grandTotal),
      entryDate: invoice.invoiceDate,
      remarks: `Replacement invoice ${invoice.invoiceNo} posted`,
      createdByUserId: actor.id,
    });
    await this.accountingService.postSalesInvoice(actor, invoice.id);
    await this.paymentMetricsService.refreshAfterInvoice(actor, invoice.retailerId);
  }

  private async generateReplacementInvoiceNo(
    organizationId: string,
    originalInvoiceNo: string,
  ) {
    const existing = await this.prisma.salesInvoice.count({
      where: {
        organizationId,
        invoiceNo: { startsWith: `${originalInvoiceNo}-R` },
      },
    });

    return `${originalInvoiceNo}-R${existing + 1}`;
  }

  private appendReason(existing: string | null | undefined, text: string) {
    return `${existing ?? ''}${existing ? ' | ' : ''}${text}`;
  }

  private async buildInvoiceWhere(actor: AuthenticatedUser, query: QuerySalesInvoicesDto) {
    const where: Prisma.SalesInvoiceWhereInput = {
      organizationId: actor.organizationId,
    };

    if (this.isRetailerUser(actor)) {
      where.retailerId = actor.retailerId ?? undefined;
    }

    if (query.retailerId && !this.isRetailerUser(actor)) {
      where.retailerId = query.retailerId;
    }

    if (query.status) where.status = query.status;
    if (query.fromDate || query.toDate) {
      where.invoiceDate = {};
      if (query.fromDate) where.invoiceDate.gte = new Date(query.fromDate);
      if (query.toDate) where.invoiceDate.lte = new Date(query.toDate);
    }
    if (query.search) {
      where.OR = [
        { invoiceNo: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.routeId) {
      const tripIds = await this.prisma.dispatchTrip.findMany({
        where: {
          organizationId: actor.organizationId,
          routeId: query.routeId,
        },
        select: { id: true },
      });
      where.dispatchTripId = { in: tripIds.map((trip) => trip.id) };
    }

    return where;
  }

  private async buildInvoiceLines(
    organizationId: string,
    retailerId: string,
    salesOrderId: string | null,
    dispatchTripId: string | null,
  ) {
    if (salesOrderId) {
      const orderItems = await this.prisma.salesOrderItem.findMany({
        where: { organizationId, salesOrderId },
        orderBy: { createdAt: 'asc' },
      });
      const stopItems = await this.prisma.deliveryStopItem.findMany({
        where: {
          organizationId,
          deliveryStop: {
            is: {
              retailerId,
              salesOrderId,
              ...(dispatchTripId ? { dispatchTripId } : {}),
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      return this.buildInvoiceLinesFromOrderItems(orderItems, stopItems);
    }

    const stops = await this.prisma.deliveryStop.findMany({
      where: {
        organizationId,
        retailerId,
        dispatchTripId: dispatchTripId ?? undefined,
      },
      select: { id: true },
    });
    const stopItems = await this.prisma.deliveryStopItem.findMany({
      where: { organizationId, deliveryStopId: { in: stops.map((stop) => stop.id) } },
      orderBy: { createdAt: 'asc' },
    });
    return this.buildInvoiceLinesFromStopItems(stopItems);
  }

  private buildInvoiceLinesFromOrderItems(orderItems: SalesOrderItem[], stopItems: DeliveryStopItem[]) {
    const stopItemByOrderItem = new Map<string, DeliveryStopItem[]>();
    for (const stopItem of stopItems) {
      if (!stopItem.salesOrderItemId) continue;
      const list = stopItemByOrderItem.get(stopItem.salesOrderItemId) ?? [];
      list.push(stopItem);
      stopItemByOrderItem.set(stopItem.salesOrderItemId, list);
    }

    const lines: InvoiceLine[] = [];
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    for (const orderItem of orderItems) {
      const relatedStops = stopItemByOrderItem.get(orderItem.id) ?? [];
      const billedQty = this.roundQty(
        relatedStops.length
          ? relatedStops.reduce((sum, item) => sum + this.toNumber(item.deliveredQty), 0)
          : this.toNumber(orderItem.approvedQty ?? orderItem.orderedQty),
      );

      if (billedQty <= 0) continue;

      const orderedQty = this.toNumber(orderItem.orderedQty);
      const perUnitDiscount = orderedQty > 0 ? this.toNumber(orderItem.discountAmount) / orderedQty : 0;
      const unitPrice = this.toNumber(orderItem.unitPrice);
      const lineBase = this.roundMoney(unitPrice * billedQty);
      const discountAmount = this.roundMoney(perUnitDiscount * billedQty);
      const taxableBase = this.roundMoney(Math.max(lineBase - discountAmount, 0));
      const taxRate = this.toNumber(orderItem.taxRate);
      const taxAmount = this.roundMoney((taxableBase * taxRate) / 100);
      const lineTotal = this.roundMoney(taxableBase + taxAmount);

      subtotal = this.roundMoney(subtotal + lineBase);
      discountTotal = this.roundMoney(discountTotal + discountAmount);
      taxTotal = this.roundMoney(taxTotal + taxAmount);
      grandTotal = this.roundMoney(grandTotal + lineTotal);

      lines.push({
        variantId: orderItem.variantId,
        billedQty,
        unitPrice,
        discountAmount,
        taxRate,
        taxAmount,
        lineTotal,
        deliveryStopItemId: relatedStops[0]?.id ?? null,
      });
    }

    return { lines, subtotal, discountTotal, taxTotal, grandTotal };
  }

  private buildInvoiceLinesFromStopItems(stopItems: DeliveryStopItem[]) {
    const grouped = new Map<string, InvoiceLine>();

    for (const stopItem of stopItems) {
      const billedQty = this.toNumber(stopItem.deliveredQty);
      if (billedQty <= 0) continue;
      const key = stopItem.variantId;
      const current = grouped.get(key) ?? {
        variantId: stopItem.variantId,
        billedQty: 0,
        unitPrice: this.toNumber(stopItem.unitPrice),
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: 0,
        deliveryStopItemId: stopItem.id,
      };

      const taxRate = this.estimateTaxRateFromStopItem(stopItem);
      const lineBase = this.roundMoney(this.toNumber(stopItem.unitPrice) * billedQty);
      const lineTax = this.roundMoney((lineBase * taxRate) / 100);
      const lineTotal = this.roundMoney(lineBase + lineTax);

      current.billedQty = this.roundQty(current.billedQty + billedQty);
      current.taxRate = taxRate;
      current.taxAmount = this.roundMoney(current.taxAmount + lineTax);
      current.lineTotal = this.roundMoney(current.lineTotal + lineTotal);
      grouped.set(key, current);
    }

    const lines = [...grouped.values()];
    const subtotal = this.roundMoney(
      lines.reduce((sum, line) => sum + this.roundMoney(line.unitPrice * line.billedQty), 0),
    );
    const discountTotal = 0;
    const taxTotal = this.roundMoney(lines.reduce((sum, line) => sum + line.taxAmount, 0));
    const grandTotal = this.roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));

    return { lines, subtotal, discountTotal, taxTotal, grandTotal };
  }

  private async enrichInvoices(organizationId: string, invoices: SalesInvoice[]) {
    const retailerIds = [...new Set(invoices.map((invoice) => invoice.retailerId))];
    const orderIds = [...new Set(invoices.map((invoice) => invoice.salesOrderId).filter((v): v is string => Boolean(v)))];
    const tripIds = [...new Set(invoices.map((invoice) => invoice.dispatchTripId).filter((v): v is string => Boolean(v)))];

    const [retailers, orders, trips] = await Promise.all([
      retailerIds.length
        ? this.prisma.retailer.findMany({
            where: { organizationId, id: { in: retailerIds } },
            select: { id: true, retailerCode: true, shopName: true, mobile: true },
          })
        : [],
      orderIds.length
        ? this.prisma.salesOrder.findMany({
            where: { organizationId, id: { in: orderIds } },
            select: { id: true, orderNo: true, status: true, source: true },
          })
        : [],
      tripIds.length
        ? this.prisma.dispatchTrip.findMany({
            where: { organizationId, id: { in: tripIds } },
            select: { id: true, tripNo: true, status: true, dispatchDate: true },
          })
        : [],
    ]);

    const retailerMap = new Map<string, any>(retailers.map((row): [string, any] => [row.id, row]));
    const orderMap = new Map<string, any>(orders.map((row): [string, any] => [row.id, row]));
    const tripMap = new Map<string, any>(trips.map((row): [string, any] => [row.id, row]));

    return invoices.map((invoice) => ({
      ...invoice,
      grandTotal: this.toNumber(invoice.grandTotal),
      outstandingAmount: this.toNumber(invoice.outstandingAmount),
      discountTotal: this.toNumber(invoice.discountTotal),
      taxTotal: this.toNumber(invoice.taxTotal),
      subtotal: this.toNumber(invoice.subtotal),
      retailer: retailerMap.get(invoice.retailerId) ?? null,
      salesOrder: invoice.salesOrderId ? orderMap.get(invoice.salesOrderId) ?? null : null,
      dispatchTrip: invoice.dispatchTripId ? tripMap.get(invoice.dispatchTripId) ?? null : null,
    }));
  }

  private async enrichInvoiceItems(organizationId: string, items: SalesInvoiceItem[]) {
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
    const variantMap = new Map<string, any>(variants.map((row) => [row.id, row]));

    return items.map((item) => ({
      ...item,
      billedQty: this.toNumber(item.billedQty),
      unitPrice: this.toNumber(item.unitPrice),
      discountAmount: this.toNumber(item.discountAmount),
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

  private estimateTaxRateFromStopItem(item: DeliveryStopItem) {
    const loadedQty = this.toNumber(item.loadedQty || item.orderedQty);
    const lineBase = this.toNumber(item.unitPrice) * loadedQty;
    if (lineBase <= 0) return 0;
    return this.roundMoney((this.toNumber(item.taxAmount) / lineBase) * 100);
  }

  private async getAccessibleInvoiceOrThrow(actor: AuthenticatedUser, id: string) {
    const invoice = await this.getInvoiceOrThrow(actor.organizationId, id);
    if (this.isRetailerUser(actor) && actor.retailerId !== invoice.retailerId) {
      throw new ForbiddenException('You can only access your own invoices');
    }
    return invoice;
  }

  private async getInvoiceOrThrow(organizationId: string, id: string): Promise<SalesInvoice> {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id, organizationId },
    });
    if (!invoice) throw new NotFoundException('Sales invoice not found');
    return invoice;
  }

  private async getRetailerOrThrow(organizationId: string, id: string) {
    const retailer = await this.prisma.retailer.findFirst({
      where: { id, organizationId },
    });
    if (!retailer) throw new NotFoundException('Retailer not found');
    return retailer;
  }

  private async getSalesOrderOrThrow(organizationId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, organizationId },
    });
    if (!order) throw new NotFoundException('Sales order not found');
    return order;
  }

  private async getDispatchTripOrThrow(organizationId: string, id: string) {
    const trip = await this.prisma.dispatchTrip.findFirst({
      where: { id, organizationId },
    });
    if (!trip) throw new NotFoundException('Dispatch trip not found');
    return trip;
  }

  private async generateInvoiceNo(organizationId: string) {
    const total = await this.prisma.salesInvoice.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `INV-${datePart}-${String(total + 1).padStart(4, '0')}`;
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

  private assertRetailer(actor: AuthenticatedUser) {
    if (!this.isRetailerUser(actor) || !actor.retailerId) {
      throw new ForbiddenException('Retailer access required');
    }
  }

  private isRetailerUser(actor: AuthenticatedUser) {
    return actor.roles.includes('RETAILER') || actor.userType === 'retailer_user';
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
