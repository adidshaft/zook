import Link from "next/link";
import { resolvePlanName } from "@zook/ui";
import { GlassCard, Pill } from "@/components/glass-card";
import { formatEnumLabel, formatInr } from "@/lib/format";
import { planValidityLabel, planVisitLabel } from "@/lib/public-plan-labels";
import { priceSummary } from "@/lib/public-gym-profile";
import { localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";
import type { PublicGym, PublicGymPlan } from "./types";

export function GymPlansGrid({
  org,
  plans,
  locale,
}: {
  org: PublicGym;
  plans: PublicGymPlan[];
  locale: PublicLocale;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const paidPlans = plans.filter((plan) => plan.pricePaise > 0);
  const visiblePlans = plans.slice(0, 4);
  const recommendedPlanId =
    paidPlans.find((plan) => plan.durationDays && plan.durationDays <= 45)?.id ??
    paidPlans[0]?.id ??
    plans[0]?.id;

  if (!plans.length) {
    return (
      <section id="plans" className="scroll-mt-5">
        <GlassCard>
          <Pill tone="amber">{t("plansComingSoon")}</Pill>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">{priceSummary([], locale)}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{t("noPublicPlanCopy")}</p>
        </GlassCard>
      </section>
    );
  }

  return (
    <section id="plans" className="grid scroll-mt-5 gap-4 lg:grid-cols-3">
      {visiblePlans.map((plan) => (
        <Link
          key={plan.id}
          href={localizedPath(`/join/${org.username}`, locale, { plan: plan.handle })}
          className="zook-focus block rounded-[28px] transition hover:-translate-y-0.5"
        >
          <GlassCard
            variant={plan.id === recommendedPlanId ? "selected" : "default"}
            className="h-full transition hover:border-[var(--border-focus)] hover:bg-[var(--bg-sunken)]"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Pill tone={plan.id === recommendedPlanId ? "lime" : "neutral"}>
                  {plan.id === recommendedPlanId ? t("mostPopular") : formatEnumLabel(plan.type)}
                </Pill>
                <h2 className="mt-4 max-w-full truncate text-2xl font-semibold text-[var(--text-primary)]">
                  {resolvePlanName(plan)}
                </h2>
              </div>
              <p className="metric shrink-0 text-2xl font-semibold text-[var(--accent-strong)]">
                {formatInr(plan.pricePaise)}
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{plan.description}</p>
            <p className="mt-4 text-sm text-[var(--text-tertiary)]">
              {planValidityLabel(plan, locale)} · {planVisitLabel(plan.visitLimit, locale)}
            </p>
          </GlassCard>
        </Link>
      ))}
      {plans.length > visiblePlans.length ? (
        <Link
          href={localizedPath(`/join/${org.username}`, locale)}
          className="zook-focus inline-flex w-fit rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] lg:col-span-3"
        >
          {t("seeAllPlansPrefix")} {plans.length} {t("seeAllPlansSuffix")}
        </Link>
      ) : null}
    </section>
  );
}
