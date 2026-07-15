import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actor: AuthenticatedUser, query: QueryAuditLogsDto) {
    this.assertAuthenticated(actor);
    this.assertBackofficeOrAuditor(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.AuditLogWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.module) where.module = query.module;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;

    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { module: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const enriched = await this.enrichAuditLogs(actor.organizationId, rows);

    return {
      success: true,
      message: 'Audit logs fetched successfully',
      data: enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async enrichAuditLogs(organizationId: string, rows: AuditLog[]) {
    const userIds = [...new Set(rows.map((row) => row.userId).filter((v): v is string => Boolean(v)))];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { organizationId, id: { in: userIds } },
          select: { id: true, fullName: true, mobile: true, userType: true },
        })
      : [];
    const userMap = new Map<string, any>(users.map((u): [string, any] => [u.id, u]));

    return rows.map((row) => ({
      ...row,
      user: row.userId ? userMap.get(row.userId) ?? null : null,
    }));
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackofficeOrAuditor(actor: AuthenticatedUser) {
    if (
      actor.roles.includes('RETAILER') ||
      actor.userType === 'retailer_user' ||
      (!actor.roles.includes('SUPER_ADMIN') &&
        !actor.roles.includes('OWNER') &&
        !actor.roles.includes('STAFF') &&
        !actor.roles.includes('AUDITOR'))
    ) {
      throw new ForbiddenException('Audit visibility requires backoffice or auditor access');
    }
  }
}
