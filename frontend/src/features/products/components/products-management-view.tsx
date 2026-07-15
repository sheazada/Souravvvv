'use client';

import React from 'react';
import { LookupInput } from '@/components/ui/lookup-input';
import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { ProductsApi } from '@/features/products/api';
import { formatCurrency } from '@/lib/utils/number';
import type {
  CreateProductPayload,
  CreateProductVariantPayload,
  ProductFilters,
  ProductListItem,
  UpdateProductPayload,
} from '@/types/products';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';

const DEFAULT_FILTERS: ProductFilters = {
  page: 1,
  limit: 20,
  search: '',
  brandId: '',
  categoryId: '',
  availableOnly: '',
};

const DEFAULT_PRODUCT_FORM: CreateProductPayload = {
  productCode: '',
  name: '',
  brandId: null,
  categoryId: null,
  description: '',
  taxCodeId: null,
  isBatchTracked: false,
  isExpiryTracked: false,
  isReturnable: true,
  defaultCrateTypeId: null,
  status: 'active',
};

const DEFAULT_VARIANT_FORM: CreateProductVariantPayload = {
  productId: '',
  sku: '',
  variantName: '',
  sizeValue: undefined,
  unitId: null,
  barcode: '',
  mrp: 0,
  distributorPrice: 0,
  defaultRetailerPrice: 0,
  offerPrice: undefined,
  status: 'active',
};

function normalizeLookupValue(value?: string | null) {
  return value ?? '';
}

function normalizeOptionalId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeOptionalPositiveNumber(value?: number | string | null) {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildProductEditDraft(product: ProductListItem): UpdateProductPayload {
  return {
    productCode: product.productCode,
    name: product.name,
    brandId: product.brandId ?? product.brand?.id ?? null,
    categoryId: product.categoryId ?? product.category?.id ?? null,
    description: product.description ?? '',
    taxCodeId: product.taxCodeId ?? product.taxCode?.id ?? null,
    isBatchTracked: Boolean(product.isBatchTracked),
    isExpiryTracked: Boolean(product.isExpiryTracked),
    isReturnable: product.isReturnable !== false,
    defaultCrateTypeId: product.defaultCrateTypeId ?? product.defaultCrateType?.id ?? null,
    status: product.status,
  };
}

function renderMasterSummary(product: ProductListItem) {
  const parts = [
    product.brand?.name ? `Brand: ${product.brand.name}` : null,
    product.category?.name ? `Category: ${product.category.name}` : null,
    product.taxCode?.code ? `Tax: ${product.taxCode.code}` : null,
    product.defaultCrateType?.name ? `Crate: ${product.defaultCrateType.name}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(' • ') : 'No master links assigned';
}

export function ProductsManagementView() {
  const routeMeta = getAdminRouteMeta('products');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [editingProductId, setEditingProductId] = useState<string>('');
  const [productForm, setProductForm] = useState<CreateProductPayload>(DEFAULT_PRODUCT_FORM);
  const [productEditDraft, setProductEditDraft] = useState<UpdateProductPayload>({});
  const [variantForm, setVariantForm] = useState<CreateProductVariantPayload>(DEFAULT_VARIANT_FORM);

  const [productsQuery, variantsQuery] = useQueries({
    queries: [
      {
        queryKey: ['products', filters],
        queryFn: () => ProductsApi.list(filters),
      },
      {
        queryKey: ['products', selectedProductId, 'variants'],
        queryFn: () => ProductsApi.getVariants(selectedProductId),
        enabled: Boolean(selectedProductId),
      },
    ],
  });

  const createProductMutation = useMutation({
    mutationFn: (payload: CreateProductPayload) => ProductsApi.create(payload),
    onSuccess: (response) => {
      setMessage(response.message || 'Product created successfully.');
      setProductForm(DEFAULT_PRODUCT_FORM);
      if (response.data?.id) {
        setSelectedProductId(response.data.id);
        setVariantForm((current) => ({ ...current, productId: response.data.id }));
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to create product');
    },
  });

  const createVariantMutation = useMutation({
    mutationFn: (payload: CreateProductVariantPayload) =>
      ProductsApi.createVariant(payload.productId, payload),
    onSuccess: (response) => {
      setMessage(response.message || 'Product variant created successfully.');
      setVariantForm((current) => ({
        ...DEFAULT_VARIANT_FORM,
        productId: current.productId,
      }));
      queryClient.invalidateQueries({ queryKey: ['products', selectedProductId, 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to create product variant');
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      ProductsApi.update(id, payload),
    onSuccess: (response, variables) => {
      setMessage(response.message || 'Product updated successfully.');
      setEditingProductId('');
      setProductEditDraft({});
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update product');
    },
  });

  const updateProductStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      ProductsApi.updateStatus(id, status),
    onSuccess: (response) => {
      setMessage(response.message || 'Product status updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedProductId) {
        queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] });
      }
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update product status');
    },
  });

  const products = productsQuery.data?.data ?? [];
  const productsMeta = productsQuery.data?.meta;
  const variants = variantsQuery.data?.data ?? [];

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const activeProducts = useMemo(
    () => products.filter((item) => item.status === 'active').length,
    [products],
  );

  const variantCount = variants.length;

  function selectProduct(productId: string) {
    setSelectedProductId(productId);
    setVariantForm((current) => ({ ...current, productId }));
  }

  function startInlineEdit(product: ProductListItem) {
    setEditingProductId(product.id);
    setProductEditDraft(buildProductEditDraft(product));
  }

  function cancelInlineEdit() {
    setEditingProductId('');
    setProductEditDraft({});
  }

  async function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!productForm.productCode.trim() || !productForm.name.trim()) {
      setMessage('Product code and product name are required.');
      return;
    }

    await createProductMutation.mutateAsync({
      ...productForm,
      productCode: productForm.productCode.trim(),
      name: productForm.name.trim(),
      brandId: normalizeOptionalId(productForm.brandId),
      categoryId: normalizeOptionalId(productForm.categoryId),
      description: normalizeOptionalText(productForm.description),
      taxCodeId: normalizeOptionalId(productForm.taxCodeId),
      defaultCrateTypeId: normalizeOptionalId(productForm.defaultCrateTypeId),
      status: productForm.status ?? 'active',
    });
  }

  async function submitVariant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!variantForm.productId.trim()) {
      setMessage('Select a product before creating a variant.');
      return;
    }
    if (!variantForm.sku.trim()) {
      setMessage('Variant SKU is required.');
      return;
    }
    if (variantForm.mrp <= 0 || variantForm.distributorPrice <= 0 || variantForm.defaultRetailerPrice <= 0) {
      setMessage('MRP, distributor price, and default retailer price must be greater than zero.');
      return;
    }

    await createVariantMutation.mutateAsync({
      ...variantForm,
      productId: variantForm.productId.trim(),
      sku: variantForm.sku.trim(),
      variantName: normalizeOptionalText(variantForm.variantName),
      sizeValue: normalizeOptionalPositiveNumber(variantForm.sizeValue),
      unitId: normalizeOptionalId(variantForm.unitId),
      barcode: normalizeOptionalText(variantForm.barcode),
      offerPrice: normalizeOptionalPositiveNumber(variantForm.offerPrice),
      status: variantForm.status ?? 'active',
    });
  }

  async function saveInlineProductEdit(productId: string) {
    setMessage(null);

    if (!productEditDraft.productCode?.trim() || !productEditDraft.name?.trim()) {
      setMessage('Product code and product name are required.');
      return;
    }

    await updateProductMutation.mutateAsync({
      id: productId,
      payload: {
        ...productEditDraft,
        productCode: productEditDraft.productCode.trim(),
        name: productEditDraft.name.trim(),
        brandId: normalizeOptionalId(productEditDraft.brandId),
        categoryId: normalizeOptionalId(productEditDraft.categoryId),
        description: normalizeOptionalText(productEditDraft.description),
        taxCodeId: normalizeOptionalId(productEditDraft.taxCodeId),
        defaultCrateTypeId: normalizeOptionalId(productEditDraft.defaultCrateTypeId),
        status: productEditDraft.status ?? 'active',
      },
    });
  }

  return (
    <div>
      <PageHeader title={routeMeta.pageTitle} description={routeMeta.pageDescription} />

      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
          {message}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Products Loaded" value={productsMeta?.total ?? products.length} />
        <KpiCard label="Active Products" value={activeProducts} />
        <KpiCard label="Selected Product Variants" value={variantCount} />
        <KpiCard label="Selected Product" value={selectedProduct?.name ?? 'None'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              value={filters.search ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
              placeholder="Search by code, name, description"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            />
            <LookupInput
              resource="brands"
              value={filters.brandId ?? ''}
              onChange={(value) => setFilters((current) => ({ ...current, brandId: value, page: 1 }))}
              placeholder="Filter by brand"
              searchPlaceholder="Search brand"
              allowCustomValue={false}
              allowClear
            />
            <LookupInput
              resource="productCategories"
              value={filters.categoryId ?? ''}
              onChange={(value) => setFilters((current) => ({ ...current, categoryId: value, page: 1 }))}
              placeholder="Filter by category"
              searchPlaceholder="Search category"
              allowCustomValue={false}
              allowClear
            />
            <select
              value={filters.availableOnly ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, availableOnly: event.target.value, page: 1 }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            >
              <option value="">All products</option>
              <option value="true">Available only</option>
            </select>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset Filters
            </button>
          </div>

          {productsQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading products...</div>
          ) : productsQuery.error ? (
            <EmptyState
              title="Unable to load products"
              description={productsQuery.error instanceof Error ? productsQuery.error.message : 'Unknown product error'}
            />
          ) : products.length === 0 ? (
            <EmptyState title="No products found" description="Create products to start managing variants and pricing." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Tracking</th>
                      <th className="px-4 py-3 font-medium">Master Links</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {products.map((product) => {
                      const isEditing = editingProductId === product.id;

                      return (
                        <Fragment key={product.id}>
                          <tr>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-950">{product.name}</div>
                              <div className="text-xs text-slate-500">{product.description ?? 'No description'}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{product.productCode}</td>
                            <td className="px-4 py-3 text-slate-700">{product.status}</td>
                            <td className="px-4 py-3 text-slate-700">
                              <div className="text-xs">Batch: {product.isBatchTracked ? 'Yes' : 'No'}</div>
                              <div className="text-xs">Expiry: {product.isExpiryTracked ? 'Yes' : 'No'}</div>
                              <div className="text-xs">Returnable: {product.isReturnable ? 'Yes' : 'No'}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">{renderMasterSummary(product)}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => selectProduct(product.id)}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                                    selectedProductId === product.id
                                      ? 'bg-slate-900 text-white'
                                      : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {selectedProductId === product.id ? 'Selected' : 'Quick Variants'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startInlineEdit(product)}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                                    isEditing
                                      ? 'bg-slate-900 text-white'
                                      : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {isEditing ? 'Editing' : 'Inline Edit'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateProductStatusMutation.mutate({
                                      id: product.id,
                                      status: product.status === 'active' ? 'inactive' : 'active',
                                    })
                                  }
                                  disabled={updateProductStatusMutation.isPending}
                                  className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {product.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <Link
                                  href={`/app/products/${product.id}`}
                                  className="rounded-lg border border-cyan-300 px-3 py-1.5 text-xs font-medium text-cyan-900 hover:bg-cyan-50"
                                >
                                  Open Detail
                                </Link>
                              </div>
                            </td>
                          </tr>
                          {isEditing ? (
                            <tr>
                              <td colSpan={6} className="bg-slate-50 px-4 py-4">
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <h3 className="text-sm font-semibold text-slate-950">Inline Product Edit</h3>
                                      <p className="mt-1 text-xs text-slate-500">
                                        Update master links, pricing tax setup, and tracking flags without leaving the list.
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={cancelInlineEdit}
                                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <input
                                      value={productEditDraft.productCode ?? ''}
                                      onChange={(event) =>
                                        setProductEditDraft((current) => ({ ...current, productCode: event.target.value }))
                                      }
                                      placeholder="Product code"
                                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                                    />
                                    <input
                                      value={productEditDraft.name ?? ''}
                                      onChange={(event) =>
                                        setProductEditDraft((current) => ({ ...current, name: event.target.value }))
                                      }
                                      placeholder="Product name"
                                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                                    />
                                    <LookupInput
                                      resource="brands"
                                      value={normalizeLookupValue(productEditDraft.brandId)}
                                      onChange={(value) =>
                                        setProductEditDraft((current) => ({ ...current, brandId: value || null }))
                                      }
                                      placeholder="Select brand"
                                      searchPlaceholder="Search brand"
                                      allowCustomValue={false}
                                      allowClear
                                    />
                                    <LookupInput
                                      resource="productCategories"
                                      value={normalizeLookupValue(productEditDraft.categoryId)}
                                      onChange={(value) =>
                                        setProductEditDraft((current) => ({ ...current, categoryId: value || null }))
                                      }
                                      placeholder="Select category"
                                      searchPlaceholder="Search category"
                                      allowCustomValue={false}
                                      allowClear
                                    />
                                    <LookupInput
                                      resource="taxCodes"
                                      value={normalizeLookupValue(productEditDraft.taxCodeId)}
                                      onChange={(value) =>
                                        setProductEditDraft((current) => ({ ...current, taxCodeId: value || null }))
                                      }
                                      placeholder="Select tax code"
                                      searchPlaceholder="Search tax code or HSN"
                                      allowCustomValue={false}
                                      allowClear
                                    />
                                    <LookupInput
                                      resource="crateTypes"
                                      value={normalizeLookupValue(productEditDraft.defaultCrateTypeId)}
                                      onChange={(value) =>
                                        setProductEditDraft((current) => ({ ...current, defaultCrateTypeId: value || null }))
                                      }
                                      placeholder="Select default crate"
                                      searchPlaceholder="Search crate type"
                                      allowCustomValue={false}
                                      allowClear
                                    />
                                    <select
                                      value={productEditDraft.status ?? 'active'}
                                      onChange={(event) =>
                                        setProductEditDraft((current) => ({ ...current, status: event.target.value }))
                                      }
                                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                                    >
                                      <option value="active">Active</option>
                                      <option value="inactive">Inactive</option>
                                    </select>
                                    <div className="grid grid-cols-3 gap-2 xl:col-span-1">
                                      <label className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(productEditDraft.isBatchTracked)}
                                          onChange={(event) =>
                                            setProductEditDraft((current) => ({
                                              ...current,
                                              isBatchTracked: event.target.checked,
                                            }))
                                          }
                                          className="mr-2"
                                        />
                                        Batch
                                      </label>
                                      <label className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(productEditDraft.isExpiryTracked)}
                                          onChange={(event) =>
                                            setProductEditDraft((current) => ({
                                              ...current,
                                              isExpiryTracked: event.target.checked,
                                            }))
                                          }
                                          className="mr-2"
                                        />
                                        Expiry
                                      </label>
                                      <label className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700">
                                        <input
                                          type="checkbox"
                                          checked={productEditDraft.isReturnable !== false}
                                          onChange={(event) =>
                                            setProductEditDraft((current) => ({
                                              ...current,
                                              isReturnable: event.target.checked,
                                            }))
                                          }
                                          className="mr-2"
                                        />
                                        Returnable
                                      </label>
                                    </div>
                                    <textarea
                                      value={productEditDraft.description ?? ''}
                                      onChange={(event) =>
                                        setProductEditDraft((current) => ({ ...current, description: event.target.value }))
                                      }
                                      placeholder="Description"
                                      className="min-h-[84px] rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2 xl:col-span-4"
                                    />
                                  </div>
                                  <div className="mt-4 flex flex-wrap gap-3">
                                    <button
                                      type="button"
                                      onClick={() => saveInlineProductEdit(product.id)}
                                      disabled={updateProductMutation.isPending}
                                      className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {updateProductMutation.isPending ? 'Saving...' : 'Save Inline Changes'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setProductEditDraft(buildProductEditDraft(product))}
                                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      Restore Row Values
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>
                  Page {productsMeta?.page ?? 1} of {productsMeta?.totalPages ?? 1}
                </span>
                <span>{productsMeta?.total ?? products.length} products</span>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <form onSubmit={submitProduct} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">Create Product</h2>
              <p className="mt-1 text-sm text-slate-500">
                Link brand, category, tax, and crate masters while setting up the product shell.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={productForm.productCode}
                onChange={(event) => setProductForm((current) => ({ ...current, productCode: event.target.value }))}
                placeholder="Product code"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              />
              <input
                value={productForm.name}
                onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Product name"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              />
              <LookupInput
                resource="brands"
                value={normalizeLookupValue(productForm.brandId)}
                onChange={(value) => setProductForm((current) => ({ ...current, brandId: value || null }))}
                placeholder="Select brand"
                searchPlaceholder="Search brand"
                allowCustomValue={false}
                allowClear
              />
              <LookupInput
                resource="productCategories"
                value={normalizeLookupValue(productForm.categoryId)}
                onChange={(value) => setProductForm((current) => ({ ...current, categoryId: value || null }))}
                placeholder="Select category"
                searchPlaceholder="Search category"
                allowCustomValue={false}
                allowClear
              />
              <LookupInput
                resource="taxCodes"
                value={normalizeLookupValue(productForm.taxCodeId)}
                onChange={(value) => setProductForm((current) => ({ ...current, taxCodeId: value || null }))}
                placeholder="Select tax code"
                searchPlaceholder="Search tax code or HSN"
                allowCustomValue={false}
                allowClear
              />
              <LookupInput
                resource="crateTypes"
                value={normalizeLookupValue(productForm.defaultCrateTypeId)}
                onChange={(value) => setProductForm((current) => ({ ...current, defaultCrateTypeId: value || null }))}
                placeholder="Select default crate"
                searchPlaceholder="Search crate type"
                allowCustomValue={false}
                allowClear
              />
              <textarea
                value={productForm.description ?? ''}
                onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Description"
                className="min-h-[88px] rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2"
              />
              <select
                value={productForm.status ?? 'active'}
                onChange={(event) => setProductForm((current) => ({ ...current, status: event.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="grid grid-cols-3 gap-2 md:col-span-2">
                <label className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(productForm.isBatchTracked)}
                    onChange={(event) => setProductForm((current) => ({ ...current, isBatchTracked: event.target.checked }))}
                    className="mr-2"
                  />
                  Batch
                </label>
                <label className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(productForm.isExpiryTracked)}
                    onChange={(event) => setProductForm((current) => ({ ...current, isExpiryTracked: event.target.checked }))}
                    className="mr-2"
                  />
                  Expiry
                </label>
                <label className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={productForm.isReturnable !== false}
                    onChange={(event) => setProductForm((current) => ({ ...current, isReturnable: event.target.checked }))}
                    className="mr-2"
                  />
                  Returnable
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={createProductMutation.isPending}
              className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createProductMutation.isPending ? 'Creating product...' : 'Create Product'}
            </button>
          </form>

          <form onSubmit={submitVariant} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">Create Variant</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add saleable pack details with unit-backed sizing and pricing.
              </p>
            </div>
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Selected Product: <span className="font-medium text-slate-950">{selectedProduct?.name ?? 'None selected'}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={variantForm.sku}
                onChange={(event) => setVariantForm((current) => ({ ...current, sku: event.target.value }))}
                placeholder="SKU"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              />
              <input
                value={variantForm.variantName ?? ''}
                onChange={(event) => setVariantForm((current) => ({ ...current, variantName: event.target.value }))}
                placeholder="Variant name"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                min={0}
                step="0.001"
                value={variantForm.sizeValue ?? ''}
                onChange={(event) =>
                  setVariantForm((current) => ({
                    ...current,
                    sizeValue: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
                placeholder="Pack size (optional)"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              />
              <LookupInput
                resource="units"
                value={normalizeLookupValue(variantForm.unitId)}
                onChange={(value) => setVariantForm((current) => ({ ...current, unitId: value || null }))}
                placeholder="Select unit"
                searchPlaceholder="Search unit"
                allowCustomValue={false}
                allowClear
              />
              <input
                value={variantForm.barcode ?? ''}
                onChange={(event) => setVariantForm((current) => ({ ...current, barcode: event.target.value }))}
                placeholder="Barcode (optional)"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2"
              />
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={variantForm.mrp}
                onChange={(event) => setVariantForm((current) => ({ ...current, mrp: Number(event.target.value) }))}
                placeholder="MRP"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={variantForm.distributorPrice}
                onChange={(event) => setVariantForm((current) => ({ ...current, distributorPrice: Number(event.target.value) }))}
                placeholder="Distributor price"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={variantForm.defaultRetailerPrice}
                onChange={(event) => setVariantForm((current) => ({ ...current, defaultRetailerPrice: Number(event.target.value) }))}
                placeholder="Default retailer price"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={variantForm.offerPrice ?? ''}
                onChange={(event) =>
                  setVariantForm((current) => ({
                    ...current,
                    offerPrice: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
                placeholder="Offer price (optional)"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={createVariantMutation.isPending || !selectedProductId}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createVariantMutation.isPending ? 'Creating variant...' : 'Create Variant'}
            </button>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Selected Product Variants</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review unit-linked variants and pricing for the selected product.
                </p>
              </div>
            </div>

            {!selectedProductId ? (
              <EmptyState title="Select a product" description="Choose a product from the list to view and manage its variants." />
            ) : variantsQuery.isLoading ? (
              <div className="text-sm text-slate-500">Loading variants...</div>
            ) : variantsQuery.error ? (
              <EmptyState
                title="Unable to load product variants"
                description={variantsQuery.error instanceof Error ? variantsQuery.error.message : 'Unknown variant error'}
              />
            ) : variants.length === 0 ? (
              <EmptyState title="No variants found" description="Create the first variant for this product using the form above." />
            ) : (
              <div className="space-y-3">
                {variants.map((variant) => (
                  <div key={variant.id} className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="font-medium text-slate-950">{variant.variantName ?? variant.sku}</div>
                    <div className="mt-1 text-xs text-slate-500">SKU: {variant.sku}</div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                      {variant.sizeValue ? <span>Size: {variant.sizeValue}</span> : null}
                      {variant.unit?.name ? <span>Unit: {variant.unit.name}</span> : null}
                      {variant.barcode ? <span>Barcode: {variant.barcode}</span> : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-slate-700">
                      <span>MRP: {formatCurrency(Number(variant.mrp ?? 0))}</span>
                      <span>Distributor: {formatCurrency(Number(variant.distributorPrice ?? 0))}</span>
                      <span>Retailer: {formatCurrency(Number(variant.defaultRetailerPrice ?? 0))}</span>
                      <span>Status: {variant.status ?? 'active'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
