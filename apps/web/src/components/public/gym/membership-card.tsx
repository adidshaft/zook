import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { resolvePlanName } from "@zook/ui";
import { GlassCard, Pill } from "@/components/glass-card";
import { formatInr } from "@/lib/format";
import { planNameLabel, planValiditySummaryLabel } from "@/lib/public-plan-labels";
import { localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";
import type { PublicGym, PublicGymPlan } from "./types";

export function GymMembershipCard({
  org,
  plans,
  locale,
  viewerMembership,
}: {
  org: PublicGym;
  plans: PublicGymPlan[];
  locale: PublicLocale;
  viewerMembership?: { active: boolean; href: string } | null;
}) {
  const t = (
    key: Parameters<typeof publicT>[1],
    replacements?: Parameters<typeof publicT>[2],
  ) => publicT(locale, key, replacements);
  const paidPlans = plans.filter((plan) => plan.pricePaise > 0);
  const recurringPaidPlans = paidPlans.filter((plan) => plan.type !== "TRIAL");
  const recommendedPlan =
    recurringPaidPlans.find((plan) => plan.durationDays && plan.durationDays <= 45) ??
    recurringPaidPlans[0] ??
    paidPlans.find((plan) => plan.durationDays && plan.durationDays <= 45) ??
    paidPlans[0] ??
    plans[0] ??
    null;
  const comparisonCount = recommendedPlan
    ? Math.max(0, plans.filter((plan) => plan.id !== recommendedPlan.id).length)
    : Math.max(0, plans.length);
  const compareLinkLabel =
    locale === "hi"
      ? `${comparisonCount} और प्लान`
      : `${comparisonCount} more plans`;
  const qrAlt = locale === "hi" ? `${org.name} से Zook पर जुड़ें` : `Join ${org.name} on Zook`;
  const recommendedPlanName = recommendedPlan
    ? planNameLabel(resolvePlanName(recommendedPlan), locale)
    : null;
  return (
    <GlassCard id="membership" variant="strong" className="h-fit scroll-mt-5 lg:sticky lg:top-24">
      {viewerMembership?.active ? (
        <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--feedback-info)_38%,transparent)] bg-[var(--surface-info-soft)] p-4">
          <Pill tone="blue">{t("membershipInProgressTitle")}</Pill>
          <h2 className="mt-3 text-xl font-semibold leading-tight text-[var(--text-primary)]">
            {t("myMembership")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t("membershipInProgressCopy")}
          </p>
          <Link
            href={viewerMembership.href}
            className="zook-focus mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 text-sm font-semibold text-[var(--text-on-accent)] transition hover:bg-[var(--accent-soft)] active:scale-[0.99]"
          >
            {t("viewMembership")}
          </Link>
        </div>
      ) : recommendedPlan ? (
        <div className="rounded-[22px] border border-[var(--border-focus)]/35 bg-[var(--bg-sunken)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Pill>{t("recommendedPlan")}</Pill>
              <h2 className="mt-3 line-clamp-2 text-xl font-semibold leading-tight text-[var(--text-primary)]">
                {recommendedPlanName}
              </h2>
              <p className="mt-1 text-xs font-medium text-[var(--text-tertiary)]">
                {planValiditySummaryLabel(recommendedPlan, locale)}
              </p>
            </div>
            <p className="metric shrink-0 text-right text-2xl font-semibold text-[var(--accent-strong)]">
              {formatInr(recommendedPlan.pricePaise)}
            </p>
          </div>
          <div className="mt-4">
            <Link
              href={localizedPath(`/join/${org.username}`, locale, { plan: recommendedPlan.handle })}
              className="zook-focus inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 text-sm font-semibold text-[var(--text-on-accent)] transition hover:bg-[var(--accent-soft)] active:scale-[0.99]"
            >
              {t("joinNow")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[18px] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {t("noPublicPlanCopy")}
        </div>
      )}
      {!viewerMembership?.active ? (
      <details className="group mt-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
        <summary className="zook-focus flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl text-sm font-semibold text-[var(--text-primary)]">
          <span>{t("moreJoinOptions")}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]">
            {comparisonCount > 0 ? compareLinkLabel : t("scanOrShare")}
            <ChevronDown size={14} aria-hidden className="transition group-open:rotate-180" />
          </span>
        </summary>
        <div className="mt-3 grid gap-3 border-t border-[var(--border)] pt-3">
          {comparisonCount > 0 ? (
            <Link
              href="#plans"
              aria-label={t("comparePlans")}
              className="zook-focus inline-flex min-h-10 w-full items-center justify-center rounded-full border border-[var(--border)] px-4 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
            >
              {t("comparePlans")}
            </Link>
          ) : null}
          <div className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t("joinOnPhone")}</p>
              </div>
              <div className="w-20 shrink-0 rounded-[14px] border border-[var(--border)] bg-white p-1.5">
                <Image
                  src={`/qr/${org.username}?target=join`}
                  alt={qrAlt}
                  width={80}
                  height={80}
                  sizes="80px"
                  className="aspect-square w-full rounded-[10px]"
                  unoptimized
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">{t("scanToJoin")}</p>
          </div>
        </div>
      </details>
      ) : null}
    </GlassCard>
  );
}
