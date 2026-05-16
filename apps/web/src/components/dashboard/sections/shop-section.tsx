"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { ErrorNotice } from "../operational-shared";
import { EmptyState, SectionHeader } from "../../dashboard-primitives";
import { ConfirmActionButton } from "../../confirm-action-button";
import { GlassCard, Pill } from "../../glass-card";
import { ImageAssetUpload } from "../../image-asset-upload";
import { HelpHint } from "../../ui";
import { ZookButton } from "../../zook-button";
import { ShopOrdersSection } from "./shop-orders-section";
import { ShopStatusCard } from "./shop-status-card";
import type {
  BranchScopeSnapshot,
  OrganizationSummary,
  ProductCategory,
  ProductRow,
  ShopOrderRow,
} from "../../dashboard-operational-model";
import { formatEnumLabel, formatInr } from "@/lib/format";

export type ProductFormState = {
  name: string;
  category: ProductCategory;
  priceRupees: string;
  stock: string;
  lowStockThreshold: string;
  description: string;
  imageAssetId: string;
  imageAssetIds: string[];
  imagePreviewUrl: string;
  imagePreviewUrls: string[];
  active: boolean;
};

type StockAdjustmentState = {
  productId: string;
  delta: string;
  reason: string;
};

type ShopSectionProps = {
  view?: "products" | "orders";
  orgId: string;
  summary: OrganizationSummary;
  branchScope: BranchScopeSnapshot;
  selectedBranchName: string;
  inventory: ProductRow[];
  shopOrders: ShopOrderRow[];
  queuedOrders: ShopOrderRow[];
  readyOrders: ShopOrderRow[];
  productsState: {
    error?: string | null;
    loading: boolean;
  };
  shopOrdersState: {
    error?: string | null;
    loading: boolean;
  };
  productForm: ProductFormState;
  setProductForm: Dispatch<SetStateAction<ProductFormState>>;
  productEditForm: ProductFormState;
  setProductEditForm: Dispatch<SetStateAction<ProductFormState>>;
  editingProductId: string | null;
  setEditingProductId: Dispatch<SetStateAction<string | null>>;
  stockAdjustment: StockAdjustmentState;
  setStockAdjustment: Dispatch<SetStateAction<StockAdjustmentState>>;
  formError: string;
  formStatus: string;
  formBusy: string | null;
  createProduct: () => Promise<void>;
  startProductEdit: (product: ProductRow) => void;
  updateProduct: (
    productId: string,
    patch?: Partial<{
      name: string;
      description?: string;
      category: ProductCategory;
      pricePaise: number;
      stock: number;
      lowStockThreshold: number;
      imageAssetId: string;
      imageAssetIds: string[];
      imageUrls: string[];
      active: boolean;
    }>,
  ) => Promise<void>;
  adjustStock: (productId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
};

const productCategories: ProductCategory[] = [
  "WATER",
  "PROTEIN_SHAKE",
  "SHAKER",
  "TOWEL",
  "SUPPLEMENT",
  "OTHER",
];

function uniqueProductImages(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= 6) break;
  }
  return result;
}

function productImagesFromForm(form: ProductFormState) {
  return uniqueProductImages([
    ...form.imagePreviewUrls,
    form.imagePreviewUrl,
  ]);
}

function productImagesFromProduct(product: ProductRow) {
  return uniqueProductImages([
    ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
    product.imageUrl,
  ]);
}

function ProductPhotosField({
  orgId,
  label,
  form,
  setForm,
}: {
  orgId: string;
  label: string;
  form: ProductFormState;
  setForm: Dispatch<SetStateAction<ProductFormState>>;
}) {
  const images = productImagesFromForm(form);

  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="mt-1 text-xs text-white/42">
            Add up to 6 clear photos. The first photo appears first in the shop.
          </p>
        </div>
        <Pill tone={images.length ? "lime" : "neutral"}>{images.length}/6 photos</Pill>
      </div>
      {images.length < 6 ? (
        <ImageAssetUpload
          orgId={orgId}
          category="product_image"
          label="Add photo"
          helper="Square or slightly wide"
          valueUrl={images[0] ?? ""}
          aspectClassName="h-20"
          onUploaded={(asset) =>
            setForm((current) => {
              const imagePreviewUrls = uniqueProductImages([
                ...productImagesFromForm(current),
                asset.url,
              ]);
              return {
                ...current,
                imageAssetId: asset.assetId,
                imageAssetIds: uniqueProductImages([...current.imageAssetIds, asset.assetId]),
                imagePreviewUrl: imagePreviewUrls[0] ?? "",
                imagePreviewUrls,
              };
            })
          }
        />
      ) : null}
      {images.length ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {images.map((imageUrl, index) => (
            <div key={imageUrl} className="relative overflow-hidden rounded-2xl border border-white/10">
              <img
                src={imageUrl}
                alt={`${label} ${index + 1}`}
                className="aspect-[4/3] w-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setForm((current) => {
                    const imagePreviewUrls = productImagesFromForm(current).filter(
                      (currentUrl) => currentUrl !== imageUrl,
                    );
                    return {
                      ...current,
                      imageAssetId: "",
                      imageAssetIds: [],
                      imagePreviewUrl: imagePreviewUrls[0] ?? "",
                      imagePreviewUrls,
                    };
                  })
                }
                className="zook-focus absolute right-2 top-2 rounded-full border border-white/15 bg-black/70 px-2 py-1 text-[11px] font-semibold text-white"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 px-4 py-5 text-center text-sm text-white/42">
          No product photos attached yet.
        </div>
      )}
    </div>
  );
}

export function ShopSection({
  view = "products",
  orgId,
  summary,
  branchScope,
  selectedBranchName,
  inventory,
  shopOrders,
  queuedOrders,
  readyOrders,
  productsState,
  shopOrdersState,
  productForm,
  setProductForm,
  productEditForm,
  setProductEditForm,
  editingProductId,
  setEditingProductId,
  stockAdjustment,
  setStockAdjustment,
  formError,
  formBusy,
  createProduct,
  startProductEdit,
  updateProduct,
  adjustStock,
  deleteProduct,
}: ShopSectionProps) {
  const showOrders = view === "orders";
  const showProducts = view === "products";
  const scopeLabel = branchScope.selectedBranch
    ? `${selectedBranchName} has its own stock`
    : "Showing all products. Choose a branch to update branch stock.";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {[
          { href: "/dashboard/shop", label: "Products", active: showProducts },
          { href: "/dashboard/shop/orders", label: "Orders", active: showOrders },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`zook-focus rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tab.active
                ? "border-lime-300/45 bg-lime-300/14 text-lime-100"
                : "border-white/10 text-white/60 hover:bg-white/8 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {showOrders ? (
        <ShopOrdersSection
          orgId={orgId}
          shopOrders={shopOrders}
          readyOrders={readyOrders}
          shopOrdersState={shopOrdersState}
        />
      ) : null}

      {showProducts ? (
        <div className="grid gap-4">
          <GlassCard>
            <SectionHeader
              eyebrow="Inventory"
              title="Low-stock watch"
              description="Inventory is sorted by stock so the team can spot refill needs."
              badge={
                <Pill tone={summary.lowStockProducts > 0 ? "amber" : "lime"}>
                  {summary.lowStockProducts} low
                </Pill>
              }
            />
            <div className="mt-5 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-2 font-medium text-white">
                    Add shop product
                    <HelpHint label="Stock thresholds" title="Stock thresholds">
                      Low-stock alerts fire below the threshold. Out-of-stock products are hidden
                      from the member shop.
                    </HelpHint>
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {scopeLabel}. Product photos should be clear and square or slightly wide.
                  </p>
                </div>
                <Pill tone="blue">Create</Pill>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs font-medium text-white/50">
                  Product name
                  <input
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Protein bar, towel, bottle"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-white/50">
                  Category
                  <select
                    value={productForm.category}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        category: event.target.value as ProductCategory,
                      }))
                    }
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  >
                    {productCategories.map((category) => (
                      <option key={category} value={category} className="bg-black">
                        {formatEnumLabel(category)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-white/50">
                  Price in rupees
                  <input
                    value={productForm.priceRupees}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, priceRupees: event.target.value }))
                    }
                    placeholder="199"
                    inputMode="decimal"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-white/50">
                  Opening stock
                  <input
                    value={productForm.stock}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, stock: event.target.value }))
                    }
                    placeholder="24"
                    inputMode="numeric"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_140px]">
                <label className="grid gap-1 text-xs font-medium text-white/50">
                  Short description
                  <input
                    value={productForm.description}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Short member-facing detail"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-white/50">
                  Low stock alert
                  <input
                    value={productForm.lowStockThreshold}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        lowStockThreshold: event.target.value,
                      }))
                    }
                    placeholder="5"
                    inputMode="numeric"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>
              </div>
              <ProductPhotosField
                orgId={orgId}
                label="Product photos"
                form={productForm}
                setForm={setProductForm}
              />
              <ZookButton
                type="button"
                onClick={() => void createProduct()}
                disabled={formBusy === "product"}
                state={formBusy === "product" ? "loading" : "idle"}
                fullWidth
              >
                {formBusy === "product" ? "Creating..." : "Add product"}
              </ZookButton>
              {formError ? <p className="text-sm text-red-200">{formError}</p> : null}
            </div>
            <div className="mt-5 grid gap-3">
              {productsState.error ? (
                <ErrorNotice message={productsState.error} />
              ) : productsState.loading && inventory.length === 0 ? (
                <EmptyState
                  title="Loading inventory"
                  description="Pulling product availability and stock thresholds."
                />
              ) : inventory.length ? (
                inventory.slice(0, 6).map((product) => (
                  <div
                    key={product.id}
                    className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        {productImagesFromProduct(product).length ? (
                          <img
                            src={productImagesFromProduct(product)[0]}
                            alt={`${product.name} product photo`}
                            className="h-14 w-14 shrink-0 rounded-2xl border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/12 bg-black/30 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                            Photo
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{product.name}</p>
                          <p className="mt-1 text-xs text-white/45">
                            {formatEnumLabel(product.category)} · {formatInr(product.pricePaise)} ·{" "}
                            {product.active ? "Active" : "Archived"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={
                          product.stock <= product.lowStockThreshold
                            ? "text-sm font-medium text-amber-100"
                            : "text-sm font-medium text-white/60"
                        }
                      >
                        {product.stock} left
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <ZookButton
                        type="button"
                        tone="ghost"
                        size="sm"
                        onClick={() => startProductEdit(product)}
                      >
                        Edit
                      </ZookButton>
                      <ZookButton
                        type="button"
                        tone="ghost"
                        size="sm"
                        onClick={() => void updateProduct(product.id, { active: !product.active })}
                        disabled={formBusy === `product:${product.id}`}
                        state={formBusy === `product:${product.id}` ? "loading" : "idle"}
                      >
                        {product.active ? "Archive" : "Restore"}
                      </ZookButton>
                      <ConfirmActionButton
                        title="Delete product?"
                        description="Only unused products can be deleted. Archive products with order history so reports stay consistent."
                        confirmLabel="Delete"
                        onConfirm={() => deleteProduct(product.id)}
                        disabled={formBusy === `product:${product.id}:delete`}
                        className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 hover:border-red-300/45 disabled:opacity-50"
                      >
                        Delete
                      </ConfirmActionButton>
                    </div>
                    {editingProductId === product.id ? (
                      <div className="mt-4 rounded-[20px] border border-lime-300/20 bg-lime-300/6 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">Edit {product.name}</p>
                            <p className="mt-1 text-xs text-white/45">
                              Changes save to {selectedBranchName}. Use stock adjustment for audit
                              history.
                            </p>
                          </div>
                          <ZookButton
                            type="button"
                            tone="ghost"
                            size="sm"
                            onClick={() => setEditingProductId(null)}
                          >
                            Cancel
                          </ZookButton>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <label className="grid gap-1 text-xs font-medium text-white/50">
                            Product name
                            <input
                              value={productEditForm.name}
                              onChange={(event) =>
                                setProductEditForm((current) => ({
                                  ...current,
                                  name: event.target.value,
                                }))
                              }
                              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                            />
                          </label>
                          <label className="grid gap-1 text-xs font-medium text-white/50">
                            Category
                            <select
                              value={productEditForm.category}
                              onChange={(event) =>
                                setProductEditForm((current) => ({
                                  ...current,
                                  category: event.target.value as ProductCategory,
                                }))
                              }
                              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                            >
                              {productCategories.map((category) => (
                                <option key={category} value={category} className="bg-black">
                                  {formatEnumLabel(category)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-1 text-xs font-medium text-white/50">
                            Price in rupees
                            <input
                              value={productEditForm.priceRupees}
                              onChange={(event) =>
                                setProductEditForm((current) => ({
                                  ...current,
                                  priceRupees: event.target.value,
                                }))
                              }
                              inputMode="decimal"
                              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                            />
                          </label>
                          <label className="grid gap-1 text-xs font-medium text-white/50">
                            Current stock
                            <input
                              value={productEditForm.stock}
                              onChange={(event) =>
                                setProductEditForm((current) => ({
                                  ...current,
                                  stock: event.target.value,
                                }))
                              }
                              inputMode="numeric"
                              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                            />
                          </label>
                          <label className="grid gap-1 text-xs font-medium text-white/50">
                            Low stock threshold
                            <input
                              value={productEditForm.lowStockThreshold}
                              onChange={(event) =>
                                setProductEditForm((current) => ({
                                  ...current,
                                  lowStockThreshold: event.target.value,
                                }))
                              }
                              inputMode="numeric"
                              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                            />
                          </label>
                          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/55">
                            Active in shop
                            <input
                              type="checkbox"
                              checked={productEditForm.active}
                              onChange={(event) =>
                                setProductEditForm((current) => ({
                                  ...current,
                                  active: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 accent-lime-300"
                            />
                          </label>
                        </div>
                        <label className="mt-3 grid gap-1 text-xs font-medium text-white/50">
                          Short description
                          <input
                            value={productEditForm.description}
                            onChange={(event) =>
                              setProductEditForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                          />
                        </label>
                        <div className="mt-3">
                          <ProductPhotosField
                            orgId={orgId}
                            label="Product photos"
                            form={productEditForm}
                            setForm={setProductEditForm}
                          />
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr_auto]">
                          <input
                            value={
                              stockAdjustment.productId === product.id ? stockAdjustment.delta : ""
                            }
                            onChange={(event) =>
                              setStockAdjustment((current) => ({
                                ...current,
                                productId: product.id,
                                delta: event.target.value,
                              }))
                            }
                            placeholder="+/- stock"
                            inputMode="numeric"
                            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                          />
                          <input
                            value={
                              stockAdjustment.productId === product.id ? stockAdjustment.reason : ""
                            }
                            onChange={(event) =>
                              setStockAdjustment((current) => ({
                                ...current,
                                productId: product.id,
                                reason: event.target.value,
                              }))
                            }
                            placeholder="Adjustment reason"
                            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                          />
                          <ZookButton
                            type="button"
                            tone="secondary"
                            onClick={() => void adjustStock(product.id)}
                            disabled={formBusy === `stock:${product.id}` || !stockAdjustment.delta}
                            state={formBusy === `stock:${product.id}` ? "loading" : "idle"}
                          >
                            Adjust
                          </ZookButton>
                        </div>
                        <ZookButton
                          type="button"
                          onClick={() => void updateProduct(product.id)}
                          disabled={formBusy === `product:${product.id}`}
                          state={formBusy === `product:${product.id}` ? "loading" : "idle"}
                          fullWidth
                          className="mt-3"
                        >
                          {formBusy === `product:${product.id}` ? "Saving..." : "Save product"}
                        </ZookButton>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Inventory is clear"
                  description="No products have been created for this organization yet."
                />
              )}
            </div>
          </GlassCard>

          <ShopStatusCard
            summary={summary}
            branchScope={branchScope}
            selectedBranchName={selectedBranchName}
            queuedOrderCount={queuedOrders.length}
            readyOrderCount={readyOrders.length}
          />
        </div>
      ) : null}
    </div>
  );
}
