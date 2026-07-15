import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, RetailerLedgerEntry } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryRetailerLedgerDto } from './dto';

type LedgerPostContext = AuthenticatedUser | { organizationId: string; userId?: string | null };

type InvoiceLedgerPayload = {
  retailerId: string;
  invoiceId: string;
  amount: number;
  entryDate?: Date | string;
  remarks?: string | null;
  createdByUserId?: string | null;
};

type ReceiptLedgerPayload = {
  retailerId: string;
  paymentReceiptId: string;
  amount: number;
  paymentMethod?: string | null;
  entryDate?: Date | string;
  remarks?: string | null;
  createdByUserId?: string | null;
  isAdvancePayment?: boolean;
};

type DebitNoteLedgerPayload = {
  retailerId: string;
  debitNoteId: string;
  amount: number;
  entryDate?: Date | string;
  remarks?: string | null;
  createdByUserId?: string | null;
};

type CreditNoteLedgerPayload = {
  retailerId: string;
  creditNoteId: string;
  amount: number;
  entryDate?: Date | string;
  remarks?: string | null;
  createdByUserId?: string | null;
};

@Injectable()
export class RetailerLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async postInvoiceDebit(context: LedgerPostContext, payload: InvoiceLedgerPayload) {
    const organizationId = this.getOrganizationId(context);

    const existing = await this.prisma.retailerLedgerEntry.findFirst({
      where: {
        organizationId,
        invoiceId: payload.invoiceId,
        transactionType: 'sales_invoice',
      },
    });

    if (existing) {
      return existing;
    }

    return this.appendEntry({
      organizationId,
      retailerId: payload.retailerId,
      transactionType: 'sales_invoice',
      referenceType: 'sales_invoice',
      referenceId: payload.invoiceId,
      invoiceId: payload.invoiceId,
      paymentMethod: null,
      debitAmount: payload.amount,
      creditAmount: 0,
      entryDate: payload.entryDate,
      remarks: payload.remarks ?? null,
      createdByUserId: payload.createdByUserId ?? this.getUserId(context),
    });
  }

  async reverseInvoicePosting(context: LedgerPostContext, payload: InvoiceLedgerPayload) {
    const organizationId = this.getOrganizationId(context);

    const existing = await this.prisma.retailerLedgerEntry.findFirst({
      where: {
        organizationId,
        invoiceId: payload.invoiceId,
        referenceType: 'sales_invoice_cancel',
      },
    });

    if (existing) {
      return existing;
    }

    return this.appendEntry({
      organizationId,
      retailerId: payload.retailerId,
      transactionType: 'adjustment',
      referenceType: 'sales_invoice_cancel',
      referenceId: payload.invoiceId,
      invoiceId: payload.invoiceId,
      paymentMethod: null,
      debitAmount: 0,
      creditAmount: payload.amount,
      entryDate: payload.entryDate,
      remarks: payload.remarks ?? 'Sales invoice cancelled',
      createdByUserId: payload.createdByUserId ?? this.getUserId(context),
    });
  }

  async postReceiptCredit(context: LedgerPostContext, payload: ReceiptLedgerPayload) {
    const organizationId = this.getOrganizationId(context);
    const transactionType = payload.isAdvancePayment ? 'advance_payment' : 'payment_receipt';

    const existing = await this.prisma.retailerLedgerEntry.findFirst({
      where: {
        organizationId,
        paymentReceiptId: payload.paymentReceiptId,
        transactionType,
      },
    });

    if (existing) {
      return existing;
    }

    return this.appendEntry({
      organizationId,
      retailerId: payload.retailerId,
      transactionType,
      referenceType: 'payment_receipt',
      referenceId: payload.paymentReceiptId,
      paymentReceiptId: payload.paymentReceiptId,
      paymentMethod: payload.paymentMethod ?? null,
      debitAmount: 0,
      creditAmount: payload.amount,
      entryDate: payload.entryDate,
      remarks: payload.remarks ?? null,
      createdByUserId: payload.createdByUserId ?? this.getUserId(context),
    });
  }

  async reverseReceiptPosting(context: LedgerPostContext, payload: ReceiptLedgerPayload) {
    const organizationId = this.getOrganizationId(context);

    const existing = await this.prisma.retailerLedgerEntry.findFirst({
      where: {
        organizationId,
        paymentReceiptId: payload.paymentReceiptId,
        referenceType: 'payment_receipt_cancel',
      },
    });

    if (existing) {
      return existing;
    }

    return this.appendEntry({
      organizationId,
      retailerId: payload.retailerId,
      transactionType: 'adjustment',
      referenceType: 'payment_receipt_cancel',
      referenceId: payload.paymentReceiptId,
      paymentReceiptId: payload.paymentReceiptId,
      paymentMethod: payload.paymentMethod ?? null,
      debitAmount: payload.amount,
      creditAmount: 0,
      entryDate: payload.entryDate,
      remarks: payload.remarks ?? 'Payment receipt cancelled',
      createdByUserId: payload.createdByUserId ?? this.getUserId(context),
    });
  }

  async postCreditNote(context: LedgerPostContext, payload: CreditNoteLedgerPayload) {
    const organizationId = this.getOrganizationId(context);

    const existing = await this.prisma.retailerLedgerEntry.findFirst({
      where: {
        organizationId,
        creditNoteId: payload.creditNoteId,
        transactionType: 'credit_note',
      },
    });

    if (existing) {
      return existing;
    }

    return this.appendEntry({
      organizationId,
      retailerId: payload.retailerId,
      transactionType: 'credit_note',
      referenceType: 'credit_note',
      referenceId: payload.creditNoteId,
      creditNoteId: payload.creditNoteId,
      paymentMethod: null,
      debitAmount: 0,
      creditAmount: payload.amount,
      entryDate: payload.entryDate,
      remarks: payload.remarks ?? null,
      createdByUserId: payload.createdByUserId ?? this.getUserId(context),
    });
  }

  async reverseCreditNotePosting(context: LedgerPostContext, payload: CreditNoteLedgerPayload) {
    const organizationId = this.getOrganizationId(context);

    const existing = await this.prisma.retailerLedgerEntry.findFirst({
      where: {
        organizationId,
        creditNoteId: payload.creditNoteId,
        referenceType: 'credit_note_cancel',
      },
    });

    if (existing) {
      return existing;
    }

    return this.appendEntry({
      organizationId,
      retailerId: payload.retailerId,
      transactionType: 'adjustment',
      referenceType: 'credit_note_cancel',
      referenceId: payload.creditNoteId,
      creditNoteId: payload.creditNoteId,
      paymentMethod: null,
      debitAmount: payload.amount,
      creditAmount: 0,
      entryDate: payload.entryDate,
      remarks: payload.remarks ?? 'Credit note cancelled',
      createdByUserId: payload.createdByUserId ?? this.getUserId(context),
    });
  }

  async postDebitNote(context: LedgerPostContext, payload: DebitNoteLedgerPayload) {
    const organizationId = this.getOrganizationId(context);

    const existing = await this.prisma.retailerLedgerEntry.findFirst({
      where: {
        organizationId,
        debitNoteId: payload.debitNoteId,
        transactionType: 'debit_note',
      },
    });

    if (existing) {
      return existing;
    }

    return this.appendEntry({
      organizationId,
      retailerId: payload.retailerId,
      transactionType: 'debit_note',
      referenceType: 'retailer_debit_note',
      referenceId: payload.debitNoteId,
      debitNoteId: payload.debitNoteId,
      paymentMethod: null,
      debitAmount: payload.amount,
      creditAmount: 0,
      entryDate: payload.entryDate,
      remarks: payload.remarks ?? null,
      createdByUserId: payload.createdByUserId ?? this.getUserId(context),
    });
  }

  async reverseDebitNotePosting(context: LedgerPostContext, payload: DebitNoteLedgerPayload) {
    const organizationId = this.getOrganizationId(context);

    const existing = await this.prisma.retailerLedgerEntry.findFirst({
      where: {
        organizationId,
        debitNoteId: payload.debitNoteId,
        referenceType: 'retailer_debit_note_cancel',
      },
    });

    if (existing) {
      return existing;
    }

    return this.appendEntry({
      organizationId,
      retailerId: payload.retailerId,
      transactionType: 'adjustment',
      referenceType: 'retailer_debit_note_cancel',
      referenceId: payload.debitNoteId,
      debitNoteId: payload.debitNoteId,
      paymentMethod: null,
      debitAmount: 0,
      creditAmount: payload.amount,
      entryDate: payload.entryDate,
      remarks: payload.remarks ?? 'Retailer debit note cancelled',
      createdByUserId: payload.createdByUserId ?? this.getUserId(context),
    });
  }

  async postAdvanceCredit(context: LedgerPostContext, payload: ReceiptLedgerPayload) {
    return this.postReceiptCredit(context, { ...payload, isAdvancePayment: true });
  }

  async getLedgerEntries(
    actor: AuthenticatedUser,
    retailerId: string,
    query: QueryRetailerLedgerDto,
  ) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.RetailerLedgerEntryWhereInput = {
      organizationId: actor.organizationId,
      retailerId,
    };

    if (query.fromDate || query.toDate) {
      where.entryDate = {};
      if (query.fromDate) where.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.entryDate.lte = new Date(query.toDate);
    }
    if (query.transactionType) where.transactionType = query.transactionType;
    if (query.referenceType) where.referenceType = query.referenceType;
    if (query.search) {
      where.OR = [
        { entryNo: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.retailerLedgerEntry.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNo: true,
              invoiceDate: true,
              grandTotal: true,
              outstandingAmount: true,
            },
          },
          paymentReceipt: {
            select: {
              id: true,
              receiptNo: true,
              paymentDate: true,
              amount: true,
              paymentMode: true,
              status: true,
            },
          },
          creditNote: {
            select: {
              id: true,
              creditNoteNo: true,
              noteDate: true,
              amount: true,
              status: true,
            },
          },
          debitNote: {
            select: {
              id: true,
              debitNoteNo: true,
              noteDate: true,
              amount: true,
              status: true,
            },
          },
        },
        orderBy: [{ entryDate: 'desc' }, { entryTime: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.retailerLedgerEntry.count({ where }),
    ]);

    return {
      success: true,
      message: 'Retailer ledger entries fetched successfully',
      data: rows.map((row) => this.serializeLedgerRow(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLedgerEntryById(actor: AuthenticatedUser, retailerId: string, entryId: string) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const row = await this.prisma.retailerLedgerEntry.findFirst({
      where: {
        organizationId: actor.organizationId,
        retailerId,
        id: entryId,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            invoiceDate: true,
            grandTotal: true,
            outstandingAmount: true,
          },
        },
        paymentReceipt: {
          select: {
            id: true,
            receiptNo: true,
            paymentDate: true,
            amount: true,
            paymentMode: true,
            status: true,
          },
        },
        creditNote: {
          select: {
            id: true,
            creditNoteNo: true,
            noteDate: true,
            amount: true,
            status: true,
          },
        },
        debitNote: {
          select: {
            id: true,
            debitNoteNo: true,
            noteDate: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Retailer ledger entry not found');
    }

    return {
      success: true,
      message: 'Retailer ledger entry fetched successfully',
      data: this.serializeLedgerRow(row),
    };
  }

  private async appendEntry(params: {
    organizationId: string;
    retailerId: string;
    transactionType: string;
    referenceType: string;
    referenceId?: string | null;
    invoiceId?: string | null;
    paymentReceiptId?: string | null;
    creditNoteId?: string | null;
    debitNoteId?: string | null;
    paymentMethod?: string | null;
    debitAmount: number;
    creditAmount: number;
    entryDate?: Date | string;
    remarks?: string | null;
    createdByUserId?: string | null;
  }) {
    const lastBalance = await this.getLatestRunningBalance(
      params.organizationId,
      params.retailerId,
    );
    const runningBalance = this.roundMoney(
      lastBalance + params.debitAmount - params.creditAmount,
    );

    return this.prisma.retailerLedgerEntry.create({
      data: {
        organizationId: params.organizationId,
        retailerId: params.retailerId,
        entryNo: await this.generateEntryNo(params.organizationId),
        entryDate: params.entryDate ? new Date(params.entryDate) : new Date(),
        entryTime: new Date(),
        transactionType: params.transactionType,
        referenceType: params.referenceType,
        referenceId: params.referenceId ?? null,
        invoiceId: params.invoiceId ?? null,
        paymentReceiptId: params.paymentReceiptId ?? null,
        creditNoteId: params.creditNoteId ?? null,
        debitNoteId: params.debitNoteId ?? null,
        paymentMethod: params.paymentMethod ?? null,
        debitAmount: params.debitAmount,
        creditAmount: params.creditAmount,
        runningBalance,
        remarks: params.remarks ?? null,
        createdByUserId: params.createdByUserId ?? null,
      },
    });
  }

  private async generateEntryNo(organizationId: string) {
    const total = await this.prisma.retailerLedgerEntry.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `LED-${datePart}-${String(total + 1).padStart(5, '0')}`;
  }

  private async getLatestRunningBalance(organizationId: string, retailerId: string) {
    const lastEntry = await this.prisma.retailerLedgerEntry.findFirst({
      where: { organizationId, retailerId },
      orderBy: [{ entryDate: 'desc' }, { entryTime: 'desc' }, { createdAt: 'desc' }],
      select: { runningBalance: true },
    });

    return this.toNumber(lastEntry?.runningBalance);
  }

  private serializeLedgerRow(row: RetailerLedgerEntry & Record<string, any>) {
    return {
      ...row,
      debitAmount: this.toNumber(row.debitAmount),
      creditAmount: this.toNumber(row.creditAmount),
      runningBalance: this.toNumber(row.runningBalance),
      invoice: row.invoice
        ? {
            ...row.invoice,
            grandTotal: this.toNumber(row.invoice.grandTotal),
            outstandingAmount: this.toNumber(row.invoice.outstandingAmount),
          }
        : null,
      paymentReceipt: row.paymentReceipt
        ? {
            ...row.paymentReceipt,
            amount: this.toNumber(row.paymentReceipt.amount),
          }
        : null,
      creditNote: row.creditNote
        ? {
            ...row.creditNote,
            amount: this.toNumber(row.creditNote.amount),
          }
        : null,
      debitNote: row.debitNote
        ? {
            ...row.debitNote,
            amount: this.toNumber(row.debitNote.amount),
          }
        : null,
    };
  }

  private async ensureRetailerAccessible(actor: AuthenticatedUser, retailerId: string) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      if (actor.retailerId !== retailerId) {
        throw new ForbiddenException('You can only access your own retailer ledger');
      }
    }

    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId: actor.organizationId, id: retailerId },
      select: { id: true },
    });

    if (!retailer) {
      throw new NotFoundException('Retailer not found');
    }
  }

  private getOrganizationId(context?: LedgerPostContext) {
    if (!context?.organizationId) {
      throw new UnauthorizedException('Organization context required');
    }
    return context.organizationId;
  }

  private getUserId(context?: LedgerPostContext) {
    if (!context) return null;
    if ('id' in context) return context.id ?? null;
    return context.userId ?? null;
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }
}
