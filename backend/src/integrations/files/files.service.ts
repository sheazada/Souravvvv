import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFileAttachmentDto, QueryAttachmentsDto } from './dto';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateFileAttachmentDto) {
    this.assertAuthenticated(actor);

    const created = await this.prisma.fileAttachment.create({
      data: {
        organizationId: actor.organizationId,
        fileName: dto.fileName,
        fileUrl: dto.storagePath,
        mimeType: dto.fileType,
        entityType: dto.entityType ?? 'general',
        entityId: dto.entityId ?? actor.organizationId,
        metaJson: { sizeBytes: dto.sizeBytes } as Prisma.InputJsonValue,
      },
    });

    return {
      success: true,
      message: `Attachment '${created.fileName}' recorded successfully`,
      data: created,
    };
  }

  async findAll(actor: AuthenticatedUser, query: QueryAttachmentsDto) {
    this.assertAuthenticated(actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.FileAttachmentWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId && typeof query.entityId === 'string') where.entityId = query.entityId;
    if (query.search) {
      where.OR = [
        { fileName: { contains: query.search, mode: 'insensitive' } },
        { mimeType: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.fileAttachment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.fileAttachment.count({ where }),
    ]);

    return {
      success: true,
      message: 'Attachments fetched successfully',
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

    const row = await this.prisma.fileAttachment.findFirst({
      where: { organizationId: actor.organizationId, id },
    });

    if (!row) throw new NotFoundException('File attachment not found');

    return {
      success: true,
      message: 'Attachment fetched successfully',
      data: row,
    };
  }

  async remove(actor: AuthenticatedUser, id: string) {
    this.assertAuthenticated(actor);

    const row = await this.prisma.fileAttachment.findFirst({
      where: { organizationId: actor.organizationId, id },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('File attachment not found');

    await this.prisma.fileAttachment.delete({ where: { id } });

    return {
      success: true,
      message: 'Attachment deleted successfully',
      data: { id },
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
