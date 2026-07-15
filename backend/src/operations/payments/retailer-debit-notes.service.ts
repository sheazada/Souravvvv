import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, RetailerDebitNote } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AccountingService } from '../../finance/accounting/accounting.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CancelRetailerDebitNoteDto,
  CreateRetailerDebitNoteDto,
  QueryRetailerDebitNotesDto,
} from './dto';
import { RetailerNoteThresholdCache } from '../../core/settings/retailer-note-thresholds';
import { PaymentMetricsService } from './payment-metrics.service';
import { RetailerLedgerService } from './retailer-ledger.service';

@Injectable()
export class RetailerDebitNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retailerLedgerService: RetailerLedgerService,
    private readonly paymentMetricsService: PaymentMetricsService,
    private readonly accountingService: AccountingService,
  ) {}

  async findAll(actor: AuthenticatedUser, query: QueryRetailerDebitNotesDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.RetailerDebitNoteWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.retailerId) where.retailerId = query.retailerId;
    if (query.relatedInvoiceId) where.relatedInvoiceId = query.relatedInvoiceId;
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
        { debitNoteNo: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.retailerDebitNote.findMany({
        where,
        orderBy: { noteDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.retailerDebitNote.count({ where }),
    ]);

    return {
      success: true,
      message: 'Retailer debit notes fetched successfully',
      data: await this.serializeRows(actor.organizationId, rows),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(actor: AuthenticatedUser, dto: CreateRetailerDebitNoteDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const maxAmount = (await RetailerNoteThresholdCache.getPayload(this.prisma, actor.organizationId)).effective.debitNoteMaxAmount;

    this.assertPositiveAmount(dto.amount, 'Retailer debit note amount must be greater than zero');
    this.assertCurrencyPrecision(dto.amount, 'Retailer debit note amount cannot have more than 2 decimal places');
    this.assertWithinConfiguredMax(
      dto.amount,
      maxAmount,
      'Retailer debit note amount exceeds configured maximum limit',
    );

    await this.getRetailerOrThrow(actor.organizationId, dto.retailerId);
    if (dto.relatedInvoiceId) {
      await this.getInvoiceForRetailerOrThrow(actor.organizationId, dto.retailerId, dto.relatedInvoiceId);
    }

    const debitNoteNo = await this.generateDebitNoteNo(actor.organizationId);
    const amount = this.roundMoney(dto.amount);

    const note = await this.prisma.retailerDebitNote.create({
      data: {
        organizationId: actor.organizationId,
        debitNoteNo,
        retailerId: dto.retailerId,
        relatedInvoiceId: dto.relatedInvoiceId ?? null,
        noteDate: new Date(dto.noteDate),
        amount,
        affectsLedger: dto.affectsLedger ?? true,
        affectsInvoiceBalance: dto.affectsInvoiceBalance ?? true,
        appliedAmount: 0,
        remainingAmount: amount,
        status: 'draft',
        remarks: dto.remarks ?? null,
      },
    });

    return this.findOne(actor, note.id);
  }

  async findOne(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);

    const note = await this.prisma.retailerDebitNote.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
      },
    });
    if (!note) {
      throw new NotFoundException('Retailer debit note not found');
    }
    if (this.isRetailer(actor) && note.retailerId !== actor.retailerId) {
      throw new ForbiddenException('You can only access your own debit notes');
    }

    const [retailer, relatedInvoice] = await Promise.all([
      this.prisma.retailer.findFirst({
        where: { organizationId: actor.organizationId, id: note.retailerId },
        select: { id: true, retailerCode: true, shopName: true, mobile: true },
      }),
      note.relatedInvoiceId
        ? this.prisma.salesInvoice.findFirst({
            where: { organizationId: actor.organizationId, id: note.relatedInvoiceId },
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
      message: 'Retailer debit note fetched successfully',
      data: this.serializeRow(note, retailer, relatedInvoice),
    };
  }

  async post(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const note = await this.getDebitNoteOrThrow(actor.organizationId, id);
    if (note.status === 'cancelled') {
      throw new ConflictException('Cancelled retailer debit note cannot be posted');
    }
    if (note.status === 'posted') {
      return this.findOne(actor, id);
    }

    const relatedInvoice = note.relatedInvoiceId
      ? await this.getInvoiceForRetailerOrThrow(actor.organizationId, note.retailerId, note.relatedInvoiceId)
      : null;
    const amount = this.toNumber(note.amount);

    const { appliedAmount, remainingAmount } = await this.prisma.$transaction(async (tx) => {
      let applied = 0;
      let remaining = amount;

      if (relatedInvoice && note.affectsInvoiceBalance) {
        applied = amount;
        remaining = 0;
        const currentOutstanding = this.toNumber(relatedInvoice.outstandingAmount);
        const newOutstanding = this.roundMoney(currentOutstanding + amount);
        const grandTotal = this.toNumber(relatedInvoice.grandTotal);

        await tx.salesInvoice.update({
          where: { id: relatedInvoice.id },
          data: {
            outstandingAmount: newOutstanding,
            paymentStatus: newOutstanding <= 0 ? 'paid' : newOutstanding >= grandTotal ? 'unpaid' : 'partial_paid',
            status: newOutstanding <= 0 ? 'paid' : newOutstanding >= grandTotal ? 'posted' : 'partial_paid',
            paidAt: newOutstanding > 0 ? null : relatedInvoice.paidAt,
          },
        });
      }

      await tx.retailerDebitNote.update({
        where: { id: note.id },
        data: {
          status: 'posted',
          appliedAmount: applied,
          remainingAmount: remaining,
        },
      });

      return { appliedAmount: applied, remainingAmount: remaining };
    });

    if (note.affectsLedger) {
      await this.retailerLedgerService.postDebitNote(actor, {
        retailerId: note.retailerId,
        debitNoteId: note.id,
        amount,
        entryDate: note.noteDate,
        remarks: note.remarks,
        createdByUserId: actor.id,
      });
    }

    const retailer = await this.getRetailerOrThrow(actor.organizationId, note.retailerId);
    const entry = await this.accountingService.createJournalEntry(actor, {
      voucherType: 'debit_note',
      referenceType: 'retailer_debit_note',
      referenceId: note.id,
      entryDate: note.noteDate,
      postingDate: note.noteDate,
      narration: `Retailer debit note ${note.debitNoteNo}`,
      lines: [
        {
          accountId: await this.resolveReceivableAccountId(actor.organizationId, retailer.receivableAccountId),
          debitAmount: amount,
          creditAmount: 0,
          retailerId: retailer.id,
          lineNarration: `Receivable increase for debit note ${note.debitNoteNo}`,
        },
        {
          accountId: await this.resolveSalesImpactAccountId(actor.organizationId),
          debitAmount: 0,
          creditAmount: amount,
          retailerId: retailer.id,
          lineNarration: `Debit note ${note.debitNoteNo} impact`,
        },
      ],
    });

    await this.prisma.retailerDebitNote.update({
      where: { id: note.id },
      data: { journalEntryId: entry.id },
    });

    await this.paymentMetricsService.refreshAfterDebitNote(actor, note.retailerId);

    return {
      success: true,
      message: 'Retailer debit note posted successfully',
      data: { debitNoteId: note.id, appliedAmount, remainingAmount },
    };
  }

  async cancel(actor: AuthenticatedUser, id: string, dto: CancelRetailerDebitNoteDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const note = await this.getDebitNoteOrThrow(actor.organizationId, id);
    if (note.status === 'cancelled') {
      return {
        success: true,
        message: 'Retailer debit note already cancelled',
        data: { id },
      };
    }

    const relatedInvoice = note.relatedInvoiceId
      ? await this.getInvoiceForRetailerOrThrow(actor.organizationId, note.retailerId, note.relatedInvoiceId)
      : null;
    const amount = this.toNumber(note.amount);
    const appliedAmount = this.toNumber(note.appliedAmount);
    const wasPosted = note.status === 'posted';

    await this.prisma.$transaction(async (tx) => {
      if (wasPosted && relatedInvoice && note.affectsInvoiceBalance && appliedAmount > 0) {
        const reducedOutstanding = this.roundMoney(Math.max(this.toNumber(relatedInvoice.outstandingAmount) - appliedAmount, 0));
        const grandTotal = this.toNumber(relatedInvoice.grandTotal);
        await tx.salesInvoice.update({
          where: { id: relatedInvoice.id },
          data: {
            outstandingAmount: reducedOutstanding,
            paymentStatus: reducedOutstanding <= 0 ? 'paid' : reducedOutstanding >= grandTotal ? 'unpaid' : 'partial_paid',
            status: reducedOutstanding <= 0 ? 'paid' : reducedOutstanding >= grandTotal ? 'posted' : 'partial_paid',
            paidAt: reducedOutstanding <= 0 ? relatedInvoice.paidAt ?? new Date() : null,
          },
        });
      }

      await tx.retailerDebitNote.update({
        where: { id: note.id },
        data: {
          status: 'cancelled',
          remarks: this.appendReason(note.remarks, `Cancelled: ${dto.reason}`),
        },
      });
    });

    if (wasPosted && note.affectsLedger) {
      await this.retailerLedgerService.reverseDebitNotePosting(actor, {
        retailerId: note.retailerId,
        debitNoteId: note.id,
        amount,
        entryDate: new Date(),
        remarks: `Retailer debit note cancelled: ${dto.reason}`,
        createdByUserId: actor.id,
      });
    }

    if (wasPosted && note.journalEntryId) {
      await this.accountingService.reverseJournalEntry(actor, note.journalEntryId, `Retailer debit note cancelled: ${dto.reason}`);
    }

    if (wasPosted) {
      await this.paymentMetricsService.refreshAfterDebitNote(actor, note.retailerId);
    }

    return {
      success: true,
      message: 'Retailer debit note cancelled successfully',
      data: { id, reason: dto.reason },
    };
  }

  async getRetailerNotes(actor: AuthenticatedUser, retailerId: string, query: QueryRetailerDebitNotesDto) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    if (this.isRetailer(actor)) {
      return this.getMyNotes(actor, { ...query, retailerId });
    }

    return this.findAll(actor, { ...query, retailerId });
  }

  async getMyNotes(actor: AuthenticatedUser, query: QueryRetailerDebitNotesDto) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.RetailerDebitNoteWhereInput = {
      organizationId: actor.organizationId,
      retailerId: actor.retailerId ?? undefined,
    };

    if (query.relatedInvoiceId) where.relatedInvoiceId = query.relatedInvoiceId;
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
        { debitNoteNo: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.retailerDebitNote.findMany({
        where,
        orderBy: { noteDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.retailerDebitNote.count({ where }),
    ]);

    return {
      success: true,
      message: 'Retailer debit notes fetched successfully',
      data: await this.serializeRows(actor.organizationId, rows),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async serializeRows(organizationId: string, rows: RetailerDebitNote[]) {
    const retailerIds = [...new Set(rows.map((row) => row.retailerId))];
    const invoiceIds = [...new Set(rows.map((row) => row.relatedInvoiceId).filter((v): v is string => Boolean(v)))];

    const [retailers, invoices] = await Promise.all([
      retailerIds.length
        ? this.prisma.retailer.findMany({
            where: { organizationId, id: { in: retailerIds } },
            select: { id: true, retailerCode: true, shopName: true, mobile: true },
          })
        : [],
      invoiceIds.length
        ? this.prisma.salesInvoice.findMany({
            where: { organizationId, id: { in: invoiceIds } },
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

    return rows.map((row) =>
      this.serializeRow(
        row,
        retailerMap.get(row.retailerId) ?? null,
        row.relatedInvoiceId ? invoiceMap.get(row.relatedInvoiceId) ?? null : null,
      ),
    );
  }

  private serializeRow(note: RetailerDebitNote, retailer: any, relatedInvoice: any) {
    return {
      ...note,
      amount: this.toNumber(note.amount),
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

  private async getDebitNoteOrThrow(organizationId: string, id: string) {
    const note = await this.prisma.retailerDebitNote.findFirst({ where: { organizationId, id } });
    if (!note) throw new NotFoundException('Retailer debit note not found');
    return note;
  }

  private async getRetailerOrThrow(organizationId: string, retailerId: string) {
    const retailer = await this.prisma.retailer.findFirst({ where: { organizationId, id: retailerId } });
    if (!retailer) throw new NotFoundException('Retailer not found');
    return retailer;
  }

  private async getInvoiceForRetailerOrThrow(organizationId: string, retailerId: string, invoiceId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({ where: { organizationId, retailerId, id: invoiceId } });
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

  private async generateDebitNoteNo(organizationId: string) {
    const total = await this.prisma.retailerDebitNote.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `DBN-${datePart}-${String(total + 1).padStart(4, '0')}`;
  }

  private appendReason(existing: string | null | undefined, text: string) {
    return `${existing ?? ''}${existing ? ' | ' : ''}${text}`;
  }

  private assertPositiveAmount(amount: number, message: string) {
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
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

  private assertWithinConfiguredMax(amount: number, maxAmount: number, message: string) {
    if (Number(amount) > maxAmount) {
      throw new BadRequestException(message);
    }
  }


  private async ensureRetailerAccessible(actor: AuthenticatedUser, retailerId: string) {
    if (this.isRetailer(actor) && actor.retailerId !== retailerId) {
      throw new ForbiddenException('You can only access your own retailer debit notes');
    }
    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId: actor.organizationId, id: retailerId },
      select: { id: true },
    });
    if (!retailer) throw new NotFoundException('Retailer not found');
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
