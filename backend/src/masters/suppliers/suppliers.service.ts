import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto, QuerySuppliersDto, UpdateSupplierDto } from './dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateSupplierDto) {
    this.assertAuthenticated(actor);

    const existing = await this.prisma.supplier.findFirst({
      where: {
        organizationId: actor.organizationId,
        supplierCode: dto.supplierCode,
      },
      select: { id: true, supplierCode: true },
    });

    if (existing) {
      throw new ConflictException(`Supplier with code ${dto.supplierCode} already exists`);
    }

    const created = await this.prisma.supplier.create({
      data: {
        organizationId: actor.organizationId,
        supplierCode: dto.supplierCode,
        name: dto.name,
        contactPerson: dto.contactPerson ?? null,
        mobile: dto.mobile ?? null,
        email: dto.email ?? null,
        gstin: dto.gstin ?? null,
        pan: dto.pan ?? null,
        paymentTermsDays: dto.paymentTermsDays ?? 15,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      success: true,
      message: `Supplier ${created.name} created successfully`,
      data: created,
    };
  }

  async findAll(actor: AuthenticatedUser, query: QuerySuppliersDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.SupplierWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { supplierCode: { contains: query.search, mode: 'insensitive' } },
        { mobile: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      success: true,
      message: 'Suppliers fetched successfully',
      data: rows,
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

    const row = await this.prisma.supplier.findFirst({
      where: { organizationId: actor.organizationId, id },
    });

    if (!row) throw new NotFoundException('Supplier not found');

    return {
      success: true,
      message: 'Supplier fetched successfully',
      data: row,
    };
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateSupplierDto) {
    this.assertAuthenticated(actor);

    const row = await this.prisma.supplier.findFirst({
      where: { organizationId: actor.organizationId, id },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Supplier not found');

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.contactPerson !== undefined ? { contactPerson: dto.contactPerson } : {}),
        ...(dto.mobile !== undefined ? { mobile: dto.mobile } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.gstin !== undefined ? { gstin: dto.gstin } : {}),
        ...(dto.pan !== undefined ? { pan: dto.pan } : {}),
        ...(dto.paymentTermsDays !== undefined ? { paymentTermsDays: dto.paymentTermsDays } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return {
      success: true,
      message: `Supplier ${updated.name} updated successfully`,
      data: updated,
    };
  }

  async getLedgerSummary(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);

    const supplier = await this.prisma.supplier.findFirst({
      where: { organizationId: actor.organizationId, id },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const invoices = await this.prisma.purchaseInvoice.findMany({
      where: { organizationId: actor.organizationId, supplierId: id, status: { not: 'cancelled' } },
      select: { grandTotal: true },
    });

    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.grandTotal || 0), 0);

    return {
      success: true,
      message: 'Supplier ledger summary fetched successfully',
      data: {
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalInvoiced,
        totalPaid: totalInvoiced,
        currentOutstanding: 0,
      },
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
