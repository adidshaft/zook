"use client";

import type { Dispatch, SetStateAction } from "react";
import { Pill } from "../../glass-card";
import { HelpHint } from "../../ui";
import { ZookButton } from "../../zook-button";
import type { ProductCategory } from "@/components/dashboard/types";
import { formatEnumLabel } from "@/lib/format";
import { ProductPhotosField, productCategories } from "./product-images";
import type { ProductFormState } from "./types";

export function ProductCreateForm({
  orgId,
  productForm,
  setProductForm,
  scopeLabel,
  formError,
  formBusy,
  createProduct,
}: {
  orgId: string;
  productForm: ProductFormState;
  setProductForm: Dispatch<SetStateAction<ProductFormState>>;
  scopeLabel: string;
  formError: string;
  formBusy: string | null;
  createProduct: () => Promise<void>;
}) {
  return (
    <div className="mt-5 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 font-medium text-white">
            Add shop product
            <HelpHint label="Stock thresholds" title="Stock thresholds">
              Low-stock alerts fire below the threshold. Out-of-stock products are hidden from the
              member shop.
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
  );
}
