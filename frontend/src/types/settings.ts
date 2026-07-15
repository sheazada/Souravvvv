export type RetailerNoteThresholdField =
  | 'creditNoteMaxAmount'
  | 'creditNoteMaxTaxAmount'
  | 'creditNoteMaxTotalAmount'
  | 'debitNoteMaxAmount';

export type RetailerNoteThresholdSources = Record<
  RetailerNoteThresholdField,
  'db' | 'env' | 'default'
>;

export type RetailerNoteThresholds = Record<RetailerNoteThresholdField, number>;

export type RetailerNoteThresholdOverrides = Record<RetailerNoteThresholdField, number | null>;

export type RetailerNoteThresholdPayload = {
  effective: RetailerNoteThresholds;
  overrides: RetailerNoteThresholdOverrides;
  sources: RetailerNoteThresholdSources;
};

export type UpdateRetailerNoteThresholdsPayload = Partial<RetailerNoteThresholds>;

export type RetailerNoteThresholdCacheOrganizationDebug = {
  hits: number;
  misses: number;
  invalidations: number;
  cached: boolean;
  expiresAt: number | null;
  msRemaining: number;
};

export type RetailerNoteThresholdCacheDebug = {
  ttlMs: number;
  cacheSize: number;
  totals: {
    hits: number;
    misses: number;
    invalidations: number;
  };
  organizations: Record<string, RetailerNoteThresholdCacheOrganizationDebug>;
};
