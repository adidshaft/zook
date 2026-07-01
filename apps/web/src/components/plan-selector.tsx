"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { resolvePlanName } from "@zook/ui";
import { formatInr } from "@/lib/format";
import { publicJoinHref } from "@/lib/public-join-url";
import {
  planNameLabel,
  planValidityLabel,
  planVisitLabel,
} from "@/lib/public-plan-labels";

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

export function PlanSelector({
  plans,
  selectedPlanId,
  username,
  referralCode,
  couponCode,
  locale = "en",
  choosePlanLabel,
  changingPlanLabel,
  className = "mt-5",
}: {
  plans: Plan[];
  selectedPlanId: string;
  username: string;
  referralCode?: string | null | undefined;
  couponCode?: string | null | undefined;
  locale?: PublicLocale;
  choosePlanLabel: string;
  changingPlanLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const optionCountLabel =
    locale === "hi"
      ? `${plans.length} ${plans.length === 1 ? "विकल्प" : "विकल्प"}`
      : `${plans.length} ${plans.length === 1 ? "option" : "options"}`;
  const planGroupLabel = locale === "hi" ? "सदस्यता प्लान" : "Membership plan";
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];
  const changeOptions = plans.length > 1 ? plans.filter((plan) => plan.id !== selectedPlanId) : plans;
  const changeOptionCountLabel =
    locale === "hi"
      ? `${changeOptions.length} ${changeOptions.length === 1 ? "दूसरा विकल्प" : "दूसरे विकल्प"}`
      : `${changeOptions.length} ${changeOptions.length === 1 ? "other option" : "other options"}`;

  const handlePlanChange = (planHandle: string) => {
    startTransition(() => {
      const nextHref = publicJoinHref({
        username,
        plan: planHandle,
        referralCode: referralCode ?? null,
        couponCode: couponCode ?? null,
        locale,
      });
      router.push(nextHref);
    });
  };

  return (
    <div className={`relative ${className}`}>
      <details className="group rounded-[18px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
        <summary className="zook-focus flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl text-sm font-semibold text-[var(--text-primary)]">
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-xs font-semibold text-[var(--text-tertiary)]">
              {choosePlanLabel}
            </span>
            <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {selectedPlan ? planNameLabel(resolvePlanName(selectedPlan), locale) : optionCountLabel}
            </span>
            <span className="truncate text-xs font-medium text-[var(--text-tertiary)]">
              {plans.length > 1 ? changeOptionCountLabel : optionCountLabel}
            </span>
          </span>
          {selectedPlan ? (
            <span className="shrink-0 text-sm font-semibold text-[var(--accent-strong)]">
              {formatInr(selectedPlan.pricePaise)}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            size={16}
            className="shrink-0 text-[var(--text-tertiary)] transition-transform duration-200 group-open:rotate-180"
          />
        </summary>
        <div className="relative mt-2">
          <div
            className={`grid gap-2 transition-all duration-300 ${
              isPending ? "opacity-40 pointer-events-none filter blur-[1px]" : ""
            } ${
              changeOptions.length > 4 ? "max-h-[190px] overflow-y-auto pr-1 scroll-smooth" : ""
            }`}
            aria-label={planGroupLabel}
          >
            {changeOptions.map((plan) => {
              const isSelected = plan.id === selectedPlanId;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => handlePlanChange(plan.handle)}
                  className={`zook-focus w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                    isSelected
                      ? "border-[var(--border-focus)] bg-[var(--surface-accent-soft)]"
                      : "border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--bg-sunken)]"
                  }`}
                >
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 rounded-full border ${
                        isSelected
                          ? "border-[var(--accent-strong)] bg-[var(--accent-strong)]"
                          : "border-[var(--border-focus)] bg-transparent"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {planNameLabel(resolvePlanName(plan), locale)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {planValidityLabel(plan, locale)} · {planVisitLabel(plan.visitLimit, locale)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[var(--accent-strong)]">
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
      </details>
    </div>
  );
}
