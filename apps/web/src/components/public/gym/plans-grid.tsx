import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { resolvePlanName } from "@zook/ui";
import { GlassCard } from "@/components/glass-card";
import { formatInr } from "@/lib/format";
import { planDescriptionLabel, planNameLabel, planValiditySummaryLabel } from "@/lib/public-plan-labels";
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
  const recurringPaidPlans = paidPlans.filter((plan) => plan.type !== "TRIAL");
  const recommendedPlanId =
    recurringPaidPlans.find((plan) => plan.durationDays && plan.durationDays <= 45)?.id ??
    recurringPaidPlans[0]?.id ??
    paidPlans.find((plan) => plan.durationDays && plan.durationDays <= 45)?.id ??
    paidPlans[0]?.id ??
    plans[0]?.id;
  const comparisonPlans = plans.filter((plan) => plan.id !== recommendedPlanId);
  const visiblePlans = comparisonPlans.slice(0, 4);

  if (!plans.length) {
    return (
      <section className="scroll-mt-5">
        <GlassCard>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{priceSummary([], locale)}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{t("noPublicPlanCopy")}</p>
        </GlassCard>
      </section>
    );
  }

  if (!visiblePlans.length) {
    return null;
  }

  return (
    <section className="scroll-mt-5">
      <div className="mb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {t("comparePlans")}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {t("otherPlans")}
          </h2>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePlans.map((plan) => {
          const description = planDescriptionLabel(plan.description, locale);
          const planName = planNameLabel(resolvePlanName(plan), locale);
          return (
          <Link
            key={plan.id}
            href={localizedPath(`/join/${org.username}`, locale, { plan: plan.handle })}
            aria-label={`${t("selectThisPlan")}: ${planName}`}
            className="group zook-focus block rounded-[22px] transition duration-200 hover:-translate-y-0.5"
          >
            <GlassCard className="flex h-full flex-col gap-4 border-[var(--border-strong)] bg-[var(--surface-raised)] transition hover:border-[var(--border-focus)] hover:bg-[var(--surface)]">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-[var(--text-primary)]">
                    {planName}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
                    {planValiditySummaryLabel(plan, locale)}
                  </p>
                </div>
                <p className="metric shrink-0 text-right text-xl font-semibold text-[var(--accent-strong)]">
                  {formatInr(plan.pricePaise)}
                </p>
              </div>
              {description ? (
                <p className="line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {description}
                </p>
              ) : null}

              <span
                aria-hidden="true"
                className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 self-end rounded-full border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition group-hover:border-[var(--border-focus)] group-hover:bg-[var(--surface-accent-soft)] group-hover:text-[var(--text-primary)]"
              >
                <span>{t("selectThisPlan")}</span>
                <ArrowRight size={15} />
              </span>
            </GlassCard>
          </Link>
          );
        })}
        {comparisonPlans.length > visiblePlans.length ? (
          <Link
            href={localizedPath(`/join/${org.username}`, locale)}
            className="zook-focus inline-flex w-fit rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] lg:col-span-3"
          >
            {t("seeAllPlansPrefix")} {plans.length} {t("seeAllPlansSuffix")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
