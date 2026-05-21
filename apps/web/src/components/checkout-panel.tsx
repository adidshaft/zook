"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
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

export function CheckoutPanel({
  session,
  returnUrl,
}: {
  session: CheckoutSessionSummary | null;
  returnUrl?: string;
}) {
  const [status, setStatus] = useState(session?.status ?? "MISSING");
  const [message, setMessage] = useState("Choose an outcome to simulate this payment session.");

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
    if (session.id === "demo") {
      setStatus(nextStatus);
      setMessage(
        nextStatus === "SUCCEEDED"
          ? "Payment confirmed. Your membership will update in Zook."
          : nextStatus === "PENDING"
            ? "Payment is pending. Membership stays inactive until confirmation."
            : "Payment failed. Membership was not activated.",
      );
      toast.success("Test payment state updated.");
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
          ? "Payment confirmed. Your membership will update in Zook."
          : payload.error.message,
      );
      if (payload.ok) {
        toast.success("Test payment state updated.");
      } else {
        toast.error(payload.error.message);
      }
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Payment update failed.";
      setStatus("FAILED");
      setMessage(nextMessage);
      toast.error(nextMessage);
    }
  }

  if (!session) {
    return <div className="glass-panel rounded-[28px] p-8">Payment session not found.</div>;
  }

  return (
    <div className="glass-panel w-full max-w-xl rounded-[28px] p-8">
      <div className="sticky top-4 z-10 mb-5 rounded-2xl border border-[var(--feedback-warning)] bg-[var(--surface-warning-soft)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-lg)]">
        TEST MODE · No real payment. Click any outcome to simulate.
      </div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-tertiary)]">Payment confirmation</p>
          <h1 className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">{formatInr(session.amountPaise)}</h1>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-1 text-xs text-[var(--text-secondary)] font-medium">
          {formatEnumLabel(status)}
        </span>
      </div>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">{message}</p>
      <div className="mt-5 grid gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-sm text-[var(--text-secondary)]">
        <p>
          <span className="text-[var(--text-tertiary)]">Plan:</span>{" "}
          {session.planName ?? formatEnumLabel(session.purpose)}
        </p>
        <p>
          <span className="text-[var(--text-tertiary)]">Validity:</span>{" "}
          {session.validityLabel ?? "Confirmation required"}
        </p>
        <p>
          <span className="text-[var(--text-tertiary)]">Activation:</span>{" "}
          {session.activationLabel ?? "Confirmation required"}
        </p>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <button
          onClick={() => void complete("SUCCEEDED")}
          className="zook-focus rounded-2xl bg-[var(--accent-fill)] px-4 py-3 font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
        >
          <CheckCircle2 className="mx-auto mb-2" />
          Simulate Success
        </button>
        <button
          onClick={() => void complete("PENDING")}
          className="zook-focus rounded-2xl border border-[var(--feedback-warning)] bg-[var(--surface-warning-soft)] hover:bg-[var(--bg-sunken)] px-4 py-3 text-[var(--feedback-warning)] font-semibold transition"
        >
          <Clock className="mx-auto mb-2" />
          Simulate Pending
        </button>
        <button
          onClick={() => void complete("FAILED")}
          className="zook-focus rounded-2xl border border-[var(--feedback-danger)] bg-[var(--surface-danger-soft)] hover:bg-[var(--bg-sunken)] px-4 py-3 text-[var(--feedback-danger)] font-semibold transition"
        >
          <XCircle className="mx-auto mb-2" />
          Simulate Failure
        </button>
      </div>
      {status === "SUCCEEDED" ? (
        <div className="mt-5">
          <ZookButtonLink href={returnUrl ?? "zook://"} tone="secondary" fullWidth>
            Open in Zook app
          </ZookButtonLink>
        </div>
      ) : null}
    </div>
  );
}
