"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatInr } from "@/lib/format";
import { ZookButton } from "@/components/zook-button";

type CouponValidatePayload = {
  ok?: boolean;
  data?: {
    coupon?: { code?: string };
    discountPaise?: number;
    finalAmountPaise?: number;
  };
  error?: { message?: string } | string;
};

function joinHref(input: {
  username: string;
  planId: string;
  couponCode?: string;
  referralCode?: string | null | undefined;
}) {
  const query = new URLSearchParams({ plan: input.planId });
  if (input.referralCode) {
    query.set("ref", input.referralCode);
  }
  if (input.couponCode) {
    query.set("coupon", input.couponCode);
  }
  return `/join/${input.username}?${query.toString()}`;
}

function payloadMessage(payload: CouponValidatePayload) {
  if (typeof payload.error === "string") {
    return payload.error;
  }
  return payload.error?.message ?? "Coupon code is not valid for this plan.";
}

export function CouponApplyForm({
  orgId,
  username,
  planId,
  referralCode,
  initialCouponCode,
}: {
  orgId: string;
  username: string;
  planId: string;
  referralCode?: string | null;
  initialCouponCode?: string | null;
}) {
  const router = useRouter();
  const couponId = useId();
  const messageId = useId();
  const [couponCode, setCouponCode] = useState(initialCouponCode ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    initialCouponCode ? `Coupon ${initialCouponCode} will be applied at checkout.` : null,
  );
  const [valid, setValid] = useState(Boolean(initialCouponCode));

  async function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setValid(false);
      setMessage("Enter a coupon code to apply.");
      router.replace(joinHref({ username, planId, referralCode }), { scroll: false });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/orgs/${orgId}/coupons/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, planId }),
      });
      const payload = (await response.json().catch(() => null)) as CouponValidatePayload | null;
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload ? payloadMessage(payload) : "Coupon code is not valid.");
      }
      const discountPaise = payload?.data?.discountPaise ?? 0;
      const normalizedCode = payload?.data?.coupon?.code ?? code;
      setValid(true);
      setCouponCode(normalizedCode);
      const successMessage = `Coupon ${normalizedCode} applied · -${formatInr(discountPaise)}`;
      setMessage(successMessage);
      toast.success(successMessage);
      router.replace(
        joinHref({ username, planId, referralCode, couponCode: normalizedCode }),
        { scroll: false },
      );
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Coupon code is not valid.";
      setValid(false);
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void applyCoupon(event)} className="mt-6 grid gap-2">
      <label
        htmlFor={couponId}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35"
      >
        Coupon code
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={couponId}
          name="coupon"
          value={couponCode}
          onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
          placeholder="Enter coupon"
          aria-describedby={message ? messageId : undefined}
          className="zook-focus min-h-11 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
        />
        <ZookButton type="submit" tone="ghost" state={busy ? "loading" : "idle"} disabled={busy}>
          {busy ? "Applying..." : "Apply"}
        </ZookButton>
      </div>
      {message ? (
        <p
          id={messageId}
          role={valid ? "status" : "alert"}
          aria-live="polite"
          className={`rounded-[18px] border px-4 py-3 text-sm ${
            valid
              ? "border-lime-300/20 bg-lime-300/10 text-lime-100"
              : "border-amber-300/20 bg-amber-300/10 text-amber-50"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
