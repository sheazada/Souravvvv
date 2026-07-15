'use client';

import React from 'react';
import { LookupInput } from '@/components/ui/lookup-input';
import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';
import { ProductsApi } from '@/features/products/api';
import { formatCurrency } from '@/lib/utils/number';
import { buildDetailTitle } from '@/lib/utils/title';
import type {
  ProductDetail,
  ProductVariantRow,
  UpdateProductPayload,
  UpdateProductVariantPayload,
} from '@/types/products';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

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

function buildProductForm(product: ProductDetail): UpdateProductPayload {
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

function buildVariantForm(variant: ProductVariantRow): UpdateProductVariantPayload {
  return {
    sku: variant.sku,
    variantName: variant.variantName ?? '',
    sizeValue: variant.sizeValue !== null && variant.sizeValue !== undefined ? Number(variant.sizeValue) : undefined,
    unitId: variant.unitId ?? variant.unit?.id ?? null,
    barcode: variant.barcode ?? '',
    mrp: Number(variant.mrp ?? 0),
    distributorPrice: Number(variant.distributorPrice ?? 0),
    defaultRetailerPrice: Number(variant.defaultRetailerPrice ?? 0),
    offerPrice:
      variant.offerPrice !== null && variant.offerPrice !== undefined
        ? Number(variant.offerPrice)
        : undefined,
    status: variant.status ?? 'active',
  };
}

export function ProductDetailView({ id }: { id: string }) {
  const routeMeta = getAdminRouteMeta('products');
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [productForm, setProductForm] = useState<UpdateProductPayload>({});
  const [variantForm, setVariantForm] = useState<UpdateProductVariantPayload>({});

  const [productQuery, variantsQuery] = useQueries({
    queries: [
      { queryKey: ['product', id], queryFn: () => ProductsApi.getById(id) },
      { queryKey: ['product', id, 'variants'], queryFn: () => ProductsApi.getVariants(id) },
    ],
  });

  const product = productQuery.data?.data;
  const variants = variantsQuery.data?.data ?? [];

  useEffect(() => {
    if (product) {
      setProductForm(buildProductForm(product));
    }
  }, [product]);

  useEffect(() => {
    if (!variants.length) {
      setSelectedVariantId('');
      setVariantForm({});
      return;
    }

    const selected = variants.find((item) => item.id === selectedVariantId) ?? variants[0];
    setSelectedVariantId(selected.id);
    setVariantForm(buildVariantForm(selected));
  }, [variants, selectedVariantId]);

  const updateProductMutation = useMutation({
    mutationFn: (payload: UpdateProductPayload) => ProductsApi.update(id, payload),
    onSuccess: (response) => {
      setMessage(response.message || 'Product updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update product');
    },
  });

  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, payload }: { variantId: string; payload: UpdateProductVariantPayload }) =>
      ProductsApi.updateVariant(variantId, payload),
    onSuccess: (response) => {
      setMessage(response.message || 'Product variant updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['product', id, 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update product variant');
    },
  });

  const updateVariantStatusMutation = useMutation({
    mutationFn: ({ variantId, status }: { variantId: string; status: 'active' | 'inactive' }) =>
      ProductsApi.updateVariantStatus(variantId, status),
    onSuccess: (response) => {
      setMessage(response.message || 'Product variant status updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['product', id, 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update product variant status');
    },
  });

  const isLoading = productQuery.isLoading || variantsQuery.isLoading;
  const error = productQuery.error ?? variantsQuery.error;

  const selectedVariant = useMemo(
    () => variants.find((item) => item.id === selectedVariantId) ?? null,
    [variants, selectedVariantId],
  );

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading product detail...</div>;
  }

  if (error || !product) {
    return (
      <EmptyState
        title="Unable to load product detail"
        description={error instanceof Error ? error.message : 'Product detail unavailable'}
      />
    );
  }

  async function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!productForm.productCode?.trim() || !productForm.name?.trim()) {
      setMessage('Product code and product name are required.');
      return;
    }

    await updateProductMutation.mutateAsync({
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

    if (!selectedVariantId) {
      setMessage('Select a variant before saving changes.');
      return;
    }
    if (!variantForm.sku?.trim()) {
      setMessage('Variant SKU is required.');
      return;
    }
    if (
      Number(variantForm.mrp ?? 0) <= 0 ||
      Number(variantForm.distributorPrice ?? 0) <= 0 ||
      Number(variantForm.defaultRetailerPrice ?? 0) <= 0
    ) {
      setMessage('MRP, distributor price, and default retailer price must be greater than zero.');
      return;
    }

    await updateVariantMutation.mutateAsync({
      variantId: selectedVariantId,
      payload: {
        ...variantForm,
        sku: variantForm.sku.trim(),
        variantName: normalizeOptionalText(variantForm.variantName),
        sizeValue: normalizeOptionalPositiveNumber(variantForm.sizeValue),
        unitId: normalizeOptionalId(variantForm.unitId),
        barcode: normalizeOptionalText(variantForm.barcode),
        offerPrice: normalizeOptionalPositiveNumber(variantForm.offerPrice),
        status: variantForm.status ?? 'active',
      },
    });
  }

  return (
    <div>
      <PageHeader
        title={buildDetailTitle(routeMeta.detailPageTitle ?? routeMeta.pageTitle, product.name)}
        description={routeMeta.detailPageDescription}
      />

      {message ? (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
          {message}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Product Code" value={product.productCode} />
        <KpiCard label="Status" value={product.status} />
        <KpiCard label="Variants" value={variants.length} />
        <KpiCard label="Selected Variant" value={selectedVariant?.variantName ?? selectedVariant?.sku ?? 'None'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <form onSubmit={submitProduct} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Product Master</h2>
            <p className="mt-1 text-sm text-slate-500">
              Update product identity, master relations, lifecycle status, and tracking flags.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={productForm.productCode ?? ''}
              onChange={(event) => setProductForm((current) => ({ ...current, productCode: event.target.value }))}
              placeholder="Product code"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            />
            <input
              value={productForm.name ?? ''}
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
            disabled={updateProductMutation.isPending}
            className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateProductMutation.isPending ? 'Saving product...' : 'Save Product Changes'}
          </button>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Variants</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a variant to edit SKU, unit-linked size, barcode, and pricing fields.
            </p>
          </div>

          {variants.length ? (
            <div className="space-y-3">
              {variants.map((variant) => {
                const isSelected = selectedVariantId === variant.id;
                const nextStatus = (variant.status ?? 'active') === 'active' ? 'inactive' : 'active';

                return (
                  <div
                    key={variant.id}
                    className={`rounded-xl border px-3 py-3 text-sm ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setVariantForm(buildVariantForm(variant));
                      }}
                      className="w-full text-left"
                    >
                      <div className="font-medium">{variant.variantName ?? variant.sku}</div>
                      <div className="mt-1 text-xs opacity-80">SKU: {variant.sku}</div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs opacity-80">
                        {variant.sizeValue ? <span>Size: {variant.sizeValue}</span> : null}
                        {variant.unit?.name ? <span>Unit: {variant.unit.name}</span> : null}
                        {variant.barcode ? <span>Barcode: {variant.barcode}</span> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs opacity-80">
                        <span>MRP: {formatCurrency(Number(variant.mrp ?? 0))}</span>
                        <span>Distributor: {formatCurrency(Number(variant.distributorPrice ?? 0))}</span>
                        <span>Retailer: {formatCurrency(Number(variant.defaultRetailerPrice ?? 0))}</span>
                        <span>Status: {variant.status ?? 'active'}</span>
                      </div>
                    </button>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setVariantForm(buildVariantForm(variant));
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          isSelected
                            ? 'border border-white/40 text-white hover:bg-white/10'
                            : 'border border-slate-300 text-slate-700 hover:bg-white'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Edit Variant'}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateVariantStatusMutation.mutate({ variantId: variant.id, status: nextStatus })}
                        disabled={updateVariantStatusMutation.isPending}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          isSelected
                            ? 'border border-amber-200 text-amber-100 hover:bg-white/10'
                            : 'border border-amber-300 text-amber-800 hover:bg-amber-50'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {(variant.status ?? 'active') === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No variants found" description="Create product variants from the products management page." />
          )}
        </section>
      </div>

      <form onSubmit={submitVariant} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Edit Variant</h2>
            <p className="mt-1 text-sm text-slate-500">
              Update the selected variant's size, unit, barcode, pricing, and status.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Selected Variant:{' '}
            <span className="font-medium text-slate-950">{selectedVariant?.variantName ?? selectedVariant?.sku ?? 'None selected'}</span>
          </div>
        </div>

        {!selectedVariant ? (
          <EmptyState title="Select a variant" description="Choose a variant above to edit its pricing configuration." />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={variantForm.sku ?? ''}
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
                value={variantForm.mrp ?? 0}
                onChange={(event) => setVariantForm((current) => ({ ...current, mrp: Number(event.target.value) }))}
                placeholder="MRP"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={variantForm.distributorPrice ?? 0}
                onChange={(event) =>
                  setVariantForm((current) => ({ ...current, distributorPrice: Number(event.target.value) }))
                }
                placeholder="Distributor price"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={variantForm.defaultRetailerPrice ?? 0}
                onChange={(event) =>
                  setVariantForm((current) => ({ ...current, defaultRetailerPrice: Number(event.target.value) }))
                }
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
              <select
                value={variantForm.status ?? 'active'}
                onChange={(event) => setVariantForm((current) => ({ ...current, status: event.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={updateVariantMutation.isPending}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updateVariantMutation.isPending ? 'Saving variant...' : 'Save Variant Changes'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
