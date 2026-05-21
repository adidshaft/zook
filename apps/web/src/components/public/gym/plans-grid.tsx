import Link from "next/link";
import { resolvePlanName } from "@zook/ui";
import { GlassCard, Pill } from "@/components/glass-card";
import { formatInr } from "@/lib/format";
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
          <h2 className="mt-4 text-2xl font-semibold text-white">{priceSummary([], locale)}</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">{t("noPublicPlanCopy")}</p>
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
            className="h-full transition hover:border-lime-300/25 hover:bg-white/[0.075]"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Pill tone={plan.id === recommendedPlanId ? "lime" : "neutral"}>
                  {plan.id === recommendedPlanId ? t("mostPopular") : plan.type.replaceAll("_", " ")}
                </Pill>
                <h2 className="mt-4 max-w-full truncate text-2xl font-semibold text-white">
                  {resolvePlanName(plan)}
                </h2>
              </div>
              <p className="metric shrink-0 text-2xl font-semibold text-lime-200">
                {formatInr(plan.pricePaise)}
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/52">{plan.description}</p>
            <p className="mt-4 text-sm text-white/45">
              {plan.durationDays
                ? `${plan.durationDays} ${t("days")}`
                : plan.type === "TRIAL"
                  ? t("trial")
                  : t("visitPack")}{" "}
              · {plan.visitLimit || t("unlimited")} {plan.visitLimit === 1 ? t("visit") : t("visits")}
            </p>
          </GlassCard>
        </Link>
      ))}
      {plans.length > visiblePlans.length ? (
        <Link
          href={localizedPath(`/join/${org.username}`, locale)}
          className="zook-focus inline-flex w-fit rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/75 lg:col-span-3"
        >
          {t("seeAllPlansPrefix")} {plans.length} {t("seeAllPlansSuffix")}
        </Link>
      ) : null}
    </section>
  );
}
