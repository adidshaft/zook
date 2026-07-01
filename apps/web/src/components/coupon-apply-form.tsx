"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { formatInr } from "@/lib/format";
import { publicJoinHref } from "@/lib/public-join-url";
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

type CouponApplyCopy = {
  addCoupon: string;
  applyCoupon: string;
  applyingCoupon: string;
  couponApplied: string;
  couponCode: string;
  couponInvalid: string;
  couponRequired: string;
  couponWillApply: string;
  enterCoupon: string;
};

const fallbackCopy: CouponApplyCopy = {
  addCoupon: "Add coupon",
  applyCoupon: "Apply",
  applyingCoupon: "Applying...",
  couponApplied: "Coupon {code} applied · -{discount}",
  couponCode: "Coupon code",
  couponInvalid: "Coupon code is not valid for this plan.",
  couponRequired: "Enter a coupon code to apply.",
  couponWillApply: "Coupon {code} will be applied at checkout.",
  enterCoupon: "Enter coupon",
};

function formatTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, value),
    template,
  );
}

function payloadMessage(payload: CouponValidatePayload, copy: CouponApplyCopy) {
  if (typeof payload.error === "string") {
    return safeCouponMessage(payload.error, copy);
  }
  return safeCouponMessage(payload.error?.message, copy);
}

function safeCouponMessage(message: string | undefined, copy: CouponApplyCopy) {
  if (!message) return copy.couponInvalid;
  if (
    /prisma|localhost|database|stack|constraint|exception|fetch failed|ECONNREFUSED/i.test(message)
  ) {
    return copy.couponInvalid;
  }
  return message;
}

export function CouponApplyForm({
  className = "mt-4",
  orgId,
  username,
  planId,
  referralCode,
  initialCouponCode,
  labels,
  variant = "disclosure",
}: {
  className?: string;
  orgId: string;
  username: string;
  planId: string;
  referralCode?: string | null;
  initialCouponCode?: string | null;
  labels?: Partial<CouponApplyCopy>;
  variant?: "disclosure" | "inline";
}) {
  const router = useRouter();
  const couponId = useId();
  const messageId = useId();
  const copy = { ...fallbackCopy, ...labels };
  const [couponCode, setCouponCode] = useState(initialCouponCode ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [valid, setValid] = useState(Boolean(initialCouponCode));

  async function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setValid(false);
      setMessage(copy.couponRequired);
      router.replace(publicJoinHref({ username, plan: planId, referralCode }), { scroll: false });
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
        throw new Error(payload ? payloadMessage(payload, copy) : copy.couponInvalid);
      }
      const discountPaise = payload?.data?.discountPaise ?? 0;
      const normalizedCode = payload?.data?.coupon?.code ?? code;
      setValid(true);
      setCouponCode(normalizedCode);
      const successMessage = formatTemplate(copy.couponApplied, {
        code: normalizedCode,
        discount: formatInr(discountPaise),
      });
      setMessage(successMessage);
      toast.success(successMessage);
      router.replace(
        publicJoinHref({ username, plan: planId, referralCode, couponCode: normalizedCode }),
        { scroll: false },
      );
    } catch (error) {
      const nextMessage = safeCouponMessage(error instanceof Error ? error.message : undefined, copy);
      setValid(false);
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setBusy(false);
    }
  }

  const trimmedCode = couponCode.trim().toUpperCase();
  const hasAppliedCoupon = valid && Boolean(trimmedCode);
  const inputControls = (
    <>
      <label htmlFor={couponId} className="sr-only">
        {copy.couponCode}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={couponId}
          name="coupon"
          value={couponCode}
          onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
          placeholder={copy.enterCoupon}
          aria-describedby={message ? messageId : undefined}
          className="zook-focus min-h-10 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
        />
        <ZookButton type="submit" tone="ghost" state={busy ? "loading" : "idle"} disabled={busy}>
          {busy ? copy.applyingCoupon : copy.applyCoupon}
        </ZookButton>
      </div>
      {message ? (
        <p
          id={messageId}
          role={valid ? "status" : "alert"}
          aria-live="polite"
          className={`rounded-[16px] border px-3 py-2 text-xs ${
            valid
              ? "border-[var(--border)] bg-[var(--surface-accent-soft)] text-[var(--text-primary)]"
              : "border-[var(--border)] bg-[var(--surface-warning-soft)] text-[var(--text-primary)]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </>
  );

  if (variant === "inline") {
    return (
      <form onSubmit={(event) => void applyCoupon(event)} className={className}>
        <div className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {copy.couponCode}
            </span>
            {valid && trimmedCode ? (
              <span className="max-w-[12rem] truncate text-xs font-semibold text-[var(--accent-strong)]">
                {trimmedCode}
              </span>
            ) : null}
          </div>
          {inputControls}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={(event) => void applyCoupon(event)} className={className}>
      <details className="group rounded-[18px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
        <summary className="zook-focus flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl text-sm font-semibold text-[var(--text-primary)]">
          {hasAppliedCoupon ? (
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 text-[var(--text-tertiary)]">{copy.couponCode}</span>
              <span className="min-w-0 truncate rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-2 py-0.5 text-xs font-bold text-[var(--accent-strong)]">
                {trimmedCode}
              </span>
            </span>
          ) : (
            <span className="min-w-0 truncate">{copy.addCoupon}</span>
          )}
          <ChevronDown
            size={15}
            aria-hidden="true"
            className="shrink-0 text-[var(--text-tertiary)] transition group-open:rotate-180"
          />
        </summary>
        <div className="mt-3 grid gap-2">
          {inputControls}
        </div>
      </details>
    </form>
  );
}
