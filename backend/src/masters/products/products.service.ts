import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProductDto,
  CreateProductVariantDto,
  QueryProductsDto,
  UpdateProductDto,
  UpdateProductStatusDto,
  UpdateProductVariantDto,
  UpdateProductVariantStatusDto,
} from './dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateProductDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.validateProductLookupReferences(actor.organizationId, dto);

    const duplicate = await this.prisma.product.findFirst({
      where: {
        organizationId: actor.organizationId,
        productCode: dto.productCode,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Product with same code already exists');
    }

    const product = await this.prisma.product.create({
      data: this.buildProductCreateData(actor.organizationId, dto),
      include: this.productDetailInclude(),
    });

    return {
      success: true,
      message: 'Product created successfully',
      data: this.serializeProduct(product),
    };
  }

  async findAll(actor: AuthenticatedUser, query: QueryProductsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ProductWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.brandId) where.brandId = query.brandId;
    if (query.availableOnly === 'true') where.status = 'active';
    if (query.search) {
      where.OR = [
        { productCode: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { brand: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
        { category: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
        { taxCode: { is: { code: { contains: query.search, mode: 'insensitive' } } } },
        { defaultCrateType: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: this.productListInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      success: true,
      message: 'Products fetched successfully',
      data: rows.map((row) => this.serializeProduct(row)),
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

    const product = await this.getProductOrThrow(actor.organizationId, id);

    return {
      success: true,
      message: 'Product fetched successfully',
      data: this.serializeProduct(product),
    };
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateProductDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getProductOrThrow(actor.organizationId, id);
    await this.validateProductLookupReferences(actor.organizationId, dto);

    if (dto.productCode) {
      const duplicate = await this.prisma.product.findFirst({
        where: {
          organizationId: actor.organizationId,
          id: { not: id },
          productCode: dto.productCode,
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException('Another product already uses the same code');
      }
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: this.buildProductUpdateData(dto),
      include: this.productDetailInclude(),
    });

    return {
      success: true,
      message: 'Product updated successfully',
      data: this.serializeProduct(product),
    };
  }

  async updateStatus(actor: AuthenticatedUser, id: string, dto: UpdateProductStatusDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getProductOrThrow(actor.organizationId, id);

    const product = await this.prisma.product.update({
      where: { id },
      data: { status: dto.status },
      include: this.productDetailInclude(),
    });

    return {
      success: true,
      message: 'Product status updated successfully',
      data: this.serializeProduct(product),
    };
  }

  async getVariants(actor: AuthenticatedUser, productId: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getProductOrThrow(actor.organizationId, productId);

    const variants = await this.prisma.productVariant.findMany({
      where: {
        organizationId: actor.organizationId,
        productId,
      },
      include: this.variantDetailInclude(),
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      message: 'Product variants fetched successfully',
      data: variants.map((row) => this.serializeVariant(row)),
    };
  }

  async createVariant(actor: AuthenticatedUser, productId: string, dto: CreateProductVariantDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    if (dto.productId !== productId) {
      throw new ConflictException('Variant product must match requested product');
    }

    await this.getProductOrThrow(actor.organizationId, productId);
    await this.validateVariantLookupReferences(actor.organizationId, dto);

    const duplicate = await this.prisma.productVariant.findFirst({
      where: {
        organizationId: actor.organizationId,
        sku: dto.sku,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Product variant with same SKU already exists');
    }

    const variant = await this.prisma.productVariant.create({
      data: this.buildVariantCreateData(actor.organizationId, productId, dto),
      include: this.variantDetailInclude(),
    });

    return {
      success: true,
      message: 'Product variant created successfully',
      data: this.serializeVariant(variant),
    };
  }

  async getVariantById(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const variant = await this.getVariantOrThrow(actor.organizationId, id);

    return {
      success: true,
      message: 'Product variant fetched successfully',
      data: this.serializeVariant(variant),
    };
  }

  async updateVariant(actor: AuthenticatedUser, id: string, dto: UpdateProductVariantDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const existing = await this.getVariantOrThrow(actor.organizationId, id);

    if (dto.productId && dto.productId !== existing.productId) {
      throw new ConflictException('Product variant cannot be moved to another product in this flow');
    }

    await this.validateVariantLookupReferences(actor.organizationId, dto);

    if (dto.sku) {
      const duplicate = await this.prisma.productVariant.findFirst({
        where: {
          organizationId: actor.organizationId,
          id: { not: id },
          sku: dto.sku,
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException('Another product variant already uses the same SKU');
      }
    }

    const variant = await this.prisma.productVariant.update({
      where: { id },
      data: this.buildVariantUpdateData(dto),
      include: this.variantDetailInclude(),
    });

    return {
      success: true,
      message: 'Product variant updated successfully',
      data: this.serializeVariant(variant),
    };
  }

  async updateVariantStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateProductVariantStatusDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    await this.getVariantOrThrow(actor.organizationId, id);

    const variant = await this.prisma.productVariant.update({
      where: { id },
      data: { status: dto.status },
      include: this.variantDetailInclude(),
    });

    return {
      success: true,
      message: 'Product variant status updated successfully',
      data: this.serializeVariant(variant),
    };
  }

  private async getProductOrThrow(organizationId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        organizationId,
        id,
      },
      include: this.productDetailInclude(),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async getVariantOrThrow(organizationId: string, id: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        organizationId,
        id,
      },
      include: this.variantDetailInclude(),
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    return variant;
  }

  private productListInclude() {
    return {
      brand: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          parentId: true,
          isActive: true,
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      taxCode: {
        select: {
          id: true,
          code: true,
          hsnCode: true,
          gstRate: true,
          cgstRate: true,
          sgstRate: true,
          igstRate: true,
          isActive: true,
        },
      },
      defaultCrateType: {
        select: {
          id: true,
          code: true,
          name: true,
          capacityUnits: true,
          depositValue: true,
          isActive: true,
        },
      },
    };
  }

  private productDetailInclude() {
    return {
      ...this.productListInclude(),
      variants: {
        include: this.variantDetailInclude(),
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private variantDetailInclude() {
    return {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
      unit: {
        select: {
          id: true,
          code: true,
          name: true,
          decimalPlaces: true,
        },
      },
    };
  }

  private buildProductCreateData(
    organizationId: string,
    dto: CreateProductDto,
  ): Prisma.ProductUncheckedCreateInput {
    return {
      organizationId,
      productCode: dto.productCode,
      name: dto.name,
      brandId: this.normalizeOptionalLookupId(dto.brandId),
      categoryId: this.normalizeOptionalLookupId(dto.categoryId),
      description: dto.description,
      taxCodeId: this.normalizeOptionalLookupId(dto.taxCodeId),
      isBatchTracked: dto.isBatchTracked ?? false,
      isExpiryTracked: dto.isExpiryTracked ?? false,
      isReturnable: dto.isReturnable ?? true,
      defaultCrateTypeId: this.normalizeOptionalLookupId(dto.defaultCrateTypeId),
      status: dto.status ?? 'active',
    };
  }

  private buildProductUpdateData(dto: UpdateProductDto): Prisma.ProductUncheckedUpdateInput {
    const data: Prisma.ProductUncheckedUpdateInput = {};

    if (this.hasOwn(dto, 'productCode')) data.productCode = dto.productCode;
    if (this.hasOwn(dto, 'name')) data.name = dto.name;
    if (this.hasOwn(dto, 'brandId')) data.brandId = this.normalizeOptionalLookupId(dto.brandId);
    if (this.hasOwn(dto, 'categoryId')) data.categoryId = this.normalizeOptionalLookupId(dto.categoryId);
    if (this.hasOwn(dto, 'description')) data.description = dto.description ?? null;
    if (this.hasOwn(dto, 'taxCodeId')) data.taxCodeId = this.normalizeOptionalLookupId(dto.taxCodeId);
    if (this.hasOwn(dto, 'isBatchTracked')) data.isBatchTracked = dto.isBatchTracked;
    if (this.hasOwn(dto, 'isExpiryTracked')) data.isExpiryTracked = dto.isExpiryTracked;
    if (this.hasOwn(dto, 'isReturnable')) data.isReturnable = dto.isReturnable;
    if (this.hasOwn(dto, 'defaultCrateTypeId')) {
      data.defaultCrateTypeId = this.normalizeOptionalLookupId(dto.defaultCrateTypeId);
    }
    if (this.hasOwn(dto, 'status')) data.status = dto.status;

    return data;
  }

  private buildVariantCreateData(
    organizationId: string,
    productId: string,
    dto: CreateProductVariantDto,
  ): Prisma.ProductVariantUncheckedCreateInput {
    return {
      organizationId,
      productId,
      sku: dto.sku,
      variantName: dto.variantName,
      sizeValue: dto.sizeValue,
      unitId: this.normalizeOptionalLookupId(dto.unitId),
      barcode: dto.barcode,
      mrp: dto.mrp,
      distributorPrice: dto.distributorPrice,
      defaultRetailerPrice: dto.defaultRetailerPrice,
      offerPrice: dto.offerPrice,
      status: dto.status ?? 'active',
    };
  }

  private buildVariantUpdateData(dto: UpdateProductVariantDto): Prisma.ProductVariantUncheckedUpdateInput {
    const data: Prisma.ProductVariantUncheckedUpdateInput = {};

    if (this.hasOwn(dto, 'sku')) data.sku = dto.sku;
    if (this.hasOwn(dto, 'variantName')) data.variantName = dto.variantName ?? null;
    if (this.hasOwn(dto, 'sizeValue')) data.sizeValue = dto.sizeValue ?? null;
    if (this.hasOwn(dto, 'unitId')) data.unitId = this.normalizeOptionalLookupId(dto.unitId);
    if (this.hasOwn(dto, 'barcode')) data.barcode = dto.barcode ?? null;
    if (this.hasOwn(dto, 'mrp')) data.mrp = dto.mrp;
    if (this.hasOwn(dto, 'distributorPrice')) data.distributorPrice = dto.distributorPrice;
    if (this.hasOwn(dto, 'defaultRetailerPrice')) {
      data.defaultRetailerPrice = dto.defaultRetailerPrice;
    }
    if (this.hasOwn(dto, 'offerPrice')) data.offerPrice = dto.offerPrice ?? null;
    if (this.hasOwn(dto, 'status')) data.status = dto.status;

    return data;
  }

  private async validateProductLookupReferences(
    organizationId: string,
    dto: Pick<CreateProductDto | UpdateProductDto, 'brandId' | 'categoryId' | 'taxCodeId' | 'defaultCrateTypeId'>,
  ) {
    await Promise.all([
      this.assertLookupExists(
        dto.brandId,
        (id) => this.prisma.brand.findFirst({ where: { organizationId, id }, select: { id: true } }),
        'Brand not found',
      ),
      this.assertLookupExists(
        dto.categoryId,
        (id) =>
          this.prisma.productCategory.findFirst({
            where: { organizationId, id },
            select: { id: true },
          }),
        'Product category not found',
      ),
      this.assertLookupExists(
        dto.taxCodeId,
        (id) => this.prisma.taxCode.findFirst({ where: { organizationId, id }, select: { id: true } }),
        'Tax code not found',
      ),
      this.assertLookupExists(
        dto.defaultCrateTypeId,
        (id) => this.prisma.crateType.findFirst({ where: { organizationId, id }, select: { id: true } }),
        'Default crate type not found',
      ),
    ]);
  }

  private async validateVariantLookupReferences(
    organizationId: string,
    dto: Pick<CreateProductVariantDto | UpdateProductVariantDto, 'unitId'>,
  ) {
    await this.assertLookupExists(
      dto.unitId,
      (id) => this.prisma.unit.findFirst({ where: { organizationId, id }, select: { id: true } }),
      'Unit not found',
    );
  }

  private async assertLookupExists(
    value: string | null | undefined,
    loader: (id: string) => Promise<{ id: string } | null>,
    message: string,
  ) {
    const normalized = this.normalizeOptionalLookupId(value);
    if (!normalized) return;

    const row = await loader(normalized);
    if (!row) {
      throw new NotFoundException(message);
    }
  }

  private normalizeOptionalLookupId(value: string | null | undefined) {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
  }

  private hasOwn<T extends object>(value: T, key: keyof any) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  private serializeProduct(product: any) {
    return {
      ...product,
      brand: this.serializeBrand(product.brand),
      category: this.serializeCategory(product.category),
      taxCode: this.serializeTaxCode(product.taxCode),
      defaultCrateType: this.serializeCrateType(product.defaultCrateType),
      variants: Array.isArray(product.variants)
        ? product.variants.map((variant: any) => this.serializeVariant(variant))
        : product.variants,
    };
  }

  private serializeVariant(variant: any) {
    return {
      ...variant,
      sizeValue: this.toNumberOrNull(variant.sizeValue),
      mrp: this.toNumber(variant.mrp),
      distributorPrice: this.toNumber(variant.distributorPrice),
      defaultRetailerPrice: this.toNumber(variant.defaultRetailerPrice),
      offerPrice: this.toNumberOrNull(variant.offerPrice),
      unit: this.serializeUnit(variant.unit),
    };
  }

  private serializeBrand(brand: any) {
    if (!brand) return brand;
    return {
      ...brand,
    };
  }

  private serializeCategory(category: any) {
    if (!category) return category;
    return {
      ...category,
      parent: category.parent
        ? {
            ...category.parent,
          }
        : category.parent,
    };
  }

  private serializeTaxCode(taxCode: any) {
    if (!taxCode) return taxCode;
    return {
      ...taxCode,
      gstRate: this.toNumber(taxCode.gstRate),
      cgstRate: this.toNumberOrNull(taxCode.cgstRate),
      sgstRate: this.toNumberOrNull(taxCode.sgstRate),
      igstRate: this.toNumberOrNull(taxCode.igstRate),
    };
  }

  private serializeCrateType(crateType: any) {
    if (!crateType) return crateType;
    return {
      ...crateType,
      depositValue: this.toNumberOrNull(crateType.depositValue),
    };
  }

  private serializeUnit(unit: any) {
    if (!unit) return unit;
    return {
      ...unit,
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
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

  private toNumberOrNull(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) return null;
    return Number(value);
  }
}
