"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ZookButton } from "@/components/zook-button";

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: { message?: string } | string;
};

export function JoinCheckoutButton({
  orgId,
  planId,
  couponCode,
  referralCode,
  loginPath,
  fallbackCheckoutUrl,
}: {
  orgId: string;
  planId: string;
  couponCode?: string | null;
  referralCode?: string | null;
  loginPath: string;
  fallbackCheckoutUrl?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/orgs/${orgId}/subscriptions`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-zook-intent": "mutate" },
        body: JSON.stringify({
          planId,
          ...(couponCode ? { couponCode } : {}),
          ...(referralCode ? { referralCode } : {}),
        }),
      });

      if (response.status === 401) {
        window.location.assign(loginPath);
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | ApiEnvelope<{ checkoutUrl?: string | null; session?: { id?: string } }>
        | null;
      if (!response.ok || payload?.ok === false) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : payload?.error?.message ?? "Unable to start payment.";
        throw new Error(message);
      }

      const checkoutUrl =
        payload?.data?.checkoutUrl ??
        fallbackCheckoutUrl ??
        (payload?.data?.session?.id ? `/checkout/${payload.data.session.id}` : null);
      if (!checkoutUrl) {
        throw new Error("Payment is not available for this plan yet.");
      }
      toast.success("Payment started.");
      window.location.assign(checkoutUrl);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to start payment.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-3">
      <ZookButton
        type="button"
        fullWidth
        onClick={() => void startCheckout()}
        disabled={busy}
        state={busy ? "loading" : "idle"}
      >
        {busy ? "Starting payment..." : "Pay securely"}
      </ZookButton>
      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-[18px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
