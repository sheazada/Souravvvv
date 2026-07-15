export type GoodsReceiptListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  fromDate?: string;
};

export type GoodsReceiptCreateItem = {
  purchaseOrderItemId?: string;
  variantId: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  batchNo?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  unitCost: number;
  remarks?: string;
};

export type CreateGoodsReceiptPayload = {
  supplierId: string;
  purchaseOrderId?: string;
  warehouseId: string;
  receiptDate: string;
  supplierChallanNo?: string;
  vehicleNo?: string;
  remarks?: string;
  items: GoodsReceiptCreateItem[];
};

export type GoodsReceiptListItem = {
  id: string;
  grnNo: string;
  supplierId: string;
  purchaseOrderId?: string | null;
  warehouseId: string;
  receiptDate: string;
  status: string;
  remarks?: string | null;
  supplier?: {
    id?: string;
    name: string;
  } | null;
  warehouse?: {
    id?: string;
    name: string;
  } | null;
};

export type GoodsReceiptDetail = GoodsReceiptListItem & {
  supplierChallanNo?: string | null;
  vehicleNo?: string | null;
  purchaseOrder?: {
    id?: string;
    poNo: string;
  } | null;
  items?: GoodsReceiptCreateItem[];
};

export type GoodsReceiptComparisonItem = {
  id: string;
  variantId: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  shortQty: number;
  excessQty: number;
  batchNo?: string | null;
  expiryDate?: string | null;
  variant?: {
    productName?: string;
    variantName?: string | null;
    sku?: string;
  } | null;
};

export type GoodsReceiptComparison = {
  totals: {
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    shortQty: number;
    excessQty: number;
  };
  items: GoodsReceiptComparisonItem[];
};
