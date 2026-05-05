"use client";

import { useState } from "react";

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: { message?: string } | string;
};

export function JoinCheckoutButton({
  orgId,
  planId,
  referralCode,
  loginPath,
  fallbackCheckoutUrl,
}: {
  orgId: string;
  planId: string;
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planId,
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
            : payload?.error?.message ?? "Unable to start checkout.";
        throw new Error(message);
      }

      const checkoutUrl =
        payload?.data?.checkoutUrl ??
        fallbackCheckoutUrl ??
        (payload?.data?.session?.id ? `/checkout/${payload.data.session.id}` : null);
      if (!checkoutUrl) {
        throw new Error("Checkout is not available for this plan yet.");
      }
      window.location.assign(checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start checkout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-3">
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={busy}
        className="zook-focus inline-flex w-full justify-center rounded-full bg-lime-300 px-5 py-3 font-semibold text-black disabled:opacity-55"
      >
        {busy ? "Starting checkout..." : "Continue to checkout"}
      </button>
      {error ? (
        <p className="rounded-[18px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
