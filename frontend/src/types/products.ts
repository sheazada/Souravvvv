export type ProductBrandRef = {
  id: string;
  name: string;
  isActive?: boolean;
};

export type ProductCategoryRef = {
  id: string;
  name: string;
  parentId?: string | null;
  isActive?: boolean;
  parent?: {
    id: string;
    name: string;
  } | null;
};

export type ProductTaxCodeRef = {
  id: string;
  code: string;
  hsnCode?: string | null;
  gstRate: number | string;
  cgstRate?: number | string | null;
  sgstRate?: number | string | null;
  igstRate?: number | string | null;
  isActive?: boolean;
};

export type ProductCrateTypeRef = {
  id: string;
  code: string;
  name: string;
  capacityUnits?: number | null;
  depositValue?: number | string | null;
  isActive?: boolean;
};

export type ProductUnitRef = {
  id: string;
  code: string;
  name: string;
  decimalPlaces: number;
};

export type ProductListItem = {
  id: string;
  productCode: string;
  name: string;
  description?: string | null;
  status: string;
  isBatchTracked?: boolean;
  isExpiryTracked?: boolean;
  isReturnable?: boolean;
  brandId?: string | null;
  categoryId?: string | null;
  taxCodeId?: string | null;
  defaultCrateTypeId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  brand?: ProductBrandRef | null;
  category?: ProductCategoryRef | null;
  taxCode?: ProductTaxCodeRef | null;
  defaultCrateType?: ProductCrateTypeRef | null;
};

export type ProductVariantRow = {
  id: string;
  productId: string;
  sku: string;
  variantName?: string | null;
  sizeValue?: number | string | null;
  unitId?: string | null;
  unit?: ProductUnitRef | null;
  barcode?: string | null;
  mrp: number | string;
  distributorPrice: number | string;
  defaultRetailerPrice: number | string;
  offerPrice?: number | string | null;
  status?: string | null;
  product?: {
    id: string;
    name: string;
  } | null;
};

export type ProductDetail = ProductListItem & {
  variants?: ProductVariantRow[];
};

export type UpdateProductPayload = Partial<CreateProductPayload>;
export type UpdateProductVariantPayload = Partial<
  Omit<CreateProductVariantPayload, 'productId'>
>;

export type ProductFilters = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  availableOnly?: string;
};

export type CreateProductPayload = {
  productCode: string;
  name: string;
  brandId?: string | null;
  categoryId?: string | null;
  description?: string;
  taxCodeId?: string | null;
  isBatchTracked?: boolean;
  isExpiryTracked?: boolean;
  isReturnable?: boolean;
  defaultCrateTypeId?: string | null;
  status?: string;
};

export type CreateProductVariantPayload = {
  productId: string;
  sku: string;
  variantName?: string;
  sizeValue?: number;
  unitId?: string | null;
  barcode?: string;
  mrp: number;
  distributorPrice: number;
  defaultRetailerPrice: number;
  offerPrice?: number;
  status?: string;
};
