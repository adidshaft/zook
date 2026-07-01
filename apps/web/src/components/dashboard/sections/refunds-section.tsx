"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { formatDate, formatEnumLabel, formatInr } from "@/lib/format";
import { webApiFetch } from "@/lib/api-client";
import { GlassCard, Pill } from "../../glass-card";
import { ZookButton } from "../../zook-button";
import type { PaymentRow } from "@/components/dashboard/types";

const copy = {
  refundsEyebrow: "Refunds",
  refundsTitle: "Refund tracker",
  refundsDescription:
    "Start refunds for recent successful payments and track refunded payments.",
};

function refundAmountFor(payment: PaymentRow) {
  return (
    payment.refundedAmountPaise ??
    payment.refunds
      ?.filter((refund) => !["FAILED", "CANCELLED"].includes(refund.status))
      .reduce((total, refund) => total + refund.amountPaise, 0) ??
    0
  );
}

function remainingRefundAmount(payment: PaymentRow) {
  return Math.max(payment.amountPaise - refundAmountFor(payment), 0);
}

function RefundStateMark({ label, urgent = false }: { label: string; urgent?: boolean }) {
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-semibold ${
        urgent
          ? "border-[color-mix(in_srgb,var(--feedback-warning)_42%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
          : "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
      }`}
    >
      {label.slice(0, 1)}
    </span>
  );
}

export function RefundsSection({
  payments,
  onRefundSubmitted,
}: {
  payments: PaymentRow[];
  onRefundSubmitted?: () => void | Promise<void>;
}) {
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [refundDraft, setRefundDraft] = useState<{
    payment: PaymentRow;
    reason: string;
    amountRupees: string;
  } | null>(null);
  
  const allRefundable = payments.filter(
    (payment) =>
      ["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(payment.status) &&
      remainingRefundAmount(payment) > 0,
  );
  
  const refundable = [...allRefundable]
    .sort((left, right) => {
      const leftAuto = left.providerRef ? 0 : 1;
      const rightAuto = right.providerRef ? 0 : 1;
      if (leftAuto !== rightAuto) return leftAuto - rightAuto;
      return remainingRefundAmount(right) - remainingRefundAmount(left);
    })
    .slice(0, 8);
    
  const trackedRefunds = payments.flatMap((payment) => {
    const refunds = payment.refunds ?? [];
    if (refunds.length) {
      return refunds.map((refund) => ({ payment, refund }));
    }
    if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(payment.status)) {
      return [
        {
          payment,
          refund: {
            id: `tracked-${payment.id}`,
            amountPaise: refundAmountFor(payment) || payment.amountPaise,
            status: payment.status,
            reason: "Recorded before detailed refund tracking",
            createdAt: payment.createdAt,
            processedAt: payment.recordedAt ?? payment.createdAt,
          },
        },
      ];
    }
    return [];
  });
  const autoRefundableCount = allRefundable.filter((payment) => payment.providerRef).length;
  const manualRefundCount = allRefundable.length - autoRefundableCount;
  const failedRefundCount = trackedRefunds.filter(({ refund }) => refund.status === "FAILED").length;
  const inFlightRefundCount = trackedRefunds.filter(({ refund }) =>
    ["PENDING", "PROCESSING", "REQUESTED"].includes(refund.status),
  ).length;
  const totalRefundablePaise = allRefundable.reduce(
    (total, payment) => total + remainingRefundAmount(payment),
    0,
  );

  async function refundPayment() {
    if (!refundDraft?.reason.trim()) return;
    const { payment, reason, amountRupees } = refundDraft;
    if (!payment.orgId) {
      setError("This payment is missing its gym link.");
      return;
    }
    const amountPaise = Math.round(Number(amountRupees || 0) * 100);
    const remainingPaise = remainingRefundAmount(payment);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0 || amountPaise > remainingPaise) {
      setError(`Enter an amount between ₹1 and ${formatInr(remainingPaise)}.`);
      return;
    }
    try {
      setBusyPaymentId(payment.id);
      setError("");
      await webApiFetch(`/api/orgs/${payment.orgId}/payments/${payment.id}/refund`, {
        method: "POST",
        body: { reason: reason.trim(), amountPaise },
        feedback: { success: "Refund submitted." },
      });
      setRefundDraft(null);
      await onRefundSubmitted?.();
      setStatus("Refund submitted and added to the tracker.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to refund payment.";
      setError(
        message.toLowerCase().includes("provider reference")
          ? "This payment cannot be refunded automatically because it was not collected through Razorpay."
          : message,
      );
    } finally {
      setBusyPaymentId(null);
    }
  }

  return (
    <GlassCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            {copy.refundsEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{copy.refundsTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{copy.refundsDescription}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill>{refundable.length} available</Pill>
          <Pill>{trackedRefunds.length} tracked</Pill>
        </div>
      </div>
      {error ? (
        <p className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--feedback-danger)_36%,transparent)] bg-[var(--surface-danger-soft)] px-4 py-3 text-sm text-[var(--feedback-danger)]">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--feedback-success)_36%,transparent)] bg-[var(--surface-success-soft)] px-4 py-3 text-sm text-[var(--feedback-success)]">
          {status}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          {
            label: "Refundable value",
            value: formatInr(totalRefundablePaise),
          },
          {
            label: "Auto-refundable",
            value: autoRefundableCount,
          },
          {
            label: "Manual follow-up",
            value: manualRefundCount,
          },
          {
            label: failedRefundCount ? "Failed refunds" : "In flight",
            value: failedRefundCount || inFlightRefundCount,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-1.5"
          >
            <p className="text-xs text-[var(--text-tertiary)]">{item.label}</p>
            <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      {refundDraft ? (
        <form
          className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void refundPayment();
          }}
        >
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Refund up to {formatInr(remainingRefundAmount(refundDraft.payment))} to{" "}
            {refundDraft.payment.user?.name ?? formatEnumLabel(refundDraft.payment.purpose)}
          </p>
          <div className="mt-3 grid gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--bg)] p-3 text-xs text-[var(--text-secondary)] sm:grid-cols-4">
            <span>
              <span className="block font-semibold text-[var(--text-primary)]">
                {formatInr(refundDraft.payment.amountPaise)}
              </span>
              original payment
            </span>
            <span>
              <span className="block font-semibold text-[var(--text-primary)]">
                {formatInr(remainingRefundAmount(refundDraft.payment))}
              </span>
              still refundable
            </span>
            <span>
              <span className="block font-semibold text-[var(--text-primary)]">
                {formatEnumLabel(refundDraft.payment.mode)}
              </span>
              {refundDraft.payment.providerRef ? "provider reference found" : "manual refund may be needed"}
            </span>
            <span>
              <span className="block font-semibold text-[var(--text-primary)]">
                {formatDate(refundDraft.payment.recordedAt ?? refundDraft.payment.createdAt)}
              </span>
              payment date
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr]">
            <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
              Amount in rupees
              <input
                value={refundDraft.amountRupees}
                onChange={(event) =>
                  setRefundDraft((current) =>
                    current ? { ...current, amountRupees: event.target.value } : current,
                  )
                }
                inputMode="decimal"
                className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </label>
            <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
              Reason
              <textarea
                value={refundDraft.reason}
                onChange={(event) =>
                  setRefundDraft((current) =>
                    current ? { ...current, reason: event.target.value } : current,
                  )
                }
                rows={3}
                maxLength={240}
                className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <ZookButton
              type="button"
              tone="ghost"
              size="sm"
              onClick={() => setRefundDraft(null)}
            >
              Cancel
            </ZookButton>
            <ConfirmActionButton
              className="zook-focus inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--accent-fill)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:opacity-60"
              title={`Refund ${refundDraft.amountRupees.trim() ? `₹${refundDraft.amountRupees.trim()}` : "this payment"}?`}
              description={`This will refund ${refundDraft.amountRupees.trim() ? `₹${refundDraft.amountRupees.trim()}` : "the entered amount"} to ${refundDraft.payment.user?.name ?? formatEnumLabel(refundDraft.payment.purpose)}. Razorpay refunds are irreversible.`}
              confirmLabel="Submit refund"
              confirmTone="danger"
              onConfirm={() => refundPayment()}
              disabled={
                !refundDraft.reason.trim() ||
                !refundDraft.amountRupees.trim() ||
                busyPaymentId === refundDraft.payment.id
              }
            >
              {busyPaymentId === refundDraft.payment.id ? "Submitting..." : "Submit refund"}
            </ConfirmActionButton>
          </div>
        </form>
      ) : null}
      <div className="mt-5 grid gap-3">
        {refundable.map((payment) => (
          <div
            key={payment.id}
            className="grid gap-3 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div className="flex min-w-0 items-center gap-3">
              <RefundStateMark
                label={payment.providerRef ? "Auto refund" : "Manual follow-up"}
                urgent={!payment.providerRef}
              />
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--text-primary)]">
                  {payment.user?.name ?? formatEnumLabel(payment.purpose)}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                  {formatInr(remainingRefundAmount(payment))} refundable of{" "}
                  {formatInr(payment.amountPaise)} · {formatEnumLabel(payment.mode)}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
                  {payment.providerRef
                    ? "Automatic provider refund ready"
                    : "Manual follow-up may be needed"}
                </p>
              </div>
            </div>
            <span className="inline-flex flex-wrap items-center gap-2">
              <ZookButton
                type="button"
                size="sm"
                onClick={() => {
                  setError("");
                  setStatus("");
                  setRefundDraft({
                    payment,
                    reason: "Owner requested refund",
                    amountRupees: "",
                  });
                }}
                disabled={busyPaymentId === payment.id}
                state={busyPaymentId === payment.id ? "loading" : "idle"}
              >
                {busyPaymentId === payment.id ? "Refunding..." : "Refund"}
              </ZookButton>
            </span>
          </div>
        ))}
        {allRefundable.length > 8 ? (
          <Link
            href="/dashboard/payments"
            className="mt-2 block text-right text-xs font-semibold text-[var(--accent-strong)] hover:underline"
          >
            {allRefundable.length - 8} more refundable payments →
          </Link>
        ) : null}
        {!refundable.length ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-tertiary)]">
            No successful payments are available for refund in this branch or payment view.
          </p>
        ) : null}
      </div>
      {trackedRefunds.length ? (
        <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
          <p className="font-medium text-[var(--text-primary)]">Tracked refunds</p>
          <div className="mt-3 grid gap-2">
            {trackedRefunds.slice(0, 12).map(({ payment, refund }) => (
              <div
                key={refund.id}
                className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <RefundStateMark
                    label={formatEnumLabel(refund.status)}
                    urgent={refund.status === "FAILED"}
                  />
                  <span className="min-w-0">
                    <span className="block truncate">
                      {payment.user?.name ?? formatEnumLabel(payment.purpose)}
                    </span>
                    <span className="mt-1 block truncate text-xs text-[var(--text-tertiary)]">
                      {refund.reason || "Refund requested"} ·{" "}
                      {refund.processedAt ? formatDate(refund.processedAt) : formatDate(refund.createdAt)}
                    </span>
                  </span>
                </span>
                <span className="text-right text-xs text-[var(--text-secondary)]">
                  {formatInr(refund.amountPaise)} · {formatEnumLabel(refund.status)}
                  {refund.providerRefundId ? (
                    <span className="block text-[var(--text-tertiary)]">Razorpay refund {refund.providerRefundId}</span>
                  ) : null}
                </span>
              </div>
            ))}
            {trackedRefunds.length > 12 ? (
              <Link
                href="/dashboard/payments"
                className="mt-2 block text-right text-xs font-semibold text-[var(--accent-strong)] hover:underline"
              >
                {trackedRefunds.length - 12} more refunds →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </GlassCard>
  );
}
