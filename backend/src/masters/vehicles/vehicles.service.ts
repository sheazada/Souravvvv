import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto, QueryVehiclesDto, UpdateVehicleDto } from './dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateVehicleDto) {
    this.assertAuthenticated(actor);

    const existing = await this.prisma.vehicle.findFirst({
      where: { organizationId: actor.organizationId, vehicleNo: dto.vehicleNo },
      select: { id: true, vehicleNo: true },
    });

    if (existing) {
      throw new ConflictException(`Vehicle with number ${dto.vehicleNo} already exists`);
    }

    const created = await this.prisma.vehicle.create({
      data: {
        organizationId: actor.organizationId,
        vehicleNo: dto.vehicleNo,
        vehicleType: dto.vehicleType ?? 'Insulated Van',
        capacityCrates: dto.capacityCrates ?? 150,
        capacityWeightKg: dto.capacityWeightKg ?? 1500,
        fuelType: dto.fuelType ?? 'Diesel',
        ownershipType: dto.ownershipType ?? 'Owned',
        driverEmployeeId: dto.driverEmployeeId ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      success: true,
      message: `Vehicle ${created.vehicleNo} added successfully`,
      data: created,
    };
  }

  async findAll(actor: AuthenticatedUser, query: QueryVehiclesDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.VehicleWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { vehicleNo: { contains: query.search, mode: 'insensitive' } },
        { vehicleType: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        orderBy: { vehicleNo: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      success: true,
      message: 'Vehicles fetched successfully',
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

    const row = await this.prisma.vehicle.findFirst({
      where: { organizationId: actor.organizationId, id },
    });

    if (!row) throw new NotFoundException('Vehicle not found');

    return {
      success: true,
      message: 'Vehicle fetched successfully',
      data: row,
    };
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateVehicleDto) {
    this.assertAuthenticated(actor);

    const row = await this.prisma.vehicle.findFirst({
      where: { organizationId: actor.organizationId, id },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Vehicle not found');

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(dto.vehicleType !== undefined ? { vehicleType: dto.vehicleType } : {}),
        ...(dto.capacityCrates !== undefined ? { capacityCrates: dto.capacityCrates } : {}),
        ...(dto.capacityWeightKg !== undefined ? { capacityWeightKg: dto.capacityWeightKg } : {}),
        ...(dto.fuelType !== undefined ? { fuelType: dto.fuelType } : {}),
        ...(dto.ownershipType !== undefined ? { ownershipType: dto.ownershipType } : {}),
        ...(dto.driverEmployeeId !== undefined ? { driverEmployeeId: dto.driverEmployeeId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return {
      success: true,
      message: `Vehicle ${updated.vehicleNo} updated successfully`,
      data: updated,
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
