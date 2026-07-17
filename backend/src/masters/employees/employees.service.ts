import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto, QueryEmployeesDto, UpdateEmployeeDto } from './dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateEmployeeDto) {
    this.assertAuthenticated(actor);

    const existing = await this.prisma.employee.findFirst({
      where: { organizationId: actor.organizationId, employeeCode: dto.employeeCode },
      select: { id: true, employeeCode: true },
    });

    if (existing) {
      throw new ConflictException(`Employee with code ${dto.employeeCode} already exists`);
    }

    const created = await this.prisma.employee.create({
      data: {
        organizationId: actor.organizationId,
        employeeCode: dto.employeeCode,
        fullName: dto.fullName,
        designation: dto.designation ?? 'driver',
        mobile: dto.mobile ?? null,
        email: dto.email ?? null,
        drivingLicenseNo: dto.drivingLicenseNo ?? null,
        assignedRouteId: dto.assignedRouteId ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      success: true,
      message: `Employee ${created.fullName} added successfully`,
      data: created,
    };
  }

  async findAll(actor: AuthenticatedUser, query: QueryEmployeesDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.EmployeeWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { employeeCode: { contains: query.search, mode: 'insensitive' } },
        { mobile: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      success: true,
      message: 'Employees fetched successfully',
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

    const row = await this.prisma.employee.findFirst({
      where: { organizationId: actor.organizationId, id },
    });

    if (!row) throw new NotFoundException('Employee not found');

    return {
      success: true,
      message: 'Employee fetched successfully',
      data: row,
    };
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateEmployeeDto) {
    this.assertAuthenticated(actor);

    const row = await this.prisma.employee.findFirst({
      where: { organizationId: actor.organizationId, id },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Employee not found');

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.designation !== undefined ? { designation: dto.designation } : {}),
        ...(dto.mobile !== undefined ? { mobile: dto.mobile } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.drivingLicenseNo !== undefined ? { drivingLicenseNo: dto.drivingLicenseNo } : {}),
        ...(dto.assignedRouteId !== undefined ? { assignedRouteId: dto.assignedRouteId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return {
      success: true,
      message: `Employee ${updated.fullName} updated successfully`,
      data: updated,
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
