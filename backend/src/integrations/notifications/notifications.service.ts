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
  QueryNotificationLogsDto,
  QueryNotificationTemplatesDto,
} from './dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(actor: AuthenticatedUser, query: QueryNotificationLogsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.NotificationLogWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.channel) where.channel = query.channel;
    if (query.status) where.status = query.status;
    if (query.eventKey) where.eventKey = query.eventKey;
    if (query.search) {
      where.OR = [
        { eventKey: { contains: query.search, mode: 'insensitive' } },
        { recipientMobile: { contains: query.search, mode: 'insensitive' } },
        { providerMessageId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        include: {
          template: {
            select: {
              id: true,
              channel: true,
              eventKey: true,
              languageCode: true,
              isActive: true,
            },
          },
          recipientUser: {
            select: {
              id: true,
              fullName: true,
              mobile: true,
              userType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return {
      success: true,
      message: 'Notification logs fetched successfully',
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLogById(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const log = await this.prisma.notificationLog.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
      },
      include: {
        template: true,
        recipientUser: {
          select: {
            id: true,
            fullName: true,
            mobile: true,
            userType: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Notification log not found');
    }

    return {
      success: true,
      message: 'Notification log fetched successfully',
      data: log,
    };
  }

  async retryLog(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const log = await this.prisma.notificationLog.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
      },
    });

    if (!log) {
      throw new NotFoundException('Notification log not found');
    }

    if (log.status === 'sent') {
      throw new ConflictException('Sent notification does not need retry');
    }

    const updated = await this.prisma.notificationLog.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        providerMessageId:
          log.providerMessageId ?? `manual-retry-${Date.now()}`,
      },
      include: {
        template: true,
        recipientUser: {
          select: {
            id: true,
            fullName: true,
            mobile: true,
            userType: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Notification retry simulated successfully',
      data: updated,
    };
  }

  async getTemplates(actor: AuthenticatedUser, query: QueryNotificationTemplatesDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.NotificationTemplateWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.channel) where.channel = query.channel;
    if (query.eventKey) where.eventKey = query.eventKey;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.search) {
      where.OR = [
        { eventKey: { contains: query.search, mode: 'insensitive' } },
        { languageCode: { contains: query.search, mode: 'insensitive' } },
        { templateText: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.notificationTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificationTemplate.count({ where }),
    ]);

    return {
      success: true,
      message: 'Notification templates fetched successfully',
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTemplateById(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const template = await this.prisma.notificationTemplate.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
      },
    });

    if (!template) {
      throw new NotFoundException('Notification template not found');
    }

    return {
      success: true,
      message: 'Notification template fetched successfully',
      data: template,
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
}
