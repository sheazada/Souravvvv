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

export interface UserRoleSummary {
  id: string;
  code: string;
  name: string;
}

export interface UserSummary {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
  userType: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  roles?: UserRoleSummary[];
}

export interface RolePermissionSummary {
  id: string;
  code: string;
  module: string;
  action: string;
  description?: string | null;
}

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissions?: RolePermissionSummary[];
  _count?: {
    rolePermissions?: number;
    userRoles?: number;
  };
}

export interface AuditLogUser {
  id: string;
  fullName: string;
  mobile: string;
  userType: string;
  roles?: string[];
}

export interface AuditLogSummary {
  id: string;
  organizationId: string;
  userId?: string | null;
  module: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: AuditLogUser | null;
}
