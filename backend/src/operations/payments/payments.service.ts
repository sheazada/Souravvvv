import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DeliveryStop, PaymentReceipt, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AccountingService } from '../../finance/accounting/accounting.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AutoAllocatePaymentReceiptDto,
  CreatePaymentAllocationDto,
  CreatePaymentReceiptDto,
  QueryPaymentReceiptsDto,
  ReallocatePaymentReceiptDto,
} from './dto';
import { AdvanceWalletService } from './advance-wallet.service';
import { PaymentMetricsService } from './payment-metrics.service';
import { RetailerLedgerService } from './retailer-ledger.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
    private readonly retailerLedgerService: RetailerLedgerService,
    private readonly paymentMetricsService: PaymentMetricsService,
    private readonly advanceWalletService: AdvanceWalletService,
  ) {}

  async findAll(actor: AuthenticatedUser, query: QueryPaymentReceiptsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.PaymentReceiptWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.partyType) where.partyType = query.partyType;
    if (query.partyId) where.partyId = query.partyId;
    if (query.retailerId) {
      where.partyType = 'retailer';
      where.partyId = query.retailerId;
    }
    if (query.paymentMode) where.paymentMode = query.paymentMode;
    if (query.status) where.status = query.status;
    if (query.paymentSource) where.paymentSource = query.paymentSource;
    if (query.gatewayName) where.gatewayName = query.gatewayName;
    if (query.isAdvancePayment !== undefined) where.isAdvancePayment = query.isAdvancePayment;
    if (query.dispatchTripId) where.dispatchTripId = query.dispatchTripId;
    if (query.fromDate || query.toDate) {
      where.paymentDate = {};
      if (query.fromDate) where.paymentDate.gte = new Date(query.fromDate);
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }
    if (query.search) {
      where.OR = [
        { receiptNo: { contains: query.search, mode: 'insensitive' } },
        { referenceNo: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.paymentReceipt.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paymentReceipt.count({ where }),
    ]);

    return {
      success: true,
      message: 'Payment receipts fetched successfully',
      data: await this.enrichReceipts(actor.organizationId, rows),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(actor: AuthenticatedUser, dto: CreatePaymentReceiptDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const receipt = await this.createReceiptInternal(actor, dto, {
      forceConfirm: dto.autoConfirm ?? false,
    });

    return this.findOne(actor, receipt.id);
  }

  async findOne(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    const receipt = await this.getAccessibleReceiptOrThrow(actor, id);

    const [allocations, party] = await Promise.all([
      this.prisma.paymentAllocation.findMany({
        where: { organizationId: actor.organizationId, paymentReceiptId: id },
        orderBy: { allocationDate: 'desc' },
      }),
      this.resolveParty(actor.organizationId, receipt.partyType, receipt.partyId),
    ]);

    return {
      success: true,
      message: 'Payment receipt fetched successfully',
      data: {
        ...receipt,
        amount: this.toNumber(receipt.amount),
        unallocatedAmount: this.toNumber(receipt.unallocatedAmount),
        party,
        allocations: allocations.map((allocation) => ({
          ...allocation,
          allocatedAmount: this.toNumber(allocation.allocatedAmount),
        })),
      },
    };
  }

  async confirm(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackofficeOrStaff(actor);

    const receipt = await this.getReceiptOrThrow(actor.organizationId, id);
    if (receipt.status === 'cancelled') {
      throw new ConflictException('Cancelled payment receipt cannot be confirmed');
    }

    if (receipt.status === 'confirmed') {
      if (receipt.partyType === 'retailer') {
        await this.paymentMetricsService.refreshAfterReceipt(actor, receipt.partyId);
      }
      if (!receipt.journalEntryId) {
        await this.accountingService.postPaymentReceipt(actor, id);
      }
      return this.findOne(actor, id);
    }

    const confirmationResult = await this.prisma.$transaction(async (tx) => {
      const draftReceipt = await tx.paymentReceipt.findFirst({
        where: { organizationId: actor.organizationId, id },
      });
      if (!draftReceipt) throw new NotFoundException('Payment receipt not found');
      if (draftReceipt.status === 'cancelled') {
        throw new ConflictException('Cancelled payment receipt cannot be confirmed');
      }

      let appliedAmount = 0;
      let remaining = this.toNumber(draftReceipt.amount);

      const allocations = await tx.paymentAllocation.findMany({
        where: { organizationId: actor.organizationId, paymentReceiptId: id },
        orderBy: { allocationDate: 'asc' },
      });

      if (draftReceipt.partyType === 'retailer') {
        if (allocations.length) {
          for (const allocation of allocations) {
            if (!allocation.salesInvoiceId) continue;
            const invoice = await tx.salesInvoice.findFirst({
              where: {
                organizationId: actor.organizationId,
                id: allocation.salesInvoiceId,
                retailerId: draftReceipt.partyId,
              },
            });
            if (!invoice) {
              throw new NotFoundException('Sales invoice not found for receipt confirmation');
            }
            if (this.toNumber(allocation.allocatedAmount) > this.toNumber(invoice.outstandingAmount) + 0.001) {
              throw new BadRequestException(`Allocated amount exceeds outstanding for invoice ${invoice.invoiceNo}`);
            }

            const newOutstanding = this.roundMoney(
              this.toNumber(invoice.outstandingAmount) - this.toNumber(allocation.allocatedAmount),
            );
            await tx.salesInvoice.update({
              where: { id: invoice.id },
              data: {
                outstandingAmount: newOutstanding,
                status: newOutstanding <= 0 ? 'paid' : 'partial_paid',
                paymentStatus: newOutstanding <= 0 ? 'paid' : 'partial_paid',
                paidAt: newOutstanding <= 0 ? new Date() : invoice.paidAt,
              },
            });

            appliedAmount = this.roundMoney(appliedAmount + this.toNumber(allocation.allocatedAmount));
          }
          remaining = this.roundMoney(this.toNumber(draftReceipt.amount) - appliedAmount);
        } else if (!draftReceipt.isAdvancePayment) {
          const fifo = await this.applyFifoRetailerAllocationsTx(
            tx,
            actor.organizationId,
            draftReceipt,
            draftReceipt.partyId,
            new Date(draftReceipt.paymentDate),
            undefined,
            true,
          );
          appliedAmount = fifo.appliedAmount;
          remaining = fifo.remaining;
        }
      } else if (draftReceipt.partyType === 'supplier' && allocations.length) {
        for (const allocation of allocations) {
          if (!allocation.purchaseInvoiceId) continue;
          const purchaseInvoice = await tx.purchaseInvoice.findFirst({
            where: {
              organizationId: actor.organizationId,
              id: allocation.purchaseInvoiceId,
              supplierId: draftReceipt.partyId,
            },
            include: { allocations: true },
          });
          if (!purchaseInvoice) {
            throw new NotFoundException('Purchase invoice not found for receipt confirmation');
          }
          const otherApplied = purchaseInvoice.allocations
            .filter((row) => row.paymentReceiptId !== draftReceipt.id)
            .reduce((sum, row) => sum + this.toNumber(row.allocatedAmount), 0);
          const currentOutstanding = this.roundMoney(this.toNumber(purchaseInvoice.grandTotal) - otherApplied);
          if (this.toNumber(allocation.allocatedAmount) > currentOutstanding + 0.001) {
            throw new BadRequestException(`Allocated amount exceeds outstanding for purchase invoice ${purchaseInvoice.invoiceNo}`);
          }

          const remainingOutstanding = this.roundMoney(currentOutstanding - this.toNumber(allocation.allocatedAmount));
          await tx.purchaseInvoice.update({
            where: { id: purchaseInvoice.id },
            data: {
              status: remainingOutstanding <= 0 ? 'paid' : 'posted',
            },
          });

          appliedAmount = this.roundMoney(appliedAmount + this.toNumber(allocation.allocatedAmount));
        }
        remaining = this.roundMoney(this.toNumber(draftReceipt.amount) - appliedAmount);
      }

      const updated = await tx.paymentReceipt.update({
        where: { id },
        data: {
          status: 'confirmed',
          unallocatedAmount: remaining,
          isAdvancePayment: remaining > 0 || draftReceipt.isAdvancePayment,
          autoReconciled: draftReceipt.paymentSource === 'gateway_webhook' ? true : draftReceipt.autoReconciled,
        },
      });

      return {
        receipt: updated,
        appliedAmount,
        remaining,
      };
    });

    if (confirmationResult.receipt.partyType === 'retailer') {
      if (confirmationResult.remaining > 0) {
        await this.advanceWalletService.creditFromReceipt(
          actor.organizationId,
          confirmationResult.receipt.partyId,
          confirmationResult.receipt.id,
          confirmationResult.remaining,
          'Advance balance from confirmed payment receipt',
        );
      }

      await this.retailerLedgerService.postReceiptCredit(actor, {
        retailerId: confirmationResult.receipt.partyId,
        paymentReceiptId: confirmationResult.receipt.id,
        amount: this.toNumber(confirmationResult.receipt.amount),
        paymentMethod: confirmationResult.receipt.paymentMode,
        entryDate: confirmationResult.receipt.paymentDate,
        remarks: confirmationResult.receipt.remarks,
        createdByUserId: actor.id,
        isAdvancePayment: confirmationResult.appliedAmount <= 0 && confirmationResult.remaining > 0,
      });
      await this.paymentMetricsService.refreshAfterReceipt(actor, confirmationResult.receipt.partyId);
    }

    await this.accountingService.postPaymentReceipt(actor, id);
    return this.findOne(actor, id);
  }

  async cancel(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const receipt = await this.getReceiptOrThrow(actor.organizationId, id);
    if (receipt.status === 'cancelled') {
      return {
        success: true,
        message: 'Payment receipt already cancelled',
        data: receipt,
      };
    }

    const allocations = await this.prisma.paymentAllocation.findMany({
      where: { organizationId: actor.organizationId, paymentReceiptId: id },
    });

    const wasConfirmed = receipt.status === 'confirmed';
    const advanceAmount = this.toNumber(receipt.unallocatedAmount);

    await this.prisma.$transaction(async (tx) => {
      if (wasConfirmed) {
        for (const allocation of allocations) {
          if (allocation.salesInvoiceId) {
            const invoice = await tx.salesInvoice.findFirst({ where: { id: allocation.salesInvoiceId } });
            if (invoice) {
              const restoredOutstanding = this.roundMoney(
                this.toNumber(invoice.outstandingAmount) + this.toNumber(allocation.allocatedAmount),
              );
              await tx.salesInvoice.update({
                where: { id: invoice.id },
                data: {
                  outstandingAmount: restoredOutstanding,
                  status: restoredOutstanding >= this.toNumber(invoice.grandTotal) ? 'posted' : 'partial_paid',
                  paymentStatus: restoredOutstanding >= this.toNumber(invoice.grandTotal) ? 'unpaid' : 'partial_paid',
                  paidAt: restoredOutstanding >= this.toNumber(invoice.grandTotal) ? null : invoice.paidAt,
                },
              });
            }
          }

          if (allocation.purchaseInvoiceId) {
            const purchaseInvoice = await tx.purchaseInvoice.findFirst({
              where: { id: allocation.purchaseInvoiceId },
              include: { allocations: true },
            });
            if (purchaseInvoice) {
              const otherAllocations = purchaseInvoice.allocations.filter((row) => row.id !== allocation.id);
              const paidAmount = otherAllocations.reduce(
                (sum, row) => sum + this.toNumber(row.allocatedAmount),
                0,
              );
              const outstanding = this.roundMoney(this.toNumber(purchaseInvoice.grandTotal) - paidAmount);
              await tx.purchaseInvoice.update({
                where: { id: purchaseInvoice.id },
                data: {
                  status: outstanding <= 0 ? 'paid' : 'posted',
                },
              });
            }
          }
        }
      }

      await tx.paymentAllocation.deleteMany({ where: { paymentReceiptId: id } });
      await tx.paymentReceipt.update({
        where: { id },
        data: {
          status: 'cancelled',
        },
      });
    });

    if (wasConfirmed && receipt.partyType === 'retailer') {
      if (advanceAmount > 0) {
        await this.advanceWalletService.reverseReceiptAdvance(
          actor.organizationId,
          receipt.partyId,
          receipt.id,
          advanceAmount,
          'Advance balance reversed due to cancelled payment receipt',
        );
      }

      await this.retailerLedgerService.reverseReceiptPosting(actor, {
        retailerId: receipt.partyId,
        paymentReceiptId: receipt.id,
        amount: this.toNumber(receipt.amount),
        paymentMethod: receipt.paymentMode,
        entryDate: new Date(),
        remarks: 'Payment receipt cancelled',
        createdByUserId: actor.id,
        isAdvancePayment: receipt.isAdvancePayment,
      });
      await this.paymentMetricsService.refreshAfterReceipt(actor, receipt.partyId);
    }

    if (wasConfirmed && receipt.journalEntryId) {
      await this.accountingService.reversePaymentReceipt(actor, id, 'Payment receipt cancelled');
    }

    return this.findOne(actor, id);
  }

  async getAllocations(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    await this.getAccessibleReceiptOrThrow(actor, id);

    const allocations = await this.prisma.paymentAllocation.findMany({
      where: { organizationId: actor.organizationId, paymentReceiptId: id },
      orderBy: { allocationDate: 'desc' },
    });

    return {
      success: true,
      message: 'Payment allocations fetched successfully',
      data: allocations.map((allocation) => ({
        ...allocation,
        allocatedAmount: this.toNumber(allocation.allocatedAmount),
      })),
    };
  }

  async createAllocation(
    actor: AuthenticatedUser,
    paymentReceiptId: string,
    dto: CreatePaymentAllocationDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const receipt = await this.getReceiptOrThrow(actor.organizationId, paymentReceiptId);
    if (receipt.status === 'cancelled') {
      throw new ConflictException('Cancelled payment receipt cannot be allocated');
    }
    if (receipt.status === 'confirmed') {
      throw new ConflictException('Confirmed payment receipt cannot be edited; create a new receipt or cancel this one');
    }
    if (!dto.salesInvoiceId && !dto.purchaseInvoiceId) {
      throw new BadRequestException('Sales invoice or purchase invoice is required for allocation');
    }
    if (dto.salesInvoiceId && dto.purchaseInvoiceId) {
      throw new BadRequestException('Allocate to either sales invoice or purchase invoice, not both');
    }

    const allocation = await this.prisma.$transaction(async (tx) => {
      if (dto.salesInvoiceId) {
        const invoice = await tx.salesInvoice.findFirst({
          where: { organizationId: actor.organizationId, id: dto.salesInvoiceId },
        });
        if (!invoice) throw new NotFoundException('Sales invoice not found');
        if (receipt.partyType !== 'retailer' || receipt.partyId !== invoice.retailerId) {
          throw new BadRequestException('Payment receipt party does not match sales invoice retailer');
        }

        const remainingReceiptAmount = await this.getRemainingReceiptAmountTx(tx, actor.organizationId, paymentReceiptId, receipt.amount);
        if (dto.allocatedAmount > remainingReceiptAmount + 0.001) {
          throw new BadRequestException('Allocated amount exceeds remaining receipt amount');
        }
        if (dto.allocatedAmount > this.toNumber(invoice.outstandingAmount) + 0.001) {
          throw new BadRequestException('Allocated amount exceeds invoice outstanding amount');
        }

        const created = await tx.paymentAllocation.create({
          data: {
            organizationId: actor.organizationId,
            paymentReceiptId,
            salesInvoiceId: invoice.id,
            allocatedAmount: dto.allocatedAmount,
            allocationDate: new Date(dto.allocationDate),
          },
        });

        await this.updateReceiptUnallocatedAmountTx(tx, paymentReceiptId, receipt.amount, actor.organizationId);
        return created;
      }

      const purchaseInvoice = await tx.purchaseInvoice.findFirst({
        where: { organizationId: actor.organizationId, id: dto.purchaseInvoiceId! },
        include: { allocations: true },
      });
      if (!purchaseInvoice) throw new NotFoundException('Purchase invoice not found');
      if (receipt.partyType !== 'supplier' || receipt.partyId !== purchaseInvoice.supplierId) {
        throw new BadRequestException('Payment receipt party does not match purchase invoice supplier');
      }

      const remainingReceiptAmount = await this.getRemainingReceiptAmountTx(tx, actor.organizationId, paymentReceiptId, receipt.amount);
      if (dto.allocatedAmount > remainingReceiptAmount + 0.001) {
        throw new BadRequestException('Allocated amount exceeds remaining receipt amount');
      }

      const currentAllocated = purchaseInvoice.allocations.reduce(
        (sum, row) => sum + this.toNumber(row.allocatedAmount),
        0,
      );
      const outstanding = this.roundMoney(this.toNumber(purchaseInvoice.grandTotal) - currentAllocated);
      if (dto.allocatedAmount > outstanding + 0.001) {
        throw new BadRequestException('Allocated amount exceeds purchase invoice outstanding');
      }

      const created = await tx.paymentAllocation.create({
        data: {
          organizationId: actor.organizationId,
          paymentReceiptId,
          purchaseInvoiceId: purchaseInvoice.id,
          allocatedAmount: dto.allocatedAmount,
          allocationDate: new Date(dto.allocationDate),
        },
      });

      await this.updateReceiptUnallocatedAmountTx(tx, paymentReceiptId, receipt.amount, actor.organizationId);
      return created;
    });

    return {
      success: true,
      message: 'Draft payment allocation created successfully',
      data: {
        ...allocation,
        allocatedAmount: this.toNumber(allocation.allocatedAmount),
      },
    };
  }

  async autoAllocateFifo(
    actor: AuthenticatedUser,
    paymentReceiptId: string,
    dto: AutoAllocatePaymentReceiptDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const receipt = await this.getReceiptOrThrow(actor.organizationId, paymentReceiptId);
    if (receipt.partyType !== 'retailer') {
      throw new BadRequestException('Auto FIFO allocation is supported for retailer receipts only');
    }
    if (receipt.status === 'cancelled') {
      throw new ConflictException('Cancelled payment receipt cannot be allocated');
    }
    if (receipt.status === 'confirmed') {
      throw new ConflictException('Confirmed payment receipt cannot be edited; create a new receipt or cancel this one');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.paymentAllocation.deleteMany({
        where: { organizationId: actor.organizationId, paymentReceiptId },
      });

      const fifo = await this.applyFifoRetailerAllocationsTx(
        tx,
        actor.organizationId,
        receipt,
        receipt.partyId,
        new Date(dto.allocationDate),
        dto.selectedInvoiceIds,
        false,
      );

      await tx.paymentReceipt.update({
        where: { id: paymentReceiptId },
        data: {
          unallocatedAmount: fifo.remaining,
          isAdvancePayment: fifo.remaining > 0 && (dto.treatRemainingAsAdvance ?? false),
        },
      });

      return {
        allocations: fifo.allocations,
        remainingUnallocatedAmount: fifo.remaining,
      };
    });

    return {
      success: true,
      message: 'Draft FIFO allocations created successfully',
      data: result,
    };
  }

  async reallocate(
    actor: AuthenticatedUser,
    paymentReceiptId: string,
    dto: ReallocatePaymentReceiptDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const receipt = await this.getReceiptOrThrow(actor.organizationId, paymentReceiptId);
    if (receipt.partyType !== 'retailer') {
      throw new BadRequestException('Reallocation is supported for retailer receipts only');
    }
    if (receipt.status === 'cancelled') {
      throw new ConflictException('Cancelled payment receipt cannot be reallocated');
    }
    if (receipt.status === 'confirmed') {
      throw new ConflictException('Confirmed payment receipt cannot be edited; create a new receipt or cancel this one');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.paymentAllocation.deleteMany({
        where: { organizationId: actor.organizationId, paymentReceiptId },
      });

      const totalRequested = this.roundMoney(
        dto.allocations.reduce((sum, row) => sum + row.allocatedAmount, 0),
      );
      if (totalRequested > this.toNumber(receipt.amount) + 0.001) {
        throw new BadRequestException('Reallocation total exceeds receipt amount');
      }

      const createdAllocations = [] as Array<{ invoiceId: string; amount: number }>;
      for (const allocation of dto.allocations) {
        const invoice = await tx.salesInvoice.findFirst({
          where: {
            organizationId: actor.organizationId,
            id: allocation.salesInvoiceId,
            retailerId: receipt.partyId,
          },
        });
        if (!invoice) {
          throw new NotFoundException('Sales invoice not found for reallocation');
        }
        if (allocation.allocatedAmount > this.toNumber(invoice.outstandingAmount) + 0.001) {
          throw new BadRequestException('Reallocation exceeds invoice outstanding amount');
        }

        await tx.paymentAllocation.create({
          data: {
            organizationId: actor.organizationId,
            paymentReceiptId,
            salesInvoiceId: invoice.id,
            allocatedAmount: allocation.allocatedAmount,
            allocationDate: new Date(allocation.allocationDate ?? dto.allocationDate),
          },
        });

        createdAllocations.push({
          invoiceId: invoice.id,
          amount: this.roundMoney(allocation.allocatedAmount),
        });
      }

      const remaining = this.roundMoney(this.toNumber(receipt.amount) - totalRequested);
      await tx.paymentReceipt.update({
        where: { id: paymentReceiptId },
        data: {
          unallocatedAmount: remaining,
          isAdvancePayment: remaining > 0 && (dto.treatRemainingAsAdvance ?? false),
          remarks: dto.remarks ?? receipt.remarks,
        },
      });

      return {
        allocations: createdAllocations,
        remainingUnallocatedAmount: remaining,
      };
    });

    return {
      success: true,
      message: 'Draft payment receipt reallocated successfully',
      data: result,
    };
  }

  async getReceiptDocument(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    const receipt = await this.findOne(actor, id);

    return {
      success: true,
      message: 'Payment receipt document payload generated successfully',
      data: {
        receipt: receipt.data,
        fileName: `${receipt.data.receiptNo}.pdf`,
        format: 'pdf',
      },
    };
  }

  async getRetailerReceipts(
    actor: AuthenticatedUser,
    retailerId: string,
    query: QueryPaymentReceiptsDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    return this.findAll(actor, {
      ...query,
      partyType: 'retailer',
      partyId: retailerId,
      retailerId,
    });
  }

  async getMyReceipts(actor: AuthenticatedUser, query: QueryPaymentReceiptsDto) {
    this.assertAuthenticated(actor);
    this.assertRetailer(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.PaymentReceiptWhereInput = {
      organizationId: actor.organizationId,
      partyType: 'retailer',
      partyId: actor.retailerId ?? undefined,
    };

    if (query.paymentMode) where.paymentMode = query.paymentMode;
    if (query.status) where.status = query.status;
    if (query.fromDate || query.toDate) {
      where.paymentDate = {};
      if (query.fromDate) where.paymentDate.gte = new Date(query.fromDate);
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }
    if (query.search) {
      where.OR = [
        { receiptNo: { contains: query.search, mode: 'insensitive' } },
        { referenceNo: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.paymentReceipt.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paymentReceipt.count({ where }),
    ]);

    return {
      success: true,
      message: 'Retailer payment receipts fetched successfully',
      data: await this.enrichReceipts(actor.organizationId, rows),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyReceiptById(actor: AuthenticatedUser, id: string) {
    return this.findOne(actor, id);
  }

  async getRetailerOutstanding(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId: actor.organizationId,
        outstandingAmount: { gt: 0 },
        status: { in: ['posted', 'partial_paid'] },
      },
      select: {
        retailerId: true,
        invoiceNo: true,
        invoiceDate: true,
        dueDate: true,
        grandTotal: true,
        outstandingAmount: true,
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

    const grouped = new Map<string, any>();
    for (const invoice of invoices) {
      const current = grouped.get(invoice.retailerId) ?? {
        retailer: retailerMap.get(invoice.retailerId) ?? null,
        totalOutstanding: 0,
        invoiceCount: 0,
        invoices: [],
      };
      current.totalOutstanding = this.roundMoney(current.totalOutstanding + this.toNumber(invoice.outstandingAmount));
      current.invoiceCount += 1;
      current.invoices.push({
        invoiceNo: invoice.invoiceNo,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        grandTotal: this.toNumber(invoice.grandTotal),
        outstandingAmount: this.toNumber(invoice.outstandingAmount),
      });
      grouped.set(invoice.retailerId, current);
    }

    return {
      success: true,
      message: 'Retailer outstanding fetched successfully',
      data: [...grouped.values()],
    };
  }

  async getSupplierOutstanding(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoices = await this.prisma.purchaseInvoice.findMany({
      where: {
        organizationId: actor.organizationId,
        status: { in: ['approved', 'posted', 'paid'] },
      },
      include: { allocations: true },
      orderBy: [{ dueDate: 'asc' }, { invoiceDate: 'asc' }],
    });

    const supplierIds = [...new Set(invoices.map((invoice) => invoice.supplierId))];
    const suppliers = supplierIds.length
      ? await this.prisma.supplier.findMany({
          where: { organizationId: actor.organizationId, id: { in: supplierIds } },
          select: { id: true, supplierCode: true, name: true, mobile: true },
        })
      : [];
    const supplierMap = new Map<string, any>(suppliers.map((supplier): [string, any] => [supplier.id, supplier]));

    const grouped = new Map<string, any>();
    for (const invoice of invoices) {
      const paid = invoice.allocations.reduce(
        (sum, allocation) => sum + this.toNumber(allocation.allocatedAmount),
        0,
      );
      const outstanding = this.roundMoney(this.toNumber(invoice.grandTotal) - paid);
      if (outstanding <= 0) continue;
      const current = grouped.get(invoice.supplierId) ?? {
        supplier: supplierMap.get(invoice.supplierId) ?? null,
        totalOutstanding: 0,
        invoiceCount: 0,
        invoices: [],
      };
      current.totalOutstanding = this.roundMoney(current.totalOutstanding + outstanding);
      current.invoiceCount += 1;
      current.invoices.push({
        invoiceNo: invoice.invoiceNo,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        grandTotal: this.toNumber(invoice.grandTotal),
        outstandingAmount: outstanding,
      });
      grouped.set(invoice.supplierId, current);
    }

    return {
      success: true,
      message: 'Supplier outstanding fetched successfully',
      data: [...grouped.values()],
    };
  }

  async getOutstandingAging(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId: actor.organizationId,
        outstandingAmount: { gt: 0 },
        status: { in: ['posted', 'partial_paid'] },
      },
      select: {
        id: true,
        invoiceNo: true,
        retailerId: true,
        dueDate: true,
        outstandingAmount: true,
      },
    });

    const retailerIds = [...new Set(invoices.map((invoice) => invoice.retailerId))];
    const retailers = retailerIds.length
      ? await this.prisma.retailer.findMany({
          where: { organizationId: actor.organizationId, id: { in: retailerIds } },
          select: { id: true, retailerCode: true, shopName: true },
        })
      : [];
    const retailerMap = new Map<string, any>(retailers.map((retailer): [string, any] => [retailer.id, retailer]));

    const now = new Date();
    const ageBucket = (dueDate?: Date | null) => {
      if (!dueDate) return 'no_due_date';
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'current';
      if (diffDays <= 30) return '1_30';
      if (diffDays <= 60) return '31_60';
      if (diffDays <= 90) return '61_90';
      return '90_plus';
    };

    return {
      success: true,
      message: 'Outstanding aging fetched successfully',
      data: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        retailer: retailerMap.get(invoice.retailerId) ?? null,
        dueDate: invoice.dueDate,
        outstandingAmount: this.toNumber(invoice.outstandingAmount),
        ageBucket: ageBucket(invoice.dueDate),
      })),
    };
  }

  async recordDeliveryStopCollection(
    actor: AuthenticatedUser,
    stopId: string,
    dto: {
      amount: number;
      paymentMode: string;
      salesInvoiceId?: string;
      referenceNo?: string;
      notes?: string;
      allocationMode?: string;
      salesInvoiceAllocations?: Array<{ invoiceId: string; allocatedAmount: number }>;
      receiptFileAttachmentId?: string;
      signatureFileAttachmentId?: string;
      markAsAdvanceIfUnallocated?: boolean;
    },
  ) {
    this.assertAuthenticated(actor);

    const stop = await this.getStopOrThrow(actor.organizationId, stopId);
    const retailer = await this.prisma.retailer.findFirst({
      where: { organizationId: actor.organizationId, id: stop.retailerId },
    });
    if (!retailer) {
      throw new NotFoundException('Retailer not found for collection stop');
    }

    const manualAllocations = dto.salesInvoiceAllocations?.map((row) => ({
      salesInvoiceId: row.invoiceId,
      allocatedAmount: row.allocatedAmount,
      allocationDate: new Date().toISOString(),
    }))
      ?? (dto.salesInvoiceId
        ? [{ salesInvoiceId: dto.salesInvoiceId, allocatedAmount: dto.amount, allocationDate: new Date().toISOString() }]
        : undefined);

    const receipt = await this.createReceiptInternal(
      actor,
      {
        partyType: 'retailer',
        partyId: retailer.id,
        paymentDirection: 'inbound',
        paymentMode: dto.paymentMode,
        paymentDate: new Date().toISOString(),
        amount: dto.amount,
        dispatchTripId: stop.dispatchTripId,
        referenceNo: dto.referenceNo,
        remarks: dto.notes,
        paymentSource: 'delivery_staff',
        receiptFileUrl: dto.receiptFileAttachmentId,
        signatureFileUrl: dto.signatureFileAttachmentId,
        autoConfirm: true,
        allocationMode: dto.allocationMode ?? (manualAllocations ? 'manual' : 'fifo'),
        salesInvoiceAllocations: manualAllocations,
        isAdvancePayment: dto.markAsAdvanceIfUnallocated ?? false,
      },
      {
        forceConfirm: true,
        allowStaffSource: true,
        fallbackStop: stop,
        treatRemainingAsAdvance: dto.markAsAdvanceIfUnallocated ?? false,
      },
    );

    return this.findOne(actor, receipt.id);
  }

  async createConfirmedGatewayReceiptForIntent(
    organizationId: string,
    paymentIntentId: string,
    payload: {
      gatewayName: string;
      gatewayPaymentId?: string | null;
      gatewayOrderId?: string | null;
      paymentMethod?: string | null;
      paidAt?: Date;
      remarks?: string | null;
    },
  ) {
    const intent = await this.prisma.retailerPaymentIntent.findFirst({
      where: { organizationId, id: paymentIntentId },
      include: {
        invoiceLinks: true,
      },
    });
    if (!intent) {
      throw new NotFoundException('Retailer payment intent not found');
    }

    const existingReceipt = await this.prisma.paymentReceipt.findFirst({
      where: {
        organizationId,
        paymentIntentId: intent.id,
      },
    });
    if (existingReceipt) {
      if (existingReceipt.status !== 'confirmed') {
        const actor = await this.buildSystemActorForOrganization(organizationId, intent.createdByUserId ?? undefined, intent.retailerId);
        await this.confirm(actor, existingReceipt.id);
        return this.getReceiptOrThrow(organizationId, existingReceipt.id);
      }
      return existingReceipt;
    }

    const actor = await this.buildSystemActorForOrganization(organizationId, intent.createdByUserId ?? undefined, intent.retailerId);
    const manualAllocations = intent.invoiceLinks.map((link) => ({
      salesInvoiceId: link.salesInvoiceId,
      allocatedAmount: this.toNumber(link.targetAmount),
      allocationDate: (payload.paidAt ?? new Date()).toISOString(),
    }));

    return this.createReceiptInternal(
      actor,
      {
        partyType: 'retailer',
        partyId: intent.retailerId,
        paymentDirection: 'inbound',
        paymentMode: payload.paymentMethod ?? 'upi',
        paymentDate: (payload.paidAt ?? new Date()).toISOString(),
        amount: this.toNumber(intent.amount),
        referenceNo: payload.gatewayPaymentId ?? payload.gatewayOrderId ?? intent.intentNo,
        remarks: payload.remarks ?? 'Gateway payment received',
        paymentSource: 'gateway_webhook',
        paymentIntentId: intent.id,
        gatewayName: payload.gatewayName,
        gatewayPaymentId: payload.gatewayPaymentId ?? undefined,
        gatewayOrderId: payload.gatewayOrderId ?? undefined,
        autoConfirm: true,
        allocationMode: manualAllocations.length ? 'manual' : 'advance',
        salesInvoiceAllocations: manualAllocations.length ? manualAllocations : undefined,
        isAdvancePayment: manualAllocations.length === 0,
      },
      {
        forceConfirm: true,
      },
    );
  }

  private async createReceiptInternal(
    actor: AuthenticatedUser,
    dto: CreatePaymentReceiptDto,
    options?: {
      forceConfirm?: boolean;
      allowStaffSource?: boolean;
      fallbackStop?: DeliveryStop | null;
      treatRemainingAsAdvance?: boolean;
    },
  ) {
    await this.validatePaymentReceiptContext(actor.organizationId, dto);
    const receiptNo = await this.generateReceiptNo(actor.organizationId);

    const receipt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.paymentReceipt.create({
        data: {
          organizationId: actor.organizationId,
          receiptNo,
          partyType: dto.partyType,
          partyId: dto.partyId,
          paymentDirection: dto.paymentDirection,
          paymentMode: dto.paymentMode,
          paymentDate: new Date(dto.paymentDate),
          amount: dto.amount,
          collectedByUserId: actor.id,
          collectedByEmployeeId: actor.employeeId ?? null,
          dispatchTripId: dto.dispatchTripId ?? options?.fallbackStop?.dispatchTripId ?? null,
          bankAccountId: dto.bankAccountId,
          cashRegisterId: dto.cashRegisterId,
          referenceNo: dto.referenceNo,
          status: 'draft',
          remarks: dto.remarks,
          paymentSource: dto.paymentSource,
          paymentIntentId: dto.paymentIntentId,
          gatewayName: dto.gatewayName,
          gatewayPaymentId: dto.gatewayPaymentId,
          gatewayOrderId: dto.gatewayOrderId,
          isAdvancePayment: dto.isAdvancePayment ?? false,
          unallocatedAmount: dto.amount,
          receiptFileUrl: dto.receiptFileUrl,
          signatureFileUrl: dto.signatureFileUrl,
        },
      });

      if (dto.partyType === 'retailer' && dto.salesInvoiceAllocations?.length) {
        await this.applyManualRetailerAllocationsTx(
          tx,
          actor.organizationId,
          created,
          dto.partyId,
          dto.salesInvoiceAllocations,
          false,
        );
      }

      const finalReceipt = await tx.paymentReceipt.findUniqueOrThrow({ where: { id: created.id } });
      return finalReceipt;
    });

    if (options?.forceConfirm) {
      if (!(actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') || options.allowStaffSource) {
        await this.confirm(actor, receipt.id);
      }
    }

    if (receipt.partyType === 'retailer') {
      await this.paymentMetricsService.refreshAfterReceipt(actor, receipt.partyId);
    }

    return receipt;
  }

  private async applyManualRetailerAllocationsTx(
    tx: Prisma.TransactionClient,
    organizationId: string,
    receipt: PaymentReceipt,
    retailerId: string,
    allocations: Array<{ salesInvoiceId: string; allocatedAmount: number; allocationDate?: string }>,
    applyToInvoices: boolean,
  ) {
    const total = this.roundMoney(allocations.reduce((sum, row) => sum + row.allocatedAmount, 0));
    if (total > this.toNumber(receipt.amount) + 0.001) {
      throw new BadRequestException('Manual allocations exceed receipt amount');
    }

    for (const allocation of allocations) {
      const invoice = await tx.salesInvoice.findFirst({
        where: {
          organizationId,
          id: allocation.salesInvoiceId,
          retailerId,
        },
      });

      if (!invoice) {
        throw new NotFoundException('Sales invoice not found for allocation');
      }
      if (allocation.allocatedAmount > this.toNumber(invoice.outstandingAmount) + 0.001) {
        throw new BadRequestException('Allocated amount exceeds invoice outstanding amount');
      }

      const existing = await tx.paymentAllocation.findFirst({
        where: {
          organizationId,
          paymentReceiptId: receipt.id,
          salesInvoiceId: invoice.id,
        },
      });

      if (existing) {
        await tx.paymentAllocation.update({
          where: { id: existing.id },
          data: {
            allocatedAmount: allocation.allocatedAmount,
            allocationDate: new Date(allocation.allocationDate ?? receipt.paymentDate),
          },
        });
      } else {
        await tx.paymentAllocation.create({
          data: {
            organizationId,
            paymentReceiptId: receipt.id,
            salesInvoiceId: invoice.id,
            allocatedAmount: allocation.allocatedAmount,
            allocationDate: new Date(allocation.allocationDate ?? receipt.paymentDate),
          },
        });
      }

      if (applyToInvoices) {
        const newOutstanding = this.roundMoney(
          this.toNumber(invoice.outstandingAmount) - allocation.allocatedAmount,
        );
        await tx.salesInvoice.update({
          where: { id: invoice.id },
          data: {
            outstandingAmount: newOutstanding,
            status: newOutstanding <= 0 ? 'paid' : 'partial_paid',
            paymentStatus: newOutstanding <= 0 ? 'paid' : 'partial_paid',
            paidAt: newOutstanding <= 0 ? new Date() : invoice.paidAt,
          },
        });
      }
    }

    await this.updateReceiptUnallocatedAmountTx(tx, receipt.id, receipt.amount, organizationId, undefined, false);
  }

  private async applyFifoRetailerAllocationsTx(
    tx: Prisma.TransactionClient,
    organizationId: string,
    receipt: PaymentReceipt,
    retailerId: string,
    allocationDate: Date,
    selectedInvoiceIds?: string[],
    applyToInvoices = false,
  ) {
    let remaining = await this.getRemainingReceiptAmountTx(tx, organizationId, receipt.id, receipt.amount);
    const invoices = await tx.salesInvoice.findMany({
      where: {
        organizationId,
        retailerId,
        outstandingAmount: { gt: 0 },
        status: { in: ['posted', 'partial_paid'] },
        ...(selectedInvoiceIds?.length ? { id: { in: selectedInvoiceIds } } : {}),
      },
      orderBy: [{ dueDate: 'asc' }, { invoiceDate: 'asc' }],
    });

    const allocations = [] as Array<{ invoiceId: string; amount: number }>;
    let appliedAmount = 0;

    for (const invoice of invoices) {
      if (remaining <= 0) break;
      const allocate = Math.min(remaining, this.toNumber(invoice.outstandingAmount));
      if (allocate <= 0) continue;

      await tx.paymentAllocation.create({
        data: {
          organizationId,
          paymentReceiptId: receipt.id,
          salesInvoiceId: invoice.id,
          allocatedAmount: allocate,
          allocationDate,
        },
      });

      if (applyToInvoices) {
        const newOutstanding = this.roundMoney(this.toNumber(invoice.outstandingAmount) - allocate);
        await tx.salesInvoice.update({
          where: { id: invoice.id },
          data: {
            outstandingAmount: newOutstanding,
            status: newOutstanding <= 0 ? 'paid' : 'partial_paid',
            paymentStatus: newOutstanding <= 0 ? 'paid' : 'partial_paid',
            paidAt: newOutstanding <= 0 ? new Date() : invoice.paidAt,
          },
        });
      }

      allocations.push({ invoiceId: invoice.id, amount: this.roundMoney(allocate) });
      appliedAmount = this.roundMoney(appliedAmount + allocate);
      remaining = this.roundMoney(remaining - allocate);
    }

    await this.updateReceiptUnallocatedAmountTx(
      tx,
      receipt.id,
      receipt.amount,
      organizationId,
      remaining,
      false,
    );

    return {
      allocations,
      appliedAmount,
      remaining,
    };
  }

  private async getRemainingReceiptAmountTx(
    tx: Prisma.TransactionClient,
    organizationId: string,
    paymentReceiptId: string,
    receiptAmount: Prisma.Decimal | number,
  ) {
    const allocatedSummary = await tx.paymentAllocation.aggregate({
      where: { organizationId, paymentReceiptId },
      _sum: { allocatedAmount: true },
    });
    return this.roundMoney(
      this.toNumber(receiptAmount) - this.toNumber(allocatedSummary._sum.allocatedAmount),
    );
  }

  private async updateReceiptUnallocatedAmountTx(
    tx: Prisma.TransactionClient,
    paymentReceiptId: string,
    receiptAmount: Prisma.Decimal | number,
    organizationId: string,
    precomputedRemaining?: number,
    setAdvanceFlag = false,
  ) {
    const remaining =
      precomputedRemaining ??
      (await this.getRemainingReceiptAmountTx(tx, organizationId, paymentReceiptId, receiptAmount));
    await tx.paymentReceipt.update({
      where: { id: paymentReceiptId },
      data: {
        unallocatedAmount: remaining,
        ...(setAdvanceFlag ? { isAdvancePayment: remaining > 0 } : {}),
      },
    });
  }

  private async validatePaymentReceiptContext(
    organizationId: string,
    dto: CreatePaymentReceiptDto,
  ) {
    if (dto.paymentMode === 'cash' && dto.bankAccountId) {
      throw new BadRequestException('Bank account should not be provided for cash receipt');
    }
    if (dto.paymentMode !== 'cash' && dto.cashRegisterId && dto.bankAccountId) {
      throw new BadRequestException('Choose either cash register or bank account');
    }
    if (dto.dispatchTripId) {
      const trip = await this.prisma.dispatchTrip.findFirst({
        where: { organizationId, id: dto.dispatchTripId },
      });
      if (!trip) throw new NotFoundException('Dispatch trip not found for payment receipt');
    }
    if (dto.partyType === 'retailer') {
      const retailer = await this.prisma.retailer.findFirst({
        where: { organizationId, id: dto.partyId },
      });
      if (!retailer) throw new NotFoundException('Retailer not found for payment receipt');
    } else {
      const supplier = await this.prisma.supplier.findFirst({
        where: { organizationId, id: dto.partyId },
      });
      if (!supplier) throw new NotFoundException('Supplier not found for payment receipt');
    }
    if (dto.bankAccountId) {
      const bankAccount = await this.prisma.bankAccount.findFirst({
        where: { organizationId, id: dto.bankAccountId },
      });
      if (!bankAccount) throw new NotFoundException('Bank account not found');
    }
    if (dto.cashRegisterId) {
      const cashRegister = await this.prisma.cashRegister.findFirst({
        where: { organizationId, id: dto.cashRegisterId },
      });
      if (!cashRegister) throw new NotFoundException('Cash register not found');
    }
  }

  private async enrichReceipts(organizationId: string, receipts: PaymentReceipt[]) {
    const retailerIds = receipts
      .filter((receipt) => receipt.partyType === 'retailer')
      .map((receipt) => receipt.partyId);
    const supplierIds = receipts
      .filter((receipt) => receipt.partyType === 'supplier')
      .map((receipt) => receipt.partyId);

    const [retailers, suppliers] = await Promise.all([
      retailerIds.length
        ? this.prisma.retailer.findMany({
            where: { organizationId, id: { in: retailerIds } },
            select: { id: true, retailerCode: true, shopName: true, mobile: true },
          })
        : [],
      supplierIds.length
        ? this.prisma.supplier.findMany({
            where: { organizationId, id: { in: supplierIds } },
            select: { id: true, supplierCode: true, name: true, mobile: true },
          })
        : [],
    ]);

    const retailerMap = new Map<string, any>(retailers.map((row): [string, any] => [row.id, row]));
    const supplierMap = new Map<string, any>(suppliers.map((row): [string, any] => [row.id, row]));

    return receipts.map((receipt) => ({
      ...receipt,
      amount: this.toNumber(receipt.amount),
      unallocatedAmount: this.toNumber(receipt.unallocatedAmount),
      party:
        receipt.partyType === 'retailer'
          ? retailerMap.get(receipt.partyId) ?? null
          : supplierMap.get(receipt.partyId) ?? null,
    }));
  }

  private async resolveParty(organizationId: string, partyType: string, partyId: string) {
    if (partyType === 'retailer') {
      return this.prisma.retailer.findFirst({
        where: { organizationId, id: partyId },
        select: { id: true, retailerCode: true, shopName: true, mobile: true },
      });
    }

    return this.prisma.supplier.findFirst({
      where: { organizationId, id: partyId },
      select: { id: true, supplierCode: true, name: true, mobile: true },
    });
  }

  private async getAccessibleReceiptOrThrow(actor: AuthenticatedUser, id: string) {
    const receipt = await this.getReceiptOrThrow(actor.organizationId, id);
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      if (receipt.partyType !== 'retailer' || receipt.partyId !== actor.retailerId) {
        throw new ForbiddenException('You can only access your own payment receipts');
      }
    }
    return receipt;
  }

  private async getReceiptOrThrow(organizationId: string, id: string) {
    const receipt = await this.prisma.paymentReceipt.findFirst({
      where: { organizationId, id },
    });
    if (!receipt) throw new NotFoundException('Payment receipt not found');
    return receipt;
  }

  private async getStopOrThrow(organizationId: string, id: string) {
    const stop = await this.prisma.deliveryStop.findFirst({
      where: { organizationId, id },
    });
    if (!stop) throw new NotFoundException('Delivery stop not found');
    return stop;
  }

  private async buildSystemActorForOrganization(
    organizationId: string,
    preferredUserId?: string,
    retailerId?: string,
  ): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        organizationId,
        ...(preferredUserId ? { id: preferredUserId } : {}),
      },
      select: {
        id: true,
        organizationId: true,
        retailerId: true,
        employeeId: true,
        fullName: true,
        mobile: true,
        userType: true,
      },
    }) ?? await this.prisma.user.findFirst({
      where: { organizationId },
      select: {
        id: true,
        organizationId: true,
        retailerId: true,
        employeeId: true,
        fullName: true,
        mobile: true,
        userType: true,
      },
    });

    if (!user) {
      throw new NotFoundException('No system user available for gateway receipt processing');
    }

    return {
      id: user.id,
      organizationId: user.organizationId,
      retailerId: retailerId ?? user.retailerId,
      employeeId: user.employeeId,
      fullName: user.fullName,
      mobile: user.mobile,
      userType: user.userType,
      roles: user.userType === 'retailer_user' ? ['RETAILER'] : ['OWNER'],
      permissions: [],
    };
  }

  private async generateReceiptNo(organizationId: string) {
    const total = await this.prisma.paymentReceipt.count({ where: { organizationId } });
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `RCPT-${datePart}-${String(total + 1).padStart(4, '0')}`;
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      throw new ForbiddenException('Retailer users cannot access payments module');
    }
  }

  private assertBackofficeOrStaff(actor: AuthenticatedUser) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      throw new ForbiddenException('Retailer users cannot access payments module');
    }
  }

  private assertRetailer(actor: AuthenticatedUser) {
    if (!actor.retailerId || !(actor.roles.includes('RETAILER') || actor.userType === 'retailer_user')) {
      throw new ForbiddenException('Retailer access required');
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
