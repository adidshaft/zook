"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ZookButton } from "@/components/zook-button";

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: { message?: string } | string;
};

function isInternalCheckoutError(message: string) {
  return /prisma|localhost|database|stack|trace|internal server|failed to fetch|networkerror|ECONNREFUSED|<html/i.test(
    message,
  );
}

export function JoinCheckoutButton({
  orgId,
  planId,
  couponCode,
  referralCode,
  loginPath,
  fallbackCheckoutUrl,
  labels,
  className = "mt-6",
}: {
  orgId: string;
  planId: string;
  couponCode?: string | null;
  referralCode?: string | null;
  loginPath: string;
  fallbackCheckoutUrl?: string | null;
  className?: string;
  labels?: {
    idle: string;
    busy: string;
    started: string;
    unavailable: string;
    unable: string;
  };
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statusId = `checkout-status-${orgId}-${planId}`;
  const copy = labels ?? {
    idle: "Pay securely",
    busy: "Starting payment...",
    started: "Payment started.",
    unavailable: "Payment is unavailable for this plan.",
    unable: "Unable to start payment.",
  };

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
            : payload?.error?.message ?? copy.unable;
        throw new Error(message);
      }

      const checkoutUrl =
        payload?.data?.checkoutUrl ??
        fallbackCheckoutUrl ??
        (payload?.data?.session?.id ? `/checkout/${payload.data.session.id}` : null);
      if (!checkoutUrl) {
        throw new Error(copy.unavailable);
      }
      toast.success(copy.started);
      window.location.assign(checkoutUrl);
    } catch (cause) {
      const rawMessage = cause instanceof Error ? cause.message : copy.unable;
      const message = isInternalCheckoutError(rawMessage) ? copy.unable : rawMessage;
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`grid gap-3 ${className}`}>
      <ZookButton
        type="button"
        fullWidth
        onClick={() => void startCheckout()}
        disabled={busy}
        state={busy ? "loading" : "idle"}
        aria-describedby={error ? statusId : undefined}
      >
        {busy ? copy.busy : copy.idle}
      </ZookButton>
      {error ? (
        <div
          id={statusId}
          role="alert"
          aria-live="polite"
          className="rounded-[18px] border border-[color-mix(in_srgb,var(--feedback-danger)_32%,transparent)] bg-[var(--surface-danger-soft)] px-4 py-3 text-sm text-[var(--feedback-danger)]"
        >
          <p>{error}</p>
        </div>
      ) : null}
    </div>
  );
}
