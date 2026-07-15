import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, PurchaseInvoice, PurchaseInvoiceItem } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePurchaseInvoiceDto,
  PurchaseInvoiceItemDto,
  QueryPurchaseInvoicesDto,
  UpdatePurchaseInvoiceDto,
} from './dto';

@Injectable()
export class PurchaseInvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actor: AuthenticatedUser, query: QueryPurchaseInvoicesDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.PurchaseInvoiceWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.goodsReceiptId) where.goodsReceiptId = query.goodsReceiptId;
    if (query.status) where.status = query.status;

    if (query.fromDate || query.toDate) {
      where.invoiceDate = {};
      if (query.fromDate) where.invoiceDate.gte = new Date(query.fromDate);
      if (query.toDate) where.invoiceDate.lte = new Date(query.toDate);
    }

    if (query.search) {
      where.OR = [
        { invoiceNo: { contains: query.search, mode: 'insensitive' } },
        { internalVoucherNo: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.purchaseInvoice.findMany({
        where,
        orderBy: { invoiceDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseInvoice.count({ where }),
    ]);

    const enriched = await this.enrichInvoices(actor.organizationId, rows);

    return {
      success: true,
      message: 'Purchase invoices fetched successfully',
      data: enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoice = await this.getInvoiceOrThrow(actor.organizationId, id);
    const [items, supplier, goodsReceipt] = await Promise.all([
      this.prisma.purchaseInvoiceItem.findMany({
        where: { organizationId: actor.organizationId, purchaseInvoiceId: id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.supplier.findFirst({
        where: { organizationId: actor.organizationId, id: invoice.supplierId },
        select: { id: true, supplierCode: true, name: true, contactPerson: true, mobile: true },
      }),
      invoice.goodsReceiptId
        ? this.prisma.goodsReceipt.findFirst({
            where: { organizationId: actor.organizationId, id: invoice.goodsReceiptId },
            select: { id: true, grnNo: true, receiptDate: true, status: true },
          })
        : null,
    ]);

    return {
      success: true,
      message: 'Purchase invoice fetched successfully',
      data: {
        ...invoice,
        taxableAmount: this.toNumber(invoice.taxableAmount),
        taxTotal: this.toNumber(invoice.taxTotal),
        grandTotal: this.toNumber(invoice.grandTotal),
        supplier,
        goodsReceipt,
        items: await this.enrichItems(actor.organizationId, items),
      },
    };
  }

  async create(actor: AuthenticatedUser, dto: CreatePurchaseInvoiceDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const supplier = await this.getSupplierOrThrow(actor.organizationId, dto.supplierId);
    if (!supplier.isActive) {
      throw new ForbiddenException('Supplier is inactive');
    }

    if (dto.goodsReceiptId) {
      const grn = await this.prisma.goodsReceipt.findFirst({
        where: { organizationId: actor.organizationId, id: dto.goodsReceiptId },
      });
      if (!grn) throw new NotFoundException('Goods receipt not found');
      if (grn.supplierId !== supplier.id) {
        throw new BadRequestException('Goods receipt supplier does not match invoice supplier');
      }
    }

    const prepared = await this.prepareItems(actor.organizationId, dto.items);

    const created = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.purchaseInvoice.create({
        data: {
          organizationId: actor.organizationId,
          invoiceNo: dto.invoiceNo.trim(),
          internalVoucherNo: dto.internalVoucherNo ?? `PINV-${Date.now().toString().slice(-6)}`,
          supplierId: supplier.id,
          goodsReceiptId: dto.goodsReceiptId ?? null,
          invoiceDate: new Date(dto.invoiceDate),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          taxableAmount: prepared.taxableAmount,
          taxTotal: prepared.taxTotal,
          grandTotal: prepared.grandTotal,
          status: 'draft',
          remarks: dto.remarks ?? null,
        },
      });

      await tx.purchaseInvoiceItem.createMany({
        data: prepared.lines.map((line) => ({
          organizationId: actor.organizationId,
          purchaseInvoiceId: inv.id,
          goodsReceiptItemId: line.goodsReceiptItemId ?? null,
          variantId: line.variantId,
          billedQty: line.billedQty,
          unitCost: line.unitCost,
          taxAmount: line.taxAmount,
        })),
      });

      return inv;
    });

    return this.findOne(actor, created.id);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdatePurchaseInvoiceDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoice = await this.getInvoiceOrThrow(actor.organizationId, id);
    if (invoice.status !== 'draft') {
      throw new ConflictException('Only draft purchase invoices can be updated');
    }

    const supplierId = dto.supplierId ?? invoice.supplierId;
    const supplier = await this.getSupplierOrThrow(actor.organizationId, supplierId);

    const goodsReceiptId = dto.goodsReceiptId !== undefined ? dto.goodsReceiptId : invoice.goodsReceiptId;
    if (goodsReceiptId) {
      const grn = await this.prisma.goodsReceipt.findFirst({
        where: { organizationId: actor.organizationId, id: goodsReceiptId },
      });
      if (!grn) throw new NotFoundException('Goods receipt not found');
      if (grn.supplierId !== supplier.id) {
        throw new BadRequestException('Goods receipt supplier does not match invoice supplier');
      }
    }

    const baseUpdate: Prisma.PurchaseInvoiceUpdateInput = {
      invoiceNo: dto.invoiceNo !== undefined ? dto.invoiceNo.trim() : invoice.invoiceNo,
      internalVoucherNo: dto.internalVoucherNo !== undefined ? dto.internalVoucherNo : invoice.internalVoucherNo,
      supplierId: supplier.id,
      goodsReceiptId: goodsReceiptId ?? null,
      invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : invoice.invoiceDate,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : invoice.dueDate,
      remarks: dto.remarks !== undefined ? dto.remarks : invoice.remarks,
    };

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.items && dto.items.length > 0) {
        const prepared = await this.prepareItems(actor.organizationId, dto.items);
        baseUpdate.taxableAmount = prepared.taxableAmount;
        baseUpdate.taxTotal = prepared.taxTotal;
        baseUpdate.grandTotal = prepared.grandTotal;

        await tx.purchaseInvoiceItem.deleteMany({ where: { purchaseInvoiceId: id } });
        await tx.purchaseInvoiceItem.createMany({
          data: prepared.lines.map((line) => ({
            organizationId: actor.organizationId,
            purchaseInvoiceId: id,
            goodsReceiptItemId: line.goodsReceiptItemId ?? null,
            variantId: line.variantId,
            billedQty: line.billedQty,
            unitCost: line.unitCost,
            taxAmount: line.taxAmount,
          })),
        });
      }

      return tx.purchaseInvoice.update({
        where: { id },
        data: baseUpdate,
      });
    });

    return this.findOne(actor, result.id);
  }

  async approve(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoice = await this.getInvoiceOrThrow(actor.organizationId, id);
    if (invoice.status === 'posted' || invoice.status === 'approved') {
      throw new ConflictException('Purchase invoice already approved or posted');
    }
    if (invoice.status === 'cancelled') {
      throw new BadRequestException('Cancelled purchase invoice cannot be approved');
    }

    const updated = await this.prisma.purchaseInvoice.update({
      where: { id },
      data: { status: 'approved' },
    });

    return {
      success: true,
      message: 'Purchase invoice approved successfully',
      data: updated,
    };
  }

  async post(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const invoice = await this.getInvoiceOrThrow(actor.organizationId, id);
    if (invoice.status === 'posted') {
      throw new ConflictException('Purchase invoice already posted');
    }
    if (invoice.status === 'cancelled') {
      throw new BadRequestException('Cancelled purchase invoice cannot be posted');
    }

    const updated = await this.prisma.purchaseInvoice.update({
      where: { id },
      data: { status: 'posted' },
    });

    return this.findOne(actor, updated.id);
  }

  async export(actor: AuthenticatedUser, id: string, format: string) {
    const invoiceResponse = await this.findOne(actor, id);
    return {
      success: true,
      message: 'Purchase invoice export payload generated successfully',
      data: {
        format,
        fileName: `${invoiceResponse.data.invoiceNo}.${format === 'xlsx' ? 'xlsx' : format === 'print' ? 'html' : 'pdf'}`,
        purchaseInvoice: invoiceResponse.data,
      },
    };
  }

  private async prepareItems(organizationId: string, items: PurchaseInvoiceItemDto[]) {
    if (!items.length) {
      throw new BadRequestException('At least one purchase invoice item is required');
    }

    const variantIds = [...new Set(items.map((i) => i.variantId))];
    const variants = await this.prisma.productVariant.findMany({
      where: { organizationId, id: { in: variantIds } },
      select: { id: true },
    });
    if (variants.length !== variantIds.length) {
      throw new BadRequestException('One or more invoice variants are invalid');
    }

    let taxableAmount = 0;
    let taxTotal = 0;
    const lines = items.map((item) => {
      if (item.billedQty <= 0) {
        throw new BadRequestException('Billed quantity must be greater than zero');
      }
      const billedQty = this.roundQty(item.billedQty);
      const unitCost = this.roundMoney(item.unitCost);
      const lineBase = this.roundMoney(billedQty * unitCost);
      const taxAmount = this.roundMoney(item.taxAmount ?? 0);
      const lineTotal = this.roundMoney(lineBase + taxAmount);

      taxableAmount = this.roundMoney(taxableAmount + lineBase);
      taxTotal = this.roundMoney(taxTotal + taxAmount);

      return {
        goodsReceiptItemId: item.goodsReceiptItemId ?? null,
        variantId: item.variantId,
        billedQty,
        unitCost,
        taxAmount,
        lineTotal,
      };
    });

    const grandTotal = this.roundMoney(taxableAmount + taxTotal);
    return { lines, taxableAmount, taxTotal, grandTotal };
  }

  private async enrichInvoices(organizationId: string, invoices: PurchaseInvoice[]) {
    const supplierIds = [...new Set(invoices.map((inv) => inv.supplierId))];
    const grnIds = [...new Set(invoices.map((inv) => inv.goodsReceiptId).filter((v): v is string => Boolean(v)))];

    const [suppliers, grns] = await Promise.all([
      supplierIds.length
        ? this.prisma.supplier.findMany({
            where: { organizationId, id: { in: supplierIds } },
            select: { id: true, supplierCode: true, name: true },
          })
        : [],
      grnIds.length
        ? this.prisma.goodsReceipt.findMany({
            where: { organizationId, id: { in: grnIds } },
            select: { id: true, grnNo: true, receiptDate: true, status: true },
          })
        : [],
    ]);

    const supplierMap = new Map<string, any>(suppliers.map((s): [string, any] => [s.id, s]));
    const grnMap = new Map<string, any>(grns.map((g): [string, any] => [g.id, g]));

    return invoices.map((inv) => ({
      ...inv,
      taxableAmount: this.toNumber(inv.taxableAmount),
      taxTotal: this.toNumber(inv.taxTotal),
      grandTotal: this.toNumber(inv.grandTotal),
      supplier: supplierMap.get(inv.supplierId) ?? null,
      goodsReceipt: inv.goodsReceiptId ? grnMap.get(inv.goodsReceiptId) ?? null : null,
    }));
  }

  private async enrichItems(organizationId: string, items: PurchaseInvoiceItem[]) {
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
    const variantMap = new Map<string, any>(variants.map((v): [string, any] => [v.id, v]));

    return items.map((item) => ({
      ...item,
      billedQty: this.toNumber(item.billedQty),
      unitCost: this.toNumber(item.unitCost),
      taxAmount: this.toNumber(item.taxAmount),
      lineTotal: this.roundMoney(this.toNumber(item.billedQty) * this.toNumber(item.unitCost) + this.toNumber(item.taxAmount)),
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

  private async getInvoiceOrThrow(organizationId: string, id: string) {
    const invoice = await this.prisma.purchaseInvoice.findFirst({
      where: { organizationId, id },
    });
    if (!invoice) throw new NotFoundException('Purchase invoice not found');
    return invoice;
  }

  private async getSupplierOrThrow(organizationId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { organizationId, id: supplierId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      throw new ForbiddenException('Retailer users cannot access purchase invoices');
    }
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private roundMoney(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  private roundQty(val: number): number {
    return Math.round((val + Number.EPSILON) * 1000) / 1000;
  }
}
