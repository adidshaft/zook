"use client";

import type { Dispatch, SetStateAction } from "react";
import { ZookButton } from "../../zook-button";
import type { ProductCategory, ProductRow } from "@/components/dashboard/types";
import { formatEnumLabel } from "@/lib/format";
import { ProductPhotosField, productCategories } from "./product-images";
import type { ProductFormState, StockAdjustmentState } from "./types";
import { useT } from "@/lib/use-t";

export function ProductEditPanel({
  orgId,
  product,
  selectedBranchName,
  productEditForm,
  setProductEditForm,
  setEditingProductId,
  stockAdjustment,
  setStockAdjustment,
  formBusy,
  updateProduct,
  adjustStock,
}: {
  orgId: string;
  product: ProductRow;
  selectedBranchName: string;
  productEditForm: ProductFormState;
  setProductEditForm: Dispatch<SetStateAction<ProductFormState>>;
  setEditingProductId: Dispatch<SetStateAction<string | null>>;
  stockAdjustment: StockAdjustmentState;
  setStockAdjustment: Dispatch<SetStateAction<StockAdjustmentState>>;
  formBusy: string | null;
  updateProduct: (productId: string) => Promise<void>;
  adjustStock: (productId: string) => Promise<void>;
}) {
  const t = useT("webUx.shop");
  return (
    <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-white">{t("editProductTitle", { product: product.name })}</p>
          <p className="mt-1 text-xs text-white/45">
            {t("editProductDescription", { branch: selectedBranchName })}
          </p>
        </div>
        <ZookButton type="button" tone="ghost" size="sm" onClick={() => setEditingProductId(null)}>
          {t("cancel")}
        </ZookButton>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium text-white/50">
          {t("productName")}
          <input
            value={productEditForm.name}
            onChange={(event) =>
              setProductEditForm((current) => ({ ...current, name: event.target.value }))
            }
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-white/50">
          {t("category")}
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
          {t("priceInRupees")}
          <input
            value={productEditForm.priceRupees}
            onChange={(event) =>
              setProductEditForm((current) => ({ ...current, priceRupees: event.target.value }))
            }
            inputMode="decimal"
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-white/50">
          {t("currentStock")}
          <input
            value={productEditForm.stock}
            onChange={(event) =>
              setProductEditForm((current) => ({ ...current, stock: event.target.value }))
            }
            inputMode="numeric"
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-white/50">
          {t("lowStockThreshold")}
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
          {t("activeInShop")}
          <input
            type="checkbox"
            checked={productEditForm.active}
            onChange={(event) =>
              setProductEditForm((current) => ({ ...current, active: event.target.checked }))
            }
            className="h-4 w-4 accent-lime-300"
          />
        </label>
      </div>
      <label className="mt-3 grid gap-1 text-xs font-medium text-white/50">
        {t("shortDescription")}
        <input
          value={productEditForm.description}
          onChange={(event) =>
            setProductEditForm((current) => ({ ...current, description: event.target.value }))
          }
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        />
      </label>
      <div className="mt-3">
        <ProductPhotosField
          orgId={orgId}
          label={t("productPhotos")}
          form={productEditForm}
          setForm={setProductEditForm}
        />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr_auto]">
        <input
          value={stockAdjustment.productId === product.id ? stockAdjustment.delta : ""}
          onChange={(event) =>
            setStockAdjustment((current) => ({
              ...current,
              productId: product.id,
              delta: event.target.value,
            }))
          }
          placeholder={t("stockDeltaPlaceholder")}
          inputMode="numeric"
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        />
        <input
          value={stockAdjustment.productId === product.id ? stockAdjustment.reason : ""}
          onChange={(event) =>
            setStockAdjustment((current) => ({
              ...current,
              productId: product.id,
              reason: event.target.value,
            }))
          }
          placeholder={t("adjustmentReason")}
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        />
        <ZookButton
          type="button"
          tone="secondary"
          onClick={() => void adjustStock(product.id)}
          disabled={formBusy === `stock:${product.id}` || !stockAdjustment.delta}
          state={formBusy === `stock:${product.id}` ? "loading" : "idle"}
        >
          {t("adjust")}
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
        {formBusy === `product:${product.id}` ? t("saving") : t("saveProduct")}
      </ZookButton>
    </div>
  );
}
