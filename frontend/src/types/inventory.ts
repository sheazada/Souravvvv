export type InventoryStockFilters = {
  variantId?: string;
  warehouseId?: string;
  lowStock?: string;
  nearExpiry?: string;
};

export type InventoryBatchFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  nearExpiry?: string;
  variantId?: string;
  warehouseId?: string;
};

export type StockMovementFilters = {
  page?: number;
  limit?: number;
  search?: string;
  variantId?: string;
  warehouseId?: string;
  movementType?: string;
};

export type StockAdjustmentFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  warehouseId?: string;
};

export type InventoryVariantRef = {
  sku?: string;
  variantName?: string | null;
  productName?: string;
};

export type InventoryWarehouseRef = {
  id?: string;
  name: string;
};

export type StockOnHandRow = {
  variantId: string;
  warehouseId: string;
  batchCount: number;
  totalAvailableQty: number;
  totalReservedQty: number;
  totalDamagedQty: number;
  nearestExpiryDate?: string | null;
  variant?: InventoryVariantRef | null;
  warehouse?: InventoryWarehouseRef | null;
};

export type InventoryBatchRow = {
  id: string;
  variantId: string;
  warehouseId: string;
  batchNo: string;
  availableQty: number;
  receivedQty: number;
  expiryDate?: string | null;
  status: string;
  variant?: InventoryVariantRef | null;
  warehouse?: InventoryWarehouseRef | null;
};

export type StockMovementRow = {
  id: string;
  movementNo?: string | null;
  warehouseId: string;
  variantId: string;
  movementType: string;
  referenceType?: string | null;
  referenceId?: string | null;
  qtyIn: number;
  qtyOut: number;
  movementAt: string;
  variant?: InventoryVariantRef | null;
  warehouse?: InventoryWarehouseRef | null;
};

export type StockAdjustmentCreateItem = {
  variantId: string;
  inventoryBatchId?: string;
  physicalQty: number;
  remarks?: string;
};

export type CreateStockAdjustmentPayload = {
  warehouseId: string;
  adjustmentDate: string;
  reason: string;
  remarks?: string;
  items: StockAdjustmentCreateItem[];
};

export type StockAdjustmentListItem = {
  id: string;
  adjustmentNo: string;
  warehouseId: string;
  adjustmentDate: string;
  reason?: string | null;
  status: string;
  warehouse?: InventoryWarehouseRef | null;
};

export type StockAdjustmentDetail = StockAdjustmentListItem & {
  remarks?: string | null;
  items?: Array<
    StockAdjustmentCreateItem & {
      id?: string;
      variant?: InventoryVariantRef | null;
      inventoryBatch?: InventoryBatchRow | null;
    }
  >;
};
