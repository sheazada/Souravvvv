'use client';

import { useQuery } from '@tanstack/react-query';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { SearchableSelectOption } from '@/components/ui/searchable-select';
import { LookupsApi } from '@/features/lookups/api';
import { lookupOptions } from '@/features/lookups/options';
import type { LookupQuery } from '@/types/lookups';

type LookupResource =
  | 'retailers'
  | 'suppliers'
  | 'routes'
  | 'deliveryCycles'
  | 'vehicles'
  | 'employees'
  | 'warehouses'
  | 'productVariants'
  | 'demandConsolidations'
  | 'salesOrders'
  | 'dispatchTrips'
  | 'salesInvoices'
  | 'purchaseOrders'
  | 'purchaseOrderItems'
  | 'purchaseInvoices'
  | 'inventoryBatches'
  | 'brands'
  | 'productCategories'
  | 'taxCodes'
  | 'units'
  | 'crateTypes'
  | 'bankAccounts'
  | 'cashRegisters';

const fetchers: Record<LookupResource, (query?: LookupQuery) => Promise<any[]>> = {
  retailers: LookupsApi.retailers,
  suppliers: LookupsApi.suppliers,
  routes: LookupsApi.routes,
  deliveryCycles: LookupsApi.deliveryCycles,
  vehicles: LookupsApi.vehicles,
  employees: LookupsApi.employees,
  warehouses: LookupsApi.warehouses,
  productVariants: LookupsApi.productVariants,
  demandConsolidations: LookupsApi.demandConsolidations,
  salesOrders: LookupsApi.salesOrders,
  dispatchTrips: LookupsApi.dispatchTrips,
  salesInvoices: LookupsApi.salesInvoices,
  purchaseOrders: LookupsApi.purchaseOrders,
  purchaseOrderItems: LookupsApi.purchaseOrderItems,
  purchaseInvoices: LookupsApi.purchaseInvoices,
  inventoryBatches: LookupsApi.inventoryBatches,
  brands: LookupsApi.brands,
  productCategories: LookupsApi.productCategories,
  taxCodes: LookupsApi.taxCodes,
  units: LookupsApi.units,
  crateTypes: LookupsApi.crateTypes,
  bankAccounts: LookupsApi.bankAccounts,
  cashRegisters: LookupsApi.cashRegisters,
};

const optionBuilders: Record<LookupResource, (items: any[]) => SearchableSelectOption[]> = {
  retailers: lookupOptions.retailers,
  suppliers: lookupOptions.suppliers,
  routes: lookupOptions.routes,
  deliveryCycles: lookupOptions.deliveryCycles,
  vehicles: lookupOptions.vehicles,
  employees: lookupOptions.employees,
  warehouses: lookupOptions.warehouses,
  productVariants: lookupOptions.productVariants,
  demandConsolidations: lookupOptions.demandConsolidations,
  salesOrders: lookupOptions.salesOrders,
  dispatchTrips: lookupOptions.dispatchTrips,
  salesInvoices: lookupOptions.salesInvoices,
  purchaseOrders: lookupOptions.purchaseOrders,
  purchaseOrderItems: lookupOptions.purchaseOrderItems,
  purchaseInvoices: lookupOptions.purchaseInvoices,
  inventoryBatches: lookupOptions.inventoryBatches,
  brands: lookupOptions.brands,
  productCategories: lookupOptions.productCategories,
  taxCodes: lookupOptions.taxCodes,
  units: lookupOptions.units,
  crateTypes: lookupOptions.crateTypes,
  bankAccounts: lookupOptions.bankAccounts,
  cashRegisters: lookupOptions.cashRegisters,
};

export function LookupInput({
  resource,
  value,
  onChange,
  query,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  allowCustomValue = true,
  allowClear = false,
  className,
}: {
  resource: LookupResource;
  value?: string;
  onChange: (value: string) => void;
  query?: LookupQuery;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowCustomValue?: boolean;
  allowClear?: boolean;
  className?: string;
}) {
  const lookupQuery = useQuery({
    queryKey: ['lookup', resource, query],
    queryFn: () => fetchers[resource](query),
    staleTime: 60_000,
  });

  const options = optionBuilders[resource](lookupQuery.data ?? []);

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={lookupQuery.isLoading ? 'Loading options...' : placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={
        lookupQuery.error
          ? allowCustomValue
            ? 'Lookup failed. Use custom value.'
            : 'Lookup failed. Retry or refresh.'
          : emptyText
      }
      disabled={disabled}
      allowCustomValue={allowCustomValue}
      allowClear={allowClear}
      className={className}
    />
  );
}
