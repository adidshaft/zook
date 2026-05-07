"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatEnumLabel, formatInr } from "@/lib/format";

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
      return;
    }
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
  }

  if (!session) {
    return <div className="glass-panel rounded-[28px] p-8">Payment session not found.</div>;
  }

  return (
    <div className="glass-panel w-full max-w-xl rounded-[28px] p-8">
      <div className="sticky top-4 z-10 mb-5 rounded-2xl border border-amber-300/30 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-50 shadow-[var(--zook-shadow-glass)]">
        TEST MODE · No real payment. Click any outcome to simulate.
      </div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-white/45">Payment confirmation</p>
          <h1 className="mt-1 text-3xl font-semibold">{formatInr(session.amountPaise)}</h1>
        </div>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs">
          {formatEnumLabel(status)}
        </span>
      </div>
      <p className="text-sm leading-6 text-white/55">{message}</p>
      <div className="mt-5 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-white/65">
        <p>
          <span className="text-white/38">Plan:</span>{" "}
          {session.planName ?? formatEnumLabel(session.purpose)}
        </p>
        <p>
          <span className="text-white/38">Validity:</span>{" "}
          {session.validityLabel ?? "Payment confirmation required"}
        </p>
        <p>
          <span className="text-white/38">Activation:</span>{" "}
          {session.activationLabel ?? "Confirmation required"}
        </p>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <button
          onClick={() => complete("SUCCEEDED")}
          className="zook-focus rounded-2xl bg-lime-300 px-4 py-3 font-semibold text-black"
        >
          <CheckCircle2 className="mx-auto mb-2" />
          Simulate Success
        </button>
        <button
          onClick={() => complete("PENDING")}
          className="zook-focus rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-amber-100"
        >
          <Clock className="mx-auto mb-2" />
          Simulate Pending
        </button>
        <button
          onClick={() => complete("FAILED")}
          className="zook-focus rounded-2xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-red-100"
        >
          <XCircle className="mx-auto mb-2" />
          Simulate Failure
        </button>
      </div>
      {status === "SUCCEEDED" ? (
        <a
          href={returnUrl ?? "zook://"}
          className="zook-focus mt-5 inline-flex w-full items-center justify-center rounded-full border border-lime-300/40 bg-lime-300/10 px-5 py-3 text-sm font-semibold text-lime-100 transition hover:bg-lime-300/16"
        >
          Open in Zook app
        </a>
      ) : null}
    </div>
  );
}
