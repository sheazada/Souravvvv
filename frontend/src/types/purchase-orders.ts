export type PurchaseOrderListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  fromDate?: string;
  extraQtyAuditState?: '' | 'recently_changed' | 'never_changed';
};

export type PurchaseOrderCreateItem = {
  variantId: string;
  orderedQty: number;
  unitCost: number;
  taxRate: number;
};

export type CreatePurchaseOrderPayload = {
  supplierId: string;
  poDate: string;
  expectedReceiptDate?: string;
  remarks?: string;
  items: PurchaseOrderCreateItem[];
};

export type PurchaseOrderFromDemandItem = {
  variantId: string;
  extraQty?: number;
};

export type UpdatePurchaseOrderDemandExtrasPayload = {
  items: PurchaseOrderFromDemandItem[];
};

export type CreatePurchaseOrderFromDemandPayload = {
  supplierId: string;
  demandConsolidationId: string;
  remarks?: string;
  items?: PurchaseOrderFromDemandItem[];
};

export type PurchaseOrderLatestDemandExtraAuditSummary = {
  id: string;
  action: string;
  changedAt: string;
  changedBy?: {
    id?: string;
    fullName: string;
    userType?: string;
    mobile?: string | null;
  } | null;
  changedItemCount: number;
  totalExtraQtyBefore: number;
  totalExtraQtyAfter: number;
  totalOrderedQtyBefore: number;
  totalOrderedQtyAfter: number;
};

export type PurchaseOrderListItem = {
  id: string;
  poNo: string;
  supplierId: string;
  demandConsolidationId?: string | null;
  poDate: string;
  expectedReceiptDate?: string | null;
  status: string;
  grandTotal?: number | string | null;
  remarks?: string | null;
  supplier?: {
    id?: string;
    name: string;
  } | null;
  demandConsolidation?: {
    id?: string;
    consolidationNo: string;
  } | null;
  latestDemandExtraAudit?: PurchaseOrderLatestDemandExtraAuditSummary | null;
};

export type PurchaseOrderItem = {
  id: string;
  variantId: string;
  orderedQty: number;
  demandQty?: number;
  extraQty?: number;
  unitCost: number;
  taxRate: number;
  lineTotal: number;
  variant?: {
    sku?: string;
    variantName?: string | null;
    productName?: string;
  } | null;
};

export type PurchaseOrderDemandExtraAuditEntry = {
  id: string;
  action: string;
  changedAt: string;
  changedBy?: {
    id?: string;
    fullName: string;
    userType?: string;
    mobile?: string | null;
  } | null;
  items: Array<{
    variantId: string;
    demandQty: number;
    beforeExtraQty: number;
    afterExtraQty: number;
    beforeOrderedQty: number;
    afterOrderedQty: number;
    variant?: {
      id?: string | null;
      sku?: string | null;
      variantName?: string | null;
      productId?: string | null;
      productName?: string | null;
    } | null;
  }>;
};

export type PurchaseOrderDetail = PurchaseOrderListItem & {
  items: PurchaseOrderItem[];
  receiptSummary: {
    receiptCount: number;
    totalAcceptedQty: number;
  };
  auditTrail?: PurchaseOrderDemandExtraAuditEntry[];
};
