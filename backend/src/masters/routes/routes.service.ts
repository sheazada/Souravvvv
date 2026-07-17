import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRouteDto, QueryRoutesDto, UpdateRouteDto } from './dto';

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateRouteDto) {
    this.assertAuthenticated(actor);

    const existing = await this.prisma.route.findFirst({
      where: { organizationId: actor.organizationId, code: dto.code },
      select: { id: true, code: true },
    });

    if (existing) {
      throw new ConflictException(`Route with code ${dto.code} already exists`);
    }

    const created = await this.prisma.route.create({
      data: {
        organizationId: actor.organizationId,
        code: dto.code,
        name: dto.name,
        areaId: dto.areaId ?? null,
        deliveryShift: dto.deliveryShift ?? 'morning',
        defaultCutoffTime: dto.defaultCutoffTime ?? '20:00',
        isActive: dto.isActive ?? true,
      },
    });

    return {
      success: true,
      message: `Route ${created.name} created successfully`,
      data: created,
    };
  }

  async findAll(actor: AuthenticatedUser, query: QueryRoutesDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.RouteWhereInput = {
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
      this.prisma.route.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.route.count({ where }),
    ]);

    return {
      success: true,
      message: 'Routes fetched successfully',
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

    const row = await this.prisma.route.findFirst({
      where: { organizationId: actor.organizationId, id },
    });

    if (!row) throw new NotFoundException('Route not found');

    return {
      success: true,
      message: 'Route fetched successfully',
      data: row,
    };
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateRouteDto) {
    this.assertAuthenticated(actor);

    const row = await this.prisma.route.findFirst({
      where: { organizationId: actor.organizationId, id },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Route not found');

    const updated = await this.prisma.route.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.areaId !== undefined ? { areaId: dto.areaId } : {}),
        ...(dto.deliveryShift !== undefined ? { deliveryShift: dto.deliveryShift } : {}),
        ...(dto.defaultCutoffTime !== undefined ? { defaultCutoffTime: dto.defaultCutoffTime } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return {
      success: true,
      message: `Route ${updated.name} updated successfully`,
      data: updated,
    };
  }

  async getRetailers(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);

    const retailers = await this.prisma.retailer.findMany({
      where: { organizationId: actor.organizationId, assignedRouteId: id },
      orderBy: { shopName: 'asc' },
    });

    return {
      success: true,
      message: 'Route retailers fetched successfully',
      data: retailers,
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
