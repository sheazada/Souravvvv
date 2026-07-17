import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Account, JournalEntry, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';

type JournalLineInput = {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  retailerId?: string | null;
  supplierId?: string | null;
  routeId?: string | null;
  lineNarration?: string | null;
};

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccounts(actor: AuthenticatedUser, query: { accountType?: string; isActive?: string }) {
    this.assertAuthenticated(actor);

    const where: Prisma.AccountWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.accountType) where.accountType = query.accountType;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

    const accounts = await this.prisma.account.findMany({
      where,
      orderBy: [{ accountType: 'asc' }, { accountCode: 'asc' }],
    });

    return {
      success: true,
      message: 'Accounts fetched successfully',
      data: accounts,
    };
  }

  async getJournalEntries(
    actor: AuthenticatedUser,
    query: { page?: string; limit?: string; voucherType?: string; status?: string; fromDate?: string; toDate?: string },
  ) {
    this.assertAuthenticated(actor);

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const where: Prisma.JournalEntryWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.voucherType) where.voucherType = query.voucherType;
    if (query.status) where.status = query.status;
    if (query.fromDate || query.toDate) {
      where.postingDate = {};
      if (query.fromDate) where.postingDate.gte = new Date(query.fromDate);
      if (query.toDate) where.postingDate.lte = new Date(query.toDate);
    }

    const [rows, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        orderBy: { postingDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      success: true,
      message: 'Journal entries fetched successfully',
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getJournalEntry(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);

    const entry = await this.prisma.journalEntry.findFirst({
      where: { organizationId: actor.organizationId, id },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');

    const lines = await this.prisma.accountJournalLine.findMany({
      where: { organizationId: actor.organizationId, journalEntryId: id },
      orderBy: { createdAt: 'asc' },
    });

    const accountIds = [...new Set(lines.map((line) => line.accountId))];
    const accounts = accountIds.length
      ? await this.prisma.account.findMany({
          where: { organizationId: actor.organizationId, id: { in: accountIds } },
          select: { id: true, accountCode: true, accountName: true, accountType: true },
        })
      : [];
    const accountMap = new Map(accounts.map((account) => [account.id, account]));

    return {
      success: true,
      message: 'Journal entry fetched successfully',
      data: {
        ...entry,
        lines: lines.map((line) => ({
          ...line,
          debitAmount: this.toNumber(line.debitAmount),
          creditAmount: this.toNumber(line.creditAmount),
          account: accountMap.get(line.accountId) ?? null,
        })),
      },
    };
  }

  async getCustomerLedger(
    actor: AuthenticatedUser,
    query: { retailerId?: string; fromDate?: string; toDate?: string },
  ) {
    this.assertAuthenticated(actor);

    if (query.retailerId) {
      const retailer = await this.prisma.retailer.findFirst({
        where: { organizationId: actor.organizationId, id: query.retailerId },
        select: { id: true, retailerCode: true, shopName: true, mobile: true },
      });
      if (!retailer) throw new NotFoundException('Retailer not found');

      const lines = await this.fetchJournalLines(actor.organizationId, {
        retailerId: query.retailerId,
        fromDate: query.fromDate,
        toDate: query.toDate,
      });

      return {
        success: true,
        message: 'Customer ledger fetched successfully',
        data: {
          retailer,
          transactions: this.buildLedgerTransactions(lines),
        },
      };
    }

    const summary = await this.prisma.salesInvoice.groupBy({
      by: ['retailerId'],
      where: {
        organizationId: actor.organizationId,
        status: { in: ['posted', 'partial_paid', 'paid'] },
      },
      _sum: {
        grandTotal: true,
        outstandingAmount: true,
      },
      _count: { _all: true },
    });

    const retailerIds = summary.map((row) => row.retailerId);
    const retailers = retailerIds.length
      ? await this.prisma.retailer.findMany({
          where: { organizationId: actor.organizationId, id: { in: retailerIds } },
          select: { id: true, retailerCode: true, shopName: true, mobile: true },
        })
      : [];
    const retailerMap = new Map(retailers.map((retailer) => [retailer.id, retailer]));

    return {
      success: true,
      message: 'Customer ledger summary fetched successfully',
      data: summary.map((row) => ({
        retailer: retailerMap.get(row.retailerId) ?? null,
        invoiceCount: row._count._all,
        totalInvoiced: this.toNumber(row._sum.grandTotal),
        outstandingAmount: this.toNumber(row._sum.outstandingAmount),
      })),
    };
  }

  async getSupplierLedger(
    actor: AuthenticatedUser,
    query: { supplierId?: string; fromDate?: string; toDate?: string },
  ) {
    this.assertAuthenticated(actor);

    if (query.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { organizationId: actor.organizationId, id: query.supplierId },
        select: { id: true, supplierCode: true, name: true, mobile: true },
      });
      if (!supplier) throw new NotFoundException('Supplier not found');

      const lines = await this.fetchJournalLines(actor.organizationId, {
        supplierId: query.supplierId,
        fromDate: query.fromDate,
        toDate: query.toDate,
      });

      return {
        success: true,
        message: 'Supplier ledger fetched successfully',
        data: {
          supplier,
          transactions: this.buildLedgerTransactions(lines),
        },
      };
    }

    const invoices = await this.prisma.purchaseInvoice.findMany({
      where: {
        organizationId: actor.organizationId,
        status: { in: ['approved', 'posted', 'paid'] },
      },
      select: {
        supplierId: true,
        grandTotal: true,
        allocations: { select: { allocatedAmount: true } },
      },
    });

    const summaryMap = new Map<string, { totalBilled: number; totalPaid: number; invoiceCount: number }>();
    for (const invoice of invoices) {
      const current = summaryMap.get(invoice.supplierId) ?? { totalBilled: 0, totalPaid: 0, invoiceCount: 0 };
      current.invoiceCount += 1;
      current.totalBilled = this.roundMoney(current.totalBilled + this.toNumber(invoice.grandTotal));
      current.totalPaid = this.roundMoney(
        current.totalPaid +
          invoice.allocations.reduce((sum, allocation) => sum + this.toNumber(allocation.allocatedAmount), 0),
      );
      summaryMap.set(invoice.supplierId, current);
    }

    const supplierIds = [...summaryMap.keys()];
    const suppliers = supplierIds.length
      ? await this.prisma.supplier.findMany({
          where: { organizationId: actor.organizationId, id: { in: supplierIds } },
          select: { id: true, supplierCode: true, name: true, mobile: true },
        })
      : [];
    const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

    return {
      success: true,
      message: 'Supplier ledger summary fetched successfully',
      data: supplierIds.map((supplierId) => {
        const summary = summaryMap.get(supplierId)!;
        return {
          supplier: supplierMap.get(supplierId) ?? null,
          invoiceCount: summary.invoiceCount,
          totalBilled: summary.totalBilled,
          totalPaid: summary.totalPaid,
          outstandingAmount: this.roundMoney(summary.totalBilled - summary.totalPaid),
        };
      }),
    };
  }

  async getAccountLedger(
    actor: AuthenticatedUser,
    accountId: string,
    query: { fromDate?: string; toDate?: string },
  ) {
    this.assertAuthenticated(actor);

    const account = await this.prisma.account.findFirst({
      where: { organizationId: actor.organizationId, id: accountId },
      select: { id: true, accountCode: true, accountName: true, accountType: true },
    });
    if (!account) throw new NotFoundException('Account not found');

    const lines = await this.fetchJournalLines(actor.organizationId, {
      accountId,
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    return {
      success: true,
      message: 'Account ledger fetched successfully',
      data: {
        account,
        transactions: this.buildLedgerTransactions(lines),
      },
    };
  }

  async getTrialBalance(actor: AuthenticatedUser, query: { asOfDate?: string }) {
    this.assertAuthenticated(actor);

    const lines = await this.prisma.accountJournalLine.findMany({
      where: {
        organizationId: actor.organizationId,
        journalEntry: {
          is: {
            status: 'posted',
            ...(query.asOfDate ? { postingDate: { lte: new Date(query.asOfDate) } } : {}),
          },
        },
      },
    });

    const accounts = await this.prisma.account.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, accountCode: true, accountName: true, accountType: true },
    });
    const accountMap = new Map(accounts.map((account) => [account.id, account]));

    const summaryMap = new Map<string, { debit: number; credit: number }>();
    for (const line of lines) {
      const current = summaryMap.get(line.accountId) ?? { debit: 0, credit: 0 };
      current.debit = this.roundMoney(current.debit + this.toNumber(line.debitAmount));
      current.credit = this.roundMoney(current.credit + this.toNumber(line.creditAmount));
      summaryMap.set(line.accountId, current);
    }

    const data = [...summaryMap.entries()].map(([accountId, totals]) => ({
      account: accountMap.get(accountId) ?? null,
      debit: totals.debit,
      credit: totals.credit,
      balance: this.roundMoney(totals.debit - totals.credit),
    }));

    return {
      success: true,
      message: 'Trial balance fetched successfully',
      data,
    };
  }

  async getProfitLoss(
    actor: AuthenticatedUser,
    query: { fromDate?: string; toDate?: string },
  ) {
    this.assertAuthenticated(actor);

    const lines = await this.prisma.accountJournalLine.findMany({
      where: {
        organizationId: actor.organizationId,
        journalEntry: {
          is: {
            status: 'posted',
            ...(query.fromDate || query.toDate
              ? {
                  postingDate: {
                    ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
                    ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
                  },
                }
              : {}),
          },
        },
      },
      include: {
        account: true,
      },
    });

    const grouped = this.groupByAccount(lines, ['income', 'expense']);
    const totalIncome = grouped
      .filter((row) => row.account.accountType === 'income')
      .reduce((sum, row) => sum + (row.credit - row.debit), 0);
    const totalExpense = grouped
      .filter((row) => row.account.accountType === 'expense')
      .reduce((sum, row) => sum + (row.debit - row.credit), 0);

    return {
      success: true,
      message: 'Profit and loss fetched successfully',
      data: {
        income: grouped.filter((row) => row.account.accountType === 'income'),
        expense: grouped.filter((row) => row.account.accountType === 'expense'),
        totalIncome: this.roundMoney(totalIncome),
        totalExpense: this.roundMoney(totalExpense),
        netProfit: this.roundMoney(totalIncome - totalExpense),
      },
    };
  }

  async getBalanceSheet(actor: AuthenticatedUser, query: { asOfDate?: string }) {
    this.assertAuthenticated(actor);

    const lines = await this.prisma.accountJournalLine.findMany({
      where: {
        organizationId: actor.organizationId,
        journalEntry: {
          is: {
            status: 'posted',
            ...(query.asOfDate ? { postingDate: { lte: new Date(query.asOfDate) } } : {}),
          },
        },
      },
      include: {
        account: true,
      },
    });

    const grouped = this.groupByAccount(lines, ['asset', 'liability', 'equity']);

    const assets = grouped.filter((row) => row.account.accountType === 'asset');
    const liabilities = grouped.filter((row) => row.account.accountType === 'liability');
    const equity = grouped.filter((row) => row.account.accountType === 'equity');

    return {
      success: true,
      message: 'Balance sheet fetched successfully',
      data: {
        assets,
        liabilities,
        equity,
        totalAssets: this.roundMoney(assets.reduce((sum, row) => sum + row.balance, 0)),
        totalLiabilities: this.roundMoney(liabilities.reduce((sum, row) => sum + Math.abs(row.balance), 0)),
        totalEquity: this.roundMoney(equity.reduce((sum, row) => sum + Math.abs(row.balance), 0)),
      },
    };
  }

  async postSalesInvoice(actor: AuthenticatedUser, salesInvoiceId: string) {
    this.assertAuthenticated(actor);

    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { organizationId: actor.organizationId, id: salesInvoiceId },
    });
    if (!invoice) throw new NotFoundException('Sales invoice not found');
    if (invoice.journalEntryId) {
      return this.getJournalEntry(actor, invoice.journalEntryId);
    }

    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId: actor.organizationId, id: invoice.retailerId },
    });
    if (!retailer) throw new NotFoundException('Retailer not found for invoice posting');

    const receivableAccount = await this.resolveReceivableAccount(actor.organizationId, retailer.receivableAccountId);
    const salesAccount = await this.resolveAccountByCode(actor.organizationId, '4100', 'Sales account not configured');

    const entry = await this.createJournalEntry(actor, {
      voucherType: 'sales',
      referenceType: 'sales_invoice',
      referenceId: invoice.id,
      entryDate: invoice.invoiceDate,
      postingDate: invoice.invoiceDate,
      narration: `Sales invoice ${invoice.invoiceNo}`,
      lines: [
        {
          accountId: receivableAccount.id,
          debitAmount: this.toNumber(invoice.grandTotal),
          creditAmount: 0,
          retailerId: retailer.id,
          lineNarration: `Receivable against invoice ${invoice.invoiceNo}`,
        },
        {
          accountId: salesAccount.id,
          debitAmount: 0,
          creditAmount: this.toNumber(invoice.grandTotal),
          retailerId: retailer.id,
          lineNarration: `Sales booking for invoice ${invoice.invoiceNo}`,
        },
      ],
    });

    await this.prisma.salesInvoice.update({
      where: { id: invoice.id },
      data: {
        journalEntryId: entry.id,
        status: invoice.status === 'draft' ? 'posted' : invoice.status,
      },
    });

    return this.getJournalEntry(actor, entry.id);
  }

  async postPaymentReceipt(actor: AuthenticatedUser, paymentReceiptId: string) {
    this.assertAuthenticated(actor);

    const receipt = await this.prisma.paymentReceipt.findFirst({
      where: { organizationId: actor.organizationId, id: paymentReceiptId },
    });
    if (!receipt) throw new NotFoundException('Payment receipt not found');
    if (receipt.journalEntryId) {
      return this.getJournalEntry(actor, receipt.journalEntryId);
    }

    const cashOrBankAccount = await this.resolvePaymentInstrumentAccount(actor.organizationId, receipt);

    let counterAccount: Account;
    let retailerId: string | null = null;
    let supplierId: string | null = null;

    if (receipt.partyType === 'retailer') {
      const retailer = await this.prisma.retailer.findFirst({
        where: { organizationId: actor.organizationId, id: receipt.partyId },
      });
      if (!retailer) throw new NotFoundException('Retailer not found for payment receipt');
      counterAccount = await this.resolveReceivableAccount(actor.organizationId, retailer.receivableAccountId);
      retailerId = retailer.id;
    } else {
      const supplier = await this.prisma.supplier.findFirst({
        where: { organizationId: actor.organizationId, id: receipt.partyId },
      });
      if (!supplier) throw new NotFoundException('Supplier not found for payment receipt');
      counterAccount = await this.resolvePayableAccount(actor.organizationId, supplier.payableAccountId);
      supplierId = supplier.id;
    }

    const amount = this.toNumber(receipt.amount);
    const isInbound = receipt.paymentDirection === 'inbound';

    const entry = await this.createJournalEntry(actor, {
      voucherType: 'receipt',
      referenceType: 'payment_receipt',
      referenceId: receipt.id,
      entryDate: receipt.paymentDate,
      postingDate: receipt.paymentDate,
      narration: `Payment receipt ${receipt.receiptNo}`,
      lines: isInbound
        ? [
            {
              accountId: cashOrBankAccount.id,
              debitAmount: amount,
              creditAmount: 0,
              retailerId,
              supplierId,
              lineNarration: `Funds received in ${receipt.paymentMode}`,
            },
            {
              accountId: counterAccount.id,
              debitAmount: 0,
              creditAmount: amount,
              retailerId,
              supplierId,
              lineNarration: 'Counter-party account adjustment',
            },
          ]
        : [
            {
              accountId: counterAccount.id,
              debitAmount: amount,
              creditAmount: 0,
              retailerId,
              supplierId,
              lineNarration: 'Counter-party account settlement',
            },
            {
              accountId: cashOrBankAccount.id,
              debitAmount: 0,
              creditAmount: amount,
              retailerId,
              supplierId,
              lineNarration: `Funds paid via ${receipt.paymentMode}`,
            },
          ],
    });

    await this.prisma.paymentReceipt.update({
      where: { id: receipt.id },
      data: {
        journalEntryId: entry.id,
        status: receipt.status === 'draft' ? 'confirmed' : receipt.status,
      },
    });

    return this.getJournalEntry(actor, entry.id);
  }

  async reverseJournalEntry(actor: AuthenticatedUser, journalEntryId: string, reason: string) {
    this.assertAuthenticated(actor);

    const original = await this.prisma.journalEntry.findFirst({
      where: { organizationId: actor.organizationId, id: journalEntryId },
    });
    if (!original) throw new NotFoundException('Journal entry not found');
    if (original.status === 'reversed') {
      throw new BadRequestException('Journal entry is already reversed');
    }

    const lines = await this.prisma.accountJournalLine.findMany({
      where: { organizationId: actor.organizationId, journalEntryId },
    });

    const reversal = await this.createJournalEntry(actor, {
      voucherType: 'journal',
      referenceType: 'reversal',
      referenceId: original.id,
      entryDate: new Date(),
      postingDate: new Date(),
      narration: `Reversal of ${original.voucherNo}: ${reason}`,
      lines: lines.map((line) => ({
        accountId: line.accountId,
        debitAmount: this.toNumber(line.creditAmount),
        creditAmount: this.toNumber(line.debitAmount),
        retailerId: line.retailerId,
        supplierId: line.supplierId,
        routeId: line.routeId,
        lineNarration: `Reversal of line ${line.id}`,
      })),
    });

    await this.prisma.journalEntry.update({
      where: { id: original.id },
      data: { status: 'reversed' },
    });

    return this.getJournalEntry(actor, reversal.id);
  }

  async reverseSalesInvoice(actor: AuthenticatedUser, salesInvoiceId: string, reason: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { organizationId: actor.organizationId, id: salesInvoiceId },
    });
    if (!invoice) throw new NotFoundException('Sales invoice not found');
    if (!invoice.journalEntryId) return null;
    return this.reverseJournalEntry(actor, invoice.journalEntryId, reason);
  }

  async reversePaymentReceipt(actor: AuthenticatedUser, paymentReceiptId: string, reason: string) {
    const receipt = await this.prisma.paymentReceipt.findFirst({
      where: { organizationId: actor.organizationId, id: paymentReceiptId },
    });
    if (!receipt) throw new NotFoundException('Payment receipt not found');
    if (!receipt.journalEntryId) return null;
    return this.reverseJournalEntry(actor, receipt.journalEntryId, reason);
  }

  async createJournalEntry(
    actor: AuthenticatedUser,
    payload: {
      voucherType: string;
      referenceType?: string | null;
      referenceId?: string | null;
      entryDate: Date;
      postingDate: Date;
      narration?: string | null;
      lines: JournalLineInput[];
    },
  ) {
    this.assertAuthenticated(actor);

    if (!payload.lines.length) {
      throw new BadRequestException('Journal entry requires at least one line');
    }

    const totalDebit = this.roundMoney(
      payload.lines.reduce((sum, line) => sum + line.debitAmount, 0),
    );
    const totalCredit = this.roundMoney(
      payload.lines.reduce((sum, line) => sum + line.creditAmount, 0),
    );
    if (totalDebit !== totalCredit) {
      throw new BadRequestException('Journal entry is not balanced');
    }

    const voucherNo = await this.generateVoucherNo(actor.organizationId, payload.voucherType);

    const entry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.journalEntry.create({
        data: {
          organizationId: actor.organizationId,
          voucherNo,
          voucherType: payload.voucherType,
          entryDate: payload.entryDate,
          postingDate: payload.postingDate,
          referenceType: payload.referenceType ?? null,
          referenceId: payload.referenceId ?? null,
          narration: payload.narration ?? null,
          status: 'posted',
          postedByUserId: actor.id,
        },
      });

      await tx.accountJournalLine.createMany({
        data: payload.lines.map((line) => ({
          organizationId: actor.organizationId,
          journalEntryId: created.id,
          accountId: line.accountId,
          retailerId: line.retailerId ?? null,
          supplierId: line.supplierId ?? null,
          routeId: line.routeId ?? null,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          lineNarration: line.lineNarration ?? null,
        })),
      });

      return created;
    });

    return entry;
  }

  private async fetchJournalLines(
    organizationId: string,
    query: { accountId?: string; retailerId?: string; supplierId?: string; fromDate?: string; toDate?: string },
  ) {
    const where: Prisma.AccountJournalLineWhereInput = {
      organizationId,
      journalEntry: { is: { status: 'posted' } },
    };

    if (query.accountId) where.accountId = query.accountId;
    if (query.retailerId) where.retailerId = query.retailerId;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.fromDate || query.toDate) {
      where.journalEntry = {
        is: {
          status: 'posted',
          postingDate: {
            ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
            ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
          },
        },
      };
    }

    return this.prisma.accountJournalLine.findMany({
      where,
      include: {
        account: true,
        journalEntry: true,
      },
      orderBy: [{ journalEntry: { postingDate: 'asc' } }, { createdAt: 'asc' }],
    });
  }

  private buildLedgerTransactions(
    lines: Array<
      Prisma.AccountJournalLineGetPayload<{
        include: { account: true; journalEntry: true };
      }>
    >,
  ) {
    let runningBalance = 0;
    return lines.map((line) => {
      const debit = this.toNumber(line.debitAmount);
      const credit = this.toNumber(line.creditAmount);
      runningBalance = this.roundMoney(runningBalance + debit - credit);
      return {
        id: line.id,
        journalEntryId: line.journalEntryId,
        voucherNo: line.journalEntry.voucherNo,
        voucherType: line.journalEntry.voucherType,
        postingDate: line.journalEntry.postingDate,
        account: {
          id: line.account.id,
          code: line.account.accountCode,
          name: line.account.accountName,
          type: line.account.accountType,
        },
        debit,
        credit,
        runningBalance,
        narration: line.lineNarration ?? line.journalEntry.narration,
      };
    });
  }

  private groupByAccount(
    lines: Array<
      Prisma.AccountJournalLineGetPayload<{
        include: { account: true };
      }>
    >,
    allowedTypes: string[],
  ) {
    const map = new Map<string, { account: Account; debit: number; credit: number; balance: number }>();
    for (const line of lines) {
      if (!allowedTypes.includes(line.account.accountType)) continue;
      const current = map.get(line.accountId) ?? {
        account: line.account,
        debit: 0,
        credit: 0,
        balance: 0,
      };
      current.debit = this.roundMoney(current.debit + this.toNumber(line.debitAmount));
      current.credit = this.roundMoney(current.credit + this.toNumber(line.creditAmount));
      current.balance = this.roundMoney(current.debit - current.credit);
      map.set(line.accountId, current);
    }
    return [...map.values()];
  }

  private async resolveReceivableAccount(organizationId: string, accountId?: string | null) {
    if (accountId) {
      const account = await this.prisma.account.findFirst({
        where: { organizationId, id: accountId },
      });
      if (account) return account;
    }
    return this.resolveAccountByCode(organizationId, '1100', 'Receivable account not configured');
  }

  private async resolvePayableAccount(organizationId: string, accountId?: string | null) {
    if (accountId) {
      const account = await this.prisma.account.findFirst({
        where: { organizationId, id: accountId },
      });
      if (account) return account;
    }
    return this.resolveAccountByCode(organizationId, '2100', 'Payable account not configured');
  }

  private async resolvePaymentInstrumentAccount(
    organizationId: string,
    receipt: { paymentMode: string; bankAccountId?: string | null; cashRegisterId?: string | null },
  ) {
    if (receipt.bankAccountId) {
      const bankAccount = await this.prisma.bankAccount.findFirst({
        where: { organizationId, id: receipt.bankAccountId },
        include: { account: true },
      });
      if (bankAccount) return bankAccount.account;
    }

    if (receipt.cashRegisterId) {
      const cashRegister = await this.prisma.cashRegister.findFirst({
        where: { organizationId, id: receipt.cashRegisterId },
        include: { account: true },
      });
      if (cashRegister) return cashRegister.account;
    }

    return receipt.paymentMode === 'cash'
      ? this.resolveAccountByCode(organizationId, '1300', 'Cash account not configured')
      : this.resolveAccountByCode(organizationId, '1310', 'Bank account not configured');
  }

  private async resolveAccountByCode(organizationId: string, code: string, errorMessage: string) {
    const account = await this.prisma.account.findFirst({
      where: { organizationId, accountCode: code },
    });
    if (!account) throw new NotFoundException(errorMessage);
    return account;
  }

  private async generateVoucherNo(organizationId: string, voucherType: string) {
    const total = await this.prisma.journalEntry.count({
      where: { organizationId, voucherType },
    });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `JV-${voucherType.toUpperCase()}-${datePart}-${String(total + 1).padStart(4, '0')}`;
  }

  async getGstSummary(actor: AuthenticatedUser, query?: { fromDate?: string; toDate?: string }) {
    this.assertAuthenticated(actor);

    const whereDate = query?.fromDate || query?.toDate ? {
      ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
      ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
    } : undefined;

    const [salesAgg, purchaseAgg] = await Promise.all([
      this.prisma.salesInvoice.aggregate({
        where: {
          organizationId: actor.organizationId,
          status: { not: 'cancelled' },
          ...(whereDate ? { invoiceDate: whereDate } : {}),
        },
        _sum: { subtotal: true, taxTotal: true, grandTotal: true },
      }),
      this.prisma.purchaseInvoice.aggregate({
        where: {
          organizationId: actor.organizationId,
          status: { not: 'cancelled' },
          ...(whereDate ? { invoiceDate: whereDate } : {}),
        },
        _sum: { taxableAmount: true, taxTotal: true, grandTotal: true },
      }),
    ]);

    const outputGst = this.toNumber(salesAgg._sum?.taxTotal);
    const inputTaxCredit = this.toNumber(purchaseAgg._sum?.taxTotal);
    const netGstPayable = this.roundMoney(Math.max(0, outputGst - inputTaxCredit));

    return {
      success: true,
      message: 'GST summary report generated successfully',
      data: {
        outputGst: this.roundMoney(outputGst),
        inputTaxCredit: this.roundMoney(inputTaxCredit),
        netGstPayable,
        salesTaxable: this.toNumber(salesAgg._sum?.subtotal),
        purchaseTaxable: this.toNumber(purchaseAgg._sum?.taxableAmount),
      },
    };
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
