"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { ConfirmActionButton } from "../../confirm-action-button";
import { EmptyState } from "../../dashboard-primitives";
import { ZookButton } from "../../zook-button";
import { ErrorNotice, LoadMoreButton } from "../operational-shared";
import type { ProductRow } from "@/components/dashboard/types";
import { formatInr } from "@/lib/format";
import { ProductEditPanel } from "./product-edit-panel";
import { productImagesFromProduct } from "./product-images";
import type { ProductFormState, ProductPatch, ResourceState, StockAdjustmentState } from "./types";

const PRODUCT_PAGE_SIZE = 6;

function productCategoryLabel(category: string | null | undefined) {
  if (category === "WATER") return "Water";
  if (category === "PROTEIN_SHAKE") return "Protein shake";
  if (category === "SHAKER") return "Shaker";
  if (category === "TOWEL") return "Towel";
  if (category === "SUPPLEMENT") return "Supplement";
  return "Other";
}

export function ProductList({
  orgId,
  inventory,
  productsState,
  selectedBranchName,
  productEditForm,
  setProductEditForm,
  editingProductId,
  setEditingProductId,
  stockAdjustment,
  setStockAdjustment,
  formBusy,
  startProductEdit,
  updateProduct,
  adjustStock,
  deleteProduct,
}: {
  orgId: string;
  inventory: ProductRow[];
  productsState: ResourceState;
  selectedBranchName: string;
  productEditForm: ProductFormState;
  setProductEditForm: Dispatch<SetStateAction<ProductFormState>>;
  editingProductId: string | null;
  setEditingProductId: Dispatch<SetStateAction<string | null>>;
  stockAdjustment: StockAdjustmentState;
  setStockAdjustment: Dispatch<SetStateAction<StockAdjustmentState>>;
  formBusy: string | null;
  startProductEdit: (product: ProductRow) => void;
  updateProduct: (productId: string, patch?: ProductPatch) => Promise<void>;
  adjustStock: (productId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
}) {
  const [visibleCount, setVisibleCount] = useState(PRODUCT_PAGE_SIZE);

  useEffect(() => {
    setVisibleCount((current) =>
      Math.max(PRODUCT_PAGE_SIZE, Math.min(current, inventory.length || PRODUCT_PAGE_SIZE)),
    );
  }, [inventory.length]);

  const visibleProducts = inventory.slice(0, visibleCount);
  const hasMore = inventory.length > visibleProducts.length;

  return (
    <div className="mt-5 grid gap-3">
      {productsState.error ? (
        <ErrorNotice message={productsState.error} />
      ) : productsState.loading && inventory.length === 0 ? (
        <EmptyState title="Loading inventory" />
      ) : inventory.length ? (
        <>
          {visibleProducts.map((product) => (
            <ProductListItem
              key={product.id}
              orgId={orgId}
              product={product}
              selectedBranchName={selectedBranchName}
              productEditForm={productEditForm}
              setProductEditForm={setProductEditForm}
              editingProductId={editingProductId}
              setEditingProductId={setEditingProductId}
              stockAdjustment={stockAdjustment}
              setStockAdjustment={setStockAdjustment}
              formBusy={formBusy}
              startProductEdit={startProductEdit}
              updateProduct={updateProduct}
              adjustStock={adjustStock}
              deleteProduct={deleteProduct}
            />
          ))}
          <LoadMoreButton
            hasMore={hasMore}
            loading={productsState.loading}
            onLoadMore={() => setVisibleCount((current) => current + PRODUCT_PAGE_SIZE)}
            count={visibleProducts.length}
          />
        </>
      ) : (
        <EmptyState title="Inventory is clear" />
      )}
    </div>
  );
}

function ProductListItem({
  orgId,
  product,
  selectedBranchName,
  productEditForm,
  setProductEditForm,
  editingProductId,
  setEditingProductId,
  stockAdjustment,
  setStockAdjustment,
  formBusy,
  startProductEdit,
  updateProduct,
  adjustStock,
  deleteProduct,
}: {
  orgId: string;
  product: ProductRow;
  selectedBranchName: string;
  productEditForm: ProductFormState;
  setProductEditForm: Dispatch<SetStateAction<ProductFormState>>;
  editingProductId: string | null;
  setEditingProductId: Dispatch<SetStateAction<string | null>>;
  stockAdjustment: StockAdjustmentState;
  setStockAdjustment: Dispatch<SetStateAction<StockAdjustmentState>>;
  formBusy: string | null;
  startProductEdit: (product: ProductRow) => void;
  updateProduct: (productId: string, patch?: ProductPatch) => Promise<void>;
  adjustStock: (productId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
}) {
  const images = productImagesFromProduct(product);
  const lowStock = product.stock <= product.lowStockThreshold;
  const isEditing = editingProductId === product.id;

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-3 transition hover:bg-white/[0.04]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {images.length ? (
            <img
              src={images[0]}
              alt={`${product.name} product photo`}
              className="h-16 w-16 shrink-0 rounded-2xl border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/12 bg-black/30 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Photo
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{product.name}</p>
            <p className="mt-1 text-xs text-white/45">
              {productCategoryLabel(product.category)} · {formatInr(product.pricePaise)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={
                  lowStock
                    ? "inline-flex h-6 items-center rounded-full border border-amber-300/25 bg-amber-300/10 px-2 text-xs font-semibold text-amber-100"
                    : "inline-flex h-6 items-center rounded-full border border-white/10 bg-white/[0.03] px-2 text-xs font-semibold text-white/58"
                }
              >
                {product.stock} left
              </span>
              {!product.active ? (
                <span className="inline-flex h-6 items-center rounded-full border border-white/10 bg-white/[0.03] px-2 text-xs font-semibold text-amber-100/75">
                  Archived
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ZookButton
            type="button"
            tone={isEditing ? "secondary" : "ghost"}
            size="sm"
            onClick={() => (isEditing ? setEditingProductId(null) : startProductEdit(product))}
          >
            {isEditing ? "Close" : "Edit"}
          </ZookButton>
        </div>
      </div>
      {isEditing ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
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
          {!product.active ? (
            <ConfirmActionButton
              title="Delete product?"
              description="Only products without order history can be deleted. Restore products with history so reports stay consistent."
              confirmLabel="Delete"
              onConfirm={() => deleteProduct(product.id)}
              disabled={formBusy === `product:${product.id}:delete`}
              className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 hover:border-red-300/45 disabled:opacity-50"
            >
              Delete
            </ConfirmActionButton>
          ) : null}
        </div>
      ) : null}
      {isEditing ? (
        <ProductEditPanel
          orgId={orgId}
          product={product}
          selectedBranchName={selectedBranchName}
          productEditForm={productEditForm}
          setProductEditForm={setProductEditForm}
          setEditingProductId={setEditingProductId}
          stockAdjustment={stockAdjustment}
          setStockAdjustment={setStockAdjustment}
          formBusy={formBusy}
          updateProduct={updateProduct}
          adjustStock={adjustStock}
        />
      ) : null}
    </div>
  );
}
