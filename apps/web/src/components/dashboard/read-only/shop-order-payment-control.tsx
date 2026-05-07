"use client";

import { useState } from "react";
import { formatInr } from "@/lib/format";
import { webApiFetch } from "@/lib/api-client";
import type { ShopOrderRow } from "../../dashboard-operational-model";
import { PaymentProofUpload } from "../../payment-proof-upload";
import { formatPaymentMode, modeOptions, type PaymentReceiptState } from "./payments-utils";

export function ShopOrderPaymentControl({
  orgId,
  order,
  disabled,
  disabledTitle,
  onRecorded,
}: {
  orgId: string;
  order: ShopOrderRow;
  disabled?: boolean;
  disabledTitle?: string | undefined;
  onRecorded: (receipt: PaymentReceiptState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    mode: "DIRECT_UPI",
    receiptNumber: "",
    proofAssetId: "",
    notes: "",
  });

  async function recordPayment() {
    try {
      setBusy(true);
      setStatus("");
      await webApiFetch(`/api/orgs/${orgId}/shop/orders/${order.id}/manual-payment`, {
        method: "POST",
        body: {
          amountPaise: order.totalPaise,
          mode: form.mode,
          receiptNumber: form.receiptNumber || undefined,
          proofAssetId: form.proofAssetId || undefined,
          notes: form.notes || "Recorded from the owner payment queue.",
        },
      });
      onRecorded({
        title: `Shop order ${order.id.slice(-8).toUpperCase()}`,
        amountPaise: order.totalPaise,
        mode: form.mode,
        reference: form.receiptNumber || undefined,
        recordedAt: new Date().toISOString(),
      });
      setOpen(false);
      setStatus("");
      setForm({ mode: "DIRECT_UPI", receiptNumber: "", proofAssetId: "", notes: "" });
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to record shop payment.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        title={disabled ? disabledTitle : undefined}
        onClick={() => setOpen(true)}
        className="zook-focus rounded-full border border-lime-300/40 px-3 py-1 text-xs font-semibold text-lime-100 transition hover:bg-lime-300/10 disabled:opacity-50"
      >
        Record payment · Mode: {formatPaymentMode(form.mode)}
      </button>
    );
  }

  return (
    <div className="ml-auto grid w-full max-w-sm gap-2 rounded-2xl border border-white/10 bg-black/45 p-3 text-left">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-white">{formatInr(order.totalPaise)}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="zook-focus rounded-full px-2 py-1 text-xs text-white/55 hover:bg-white/8"
        >
          Close
        </button>
      </div>
      <select
        value={form.mode}
        onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value }))}
        className="zook-focus min-h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white"
      >
        {modeOptions.map((mode) => (
          <option key={mode} value={mode} className="bg-black">
            {formatPaymentMode(mode)}
          </option>
        ))}
      </select>
      <input
        value={form.receiptNumber}
        onChange={(event) => setForm((current) => ({ ...current, receiptNumber: event.target.value }))}
        placeholder="Reference"
        className="zook-focus min-h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white"
      />
      <PaymentProofUpload
        orgId={orgId}
        value={form.proofAssetId}
        onChange={(proofAssetId) => setForm((current) => ({ ...current, proofAssetId }))}
        label="Proof"
      />
      <textarea
        value={form.notes}
        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        placeholder="Notes"
        className="zook-focus min-h-16 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
      />
      {status ? <p className="text-xs text-amber-100">{status}</p> : null}
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => void recordPayment()}
        className="zook-focus min-h-10 rounded-full bg-lime-300 px-3 text-xs font-semibold text-black disabled:opacity-50"
      >
        {busy ? "Recording..." : "Confirm payment"}
      </button>
    </div>
  );
}
