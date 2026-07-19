import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeliveryCycleDto, QueryDeliveryCyclesDto, UpdateCutoffRulesDto, UpdateDeliveryCycleDto } from './dto';

@Injectable()
export class DeliveryCyclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateDeliveryCycleDto) {
    this.assertAuthenticated(actor);

    const existing = await this.prisma.deliveryCycle.findFirst({
      where: { organizationId: actor.organizationId, cycleCode: dto.cycleCode },
      select: { id: true, cycleCode: true },
    });

    if (existing) {
      throw new ConflictException(`Delivery cycle with code ${dto.cycleCode} already exists`);
    }

    const created = await this.prisma.deliveryCycle.create({
      data: {
        organizationId: actor.organizationId,
        cycleCode: dto.cycleCode,
        orderDate: new Date(dto.orderDate),
        deliveryDate: new Date(dto.deliveryDate),
        deliveryShift: dto.deliveryShift,
        cutoffAt: new Date(dto.cutoffAt),
        status: dto.status ?? 'active',
      },
    });

    return {
      success: true,
      message: `Delivery cycle ${created.cycleCode} configured successfully`,
      data: created,
    };
  }

  async findAll(actor: AuthenticatedUser, query: QueryDeliveryCyclesDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.DeliveryCycleWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.status) where.status = query.status;
    if (query.deliveryShift) where.deliveryShift = query.deliveryShift;
    if (query.search) {
      where.OR = [
        { cycleCode: { contains: query.search, mode: 'insensitive' } },
        { deliveryShift: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.deliveryCycle.findMany({
        where,
        orderBy: { deliveryDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deliveryCycle.count({ where }),
    ]);

    return {
      success: true,
      message: 'Delivery cycles fetched successfully',
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

    const row = await this.prisma.deliveryCycle.findFirst({
      where: { organizationId: actor.organizationId, id },
    });

    if (!row) throw new NotFoundException('Delivery cycle not found');

    return {
      success: true,
      message: 'Delivery cycle fetched successfully',
      data: row,
    };
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateDeliveryCycleDto) {
    this.assertAuthenticated(actor);

    const row = await this.prisma.deliveryCycle.findFirst({
      where: { organizationId: actor.organizationId, id },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Delivery cycle not found');

    const updated = await this.prisma.deliveryCycle.update({
      where: { id },
      data: {
        ...(dto.cutoffAt !== undefined ? { cutoffAt: new Date(dto.cutoffAt) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });

    return {
      success: true,
      message: `Delivery cycle ${updated.cycleCode} updated successfully`,
      data: updated,
    };
  }

  async getCutoffRules(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);

    const row = await this.prisma.systemSetting.findFirst({
      where: { organizationId: actor.organizationId, settingGroup: 'cutoff_rules', settingKey: 'default_shifts' },
    });

    let rules = {
      morningCutoffHour: 20,
      morningCutoffMinute: 0,
      eveningCutoffHour: 11,
      eveningCutoffMinute: 30,
    };

    if (row && row.valueJson) {
      try {
        rules = typeof row.valueJson === 'string' ? JSON.parse(row.valueJson) : (row.valueJson as any);
      } catch {}
    }

    return {
      success: true,
      message: 'Cutoff rules fetched successfully',
      data: rules,
    };
  }

  async updateCutoffRules(actor: AuthenticatedUser, dto: UpdateCutoffRulesDto) {
    this.assertAuthenticated(actor);

    const existing = await this.prisma.systemSetting.findFirst({
      where: { organizationId: actor.organizationId, settingGroup: 'cutoff_rules', settingKey: 'default_shifts' },
    });

    if (existing) {
      await this.prisma.systemSetting.update({
        where: { id: existing.id },
        data: { valueJson: (dto as unknown) as Prisma.InputJsonValue },
      });
    } else {
      await this.prisma.systemSetting.create({
        data: {
          organizationId: actor.organizationId,
          settingGroup: 'cutoff_rules',
          settingKey: 'default_shifts',
          valueJson: (dto as unknown) as Prisma.InputJsonValue,
        },
      });
    }

    return {
      success: true,
      message: 'Order cutoff rules updated successfully',
      data: dto,
    };
  }

  async resolveDeliveryCycles(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);

    const now = new Date();
    const expiredCycles = await this.prisma.deliveryCycle.findMany({
      where: {
        organizationId: actor.organizationId,
        status: 'active',
        cutoffAt: { lte: now },
      },
    });

    if (expiredCycles.length) {
      await this.prisma.deliveryCycle.updateMany({
        where: { id: { in: expiredCycles.map((c) => c.id) } },
        data: { status: 'closed' },
      });
    }

    return {
      success: true,
      message: `Resolved ${expiredCycles.length} active delivery cycles past their order cutoff timestamp`,
      data: {
        resolvedCount: expiredCycles.length,
        closedCycles: expiredCycles.map((c) => c.cycleCode),
      },
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
