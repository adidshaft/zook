"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolvePlanName } from "@zook/ui";
import { formatInr } from "@/lib/format";
import { planValidityLabel, planVisitLabel } from "@/lib/public-plan-labels";

type Plan = {
  id: string;
  handle: string;
  name: string;
  pricePaise: number;
  durationDays: number | null;
  type: string;
  visitLimit: number | null;
};

type PublicLocale = "en" | "hi";

function joinHref(input: {
  username: string;
  planHandle: string;
  referralCode?: string | null | undefined;
  couponCode?: string | null | undefined;
  locale: PublicLocale;
}) {
  const query = new URLSearchParams({ plan: input.planHandle });
  if (input.referralCode) {
    query.set("ref", input.referralCode);
  }
  if (input.couponCode) {
    query.set("coupon", input.couponCode);
  }
  if (input.locale === "hi") {
    query.set("lang", "hi");
  }
  return `/join/${input.username}?${query.toString()}`;
}

export function PlanSelector({
  plans,
  selectedPlanId,
  username,
  referralCode,
  couponCode,
  locale = "en",
  choosePlanLabel,
  changingPlanLabel,
}: {
  plans: Plan[];
  selectedPlanId: string;
  username: string;
  referralCode?: string | null | undefined;
  couponCode?: string | null | undefined;
  locale?: PublicLocale;
  choosePlanLabel: string;
  changingPlanLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePlanChange = (planHandle: string) => {
    startTransition(() => {
      const nextHref = joinHref({
        username,
        planHandle,
        referralCode: referralCode ?? null,
        couponCode: couponCode ?? null,
        locale,
      });
      router.push(nextHref);
    });
  };

  return (
    <div className="relative mt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
        {choosePlanLabel}
      </p>

      <div className="relative mt-2.5">
        <div
          className={`grid gap-2.5 md:grid-cols-2 transition-all duration-300 ${isPending ? "opacity-40 pointer-events-none filter blur-[1px]" : ""} ${
            plans.length > 4 ? "max-h-[185px] overflow-y-auto pr-1 scroll-smooth" : ""
          }`}
          role="radiogroup"
          aria-label="Membership plan"
        >
          {plans.map((plan) => {
            const isSelected = plan.id === selectedPlanId;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => handlePlanChange(plan.handle)}
                className={`zook-focus text-left w-full rounded-[22px] border p-4 transition ${
                  isSelected
                    ? "border-[var(--border-focus)] bg-[var(--surface-accent-soft)]"
                    : "border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--bg-sunken)]"
                }`}
                role="radio"
                aria-checked={isSelected}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--text-primary)]">
                      {resolvePlanName(plan)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {planValidityLabel(plan, locale)} · {planVisitLabel(plan.visitLimit, locale)}
                    </p>
                  </div>
                  <span className="font-semibold text-[var(--accent-strong)] shrink-0">
                    {formatInr(plan.pricePaise)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {isPending && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[22px] bg-black/40 backdrop-blur-sm transition-all duration-300 animate-fade-in">
            <div className="flex flex-col items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <div className="absolute h-10 w-10 rounded-full border-4 border-white/20 border-t-[var(--accent-strong)] animate-spin" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white bg-black/60 px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
                {changingPlanLabel}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
