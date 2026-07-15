export type CrateTransactionListItem = {
  id: string;
  crateTypeId: string;
  retailerId?: string | null;
  dispatchTripId?: string | null;
  transactionType: 'issue' | 'return' | 'damage' | 'missing' | 'adjustment';
  quantity: number;
  transactionDate: string;
  referenceType?: string | null;
  remarks?: string | null;
  crateType?: {
    id: string;
    code: string;
    name: string;
    depositValue?: number | string | null;
  } | null;
  retailer?: {
    id: string;
    retailerCode?: string | null;
    shopName: string;
  } | null;
};

export type CrateBalanceSnapshotListItem = {
  id: string;
  balanceDate: string;
  retailerId: string;
  crateTypeId: string;
  openingQty: number;
  issuedQty: number;
  returnedQty: number;
  damagedQty: number;
  missingQty: number;
  closingQty: number;
  depositRate?: number;
  totalLiability?: number;
  crateType?: {
    id: string;
    code: string;
    name: string;
    depositValue?: number | string | null;
  } | null;
  retailer?: {
    id: string;
    retailerCode?: string | null;
    shopName: string;
    mobile?: string | null;
  } | null;
};

export type DispatchTripListItem = {
  id: string;
  tripNo: string;
  deliveryCycleId: string;
  routeId: string;
  vehicleId?: string | null;
  driverEmployeeId?: string | null;
  helperEmployeeId?: string | null;
  dispatchDate: string;
  plannedStartAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  status: 'planned' | 'loaded' | 'dispatched' | 'in_transit' | 'completed' | 'reconciled' | 'cancelled';
  loadingSheetNo?: string | null;
  challanNo?: string | null;
  totalStops: number;
  totalCratesLoaded: number;
  notes?: string | null;
  route?: {
    id: string;
    code: string;
    name: string;
    deliveryShift?: string | null;
  } | null;
  deliveryCycle?: {
    id: string;
    cycleCode: string;
    deliveryDate: string;
    deliveryShift: string;
  } | null;
  vehicle?: {
    id: string;
    vehicleNo: string;
    vehicleType?: string | null;
  } | null;
};

export type DispatchTripItem = {
  id: string;
  variantId: string;
  plannedQty: number;
  loadedQty: number;
  warehouse: {
    id: string;
    code: string;
    name: string;
  } | null;
  variant: {
    id: string;
    sku: string;
    variantName: string | null;
    productId: string;
    productName: string;
  } | null;
  stockOnHand?: number;
};

export type DispatchStopSummary = {
  id: string;
  retailerId: string;
  salesOrderId?: string | null;
  stopSequence: number;
  status: string;
  failureReason?: string | null;
  cratesIssued: number;
  emptyCratesReceived: number;
  notes?: string | null;
  retailer?: {
    id: string;
    retailerCode: string;
    shopName: string;
    ownerName?: string | null;
    mobile: string;
    locality?: string | null;
  } | null;
  salesOrder?: {
    id: string;
    orderNo: string;
    status: string;
    source: string;
  } | null;
  items: Array<{
    id: string;
    variantId: string;
    orderedQty: number;
    loadedQty: number;
    deliveredQty: number;
    returnedQty: number;
    damagedQty: number;
    refusedQty: number;
    unitPrice: number;
    taxAmount: number;
    lineTotal: number;
    variant: {
      id: string;
      sku: string;
      variantName: string | null;
      productId: string;
      productName: string;
    } | null;
  }>;
};

export type DispatchTripDetail = DispatchTripListItem & {
  items: DispatchTripItem[];
  stops: DispatchStopSummary[];
  challan?: {
    id: string;
    challanNo: string;
    issueDate: string;
    status: string;
  } | null;
  driver?: {
    id: string;
    employeeCode: string;
    fullName: string;
    mobile?: string | null;
  } | null;
  helper?: {
    id: string;
    employeeCode: string;
    fullName: string;
    mobile?: string | null;
  } | null;
};

export type DispatchTripFilters = {
  page?: number;
  limit?: number;
  search?: string;
  routeId?: string;
  deliveryCycleId?: string;
  vehicleId?: string;
  status?: string;
  dispatchDate?: string;
};

export type GenerateDispatchTripPayload = {
  deliveryCycleId: string;
  routeId: string;
  vehicleId?: string;
  driverEmployeeId?: string;
  helperEmployeeId?: string;
  dispatchDate?: string;
};

export type AssignDispatchResourcesPayload = {
  vehicleId?: string;
  driverEmployeeId?: string;
  helperEmployeeId?: string;
};
