"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { ConfirmActionButton } from "../../confirm-action-button";
import { EmptyState } from "../../dashboard-primitives";
import { ZookButton } from "../../zook-button";
import { ErrorNotice, LoadMoreButton } from "../operational-shared";
import type { ProductRow } from "@/components/dashboard/types";
import { formatEnumLabel, formatInr } from "@/lib/format";
import { ProductEditPanel } from "./product-edit-panel";
import { productImagesFromProduct } from "./product-images";
import type { ProductFormState, ProductPatch, ResourceState, StockAdjustmentState } from "./types";

const PRODUCT_PAGE_SIZE = 6;

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
        <EmptyState
          title="Loading inventory"
          description="Pulling product availability and stock thresholds."
        />
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
        <EmptyState
          title="Inventory is clear"
          description="No products have been created for this organization yet."
        />
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

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          {images.length ? (
            <img
              src={images[0]}
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
        <ZookButton type="button" tone="ghost" size="sm" onClick={() => startProductEdit(product)}>
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
          description="Only products without order history can be deleted. Archive products with orders so reports stay consistent."
          confirmLabel="Delete"
          onConfirm={() => deleteProduct(product.id)}
          disabled={formBusy === `product:${product.id}:delete`}
          className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 hover:border-red-300/45 disabled:opacity-50"
        >
          Delete
        </ConfirmActionButton>
      </div>
      {editingProductId === product.id ? (
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
