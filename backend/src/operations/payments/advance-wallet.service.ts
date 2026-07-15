import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AdjustAdvanceWalletDto, ApplyWalletBalanceDto, QueryWalletTransactionsDto } from './dto';

@Injectable()
export class AdvanceWalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(actor: AuthenticatedUser, retailerId: string) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const wallet = await this.ensureWallet(actor.organizationId, retailerId);
    const transactions = await this.prisma.retailerWalletTransaction.findMany({
      where: {
        organizationId: actor.organizationId,
        retailerAdvanceWalletId: wallet.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      success: true,
      message: 'Retailer advance wallet fetched successfully',
      data: {
        ...this.serializeWallet(wallet),
        transactions: transactions.map((row) => this.serializeTransaction(row)),
      },
    };
  }

  async getMyWallet(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);
    return this.getWallet(actor, actor.retailerId!);
  }

  async getWalletTransactions(actor: AuthenticatedUser, retailerId: string, query: QueryWalletTransactionsDto) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const wallet = await this.ensureWallet(actor.organizationId, retailerId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.RetailerWalletTransactionWhereInput = {
      organizationId: actor.organizationId,
      retailerAdvanceWalletId: wallet.id,
    };

    if (query.transactionType) where.transactionType = query.transactionType;
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.retailerWalletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.retailerWalletTransaction.count({ where }),
    ]);

    return {
      success: true,
      message: 'Retailer wallet transactions fetched successfully',
      data: rows.map((row) => this.serializeTransaction(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adjustWallet(actor: AuthenticatedUser, retailerId: string, dto: AdjustAdvanceWalletDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const wallet = await this.ensureWallet(actor.organizationId, retailerId);
    const debitAmount = this.toNumber(dto.debitAmount);
    const creditAmount = this.toNumber(dto.creditAmount);

    if (debitAmount <= 0 && creditAmount <= 0) {
      throw new BadRequestException('Debit or credit amount must be greater than zero');
    }

    const transaction = await this.postTransaction(actor.organizationId, wallet.id, {
      transactionType: dto.transactionType,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      debitAmount,
      creditAmount,
      remarks: dto.remarks,
    });

    return {
      success: true,
      message: 'Retailer advance wallet adjusted successfully',
      data: this.serializeTransaction(transaction),
    };
  }

  async applyWalletBalance(actor: AuthenticatedUser, retailerId: string, dto: ApplyWalletBalanceDto) {
    this.assertAuthenticated(actor);
    await this.ensureRetailerAccessible(actor, retailerId);

    const wallet = await this.ensureWallet(actor.organizationId, retailerId);
    if (dto.amount > this.toNumber(wallet.availableBalance) + 0.001) {
      throw new BadRequestException('Wallet balance is insufficient');
    }

    return {
      success: true,
      message: 'Wallet balance application contract prepared',
      data: {
        retailerId,
        walletId: wallet.id,
        amount: dto.amount,
        allocationMode: dto.allocationMode,
        selectedInvoiceIds: dto.selectedInvoiceIds ?? [],
      },
    };
  }

  async creditFromReceipt(
    organizationId: string,
    retailerId: string,
    paymentReceiptId: string,
    amount: number,
    remarks?: string | null,
  ) {
    if (amount <= 0) return null;
    const wallet = await this.ensureWallet(organizationId, retailerId);

    const existing = await this.prisma.retailerWalletTransaction.findFirst({
      where: {
        organizationId,
        retailerAdvanceWalletId: wallet.id,
        transactionType: 'advance_credit',
        referenceType: 'payment_receipt',
        referenceId: paymentReceiptId,
      },
    });

    if (existing) return existing;

    return this.postTransaction(organizationId, wallet.id, {
      transactionType: 'advance_credit',
      referenceType: 'payment_receipt',
      referenceId: paymentReceiptId,
      debitAmount: 0,
      creditAmount: amount,
      remarks: remarks ?? 'Advance balance created from payment receipt',
    });
  }

  async reverseReceiptAdvance(
    organizationId: string,
    retailerId: string,
    paymentReceiptId: string,
    amount: number,
    remarks?: string | null,
  ) {
    if (amount <= 0) return null;
    const wallet = await this.ensureWallet(organizationId, retailerId);

    const existing = await this.prisma.retailerWalletTransaction.findFirst({
      where: {
        organizationId,
        retailerAdvanceWalletId: wallet.id,
        transactionType: 'adjustment',
        referenceType: 'payment_receipt_cancel',
        referenceId: paymentReceiptId,
      },
    });

    if (existing) return existing;

    return this.postTransaction(organizationId, wallet.id, {
      transactionType: 'adjustment',
      referenceType: 'payment_receipt_cancel',
      referenceId: paymentReceiptId,
      debitAmount: amount,
      creditAmount: 0,
      remarks: remarks ?? 'Advance balance reversed due to payment receipt cancellation',
    });
  }

  private async ensureWallet(organizationId: string, retailerId: string) {
    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId, id: retailerId },
      select: { id: true },
    });
    if (!retailer) {
      throw new NotFoundException('Retailer not found');
    }

    return this.prisma.retailerAdvanceWallet.upsert({
      where: { retailerId },
      create: {
        organizationId,
        retailerId,
        availableBalance: 0,
        lockedBalance: 0,
      },
      update: {},
    });
  }

  private async postTransaction(
    organizationId: string,
    walletId: string,
    params: {
      transactionType: string;
      referenceType?: string | null;
      referenceId?: string | null;
      debitAmount: number;
      creditAmount: number;
      remarks?: string | null;
    },
  ) {
    const wallet = await this.prisma.retailerAdvanceWallet.findFirst({
      where: { organizationId, id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Retailer wallet not found');
    }

    const currentBalance = this.toNumber(wallet.availableBalance);
    const nextBalance = this.roundMoney(currentBalance + params.creditAmount - params.debitAmount);
    if (nextBalance < -0.001) {
      throw new BadRequestException('Wallet balance cannot become negative');
    }

    const transaction = await this.prisma.retailerWalletTransaction.create({
      data: {
        organizationId,
        retailerAdvanceWalletId: wallet.id,
        transactionType: params.transactionType,
        referenceType: params.referenceType ?? null,
        referenceId: params.referenceId ?? null,
        debitAmount: params.debitAmount,
        creditAmount: params.creditAmount,
        runningWalletBalance: nextBalance,
        remarks: params.remarks ?? null,
      },
    });

    await this.prisma.retailerAdvanceWallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: nextBalance,
        lastUpdatedAt: new Date(),
      },
    });

    return transaction;
  }

  private async ensureRetailerAccessible(actor: AuthenticatedUser, retailerId: string) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      if (actor.retailerId !== retailerId) {
        throw new ForbiddenException('Retailer access restricted to own wallet');
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

  private serializeWallet(wallet: any) {
    return {
      ...wallet,
      availableBalance: this.toNumber(wallet.availableBalance),
      lockedBalance: this.toNumber(wallet.lockedBalance),
    };
  }

  private serializeTransaction(transaction: any) {
    return {
      ...transaction,
      debitAmount: this.toNumber(transaction.debitAmount),
      creditAmount: this.toNumber(transaction.creditAmount),
      runningWalletBalance: this.toNumber(transaction.runningWalletBalance),
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertRetailer(actor: AuthenticatedUser) {
    if (!actor.retailerId || !(actor.roles.includes('RETAILER') || actor.userType === 'retailer_user')) {
      throw new ForbiddenException('Retailer access required');
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
}
