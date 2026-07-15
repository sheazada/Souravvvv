import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreditNote, Prisma, SalesInvoice } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AccountingService } from '../../finance/accounting/accounting.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CancelCreditNoteDto,
  CreateRetailerCreditNoteDto,
  QueryCreditNotesDto,
} from './dto';
import { RetailerNoteThresholdCache } from '../../core/settings/retailer-note-thresholds';
import { PaymentMetricsService } from './payment-metrics.service';
import { RetailerLedgerService } from './retailer-ledger.service';

@Injectable()
export class RetailerCreditNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retailerLedgerService: RetailerLedgerService,
    private readonly paymentMetricsService: PaymentMetricsService,
    private readonly accountingService: AccountingService,
  ) {}

  async findAll(actor: AuthenticatedUser, query: QueryCreditNotesDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.CreditNoteWhereInput = {
      organizationId: actor.organizationId,
      partyType: 'retailer',
    };

    if (query.retailerId) where.retailerId = query.retailerId;
    if (query.relatedInvoiceId) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { relatedInvoiceId: query.relatedInvoiceId },
            { relatedReturnId: query.relatedInvoiceId },
          ],
        },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.fromDate || query.toDate) {
      where.noteDate = {};
      if (query.fromDate) where.noteDate.gte = new Date(query.fromDate);
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.noteDate.lte = end;
      }
    }
    if (query.search) {
      where.OR = [
        { creditNoteNo: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.creditNote.findMany({
        where,
        orderBy: { noteDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.creditNote.count({ where }),
    ]);

    return {
      success: true,
      message: 'Retailer credit notes fetched successfully',
      data: await this.serializeRows(actor.organizationId, rows),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(actor: AuthenticatedUser, dto: CreateRetailerCreditNoteDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const limits = (await RetailerNoteThresholdCache.getPayload(this.prisma, actor.organizationId)).effective;

    this.assertPositiveAmount(dto.amount, 'Credit note amount must be greater than zero');
    this.assertCurrencyPrecision(dto.amount, 'Credit note amount cannot have more than 2 decimal places');
    this.assertWithinConfiguredMax(
      dto.amount,
      limits.creditNoteMaxAmount,
      'Credit note amount exceeds configured maximum limit',
    );
    this.assertNonNegativeAmount(dto.taxAmount, 'Credit note tax amount cannot be negative');
    this.assertCurrencyPrecision(dto.taxAmount, 'Credit note tax amount cannot have more than 2 decimal places');
    this.assertWithinConfiguredMax(
      dto.taxAmount,
      limits.creditNoteMaxTaxAmount,
      'Credit note tax amount exceeds configured maximum limit',
    );
    this.assertWithinConfiguredMax(
      this.totalImpact(dto.amount, dto.taxAmount),
      limits.creditNoteMaxTotalAmount,
      'Credit note total amount exceeds configured maximum limit',
    );

    if (dto.partyId !== dto.retailerId) {
      throw new ConflictException('Credit note retailer must match retailer party');
    }

    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId: actor.organizationId, id: dto.retailerId },
    });
    if (!retailer) throw new NotFoundException('Retailer not found');

    if (dto.relatedInvoiceId) {
      await this.getInvoiceForRetailerOrThrow(actor.organizationId, dto.retailerId, dto.relatedInvoiceId);
    }

    const creditNoteNo = await this.generateCreditNoteNo(actor.organizationId);
    const totalImpact = this.totalImpact(dto.amount, dto.taxAmount);

    const note = await this.prisma.creditNote.create({
      data: {
        organizationId: actor.organizationId,
        creditNoteNo,
        partyType: 'retailer',
        partyId: dto.partyId,
        retailerId: dto.retailerId,
        relatedInvoiceId: dto.relatedInvoiceId ?? null,
        relatedReturnId: null,
        noteDate: new Date(dto.noteDate),
        amount: dto.amount,
        taxAmount: dto.taxAmount ?? 0,
        status: dto.status ?? 'draft',
        affectsLedger: dto.affectsLedger ?? true,
        affectsInvoiceBalance: dto.affectsInvoiceBalance ?? true,
        appliedAmount: 0,
        remainingAmount: totalImpact,
        remarks: dto.remarks ?? null,
      },
    });

    if ((dto.status ?? 'draft') === 'posted') {
      return this.post(actor, note.id);
    }

    return this.findOne(actor, note.id);
  }

  async findOne(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);

    const note = await this.prisma.creditNote.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
        partyType: 'retailer',
      },
    });

    if (!note) {
      throw new NotFoundException('Retailer credit note not found');
    }

    if (this.isRetailer(actor) && note.retailerId !== actor.retailerId) {
      throw new ForbiddenException('You can only access your own credit notes');
    }

    const relatedInvoiceId = this.getRelatedInvoiceId(note);
    const [retailer, relatedInvoice] = await Promise.all([
      note.retailerId
        ? this.prisma.retailer.findFirst({
            where: { organizationId: actor.organizationId, id: note.retailerId },
            select: { id: true, retailerCode: true, shopName: true, mobile: true },
          })
        : null,
      relatedInvoiceId
        ? this.prisma.salesInvoice.findFirst({
            where: { organizationId: actor.organizationId, id: relatedInvoiceId },
            select: {
              id: true,
              invoiceNo: true,
              invoiceDate: true,
              grandTotal: true,
              outstandingAmount: true,
              paymentStatus: true,
              status: true,
            },
          })
        : null,
    ]);

    return {
      success: true,
      message: 'Retailer credit note fetched successfully',
      data: this.serializeRow(note, retailer, relatedInvoice),
    };
  }

  async post(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const note = await this.getCreditNoteOrThrow(actor.organizationId, id);
    if (note.status === 'cancelled') {
      throw new ConflictException('Cancelled credit note cannot be posted');
    }
    if (note.status === 'posted') {
      return this.findOne(actor, id);
    }

    const relatedInvoiceId = this.getRelatedInvoiceId(note);
    const relatedInvoice = relatedInvoiceId
      ? await this.getInvoiceForRetailerOrThrow(actor.organizationId, note.retailerId!, relatedInvoiceId)
      : null;
    const totalImpact = this.totalImpact(this.toNumber(note.amount), this.toNumber(note.taxAmount));

    const { postedNote, invoiceAppliedAmount, invoiceRemainingAmount } = await this.prisma.$transaction(
      async (tx) => {
        let appliedAmount = 0;
        let remainingAmount = totalImpact;

        if (relatedInvoice && note.affectsInvoiceBalance) {
          const currentOutstanding = this.toNumber(relatedInvoice.outstandingAmount);
          appliedAmount = this.roundMoney(Math.min(currentOutstanding, totalImpact));
          remainingAmount = this.roundMoney(totalImpact - appliedAmount);

          if (appliedAmount > 0) {
            const newOutstanding = this.roundMoney(currentOutstanding - appliedAmount);
            await tx.salesInvoice.update({
              where: { id: relatedInvoice.id },
              data: {
                outstandingAmount: newOutstanding,
                paymentStatus: newOutstanding <= 0 ? 'paid' : 'partial_paid',
                status: newOutstanding <= 0 ? 'paid' : 'partial_paid',
                paidAt: newOutstanding <= 0 ? new Date() : relatedInvoice.paidAt,
              },
            });
          }
        }

        const updated = await tx.creditNote.update({
          where: { id: note.id },
          data: {
            status: 'posted',
            appliedAmount,
            remainingAmount,
          },
        });

        return {
          postedNote: updated,
          invoiceAppliedAmount: appliedAmount,
          invoiceRemainingAmount: remainingAmount,
        };
      },
    );

    if (note.affectsLedger) {
      await this.retailerLedgerService.postCreditNote(actor, {
        retailerId: note.retailerId!,
        creditNoteId: note.id,
        amount: totalImpact,
        entryDate: note.noteDate,
        remarks: note.remarks,
        createdByUserId: actor.id,
      });
    }

    const retailer = await this.getRetailerOrThrow(actor.organizationId, note.retailerId!);
    const entry = await this.accountingService.createJournalEntry(actor, {
      voucherType: 'credit_note',
      referenceType: 'credit_note',
      referenceId: note.id,
      entryDate: note.noteDate,
      postingDate: note.noteDate,
      narration: `Credit note ${note.creditNoteNo}`,
      lines: [
        {
          accountId: await this.resolveSalesImpactAccountId(actor.organizationId),
          debitAmount: totalImpact,
          creditAmount: 0,
          retailerId: retailer.id,
          lineNarration: `Credit note ${note.creditNoteNo} impact`,
        },
        {
          accountId: await this.resolveReceivableAccountId(actor.organizationId, retailer.receivableAccountId),
          debitAmount: 0,
          creditAmount: totalImpact,
          retailerId: retailer.id,
          lineNarration: `Receivable reduction for credit note ${note.creditNoteNo}`,
        },
      ],
    });

    await this.prisma.creditNote.update({
      where: { id: note.id },
      data: { journalEntryId: entry.id },
    });

    await this.paymentMetricsService.refreshAfterCreditNote(actor, note.retailerId!);

    return {
      success: true,
      message: 'Retailer credit note posted successfully',
      data: {
        creditNoteId: note.id,
        appliedAmount: invoiceAppliedAmount,
        remainingAmount: invoiceRemainingAmount,
      },
    };
  }

  async cancel(actor: AuthenticatedUser, id: string, dto: CancelCreditNoteDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const note = await this.getCreditNoteOrThrow(actor.organizationId, id);
    if (note.status === 'cancelled') {
      return {
        success: true,
        message: 'Retailer credit note already cancelled',
        data: { id },
      };
    }

    const relatedInvoiceId = this.getRelatedInvoiceId(note);
    const relatedInvoice = relatedInvoiceId
      ? await this.getInvoiceForRetailerOrThrow(actor.organizationId, note.retailerId!, relatedInvoiceId)
      : null;
    const totalImpact = this.totalImpact(this.toNumber(note.amount), this.toNumber(note.taxAmount));
    const appliedAmount = this.toNumber(note.appliedAmount);
    const wasPosted = note.status === 'posted';

    await this.prisma.$transaction(async (tx) => {
      if (wasPosted && relatedInvoice && note.affectsInvoiceBalance && appliedAmount > 0) {
        const restoredOutstanding = this.roundMoney(this.toNumber(relatedInvoice.outstandingAmount) + appliedAmount);
        const grandTotal = this.toNumber(relatedInvoice.grandTotal);
        await tx.salesInvoice.update({
          where: { id: relatedInvoice.id },
          data: {
            outstandingAmount: restoredOutstanding,
            paymentStatus:
              restoredOutstanding <= 0 ? 'paid' : restoredOutstanding >= grandTotal ? 'unpaid' : 'partial_paid',
            status:
              restoredOutstanding <= 0 ? 'paid' : restoredOutstanding >= grandTotal ? 'posted' : 'partial_paid',
            paidAt: restoredOutstanding > 0 ? null : relatedInvoice.paidAt,
          },
        });
      }

      await tx.creditNote.update({
        where: { id: note.id },
        data: {
          status: 'cancelled',
          remarks: this.appendReason(note.remarks, `Cancelled: ${dto.reason}`),
        },
      });
    });

    if (wasPosted && note.affectsLedger) {
      await this.retailerLedgerService.reverseCreditNotePosting(actor, {
        retailerId: note.retailerId!,
        creditNoteId: note.id,
        amount: totalImpact,
        entryDate: new Date(),
        remarks: `Credit note cancelled: ${dto.reason}`,
        createdByUserId: actor.id,
      });
    }

    if (wasPosted && note.journalEntryId) {
      await this.accountingService.reverseJournalEntry(actor, note.journalEntryId, `Credit note cancelled: ${dto.reason}`);
    }

    if (wasPosted) {
      await this.paymentMetricsService.refreshAfterCreditNote(actor, note.retailerId!);
    }

    return {
      success: true,
      message: 'Retailer credit note cancelled successfully',
      data: { id, reason: dto.reason },
    };
  }

  async getRetailerNotes(
    actor: AuthenticatedUser,
    retailerId: string,
    query: QueryCreditNotesDto,
  ) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    if (this.isRetailer(actor)) {
      return this.getMyNotes(actor, {
        ...query,
        retailerId,
        partyType: 'retailer',
      });
    }

    return this.findAll(actor, {
      ...query,
      retailerId,
      partyType: 'retailer',
    });
  }

  async getMyNotes(actor: AuthenticatedUser, query: QueryCreditNotesDto) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.CreditNoteWhereInput = {
      organizationId: actor.organizationId,
      partyType: 'retailer',
      retailerId: actor.retailerId ?? undefined,
    };

    if (query.relatedInvoiceId) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { relatedInvoiceId: query.relatedInvoiceId },
            { relatedReturnId: query.relatedInvoiceId },
          ],
        },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.fromDate || query.toDate) {
      where.noteDate = {};
      if (query.fromDate) where.noteDate.gte = new Date(query.fromDate);
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.noteDate.lte = end;
      }
    }
    if (query.search) {
      where.OR = [
        { creditNoteNo: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.creditNote.findMany({
        where,
        orderBy: { noteDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.creditNote.count({ where }),
    ]);

    return {
      success: true,
      message: 'Retailer credit notes fetched successfully',
      data: await this.serializeRows(actor.organizationId, rows),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async serializeRows(organizationId: string, rows: CreditNote[]) {
    const retailerIds = [...new Set(rows.map((row) => row.retailerId).filter((v): v is string => Boolean(v)))];
    const relatedInvoiceIds = [...new Set(rows.map((row) => this.getRelatedInvoiceId(row)).filter((v): v is string => Boolean(v)))];

    const [retailers, invoices] = await Promise.all([
      retailerIds.length
        ? this.prisma.retailer.findMany({
            where: { organizationId, id: { in: retailerIds } },
            select: { id: true, retailerCode: true, shopName: true, mobile: true },
          })
        : [],
      relatedInvoiceIds.length
        ? this.prisma.salesInvoice.findMany({
            where: { organizationId, id: { in: relatedInvoiceIds } },
            select: {
              id: true,
              invoiceNo: true,
              invoiceDate: true,
              grandTotal: true,
              outstandingAmount: true,
              paymentStatus: true,
              status: true,
            },
          })
        : [],
    ]);

    const retailerMap = new Map<string, any>(retailers.map((row): [string, any] => [row.id, row]));
    const invoiceMap = new Map<string, any>(invoices.map((row): [string, any] => [row.id, row]));

    return rows.map((row) => {
      const relatedInvoiceId = this.getRelatedInvoiceId(row);
      return this.serializeRow(
        row,
        row.retailerId ? retailerMap.get(row.retailerId) ?? null : null,
        relatedInvoiceId ? invoiceMap.get(relatedInvoiceId) ?? null : null,
      );
    });
  }

  private serializeRow(note: CreditNote, retailer: any, relatedInvoice: any) {
    return {
      ...note,
      relatedInvoiceId: this.getRelatedInvoiceId(note),
      amount: this.toNumber(note.amount),
      taxAmount: this.toNumber(note.taxAmount),
      appliedAmount: this.toNumber(note.appliedAmount),
      remainingAmount: this.toNumber(note.remainingAmount),
      retailer,
      relatedInvoice: relatedInvoice
        ? {
            ...relatedInvoice,
            grandTotal: this.toNumber(relatedInvoice.grandTotal),
            outstandingAmount: this.toNumber(relatedInvoice.outstandingAmount),
          }
        : null,
    };
  }


  private getRelatedInvoiceId(note: Pick<CreditNote, 'relatedInvoiceId' | 'relatedReturnId'>) {
    return note.relatedInvoiceId ?? note.relatedReturnId ?? null;
  }

  private async getCreditNoteOrThrow(organizationId: string, id: string) {
    const note = await this.prisma.creditNote.findFirst({
      where: {
        id,
        organizationId,
        partyType: 'retailer',
      },
    });
    if (!note) throw new NotFoundException('Retailer credit note not found');
    return note;
  }

  private async getRetailerOrThrow(organizationId: string, retailerId: string) {
    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId, id: retailerId },
    });
    if (!retailer) throw new NotFoundException('Retailer not found');
    return retailer;
  }

  private async getInvoiceForRetailerOrThrow(
    organizationId: string,
    retailerId: string,
    invoiceId: string,
  ) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { organizationId, retailerId, id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('Related sales invoice not found');
    return invoice;
  }

  private async resolveReceivableAccountId(organizationId: string, accountId?: string | null) {
    if (accountId) {
      const account = await this.prisma.account.findFirst({ where: { organizationId, id: accountId } });
      if (account) return account.id;
    }
    const fallback = await this.prisma.account.findFirst({ where: { organizationId, accountCode: '1100' } });
    if (!fallback) throw new NotFoundException('Receivable account not configured');
    return fallback.id;
  }

  private async resolveSalesImpactAccountId(organizationId: string) {
    const account = await this.prisma.account.findFirst({ where: { organizationId, accountCode: '4100' } });
    if (!account) throw new NotFoundException('Sales impact account not configured');
    return account.id;
  }

  private async generateCreditNoteNo(organizationId: string) {
    const total = await this.prisma.creditNote.count({ where: { organizationId, partyType: 'retailer' } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `CRN-${datePart}-${String(total + 1).padStart(4, '0')}`;
  }

  private totalImpact(amount: number, taxAmount?: number | null) {
    return this.roundMoney(this.toNumber(amount) + this.toNumber(taxAmount));
  }

  private assertPositiveAmount(amount: number, message: string) {
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw new BadRequestException(message);
    }
  }

  private assertNonNegativeAmount(amount: number | null | undefined, message: string) {
    if (amount === null || amount === undefined) {
      return;
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) {
      throw new BadRequestException(message);
    }
  }

  private assertCurrencyPrecision(amount: number | null | undefined, message: string) {
    if (amount === null || amount === undefined) {
      return;
    }
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || Number(numeric.toFixed(2)) !== numeric) {
      throw new BadRequestException(message);
    }
  }

  private assertWithinConfiguredMax(amount: number | null | undefined, maxAmount: number, message: string) {
    if (amount === null || amount === undefined) {
      return;
    }
    if (Number(amount) > maxAmount) {
      throw new BadRequestException(message);
    }
  }


  private appendReason(existing: string | null | undefined, text: string) {
    return `${existing ?? ''}${existing ? ' | ' : ''}${text}`;
  }

  private async ensureRetailerAccessible(actor: AuthenticatedUser, retailerId: string) {
    if (this.isRetailer(actor) && actor.retailerId !== retailerId) {
      throw new ForbiddenException('You can only access your own retailer credit notes');
    }

    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId: actor.organizationId, id: retailerId },
      select: { id: true },
    });

    if (!retailer) {
      throw new NotFoundException('Retailer not found');
    }
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (this.isRetailer(actor)) {
      throw new ForbiddenException('Backoffice access required');
    }
  }

  private assertRetailer(actor: AuthenticatedUser) {
    if (!this.isRetailer(actor) || !actor.retailerId) {
      throw new ForbiddenException('Retailer access required');
    }
  }

  private isRetailer(actor: AuthenticatedUser) {
    return actor.roles.includes('RETAILER') || actor.userType === 'retailer_user';
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }
}
