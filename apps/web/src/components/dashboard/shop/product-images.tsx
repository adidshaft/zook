"use client";

import type { Dispatch, SetStateAction } from "react";
import { ImageAssetUpload } from "../../image-asset-upload";
import { Pill } from "../../glass-card";
import type { ProductCategory, ProductRow } from "@/components/dashboard/types";
import type { ProductFormState } from "./types";

export const productCategories: ProductCategory[] = [
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
  return uniqueProductImages([...form.imagePreviewUrls, form.imagePreviewUrl]);
}

export function productImagesFromProduct(product: ProductRow) {
  return uniqueProductImages([
    ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
    product.imageUrl,
  ]);
}

export function ProductPhotosField({
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
            <div
              key={imageUrl}
              className="relative overflow-hidden rounded-2xl border border-white/10"
            >
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
