"use client";

import { useState } from "react";
import { webApiFetch } from "@/lib/api-client";

type FileAssetResponse = {
  file?: { id: string; originalName?: string | null };
};

export function PaymentProofUpload({
  orgId,
  value,
  onChange,
  label = "Payment proof",
  placeholder = "Receipt, screenshot, or bank slip",
}: {
  orgId: string;
  value: string;
  onChange: (assetId: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function uploadProof(file?: File | null) {
    if (!file) return;
    try {
      setBusy(true);
      setStatus("Uploading proof...");
      const formData = new FormData();
      formData.set("orgId", orgId);
      formData.set("category", "payment_proof");
      formData.set("visibility", "private");
      formData.set("file", file);
      const payload = await webApiFetch<FileAssetResponse>("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      const assetId = payload.file?.id;
      if (!assetId) {
        throw new Error("Proof uploaded, but no file ID was returned.");
      }
      onChange(assetId);
      setStatus(payload.file?.originalName ? `Attached ${payload.file.originalName}.` : "Proof attached.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to upload proof.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
      {label}
      <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3">
        <input
          type="file"
          accept="image/*,application/pdf"
          disabled={busy}
          onChange={(event) => void uploadProof(event.target.files?.[0])}
          className="zook-focus block w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--accent-fill)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--text-on-accent)] disabled:opacity-55"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="zook-focus min-h-11 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
        {status ? <span className="text-xs text-[var(--text-tertiary)]">{status}</span> : null}
      </div>
    </label>
  );
}
