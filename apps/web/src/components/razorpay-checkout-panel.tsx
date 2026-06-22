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
  description,
  returnUrl: returnUrlOverride,
}: {
  checkoutData: RazorpayCheckoutData;
  sessionId: string;
  description: string;
  returnUrl?: string;
}) {
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
  const ctaLabel = handoffState === "failed" ? "Try checkout again" : isRecurring ? "Authorize autopay" : "Pay securely";

  const canOpen = Boolean(providerReference && keyId && amountPaise && scriptReady && !scriptError);
  const statusText = useMemo(() => {
    if (scriptError) return scriptError;
    if (!providerReference || !keyId || !amountPaise)
      return "Payment details are incomplete. Please start again from Zook.";
    if (!scriptReady) return "Preparing secure payment...";
    if (handoffState === "opening") return "Redirecting to Razorpay...";
    if (handoffState === "submitted")
      return isRecurring
        ? "Autopay authorization submitted. Waiting for confirmation."
        : "Payment submitted. Waiting for confirmation.";
    if (handoffState === "failed")
      return "Razorpay was closed before confirmation. Retry checkout here or return to Zook to start a new payment link.";
    return isRecurring ? "Autopay authorization is available." : "Secure checkout is available.";
  }, [amountPaise, handoffState, isRecurring, keyId, providerReference, scriptError, scriptReady]);

  useEffect(() => {
    if (window.Razorpay) {
      setScriptReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () =>
      setScriptError("Unable to load the payment window. Check the network and retry.");
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

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
    <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Secure checkout</p>
          {!scriptReady && !scriptError ? (
            <p role="status" className="mt-2 text-sm text-[var(--text-secondary)]">
              {statusText}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{statusText}</p>
          )}
        </div>
        <ZookButton
          type="button"
          disabled={!canOpen || handoffState === "opening"}
          state={handoffState === "opening" ? "loading" : "idle"}
          onClick={openCheckout}
        >
          {ctaLabel}
        </ZookButton>
      </div>
    </div>
  );
}
