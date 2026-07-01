"use client";

import { useEffect, useMemo, useState } from "react";
import { ZookButton } from "@/components/zook-button";

type RazorpayCheckoutData = {
  provider?: unknown;
  orderId?: unknown;
  subscriptionId?: unknown;
  keyId?: unknown;
  amountPaise?: unknown;
  currency?: unknown;
  themeColor?: unknown;
  returnUrl?: unknown;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => {
  open: () => void;
  on?: (event: string, handler: (response: unknown) => void) => void;
};

type RazorpayCheckoutLabels = {
  title: string;
  ready: string;
  recurringReady: string;
  amountDue: string;
  paySecurely: string;
  authorizeAutopay: string;
  tryAgain: string;
  incomplete: string;
  preparing: string;
  redirecting: string;
  submitted: string;
  recurringSubmitted: string;
  dismissed: string;
  loadFailed: string;
};

const DEFAULT_RAZORPAY_CHECKOUT_LABELS: RazorpayCheckoutLabels = {
  title: "Secure checkout",
  ready: "Ready for secure payment.",
  recurringReady: "Ready to enable autopay.",
  amountDue: "Amount due",
  paySecurely: "Pay securely",
  authorizeAutopay: "Enable autopay",
  tryAgain: "Try checkout again",
  incomplete: "Payment details are incomplete. Please start again from Zook.",
  preparing: "Preparing secure payment...",
  redirecting: "Redirecting to Razorpay...",
  submitted: "Payment submitted. Waiting for confirmation.",
  recurringSubmitted: "Autopay setup submitted. Waiting for confirmation.",
  dismissed:
    "Razorpay was closed before confirmation. Retry checkout here or return to Zook to start a new payment link.",
  loadFailed: "Unable to load the payment window. Check the network and retry.",
};

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function RazorpayCheckoutPanel({
  checkoutData,
  sessionId,
  amountLabel,
  description,
  returnUrl: returnUrlOverride,
  labels,
}: {
  checkoutData: RazorpayCheckoutData;
  sessionId: string;
  amountLabel?: string;
  description: string;
  returnUrl?: string;
  labels?: RazorpayCheckoutLabels;
}) {
  const copy = labels ?? DEFAULT_RAZORPAY_CHECKOUT_LABELS;
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState("");
  const [handoffState, setHandoffState] = useState<"idle" | "opening" | "submitted" | "failed">(
    "idle",
  );

  const orderId = asString(checkoutData.orderId);
  const subscriptionId = asString(checkoutData.subscriptionId);
  const keyId = asString(checkoutData.keyId);
  const amountPaise = asNumber(checkoutData.amountPaise);
  const currency = asString(checkoutData.currency) ?? "INR";
  const themeColor = asString(checkoutData.themeColor) ?? "#b9f455";
  const returnUrl = returnUrlOverride ?? asString(checkoutData.returnUrl);
  const providerReference = subscriptionId ?? orderId;
  const isRecurring = Boolean(subscriptionId);
  const ctaLabel = handoffState === "failed" ? copy.tryAgain : isRecurring ? copy.authorizeAutopay : copy.paySecurely;

  const canOpen = Boolean(providerReference && keyId && amountPaise && scriptReady && !scriptError);
  const statusText = useMemo(() => {
    if (scriptError) return scriptError;
    if (!providerReference || !keyId || !amountPaise)
      return copy.incomplete;
    if (!scriptReady) return copy.preparing;
    if (handoffState === "opening") return copy.redirecting;
    if (handoffState === "submitted")
      return isRecurring
        ? copy.recurringSubmitted
        : copy.submitted;
    if (handoffState === "failed")
      return copy.dismissed;
    return isRecurring ? copy.recurringReady : copy.ready;
  }, [amountPaise, copy, handoffState, isRecurring, keyId, providerReference, scriptError, scriptReady]);

  useEffect(() => {
    if (window.Razorpay) {
      setScriptReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => setScriptError(copy.loadFailed);
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [copy.loadFailed]);

  function openCheckout() {
    if (!canOpen || !window.Razorpay) {
      return;
    }
    setHandoffState("opening");
    const checkout = new window.Razorpay({
      key: keyId,
      amount: amountPaise,
      currency,
      name: "Zook",
      description,
      ...(subscriptionId ? { subscription_id: subscriptionId } : { order_id: orderId }),
      notes: {
        paymentSessionId: sessionId,
      },
      theme: {
        color: themeColor,
      },
      handler: () => {
        setHandoffState("submitted");
        if (returnUrl) {
          window.setTimeout(() => {
            window.location.href = returnUrl;
          }, 1200);
        }
      },
      modal: {
        ondismiss: () => setHandoffState("failed"),
      },
    });
    checkout.on?.("payment.failed", () => setHandoffState("failed"));
    checkout.open();
  }

  return (
    <section className="mt-4 rounded-[24px] border border-[var(--border-focus)]/40 bg-[var(--surface-raised)] p-3 shadow-[var(--shadow-sm)]">
      <div className="grid gap-3">
        <ZookButton
          type="button"
          fullWidth
          disabled={!canOpen || handoffState === "opening"}
          state={handoffState === "opening" ? "loading" : "idle"}
          onClick={openCheckout}
          className="min-h-12 whitespace-normal text-center leading-5"
        >
          {ctaLabel}
        </ZookButton>
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="min-w-0 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            {copy.title}
          </p>
          {amountLabel ? (
            <span className="inline-flex max-w-full items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]">
              {copy.amountDue} · {amountLabel}
            </span>
          ) : null}
        </div>
        {!scriptReady && !scriptError ? (
          <p
            role="status"
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]"
          >
            {statusText}
          </p>
        ) : (
          <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
            {statusText}
          </p>
        )}
      </div>
    </section>
  );
}
