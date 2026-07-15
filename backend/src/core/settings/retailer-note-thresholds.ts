import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

export const RETAILER_NOTE_LIMITS_GROUP = 'retailer_note_limits';

export const RETAILER_NOTE_THRESHOLD_CONFIG = {
  creditNoteMaxAmount: {
    settingKey: 'credit_note_max_amount',
    envKey: 'RETAILER_CREDIT_NOTE_MAX_AMOUNT',
    defaultValue: 1000000,
  },
  creditNoteMaxTaxAmount: {
    settingKey: 'credit_note_max_tax_amount',
    envKey: 'RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT',
    defaultValue: 1000000,
  },
  creditNoteMaxTotalAmount: {
    settingKey: 'credit_note_max_total_amount',
    envKey: 'RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT',
    defaultValue: 1000000,
  },
  debitNoteMaxAmount: {
    settingKey: 'debit_note_max_amount',
    envKey: 'RETAILER_DEBIT_NOTE_MAX_AMOUNT',
    defaultValue: 1000000,
  },
} as const;

export type RetailerNoteThresholdField = keyof typeof RETAILER_NOTE_THRESHOLD_CONFIG;
export type RetailerNoteThresholdSource = 'db' | 'env' | 'default';

export interface RetailerNoteThresholdPayload {
  effective: Record<RetailerNoteThresholdField, number>;
  overrides: Record<RetailerNoteThresholdField, number | null>;
  sources: Record<RetailerNoteThresholdField, RetailerNoteThresholdSource>;
}

type ThresholdCacheEntry = {
  expiresAt: number;
  payload: RetailerNoteThresholdPayload;
};

type ThresholdCacheCounters = {
  hits: number;
  misses: number;
  invalidations: number;
};

const DEFAULT_CACHE_TTL_MS = 60_000;

export class RetailerNoteThresholdCache {
  private static readonly cache = new Map<string, ThresholdCacheEntry>();
  private static readonly totals: ThresholdCacheCounters = {
    hits: 0,
    misses: 0,
    invalidations: 0,
  };
  private static readonly perOrganization = new Map<string, ThresholdCacheCounters>();

  static async getPayload(
    prisma: Pick<PrismaService, 'systemSetting'>,
    organizationId: string,
  ): Promise<RetailerNoteThresholdPayload> {
    const ttlMs = this.getCacheTtlMs();
    const cached = this.cache.get(organizationId);
    const now = Date.now();
    if (ttlMs > 0 && cached && cached.expiresAt > now) {
      this.bumpCounter(organizationId, 'hits');
      return cached.payload;
    }

    this.bumpCounter(organizationId, 'misses');

    const settings = await prisma.systemSetting.findMany({
      where: {
        organizationId,
        settingGroup: RETAILER_NOTE_LIMITS_GROUP,
        settingKey: {
          in: Object.values(RETAILER_NOTE_THRESHOLD_CONFIG).map((row) => row.settingKey),
        },
      },
      select: { settingKey: true, valueJson: true },
    });

    const settingsMap = new Map<string, Prisma.JsonValue>(
      settings.map((row) => [row.settingKey, row.valueJson] as const),
    );

    const effective = {} as Record<RetailerNoteThresholdField, number>;
    const overrides = {} as Record<RetailerNoteThresholdField, number | null>;
    const sources = {} as Record<RetailerNoteThresholdField, RetailerNoteThresholdSource>;

    for (const [field, config] of Object.entries(RETAILER_NOTE_THRESHOLD_CONFIG) as [
      RetailerNoteThresholdField,
      (typeof RETAILER_NOTE_THRESHOLD_CONFIG)[RetailerNoteThresholdField],
    ][]) {
      const dbValue = this.parsePositiveNumberSetting(settingsMap.get(config.settingKey));
      const envValue = this.parsePositiveNumberSetting(process.env[config.envKey]);

      overrides[field] = dbValue;
      if (dbValue !== null) {
        effective[field] = dbValue;
        sources[field] = 'db';
      } else if (envValue !== null) {
        effective[field] = envValue;
        sources[field] = 'env';
      } else {
        effective[field] = config.defaultValue;
        sources[field] = 'default';
      }
    }

    const payload: RetailerNoteThresholdPayload = { effective, overrides, sources };
    if (ttlMs > 0) {
      this.cache.set(organizationId, { expiresAt: now + ttlMs, payload });
    } else {
      this.cache.delete(organizationId);
    }
    return payload;
  }

  static invalidate(organizationId?: string) {
    if (organizationId) {
      this.cache.delete(organizationId);
      this.bumpCounter(organizationId, 'invalidations');
      return;
    }

    for (const organizationKey of this.cache.keys()) {
      this.bumpCounter(organizationKey, 'invalidations');
    }
    this.cache.clear();
  }

  static getDebugCounters() {
    const now = Date.now();
    return {
      ttlMs: this.getCacheTtlMs(),
      cacheSize: this.cache.size,
      totals: { ...this.totals },
      organizations: Object.fromEntries(
        [...this.perOrganization.entries()].map(([organizationId, counters]) => {
          const entry = this.cache.get(organizationId);
          return [
            organizationId,
            {
              ...counters,
              cached: Boolean(entry),
              expiresAt: entry?.expiresAt ?? null,
              msRemaining: entry ? Math.max(entry.expiresAt - now, 0) : 0,
            },
          ];
        }),
      ),
    };
  }

  static resetDebugCounters(organizationId?: string) {
    if (organizationId) {
      this.perOrganization.delete(organizationId);
      return;
    }

    this.totals.hits = 0;
    this.totals.misses = 0;
    this.totals.invalidations = 0;
    this.perOrganization.clear();
  }

  private static getCacheTtlMs() {
    const raw = process.env.RETAILER_NOTE_THRESHOLD_CACHE_TTL_MS;
    const parsed = Number(raw ?? String(DEFAULT_CACHE_TTL_MS));
    if (!Number.isFinite(parsed) || parsed < 0) {
      return DEFAULT_CACHE_TTL_MS;
    }
    return parsed;
  }

  private static bumpCounter(organizationId: string, field: keyof ThresholdCacheCounters) {
    this.totals[field] += 1;
    const current = this.perOrganization.get(organizationId) ?? {
      hits: 0,
      misses: 0,
      invalidations: 0,
    };
    current[field] += 1;
    this.perOrganization.set(organizationId, current);
  }

  private static parsePositiveNumberSetting(value: Prisma.JsonValue | string | null | undefined) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) && value > 0 ? value : null;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    if (typeof value === 'object' && !Array.isArray(value) && value !== null && 'value' in value) {
      const parsed = Number((value as { value?: unknown }).value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    return null;
  }
}
