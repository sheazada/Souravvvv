import { apiClient, buildQueryString } from '@/lib/api/client';
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
  LookupQuery,
  ProductCategoryLookup,
  ProductVariantLookup,
  PurchaseInvoiceLookup,
  PurchaseOrderItemLookup,
  PurchaseOrderLookup,
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

export const LookupsApi = {
  retailers(query?: LookupQuery) {
    return apiClient<RetailerLookup[]>(`/lookups/retailers${buildQueryString(query)}`);
  },
  suppliers(query?: LookupQuery) {
    return apiClient<SupplierLookup[]>(`/lookups/suppliers${buildQueryString(query)}`);
  },
  routes(query?: LookupQuery) {
    return apiClient<RouteLookup[]>(`/lookups/routes${buildQueryString(query)}`);
  },
  deliveryCycles(query?: LookupQuery) {
    return apiClient<DeliveryCycleLookup[]>(`/lookups/delivery-cycles${buildQueryString(query)}`);
  },
  vehicles(query?: LookupQuery) {
    return apiClient<VehicleLookup[]>(`/lookups/vehicles${buildQueryString(query)}`);
  },
  employees(query?: LookupQuery) {
    return apiClient<EmployeeLookup[]>(`/lookups/employees${buildQueryString(query)}`);
  },
  warehouses(query?: LookupQuery) {
    return apiClient<WarehouseLookup[]>(`/lookups/warehouses${buildQueryString(query)}`);
  },
  productVariants(query?: LookupQuery) {
    return apiClient<ProductVariantLookup[]>(`/lookups/product-variants${buildQueryString(query)}`);
  },
  demandConsolidations(query?: LookupQuery) {
    return apiClient<DemandConsolidationLookup[]>(`/lookups/demand-consolidations${buildQueryString(query)}`);
  },
  salesOrders(query?: LookupQuery) {
    return apiClient<SalesOrderLookup[]>(`/lookups/sales-orders${buildQueryString(query)}`);
  },
  dispatchTrips(query?: LookupQuery) {
    return apiClient<DispatchTripLookup[]>(`/lookups/dispatch-trips${buildQueryString(query)}`);
  },
  salesInvoices(query?: LookupQuery) {
    return apiClient<SalesInvoiceLookup[]>(`/lookups/sales-invoices${buildQueryString(query)}`);
  },
  purchaseOrders(query?: LookupQuery) {
    return apiClient<PurchaseOrderLookup[]>(`/lookups/purchase-orders${buildQueryString(query)}`);
  },
  purchaseOrderItems(query?: LookupQuery) {
    return apiClient<PurchaseOrderItemLookup[]>(`/lookups/purchase-order-items${buildQueryString(query)}`);
  },
  purchaseInvoices(query?: LookupQuery) {
    return apiClient<PurchaseInvoiceLookup[]>(`/lookups/purchase-invoices${buildQueryString(query)}`);
  },
  inventoryBatches(query?: LookupQuery) {
    return apiClient<InventoryBatchLookup[]>(`/lookups/inventory-batches${buildQueryString(query)}`);
  },
  brands(query?: LookupQuery) {
    return apiClient<BrandLookup[]>(`/lookups/brands${buildQueryString(query)}`);
  },
  productCategories(query?: LookupQuery) {
    return apiClient<ProductCategoryLookup[]>(`/lookups/product-categories${buildQueryString(query)}`);
  },
  taxCodes(query?: LookupQuery) {
    return apiClient<TaxCodeLookup[]>(`/lookups/tax-codes${buildQueryString(query)}`);
  },
  units(query?: LookupQuery) {
    return apiClient<UnitLookup[]>(`/lookups/units${buildQueryString(query)}`);
  },
  crateTypes(query?: LookupQuery) {
    return apiClient<CrateTypeLookup[]>(`/lookups/crate-types${buildQueryString(query)}`);
  },
  bankAccounts(query?: LookupQuery) {
    return apiClient<BankAccountLookup[]>(`/lookups/bank-accounts${buildQueryString(query)}`);
  },
  cashRegisters(query?: LookupQuery) {
    return apiClient<CashRegisterLookup[]>(`/lookups/cash-registers${buildQueryString(query)}`);
  },
};
