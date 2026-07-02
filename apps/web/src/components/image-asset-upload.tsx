"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Upload, X } from "lucide-react";
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
  onClear,
}: {
  orgId: string;
  category: ImageCategory;
  label: string;
  helper?: string;
  valueUrl?: string | null;
  altText?: string;
  aspectClassName?: string;
  onUploaded: (asset: UploadedAsset) => void;
  onClear?: () => void;
}) {
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<"neutral" | "success" | "danger">("neutral");
  const [busy, setBusy] = useState(false);

  async function uploadImage(file?: File | null) {
    if (!file) return;
    try {
      setBusy(true);
      setStatusTone("neutral");
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
      setStatusTone("success");
      setStatus(payload.file?.originalName ? `Attached ${payload.file.originalName}.` : "Image attached.");
    } catch (cause) {
      setStatusTone("danger");
      setStatus(cause instanceof Error ? cause.message : "Unable to upload image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2 text-sm text-[var(--text-secondary)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[var(--text-primary)]">{label}</p>
          {helper ? <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{helper}</p> : null}
        </div>
        {valueUrl && onClear ? (
          <button
            type="button"
            onClick={() => {
              onClear();
              setStatus("");
              setStatusTone("neutral");
            }}
            className="zook-focus inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
            aria-label={`Remove ${label}`}
          >
            <X size={15} />
          </button>
        ) : null}
      </div>
      <label className="grid cursor-pointer gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)]/70 p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]">
        {valueUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <img
              src={valueUrl}
              alt={altText ?? label}
              className={`${aspectClassName} w-full object-cover`}
            />
          </div>
        ) : (
          <div
            className={`${aspectClassName} grid w-full place-items-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-[var(--text-tertiary)]`}
          >
            <div className="grid justify-items-center gap-2">
              <ImagePlus size={22} />
              <span className="text-xs font-medium">No image selected</span>
            </div>
          </div>
        )}
        <span className="zook-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {busy ? "Uploading..." : valueUrl ? `Replace ${label}` : `Choose ${label}`}
        </span>
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(event) => void uploadImage(event.target.files?.[0])}
          className="sr-only"
        />
        {status ? (
          <span
            className={[
              "inline-flex items-center gap-1.5 text-xs",
              statusTone === "danger"
                ? "text-[var(--feedback-danger)]"
                : statusTone === "success"
                  ? "text-[var(--feedback-success)]"
                  : "text-[var(--text-tertiary)]",
            ].join(" ")}
          >
            {statusTone === "danger" ? (
              <AlertCircle size={13} />
            ) : statusTone === "success" ? (
              <CheckCircle2 size={13} />
            ) : (
              <Loader2 size={13} className={busy ? "animate-spin" : undefined} />
            )}
            {status}
          </span>
        ) : null}
      </label>
    </div>
  );
}
