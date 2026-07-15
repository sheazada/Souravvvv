export type LookupOptionBase = {
  id: string;
};

export type RetailerLookup = LookupOptionBase & {
  retailerCode: string;
  shopName: string;
  ownerName?: string | null;
  mobile: string;
  orderingMode?: string | null;
};

export type SupplierLookup = LookupOptionBase & {
  supplierCode: string;
  name: string;
  contactPerson?: string | null;
  mobile?: string | null;
};

export type RouteLookup = LookupOptionBase & {
  code: string;
  name: string;
  deliveryShift?: string | null;
};

export type DeliveryCycleLookup = LookupOptionBase & {
  cycleCode: string;
  orderDate: string;
  deliveryDate: string;
  deliveryShift: string;
  status: string;
};

export type VehicleLookup = LookupOptionBase & {
  vehicleNo: string;
  vehicleType?: string | null;
};

export type EmployeeLookup = LookupOptionBase & {
  employeeCode: string;
  fullName: string;
  designation?: string | null;
  mobile?: string | null;
};

export type WarehouseLookup = LookupOptionBase & {
  code: string;
  name: string;
  warehouseType?: string | null;
};

export type ProductVariantLookup = LookupOptionBase & {
  sku: string;
  variantName?: string | null;
  barcode?: string | null;
  product: {
    id: string;
    name: string;
  };
};

export type DemandConsolidationLookup = LookupOptionBase & {
  consolidationNo: string;
  status: string;
  deliveryCycleId: string;
  deliveryCycle: {
    cycleCode: string;
    deliveryDate: string;
    deliveryShift: string;
  };
};

export type SalesOrderLookup = LookupOptionBase & {
  orderNo: string;
  status: string;
  source: string;
  retailerId: string;
  retailer: {
    retailerCode: string;
    shopName: string;
  };
};

export type DispatchTripLookup = LookupOptionBase & {
  tripNo: string;
  status: string;
  routeId: string;
  route: {
    code: string;
    name: string;
  };
};

export type SalesInvoiceLookup = LookupOptionBase & {
  invoiceNo: string;
  status: string;
  retailerId: string;
  retailer: {
    retailerCode: string;
    shopName: string;
  };
};

export type PurchaseOrderLookup = LookupOptionBase & {
  poNo: string;
  status: string;
  supplierId: string;
  supplier: {
    supplierCode: string;
    name: string;
  };
};

export type PurchaseInvoiceLookup = LookupOptionBase & {
  invoiceNo: string;
  status: string;
  supplierId: string;
  supplier: {
    supplierCode: string;
    name: string;
  };
};

export type PurchaseOrderItemLookup = LookupOptionBase & {
  purchaseOrderId: string;
  orderedQty: number | string;
  variantId: string;
  purchaseOrder: {
    poNo: string;
    status: string;
  };
  variant: {
    sku: string;
    variantName?: string | null;
    product: {
      name: string;
    };
  };
};

export type InventoryBatchLookup = LookupOptionBase & {
  batchNo: string;
  expiryDate?: string | null;
  variantId: string;
  variant: {
    sku: string;
    variantName?: string | null;
    product: {
      name: string;
    };
  };
};

export type BrandLookup = LookupOptionBase & {
  name: string;
  isActive: boolean;
};

export type ProductCategoryLookup = LookupOptionBase & {
  name: string;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
  isActive: boolean;
};

export type TaxCodeLookup = LookupOptionBase & {
  code: string;
  hsnCode?: string | null;
  gstRate: number | string;
  cgstRate?: number | string | null;
  sgstRate?: number | string | null;
  igstRate?: number | string | null;
  isActive: boolean;
};

export type UnitLookup = LookupOptionBase & {
  code: string;
  name: string;
  decimalPlaces: number;
};

export type CrateTypeLookup = LookupOptionBase & {
  code: string;
  name: string;
};

export type BankAccountLookup = LookupOptionBase & {
  bankName: string;
  branchName?: string | null;
  accountNoMasked: string;
};

export type CashRegisterLookup = LookupOptionBase & {
  name: string;
};

export type LookupQuery = {
  search?: string;
  limit?: number;
  status?: string;
  routeId?: string;
  deliveryCycleId?: string;
  purchaseOrderId?: string;
  designation?: string;
  channel?: string;
};
