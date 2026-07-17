import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAreaDto, QueryAreasDto, UpdateAreaDto } from './dto';

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateAreaDto) {
    this.assertAuthenticated(actor);

    const existing = await this.prisma.area.findFirst({
      where: { organizationId: actor.organizationId, code: dto.code },
      select: { id: true, code: true },
    });

    if (existing) {
      throw new ConflictException(`Area with code ${dto.code} already exists`);
    }

    const created = await this.prisma.area.create({
      data: {
        organizationId: actor.organizationId,
        code: dto.code,
        name: dto.name,
        city: dto.city ?? 'Patna',
        state: dto.state ?? 'Bihar',
        isActive: dto.isActive ?? true,
      },
    });

    return {
      success: true,
      message: `Area ${created.name} added successfully`,
      data: created,
    };
  }

  async findAll(actor: AuthenticatedUser, query: QueryAreasDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.AreaWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.area.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.area.count({ where }),
    ]);

    return {
      success: true,
      message: 'Areas fetched successfully',
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

    const row = await this.prisma.area.findFirst({
      where: { organizationId: actor.organizationId, id },
    });

    if (!row) throw new NotFoundException('Area not found');

    return {
      success: true,
      message: 'Area fetched successfully',
      data: row,
    };
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateAreaDto) {
    this.assertAuthenticated(actor);

    const row = await this.prisma.area.findFirst({
      where: { organizationId: actor.organizationId, id },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Area not found');

    const updated = await this.prisma.area.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return {
      success: true,
      message: `Area ${updated.name} updated successfully`,
      data: updated,
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
