"use client";

import { useState } from "react";
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

export function CheckoutPanel({ session }: { session: CheckoutSessionSummary | null }) {
  const [status, setStatus] = useState(session?.status ?? "MISSING");
  const [message, setMessage] = useState(
    "Confirm payment to continue.",
  );

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
          Success
        </button>
        <button
          onClick={() => complete("PENDING")}
          className="zook-focus rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-amber-100"
        >
          <Clock className="mx-auto mb-2" />
          Pending
        </button>
        <button
          onClick={() => complete("FAILED")}
          className="zook-focus rounded-2xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-red-100"
        >
          <XCircle className="mx-auto mb-2" />
          Failure
        </button>
      </div>
    </div>
  );
}
