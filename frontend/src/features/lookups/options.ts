import type { SearchableSelectOption } from '@/components/ui/searchable-select';
import type {
  BankAccountLookup,
  BrandLookup,
  CashRegisterLookup,
  CrateTypeLookup,
  DeliveryCycleLookup,
  DemandConsolidationLookup,
  DispatchTripLookup,
  EmployeeLookup,
  InventoryBatchLookup,
  ProductCategoryLookup,
  ProductVariantLookup,
  PurchaseOrderItemLookup,
  PurchaseOrderLookup,
  PurchaseInvoiceLookup,
  RetailerLookup,
  RouteLookup,
  SalesInvoiceLookup,
  SalesOrderLookup,
  SupplierLookup,
  TaxCodeLookup,
  UnitLookup,
  VehicleLookup,
  WarehouseLookup,
} from '@/types/lookups';

export const lookupOptions = {
  retailers(items: RetailerLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: `${item.shopName} (${item.retailerCode})`,
      description: [item.ownerName, item.mobile, item.orderingMode].filter(Boolean).join(' • '),
    }));
  },
  suppliers(items: SupplierLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: `${item.name} (${item.supplierCode})`,
      description: [item.contactPerson, item.mobile].filter(Boolean).join(' • '),
    }));
  },
  routes(items: RouteLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: `${item.name} (${item.code})`,
      description: item.deliveryShift ?? undefined,
    }));
  },
  deliveryCycles(items: DeliveryCycleLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: `${item.cycleCode}`,
      description: `${new Date(item.deliveryDate).toLocaleDateString('en-IN')} • ${item.deliveryShift} • ${item.status}`,
    }));
  },
  vehicles(items: VehicleLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.vehicleNo,
      description: item.vehicleType ?? undefined,
    }));
  },
  employees(items: EmployeeLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: `${item.fullName} (${item.employeeCode})`,
      description: [item.designation, item.mobile].filter(Boolean).join(' • '),
    }));
  },
  warehouses(items: WarehouseLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: `${item.name} (${item.code})`,
      description: item.warehouseType ?? undefined,
    }));
  },
  productVariants(items: ProductVariantLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: `${item.product.name}${item.variantName ? ` - ${item.variantName}` : ''}`,
      description: [item.sku, item.barcode].filter(Boolean).join(' • '),
    }));
  },
  demandConsolidations(items: DemandConsolidationLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.consolidationNo,
      description: `${item.deliveryCycle.cycleCode} • ${new Date(item.deliveryCycle.deliveryDate).toLocaleDateString('en-IN')} • ${item.status}`,
    }));
  },
  salesOrders(items: SalesOrderLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.orderNo,
      description: `${item.retailer.shopName} • ${item.source} • ${item.status}`,
    }));
  },
  dispatchTrips(items: DispatchTripLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.tripNo,
      description: `${item.route.name} • ${item.status}`,
    }));
  },
  salesInvoices(items: SalesInvoiceLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.invoiceNo,
      description: `${item.retailer.shopName} • ${item.status}`,
    }));
  },
  purchaseOrders(items: PurchaseOrderLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.poNo,
      description: `${item.supplier.name} • ${item.status}`,
    }));
  },
  purchaseOrderItems(items: PurchaseOrderItemLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: `${item.variant.product.name}${item.variant.variantName ? ` - ${item.variant.variantName}` : ''}`,
      description: `${item.purchaseOrder.poNo} • ${item.variant.sku} • Qty ${item.orderedQty}`,
    }));
  },
  purchaseInvoices(items: PurchaseInvoiceLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.invoiceNo,
      description: `${item.supplier.name} • ${item.status}`,
    }));
  },
  inventoryBatches(items: InventoryBatchLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.batchNo,
      description: `${item.variant.product.name}${item.variant.variantName ? ` - ${item.variant.variantName}` : ''}${item.expiryDate ? ` • Exp ${new Date(item.expiryDate).toLocaleDateString('en-IN')}` : ''}`,
    }));
  },
  brands(items: BrandLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.name,
    }));
  },
  productCategories(items: ProductCategoryLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.name,
      description: item.parent?.name ? `Parent: ${item.parent.name}` : undefined,
    }));
  },
  taxCodes(items: TaxCodeLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.code,
      description: [item.hsnCode ? `HSN ${item.hsnCode}` : null, `GST ${Number(item.gstRate)}%`]
        .filter(Boolean)
        .join(' • '),
    }));
  },
  units(items: UnitLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: `${item.name} (${item.code})`,
      description: `Decimals: ${item.decimalPlaces}`,
    }));
  },
  crateTypes(items: CrateTypeLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: `${item.name} (${item.code})`,
    }));
  },
  bankAccounts(items: BankAccountLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.bankName,
      description: [item.branchName, item.accountNoMasked].filter(Boolean).join(' • '),
    }));
  },
  cashRegisters(items: CashRegisterLookup[]): SearchableSelectOption[] {
    return items.map((item) => ({
      value: item.id,
      label: item.name,
    }));
  },
};
