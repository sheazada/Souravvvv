import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateUserDto,
  QueryUsersDto,
  ResetUserPasswordDto,
  UpdateUserDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actor: AuthenticatedUser, query: QueryUsersDto) {
    this.assertAuthenticated(actor);
    this.assertBackofficeManager(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.UserWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.userType) where.userType = query.userType;
    if (query.status === 'true' || query.status === 'active') where.isActive = true;
    if (query.status === 'false' || query.status === 'inactive') where.isActive = false;

    if (query.roleCode) {
      where.userRoles = {
        some: {
          role: {
            code: query.roleCode,
          },
        },
      };
    }

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { mobile: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          fullName: true,
          mobile: true,
          email: true,
          userType: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: {
            select: {
              role: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      success: true,
      message: 'Users fetched successfully',
      data: rows.map((row) => ({
        ...row,
        roles: row.userRoles.map((ur) => ur.role),
      })),
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
    this.assertBackofficeManager(actor);

    const user = await this.prisma.user.findFirst({
      where: { organizationId: actor.organizationId, id },
      select: {
        id: true,
        fullName: true,
        mobile: true,
        email: true,
        userType: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      success: true,
      message: 'User detail fetched successfully',
      data: {
        ...user,
        roles: user.userRoles.map((ur) => ur.role),
      },
    };
  }

  async create(actor: AuthenticatedUser, dto: CreateUserDto) {
    this.assertAuthenticated(actor);
    this.assertBackofficeManager(actor);

    const existing = await this.prisma.user.findFirst({
      where: { organizationId: actor.organizationId, mobile: dto.mobile },
    });
    if (existing) {
      throw new ConflictException('User with this mobile number already exists');
    }

    const roles = await this.prisma.role.findMany({
      where: { organizationId: actor.organizationId, code: { in: dto.roleCodes } },
      select: { id: true, code: true },
    });
    if (roles.length !== new Set(dto.roleCodes).size) {
      throw new BadRequestException('One or more role codes are invalid');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organizationId: actor.organizationId,
          fullName: dto.fullName,
          mobile: dto.mobile,
          email: dto.email ?? null,
          passwordHash,
          userType: dto.userType,
          isActive: dto.isActive ?? true,
        },
      });

      if (roles.length) {
        await tx.userRole.createMany({
          data: roles.map((r) => ({
            userId: user.id,
            roleId: r.id,
          })),
        });
      }

      return user;
    });

    return this.findOne(actor, created.id);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateUserDto) {
    this.assertAuthenticated(actor);
    this.assertBackofficeManager(actor);

    const user = await this.prisma.user.findFirst({
      where: { organizationId: actor.organizationId, id },
    });
    if (!user) throw new NotFoundException('User not found');

    if (dto.mobile && dto.mobile !== user.mobile) {
      const conflict = await this.prisma.user.findFirst({
        where: { organizationId: actor.organizationId, mobile: dto.mobile, id: { not: id } },
      });
      if (conflict) throw new ConflictException('Another user is already using this mobile number');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          fullName: dto.fullName !== undefined ? dto.fullName : user.fullName,
          mobile: dto.mobile !== undefined ? dto.mobile : user.mobile,
          email: dto.email !== undefined ? dto.email : user.email,
          userType: dto.userType !== undefined ? dto.userType : user.userType,
          isActive: dto.isActive !== undefined ? dto.isActive : user.isActive,
        },
      });

      if (dto.roleCodes !== undefined) {
        const roles = await tx.role.findMany({
          where: { organizationId: actor.organizationId, code: { in: dto.roleCodes } },
          select: { id: true },
        });
        if (roles.length !== new Set(dto.roleCodes).size) {
          throw new BadRequestException('One or more role codes are invalid');
        }

        await tx.userRole.deleteMany({ where: { userId: id } });
        if (roles.length) {
          await tx.userRole.createMany({
            data: roles.map((r) => ({
              userId: id,
              roleId: r.id,
            })),
          });
        }
      }
    });

    return this.findOne(actor, id);
  }

  async resetPassword(actor: AuthenticatedUser, id: string, dto: ResetUserPasswordDto) {
    this.assertAuthenticated(actor);
    this.assertBackofficeManager(actor);

    const user = await this.prisma.user.findFirst({
      where: { organizationId: actor.organizationId, id },
    });
    if (!user) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await this.prisma.userSession.deleteMany({
      where: { userId: id },
    });

    return {
      success: true,
      message: 'User password reset successfully and sessions revoked',
    };
  }

  async deactivate(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackofficeManager(actor);

    if (actor.id === id) {
      throw new BadRequestException('Cannot deactivate your own user account');
    }

    const user = await this.prisma.user.findFirst({
      where: { organizationId: actor.organizationId, id },
    });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await this.prisma.userSession.deleteMany({
      where: { userId: id },
    });

    return {
      success: true,
      message: 'User deactivated successfully and sessions revoked',
      data: updated,
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackofficeManager(actor: AuthenticatedUser) {
    if (
      actor.roles.includes('RETAILER') ||
      actor.userType === 'retailer_user' ||
      (!actor.roles.includes('SUPER_ADMIN') &&
        !actor.roles.includes('OWNER') &&
        !actor.roles.includes('ADMIN'))
    ) {
      throw new ForbiddenException('Backoffice user management requires Admin or Owner roles');
    }
  }
}
