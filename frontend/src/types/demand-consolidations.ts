export type DemandConsolidationStatus =
  | 'draft'
  | 'reviewed'
  | 'approved'
  | 'po_generated';

export type DeliveryCycleSummary = {
  id: string;
  cycleCode: string;
  deliveryDate: string;
  deliveryShift: string;
  status: string;
};

export type DemandConsolidationListItem = {
  id: string;
  consolidationNo: string;
  deliveryCycleId: string;
  consolidationDate: string;
  status: DemandConsolidationStatus;
  notes?: string | null;
  createdByUserId?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  deliveryCycle?: DeliveryCycleSummary | null;
};

export type DemandConsolidationItem = {
  id: string;
  demandConsolidationId: string;
  variantId: string;
  totalOrderQty: number;
  totalApprovedQty: number;
  bufferQty: number;
  finalProcurementQty: number;
  remarks?: string | null;
  variant: {
    id: string;
    sku: string;
    variantName: string | null;
    productId: string;
    productName: string;
  } | null;
};

export type DemandConsolidationTotals = {
  totalOrderQty: number;
  totalApprovedQty: number;
  totalBufferQty: number;
  totalFinalProcurementQty: number;
};

export type DemandConsolidationDetail = DemandConsolidationListItem & {
  items: DemandConsolidationItem[];
  totals: DemandConsolidationTotals;
  sourceOrderCount: number;
  deliveryCycle: {
    id: string;
    cycleCode: string;
    orderDate: string;
    deliveryDate: string;
    deliveryShift: string;
    cutoffAt: string;
    status: string;
  } | null;
};

export type DemandConsolidationListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  deliveryCycleId?: string;
  status?: DemandConsolidationStatus | '';
  fromDate?: string;
  toDate?: string;
};

export type CreateDemandConsolidationPayload = {
  deliveryCycleId: string;
  includeStatuses?: string[];
  notes?: string;
};

export type UpdateDemandConsolidationItemPayload = {
  bufferQty?: number;
  finalProcurementQty?: number;
  remarks?: string;
};

export type DemandSourceOrder = {
  id: string;
  orderNo: string;
  retailerId: string;
  routeId: string | null;
  orderDate: string;
  source: string;
  status: string;
  grandTotal: number | string;
  retailer?: {
    id: string;
    retailerCode: string;
    shopName: string;
    ownerName?: string | null;
    mobile: string;
  } | null;
  route?: {
    id: string;
    code: string;
    name: string;
  } | null;
};

export type RouteWiseDemandRow = {
  routeId: string;
  routeCode: string | null;
  routeName: string | null;
  retailerCount: number;
  orderCount: number;
  totalOrderedQty: number;
  totalApprovedQty: number;
};

export type AreaWiseDemandRow = {
  areaId: string | null;
  areaCode: string | null;
  areaName: string;
  routeCount: number;
  retailerCount: number;
  orderCount: number;
  totalOrderedQty: number;
  totalApprovedQty: number;
};
