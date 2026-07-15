import {
  BadRequestException,
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
  AssignPermissionsDto,
  CreateRoleDto,
  QueryRolesDto,
  UpdateRoleDto,
} from './dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actor: AuthenticatedUser, query: QueryRolesDto) {
    this.assertAuthenticated(actor);
    this.assertBackofficeManager(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.RoleWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.isSystemRole === 'true') where.isSystemRole = true;
    if (query.isSystemRole === 'false') where.isSystemRole = false;

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          isSystemRole: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              rolePermissions: true,
              userRoles: true,
            },
          },
        },
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      success: true,
      message: 'Roles fetched successfully',
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
    this.assertBackofficeManager(actor);

    const role = await this.prisma.role.findFirst({
      where: { organizationId: actor.organizationId, id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!role) throw new NotFoundException('Role not found');

    return {
      success: true,
      message: 'Role fetched successfully',
      data: {
        ...role,
        permissions: role.rolePermissions.map((rp) => rp.permission),
      },
    };
  }

  async create(actor: AuthenticatedUser, dto: CreateRoleDto) {
    this.assertAuthenticated(actor);
    this.assertBackofficeManager(actor);

    const code = dto.code.toUpperCase().trim();
    const existing = await this.prisma.role.findFirst({
      where: { organizationId: actor.organizationId, code },
    });
    if (existing) {
      throw new ConflictException(`Role with code ${code} already exists`);
    }

    const permissionCodes = dto.permissionCodes ?? [];
    const permissions = permissionCodes.length
      ? await this.prisma.permission.findMany({
          where: { code: { in: permissionCodes } },
          select: { id: true, code: true },
        })
      : [];
    if (permissions.length !== new Set(permissionCodes).size) {
      throw new BadRequestException('One or more permission codes are invalid');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          organizationId: actor.organizationId,
          code,
          name: dto.name,
          description: dto.description ?? null,
          isSystemRole: false,
        },
      });

      if (permissions.length) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: role.id,
            permissionId: p.id,
          })),
        });
      }

      return role;
    });

    return this.findOne(actor, created.id);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateRoleDto) {
    this.assertAuthenticated(actor);
    this.assertBackofficeManager(actor);

    const role = await this.prisma.role.findFirst({
      where: { organizationId: actor.organizationId, id },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystemRole) {
      throw new ConflictException('System roles cannot be renamed or modified');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          name: dto.name !== undefined ? dto.name : role.name,
          description: dto.description !== undefined ? dto.description : role.description,
        },
      });

      if (dto.permissionCodes !== undefined) {
        const permissions = dto.permissionCodes.length
          ? await tx.permission.findMany({
              where: { code: { in: dto.permissionCodes } },
              select: { id: true },
            })
          : [];
        if (permissions.length !== new Set(dto.permissionCodes).size) {
          throw new BadRequestException('One or more permission codes are invalid');
        }

        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (permissions.length) {
          await tx.rolePermission.createMany({
            data: permissions.map((p) => ({
              roleId: id,
              permissionId: p.id,
            })),
          });
        }
      }
    });

    return this.findOne(actor, id);
  }

  async assignPermissions(actor: AuthenticatedUser, id: string, dto: AssignPermissionsDto) {
    this.assertAuthenticated(actor);
    this.assertBackofficeManager(actor);

    const role = await this.prisma.role.findFirst({
      where: { organizationId: actor.organizationId, id },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystemRole) {
      throw new ConflictException('Cannot reassign permissions on predefined system roles');
    }

    const permissions = dto.permissionCodes.length
      ? await this.prisma.permission.findMany({
          where: { code: { in: dto.permissionCodes } },
          select: { id: true },
        })
      : [];
    if (permissions.length !== new Set(dto.permissionCodes).size) {
      throw new BadRequestException('One or more permission codes are invalid');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissions.length) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: id,
            permissionId: p.id,
          })),
        });
      }
    });

    return this.findOne(actor, id);
  }

  async remove(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackofficeManager(actor);

    const role = await this.prisma.role.findFirst({
      where: { organizationId: actor.organizationId, id },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystemRole) {
      throw new ConflictException('System roles cannot be deleted');
    }
    if (role._count.userRoles > 0) {
      throw new ConflictException('Cannot delete role assigned to active users');
    }

    await this.prisma.role.delete({ where: { id } });
    return {
      success: true,
      message: 'Role deleted successfully',
      data: role,
    };
  }

  async findAllPermissions(actor: AuthenticatedUser, module?: string) {
    this.assertAuthenticated(actor);
    this.assertBackofficeManager(actor);

    const permissions = await this.prisma.permission.findMany({
      where: module ? { module } : undefined,
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });

    return {
      success: true,
      message: 'Permissions fetched successfully',
      data: permissions,
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
      throw new ForbiddenException('Role management requires Admin or Owner roles');
    }
  }
}
