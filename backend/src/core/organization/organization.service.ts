import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateOrganizationDto } from './dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);

    const org = await this.prisma.organization.findFirst({
      where: { id: actor.organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return {
      success: true,
      message: 'Organization profile fetched successfully',
      data: org,
    };
  }

  async updateProfile(actor: AuthenticatedUser, dto: UpdateOrganizationDto) {
    this.assertAuthenticated(actor);

    const org = await this.prisma.organization.findFirst({
      where: { id: actor.organizationId },
      select: { id: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const updated = await this.prisma.organization.update({
      where: { id: actor.organizationId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.legalName !== undefined ? { legalName: dto.legalName } : {}),
        ...(dto.gstin !== undefined ? { gstin: dto.gstin } : {}),
        ...(dto.pan !== undefined ? { pan: dto.pan } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.currencyCode !== undefined ? { currencyCode: dto.currencyCode } : {}),
        ...(dto.addressJson !== undefined ? { addressJson: dto.addressJson as Prisma.InputJsonValue } : {}),
      },
    });

    return {
      success: true,
      message: `Organization '${updated.name}' profile updated successfully`,
      data: updated,
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
