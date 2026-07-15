import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRetailerNoteThresholdsDto } from './dto';
import {
  RETAILER_NOTE_LIMITS_GROUP,
  RETAILER_NOTE_THRESHOLD_CONFIG,
  RetailerNoteThresholdCache,
  RetailerNoteThresholdField,
} from './retailer-note-thresholds';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRetailerNoteThresholds(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    return {
      success: true,
      message: 'Retailer note thresholds fetched successfully',
      data: await RetailerNoteThresholdCache.getPayload(this.prisma, actor.organizationId),
    };
  }

  async getRetailerNoteThresholdCacheDebug(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    return {
      success: true,
      message: 'Retailer note threshold cache debug counters fetched successfully',
      data: RetailerNoteThresholdCache.getDebugCounters(),
    };
  }

  async updateRetailerNoteThresholds(
    actor: AuthenticatedUser,
    dto: UpdateRetailerNoteThresholdsDto,
  ) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    const updates = this.toUpdateEntries(dto);
    if (!updates.length) {
      throw new BadRequestException('At least one threshold value is required');
    }

    for (const update of updates) {
      this.assertPositiveAmount(update.value, `${this.toLabel(update.field)} must be greater than zero`);
      this.assertCurrencyPrecision(
        update.value,
        `${this.toLabel(update.field)} cannot have more than 2 decimal places`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const config = RETAILER_NOTE_THRESHOLD_CONFIG[update.field];
        const existing = await tx.systemSetting.findFirst({
          where: {
            organizationId: actor.organizationId,
            settingGroup: RETAILER_NOTE_LIMITS_GROUP,
            settingKey: config.settingKey,
          },
        });

        if (existing) {
          await tx.systemSetting.update({
            where: { id: existing.id },
            data: { valueJson: update.value },
          });
        } else {
          await tx.systemSetting.create({
            data: {
              organizationId: actor.organizationId,
              settingGroup: RETAILER_NOTE_LIMITS_GROUP,
              settingKey: config.settingKey,
              valueJson: update.value,
              isEncrypted: false,
            },
          });
        }
      }
    });

    RetailerNoteThresholdCache.invalidate(actor.organizationId);

    return {
      success: true,
      message: 'Retailer note thresholds updated successfully',
      data: await RetailerNoteThresholdCache.getPayload(this.prisma, actor.organizationId),
    };
  }

  async resetRetailerNoteThresholdCache(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    RetailerNoteThresholdCache.invalidate(actor.organizationId);

    return {
      success: true,
      message: 'Retailer note threshold cache reset successfully',
      data: RetailerNoteThresholdCache.getDebugCounters(),
    };
  }

  async resetRetailerNoteThresholds(actor: AuthenticatedUser) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);

    await this.prisma.systemSetting.deleteMany({
      where: {
        organizationId: actor.organizationId,
        settingGroup: RETAILER_NOTE_LIMITS_GROUP,
        settingKey: {
          in: Object.values(RETAILER_NOTE_THRESHOLD_CONFIG).map((row) => row.settingKey),
        },
      },
    });

    RetailerNoteThresholdCache.invalidate(actor.organizationId);

    return {
      success: true,
      message: 'Retailer note thresholds reset successfully',
      data: await RetailerNoteThresholdCache.getPayload(this.prisma, actor.organizationId),
    };
  }

  private toUpdateEntries(dto: UpdateRetailerNoteThresholdsDto) {
    const entries: Array<{ field: RetailerNoteThresholdField; value: number }> = [];

    for (const field of Object.keys(RETAILER_NOTE_THRESHOLD_CONFIG) as RetailerNoteThresholdField[]) {
      const value = dto[field];
      if (value !== undefined) {
        entries.push({ field, value });
      }
    }

    return entries;
  }

  private assertPositiveAmount(amount: number, message: string) {
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw new BadRequestException(message);
    }
  }

  private assertCurrencyPrecision(amount: number, message: string) {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || Number(numeric.toFixed(2)) !== numeric) {
      throw new BadRequestException(message);
    }
  }

  private toLabel(field: RetailerNoteThresholdField) {
    switch (field) {
      case 'creditNoteMaxAmount':
        return 'Credit note amount';
      case 'creditNoteMaxTaxAmount':
        return 'Credit note tax amount';
      case 'creditNoteMaxTotalAmount':
        return 'Credit note total amount';
      case 'debitNoteMaxAmount':
        return 'Retailer debit note amount';
      default:
        return 'Threshold value';
    }
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
