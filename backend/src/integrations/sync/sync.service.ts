import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { PushSyncEventsDto, QuerySyncEventsDto, ResolveConflictDto } from './dto';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async pushEvents(actor: AuthenticatedUser, dto: PushSyncEventsDto) {
    this.assertAuthenticated(actor);

    const processedEvents = await Promise.all(
      dto.events.map(async (event) => {
        return this.prisma.syncEvent.create({
          data: {
            organizationId: actor.organizationId,
            userId: actor.id,
            deviceId: event.deviceId,
            entityType: event.entityType,
            entityId: event.entityId ?? null,
            action: event.action,
            payloadJson: event.payloadJson as Prisma.InputJsonValue,
            clientTimestamp: new Date(event.clientTimestamp),
            serverTimestamp: new Date(),
            syncStatus: 'processed',
          },
        });
      }),
    );

    return {
      success: true,
      message: `Successfully synchronized ${processedEvents.length} offline events`,
      data: {
        syncedCount: processedEvents.length,
        events: processedEvents,
      },
    };
  }

  async findAllEvents(actor: AuthenticatedUser, query: QuerySyncEventsDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.SyncEventWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.deviceId) where.deviceId = query.deviceId;
    if (query.syncStatus) where.syncStatus = query.syncStatus;

    const [rows, total] = await Promise.all([
      this.prisma.syncEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.syncEvent.count({ where }),
    ]);

    return {
      success: true,
      message: 'Sync events fetched successfully',
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findConflicts(actor: AuthenticatedUser, query: QuerySyncEventsDto) {
    this.assertAuthenticated(actor);

    return this.findAllEvents(actor, { ...query, syncStatus: 'conflict' });
  }

  async resolveConflict(actor: AuthenticatedUser, id: string, dto: ResolveConflictDto) {
    this.assertAuthenticated(actor);

    const row = await this.prisma.syncEvent.findFirst({
      where: { organizationId: actor.organizationId, id },
    });

    if (!row) throw new NotFoundException('Sync conflict event not found');

    const updated = await this.prisma.syncEvent.update({
      where: { id },
      data: {
        syncStatus: 'resolved',
        conflictNotes: `${dto.resolutionStrategy}: ${dto.resolutionNotes ?? 'Resolved via admin panel'}`,
      },
    });

    return {
      success: true,
      message: `Conflict event '${id}' resolved using strategy '${dto.resolutionStrategy}'`,
      data: updated,
    };
  }

  async getDeviceStatus(actor: AuthenticatedUser, deviceId: string) {
    this.assertAuthenticated(actor);

    const [lastSync, pendingCount, conflictCount] = await Promise.all([
      this.prisma.syncEvent.findFirst({
        where: { organizationId: actor.organizationId, deviceId },
        orderBy: { serverTimestamp: 'desc' },
      }),
      this.prisma.syncEvent.count({
        where: { organizationId: actor.organizationId, deviceId, syncStatus: 'pending' },
      }),
      this.prisma.syncEvent.count({
        where: { organizationId: actor.organizationId, deviceId, syncStatus: 'conflict' },
      }),
    ]);

    return {
      success: true,
      message: 'Device synchronization status fetched',
      data: {
        deviceId,
        lastSyncTimestamp: lastSync?.serverTimestamp ?? null,
        pendingEvents: pendingCount,
        unresolvedConflicts: conflictCount,
        status: conflictCount > 0 ? 'attention_required' : 'in_sync',
      },
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
