"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Clock, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { formatEnumLabel, formatInr } from "@/lib/format";
import { ZookButtonLink } from "@/components/zook-button";

type CheckoutSessionSummary = {
  id: string;
  amountPaise: number;
  purpose: string;
  status: string;
  planName?: string | null;
  validityLabel?: string | null;
  activationLabel?: string | null;
};

function checkoutStatusLabel(status: string) {
  if (status === "SUCCEEDED") return "Paid";
  if (status === "PENDING") return "Pending";
  if (status === "FAILED") return "Failed";
  if (status === "MISSING") return "Missing";
  return formatEnumLabel(status);
}

function checkoutPurposeLabel(purpose: string) {
  if (purpose === "MEMBERSHIP") return "Membership";
  if (purpose === "CLASS_BOOKING") return "Class booking";
  if (purpose === "SHOP_ORDER") return "Shop order";
  return formatEnumLabel(purpose);
}

function safeCheckoutMessage(message: string | undefined) {
  if (!message) return "Payment update failed.";
  if (
    /prisma|localhost|database|stack|constraint|exception|fetch failed|ECONNREFUSED/i.test(message)
  ) {
    return "Payment update failed.";
  }
  return message;
}

export function CheckoutPanel({
  session,
  returnUrl,
  labels,
}: {
  session: CheckoutSessionSummary | null;
  returnUrl?: string;
  labels?: {
    paymentConfirmation: string;
    confirmationRequired: string;
    testMode: string;
    initialMessage: string;
    confirmedMessage: string;
    pendingMessage: string;
    failedMessage: string;
    testStateUpdated: string;
    confirmPayment: string;
    confirmPaymentAmount?: string;
    otherOutcomes: string;
    markPending: string;
    markFailed: string;
    openInZook: string;
    sessionNotFound: string;
    statusCreated: string;
    statusPaid: string;
    statusPending: string;
    statusFailed: string;
    autopayNextTitle?: string;
    autopayNextBody?: string;
  };
}) {
  const copy = labels ?? {
    paymentConfirmation: "Payment confirmation",
    confirmationRequired: "Confirmation required",
    testMode: "Test mode · no real payment",
    initialMessage: "Choose an outcome to simulate this payment session.",
    confirmedMessage: "Payment confirmed. Your membership will update in Zook.",
    pendingMessage: "Payment is pending. Membership stays inactive until confirmation.",
    failedMessage: "Payment failed. Membership was not activated.",
    testStateUpdated: "Test payment state updated.",
    confirmPayment: "Confirm payment",
    confirmPaymentAmount: undefined,
    otherOutcomes: "Other test outcomes",
    markPending: "Mark pending",
    markFailed: "Mark failed",
    openInZook: "Open in Zook app",
    sessionNotFound: "Payment session not found.",
    statusCreated: "Created",
    statusPaid: "Paid",
    statusPending: "Pending",
    statusFailed: "Failed",
    autopayNextTitle: "After payment: autopay",
    autopayNextBody:
      "Your membership is active after confirmation. Set up autopay from your membership page when you are ready, and cancel it anytime.",
  };
  function statusLabel(value: string) {
    if (value === "CREATED") return copy.statusCreated;
    if (value === "SUCCEEDED") return copy.statusPaid;
    if (value === "PENDING") return copy.statusPending;
    if (value === "FAILED") return copy.statusFailed;
    return checkoutStatusLabel(value);
  }
  const [status, setStatus] = useState(session?.status ?? "MISSING");
  const [message, setMessage] = useState(copy.initialMessage);
  const [pendingStatus, setPendingStatus] = useState<"SUCCEEDED" | "FAILED" | "PENDING" | null>(
    null,
  );
  const isSucceeded = status === "SUCCEEDED";
  const confirmPaymentLabel =
    copy.confirmPaymentAmount?.replace("{amount}", formatInr(session?.amountPaise ?? 0)) ??
    copy.confirmPayment;

  useEffect(() => {
    if (status !== "SUCCEEDED" || !returnUrl) {
      return;
    }
    const timer = window.setTimeout(() => {
      window.location.assign(returnUrl);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [returnUrl, status]);

  async function complete(nextStatus: "SUCCEEDED" | "FAILED" | "PENDING") {
    if (!session) return;
    setPendingStatus(nextStatus);
    if (session.id === "demo") {
      setStatus(nextStatus);
      setMessage(
        nextStatus === "SUCCEEDED"
          ? copy.confirmedMessage
          : nextStatus === "PENDING"
            ? copy.pendingMessage
            : copy.failedMessage,
      );
      toast.success(copy.testStateUpdated);
      setPendingStatus(null);
      return;
    }
    try {
      const response = await fetch(`/api/payments/mock/${session.id}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-zook-intent": "mutate" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      setStatus(payload.ok ? payload.data.session.status : "FAILED");
      setMessage(
        payload.ok
          ? copy.confirmedMessage
          : safeCheckoutMessage(payload.error?.message),
      );
      if (payload.ok) {
        toast.success(copy.testStateUpdated);
      } else {
        toast.error(safeCheckoutMessage(payload.error?.message));
      }
    } catch (error) {
      const nextMessage = safeCheckoutMessage(
        error instanceof Error ? error.message : "Payment update failed.",
      );
      setStatus("FAILED");
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setPendingStatus(null);
    }
  }

  if (!session) {
    return <div className="glass-panel rounded-[28px] p-8">{copy.sessionNotFound}</div>;
  }

  return (
    <div className="glass-panel w-full max-w-xl rounded-[28px] p-5 md:p-8">
      <div className="rounded-[24px] border border-[var(--border-focus)]/30 bg-[var(--bg-sunken)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-[var(--text-tertiary)]">
                {copy.paymentConfirmation}
              </p>
              <span className="rounded-full border border-[var(--feedback-warning)]/40 bg-[var(--surface-warning-soft)] px-2 py-0.5 text-[0.68rem] font-semibold text-[var(--feedback-warning)]">
                {copy.testMode}
              </span>
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--accent-strong)]">
              {formatInr(session.amountPaise)}
            </h1>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
              {session.planName ?? checkoutPurposeLabel(session.purpose)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {session.validityLabel ?? copy.confirmationRequired}
            </p>
          </div>
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            {statusLabel(status)}
          </span>
        </div>
      </div>
      {!isSucceeded ? (
        <>
          <div className="mt-5">
            <button
              onClick={() => void complete("SUCCEEDED")}
              disabled={Boolean(pendingStatus)}
              className="zook-focus inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-semibold text-[var(--text-on-accent)] transition hover:opacity-90 active:scale-[0.99]"
            >
              {pendingStatus === "SUCCEEDED" ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/45 border-t-transparent" />
              ) : (
                <CheckCircle2 size={18} />
              )}
              {confirmPaymentLabel}
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]" aria-live="polite">
            {message}
          </p>
          <details className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
            <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)]">
              {copy.otherOutcomes}
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => void complete("PENDING")}
                disabled={Boolean(pendingStatus)}
                className="zook-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--feedback-warning)] bg-[var(--surface-warning-soft)] px-4 text-sm font-semibold text-[var(--feedback-warning)] transition hover:bg-[var(--bg-sunken)]"
              >
                {pendingStatus === "PENDING" ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/40 border-t-transparent" />
                ) : (
                  <Clock size={16} />
                )}
                {copy.markPending}
              </button>
              <button
                onClick={() => void complete("FAILED")}
                disabled={Boolean(pendingStatus)}
                className="zook-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--feedback-danger)] bg-[var(--surface-danger-soft)] px-4 text-sm font-semibold text-[var(--feedback-danger)] transition hover:bg-[var(--bg-sunken)]"
              >
                {pendingStatus === "FAILED" ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/40 border-t-transparent" />
                ) : (
                  <XCircle size={16} />
                )}
                {copy.markFailed}
              </button>
            </div>
          </details>
        </>
      ) : null}
      {isSucceeded ? (
        <div className="mt-5 grid gap-3">
          <div
            className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2.5"
            aria-live="polite"
          >
            <div className="flex gap-2 text-sm leading-5 text-[var(--text-secondary)]">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-[var(--feedback-success)]"
                aria-hidden="true"
              />
              <span>{message}</span>
            </div>
          </div>
          {session.purpose === "MEMBERSHIP" ? (
            <details className="group rounded-[18px] border border-[var(--border-focus)]/30 bg-[var(--surface-accent-soft)] px-3 py-2">
              <summary className="zook-focus flex cursor-pointer list-none items-center gap-2 rounded-[14px] text-sm font-semibold text-[var(--text-primary)]">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-fill)] text-[var(--text-on-accent)]">
                  <Zap size={14} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate">{copy.autopayNextTitle}</span>
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className="shrink-0 text-[var(--text-tertiary)] transition group-open:rotate-180"
                />
              </summary>
              <p className="mt-2 pl-9 text-xs leading-5 text-[var(--text-secondary)]">
                {copy.autopayNextBody}
              </p>
            </details>
          ) : null}
          <ZookButtonLink href={returnUrl ?? "zook://"} tone="secondary" fullWidth>
            {copy.openInZook}
          </ZookButtonLink>
        </div>
      ) : null}
    </div>
  );
}
