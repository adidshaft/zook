"use client";

import type { Dispatch, SetStateAction } from "react";
import { ErrorNotice } from "../operational-shared";
import { EmptyState, SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
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
  formStatus,
  formBusy,
  createProduct,
  startProductEdit,
  updateProduct,
  adjustStock,
  deleteProduct,
}: ShopSectionProps) {
  const showOrders = view === "orders";
  const showProducts = view === "products";

  return (
    <div className={showOrders ? "grid gap-4" : "grid gap-4 xl:grid-cols-[1.15fr_0.85fr]"}>
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
                  <p className="font-medium text-white">Add shop product</p>
                  <p className="mt-1 text-xs text-white/45">Adds a new product to your shop.</p>
                </div>
                <Pill tone="blue">Create</Pill>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Product name"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
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
                <input
                  value={productForm.priceRupees}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, priceRupees: event.target.value }))
                  }
                  placeholder="Price in rupees"
                  inputMode="decimal"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <input
                  value={productForm.stock}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, stock: event.target.value }))
                  }
                  placeholder="Opening stock"
                  inputMode="numeric"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_140px]">
                <input
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Short description"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <input
                  value={productForm.lowStockThreshold}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      lowStockThreshold: event.target.value,
                    }))
                  }
                  placeholder="Low stock"
                  inputMode="numeric"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
              </div>
              <button
                onClick={() => void createProduct()}
                disabled={formBusy === "product"}
                className="zook-focus w-full rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
              >
                {formBusy === "product" ? "Creating..." : "Add product"}
              </button>
              {formError ? <p className="text-sm text-red-200">{formError}</p> : null}
              {formStatus ? <p className="text-sm text-lime-100">{formStatus}</p> : null}
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
                      <div>
                        <p className="font-medium text-white">{product.name}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {formatEnumLabel(product.category)} · {formatInr(product.pricePaise)} ·{" "}
                          {product.active ? "Active" : "Archived"}
                        </p>
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
                      <button
                        onClick={() => startProductEdit(product)}
                        className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:border-lime-300/40 hover:text-lime-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void updateProduct(product.id, { active: !product.active })}
                        disabled={formBusy === `product:${product.id}`}
                        className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:border-amber-300/40 hover:text-amber-100 disabled:opacity-50"
                      >
                        {product.active ? "Archive" : "Restore"}
                      </button>
                      <button
                        onClick={() => void deleteProduct(product.id)}
                        disabled={formBusy === `product:${product.id}:delete`}
                        className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 hover:border-red-300/45 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Inventory is clear"
                  description="No products have been created for this organization yet."
                />
              )}
              {editingProductId ? (
                <div className="rounded-[24px] border border-lime-300/20 bg-lime-300/6 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">Edit shop product</p>
                      <p className="mt-1 text-xs text-white/45">
                        Update catalog details or apply a stock correction.
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingProductId(null)}
                      className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/60"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input
                      value={productEditForm.name}
                      onChange={(event) =>
                        setProductEditForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Product name"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
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
                    <input
                      value={productEditForm.priceRupees}
                      onChange={(event) =>
                        setProductEditForm((current) => ({
                          ...current,
                          priceRupees: event.target.value,
                        }))
                      }
                      placeholder="Price in rupees"
                      inputMode="decimal"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <input
                      value={productEditForm.stock}
                      onChange={(event) =>
                        setProductEditForm((current) => ({ ...current, stock: event.target.value }))
                      }
                      placeholder="Current stock"
                      inputMode="numeric"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <input
                      value={productEditForm.lowStockThreshold}
                      onChange={(event) =>
                        setProductEditForm((current) => ({
                          ...current,
                          lowStockThreshold: event.target.value,
                        }))
                      }
                      placeholder="Low stock threshold"
                      inputMode="numeric"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/55">
                      Active
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
                  <input
                    value={productEditForm.description}
                    onChange={(event) =>
                      setProductEditForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Short description"
                    className="zook-focus mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr_auto]">
                    <input
                      value={
                        stockAdjustment.productId === editingProductId ? stockAdjustment.delta : ""
                      }
                      onChange={(event) =>
                        setStockAdjustment((current) => ({
                          ...current,
                          productId: editingProductId,
                          delta: event.target.value,
                        }))
                      }
                      placeholder="+/- stock"
                      inputMode="numeric"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <input
                      value={
                        stockAdjustment.productId === editingProductId ? stockAdjustment.reason : ""
                      }
                      onChange={(event) =>
                        setStockAdjustment((current) => ({
                          ...current,
                          productId: editingProductId,
                          reason: event.target.value,
                        }))
                      }
                      placeholder="Adjustment reason"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <button
                      onClick={() => void adjustStock(editingProductId)}
                      disabled={formBusy === `stock:${editingProductId}` || !stockAdjustment.delta}
                      className="zook-focus rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Adjust
                    </button>
                  </div>
                  <button
                    onClick={() => void updateProduct(editingProductId)}
                    disabled={formBusy === `product:${editingProductId}`}
                    className="zook-focus mt-3 w-full rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
                  >
                    {formBusy === `product:${editingProductId}` ? "Saving..." : "Save product"}
                  </button>
                </div>
              ) : null}
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
