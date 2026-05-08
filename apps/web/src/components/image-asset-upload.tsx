"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { webApiFetch } from "@/lib/api-client";

type ImageCategory = "org_logo" | "org_cover" | "org_gallery" | "product_image";

type UploadedAsset = {
  assetId: string;
  url: string;
  name?: string | null;
};

type FileAssetResponse = {
  file?: { id: string; url?: string | null; originalName?: string | null };
  deliveryUrl?: string | null;
  signedUrl?: string | null;
};

export function ImageAssetUpload({
  orgId,
  category,
  label,
  helper,
  valueUrl,
  altText,
  aspectClassName = "aspect-[4/3]",
  onUploaded,
}: {
  orgId: string;
  category: ImageCategory;
  label: string;
  helper?: string;
  valueUrl?: string | null;
  altText?: string;
  aspectClassName?: string;
  onUploaded: (asset: UploadedAsset) => void;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function uploadImage(file?: File | null) {
    if (!file) return;
    try {
      setBusy(true);
      setStatus("Uploading...");
      const formData = new FormData();
      formData.set("orgId", orgId);
      formData.set("category", category);
      formData.set("visibility", "public");
      formData.set("file", file);
      const payload = await webApiFetch<FileAssetResponse>("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      const assetId = payload.file?.id;
      const url = payload.deliveryUrl ?? payload.file?.url ?? "";
      if (!assetId || !url) {
        throw new Error("Image uploaded, but Zook could not attach it.");
      }
      onUploaded({
        assetId,
        url,
        ...(payload.file?.originalName ? { name: payload.file.originalName } : {}),
      });
      setStatus(
        payload.file?.originalName ? `Attached ${payload.file.originalName}.` : "Image attached.",
      );
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to upload image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="grid gap-2 text-sm text-white/62">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {helper ? <span className="text-xs font-normal text-white/38">{helper}</span> : null}
      </span>
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
        {valueUrl ? (
          <img
            src={valueUrl}
            alt={altText ?? label}
            className={`${aspectClassName} w-full rounded-xl border border-white/10 object-cover`}
          />
        ) : (
          <div
            className={`${aspectClassName} grid w-full place-items-center rounded-xl border border-dashed border-white/15 bg-black/25 text-white/35`}
          >
            <ImagePlus size={22} />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(event) => void uploadImage(event.target.files?.[0])}
          className="zook-focus block w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-lime-300 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-black disabled:opacity-55"
        />
        {status ? <span className="text-xs text-white/45">{status}</span> : null}
      </div>
    </label>
  );
}
