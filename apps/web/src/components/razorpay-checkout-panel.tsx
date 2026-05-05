"use client";

import { useEffect, useMemo, useState } from "react";

type RazorpayCheckoutData = {
  provider?: unknown;
  orderId?: unknown;
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
}: {
  checkoutData: RazorpayCheckoutData;
  sessionId: string;
  description: string;
}) {
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState("");
  const [handoffState, setHandoffState] = useState<"idle" | "opening" | "submitted" | "failed">(
    "idle",
  );

  const orderId = asString(checkoutData.orderId);
  const keyId = asString(checkoutData.keyId);
  const amountPaise = asNumber(checkoutData.amountPaise);
  const currency = asString(checkoutData.currency) ?? "INR";
  const themeColor = asString(checkoutData.themeColor) ?? "#b9f455";
  const returnUrl = asString(checkoutData.returnUrl);

  const canOpen = Boolean(orderId && keyId && amountPaise && scriptReady && !scriptError);
  const statusText = useMemo(() => {
    if (scriptError) return scriptError;
    if (!orderId || !keyId || !amountPaise) return "Payment handoff is missing provider data.";
    if (!scriptReady) return "Preparing secure checkout...";
    if (handoffState === "opening") return "Opening Razorpay...";
    if (handoffState === "submitted")
      return "Payment submitted. Waiting for secure webhook confirmation.";
    if (handoffState === "failed") return "Checkout was closed before payment confirmation.";
    return "Ready for secure payment.";
  }, [amountPaise, handoffState, keyId, orderId, scriptError, scriptReady]);

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
      setScriptError("Unable to load Razorpay Checkout. Check the network and retry.");
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
      order_id: orderId,
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
    <div className="mt-6 rounded-[24px] border border-lime-300/25 bg-lime-300/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lime-100/55">Razorpay Checkout</p>
          <p className="mt-2 text-sm text-white/70">{statusText}</p>
        </div>
        <button
          type="button"
          disabled={!canOpen || handoffState === "opening"}
          onClick={openCheckout}
          className="zook-focus inline-flex items-center justify-center rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pay securely
        </button>
      </div>
    </div>
  );
}
