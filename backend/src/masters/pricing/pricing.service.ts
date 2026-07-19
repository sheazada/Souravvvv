import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePriceBookDto, CreatePromotionDto, PricingPreviewDto, QueryPricingDto } from './dto';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async createPriceBook(actor: AuthenticatedUser, dto: CreatePriceBookDto) {
    this.assertAuthenticated(actor);

    const existing = await this.prisma.priceBook.findFirst({
      where: { organizationId: actor.organizationId, code: dto.code },
      select: { id: true, code: true },
    });

    if (existing) {
      throw new ConflictException(`Price book with code ${dto.code} already exists`);
    }

    const created = await this.prisma.priceBook.create({
      data: {
        organizationId: actor.organizationId,
        code: dto.code,
        name: dto.name,
        scopeType: dto.bookType ?? 'default',
        priority: 0,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: dto.isActive ?? true,
      },
    });

    return {
      success: true,
      message: `Price book ${created.name} created successfully`,
      data: created,
    };
  }

  async findAllPriceBooks(actor: AuthenticatedUser, query: QueryPricingDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.PriceBookWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.priceBook.findMany({
        where,
        include: { items: true },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.priceBook.count({ where }),
    ]);

    return {
      success: true,
      message: 'Price books fetched successfully',
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOnePriceBook(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);

    const row = await this.prisma.priceBook.findFirst({
      where: { organizationId: actor.organizationId, id },
      include: { items: true, assignments: true },
    });

    if (!row) throw new NotFoundException('Price book not found');

    return {
      success: true,
      message: 'Price book fetched successfully',
      data: row,
    };
  }

  async createPromotion(actor: AuthenticatedUser, dto: CreatePromotionDto) {
    this.assertAuthenticated(actor);

    const existing = await this.prisma.promotion.findFirst({
      where: { organizationId: actor.organizationId, code: dto.code },
      select: { id: true, code: true },
    });

    if (existing) {
      throw new ConflictException(`Promotion with code ${dto.code} already exists`);
    }

    const created = await this.prisma.promotion.create({
      data: {
        organizationId: actor.organizationId,
        code: dto.code,
        name: dto.name,
        promoType: dto.discountType,
        conditionsJson: { discountType: dto.discountType, discountValue: dto.discountValue } as Prisma.InputJsonValue,
        benefitsJson: { discountValue: dto.discountValue } as Prisma.InputJsonValue,
        validFrom: dto.startDate ? new Date(dto.startDate) : new Date(),
        validTo: dto.endDate ? new Date(dto.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: dto.isActive ?? true,
      },
    });

    return {
      success: true,
      message: `Promotion ${created.name} created successfully`,
      data: created,
    };
  }

  async findAllPromotions(actor: AuthenticatedUser, query: QueryPricingDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.PromotionWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.promotion.count({ where }),
    ]);

    return {
      success: true,
      message: 'Promotions fetched successfully',
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async previewPricing(actor: AuthenticatedUser, dto: PricingPreviewDto) {
    this.assertAuthenticated(actor);

    const variant = await this.prisma.productVariant.findFirst({
      where: { organizationId: actor.organizationId, id: dto.variantId },
    });
    if (!variant) throw new NotFoundException('Product variant not found');

    const basePrice = Number(variant.offerPrice || 25);
    const qty = Number(dto.qty || 1);
    let effectivePrice = basePrice;
    let appliedDiscount = 0;
    let appliedPromoName = 'Standard Base Price';

    // Check if retailer has an assigned PriceBook item
    const assignment = await this.prisma.priceBookAssignment.findFirst({
      where: { organizationId: actor.organizationId, retailerId: dto.retailerId },
      include: { priceBook: { include: { items: { where: { variantId: dto.variantId } } } } },
    });

    if (assignment && assignment.priceBook?.items?.[0]) {
      effectivePrice = Number(assignment.priceBook.items[0].offerPrice || assignment.priceBook.items[0].basePrice);
      appliedPromoName = `PriceBook: ${assignment.priceBook.name}`;
    }

    // Check for active percentage promotion
    const activePromo = await this.prisma.promotion.findFirst({
      where: { organizationId: actor.organizationId, isActive: true },
    });

    if (activePromo && activePromo.promoType === 'percentage_off' && activePromo.benefitsJson) {
      const discountValue = Number((activePromo.benefitsJson as any)?.discountValue || 5);
      appliedDiscount = Math.round(effectivePrice * (discountValue / 100) * 100) / 100;
      effectivePrice = Math.max(0, effectivePrice - appliedDiscount);
      appliedPromoName += ` + Promo (${activePromo.name}: ${discountValue}% off)`;
    }

    const lineTotal = Math.round(qty * effectivePrice * 100) / 100;

    return {
      success: true,
      message: 'Pricing preview calculated successfully',
      data: {
        variantId: dto.variantId,
        retailerId: dto.retailerId,
        qty,
        basePrice,
        effectivePrice,
        appliedDiscount,
        appliedPromoName,
        lineTotal,
      },
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
