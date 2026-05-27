import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { PublicFooter } from "@/components/public/footer";
import { PublicNav } from "@/components/public/nav/public-nav";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookButtonLink } from "@/components/zook-button";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import {
  defaultSaasPlanCatalog,
  formatSaasLimit,
  type SaasPlanDefinition,
  type SaasTier,
} from "@/server/domains/billing/saas-plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare Zook pricing for gyms: two-month free trial, Starter, Growth, and Pro plans.",
  alternates: { canonical: "/pricing" },
};

const tierOrder: SaasTier[] = ["FREE", "STARTER", "GROWTH", "PRO"];

const tierHighlights: Record<SaasTier, string[]> = {
  FREE: [
    "2-month free trial for new gyms",
    "Memberships, QR entry, desk workflows, and public gym profile",
    "Enough room to validate Zook with one branch before billing starts",
  ],
  STARTER: [
    "Single-branch gym operating system",
    "Memberships, attendance, payments, reports, staff, and shop basics",
    "Best for gyms moving away from spreadsheets",
  ],
  GROWTH: [
    "More members, branches, trainers, inventory, and campaign capacity",
    "Advanced reports, referrals, notifications, and AI text usage",
    "Best for teams running daily front-desk and trainer workflows",
  ],
  PRO: [
    "Unlimited members, branches, staff, trainers, and products",
    "Premium support, custom reports/referrals, API access, and higher AI limits",
    "Best for multi-branch operators and serious scale",
  ],
};

function formatInr(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

function planPrice(plan: SaasPlanDefinition) {
  if (plan.tier === "FREE") {
    return "₹0";
  }
  return formatInr(plan.monthly);
}

function planPeriod(plan: SaasPlanDefinition) {
  return plan.tier === "FREE" ? "for 2 months" : "/ month";
}

function yearlyLine(plan: SaasPlanDefinition) {
  if (plan.tier === "FREE") {
    return "After trial, choose Starter, Growth, or Pro.";
  }
  return `${formatInr(plan.yearly)} / year`;
}

function detailsForPlan(plan: SaasPlanDefinition) {
  const e = plan.entitlements;
  return [
    `Members: ${formatSaasLimit(e.memberLimit)}`,
    `Branches: ${formatSaasLimit(e.branchLimit)}`,
    `Staff users: ${formatSaasLimit(e.staffLimit)}`,
    `Trainers: ${formatSaasLimit(e.trainerLimit)}`,
    `Products: ${formatSaasLimit(e.productLimit)}`,
    `Notifications/month: ${formatSaasLimit(e.notificationMonthlyLimit)}`,
    `AI text/month: ${e.aiTextMonthlyLimit.toLocaleString("en-IN")}`,
    `AI images/month: ${e.aiImageMonthlyLimit.toLocaleString("en-IN")}`,
    `Reports: ${e.reports.replaceAll("_", " ")}`,
    `Referrals: ${e.referrals.replaceAll("_", " ")}`,
    `Support: ${e.support.replaceAll("_", " ")}`,
    `Onboarding: ${e.onboarding.replaceAll("_", " ")}`,
    e.multiBranch ? "Multi-branch controls included" : "Single-branch focused",
    e.apiAccess ? "API access included" : "API access not included",
  ];
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const nextLocale = alternatePublicLocale(locale);
  const plans = tierOrder.map((tier) => defaultSaasPlanCatalog[tier]);

  return (
    <main
      lang={locale === "hi" ? "hi-IN" : "en-IN"}
      className="relative min-h-screen overflow-x-hidden px-5 py-5"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <PublicNav
          locale={locale}
          languageHref={localizedPath("/pricing", nextLocale)}
          languageLabel={publicT(locale, "languageSwitch")}
        >
          <AccountAwareNav locale={locale} />
        </PublicNav>

        <section className="grid gap-6 pt-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <Pill tone="lime">Pricing</Pill>
            <h1 className="mt-5 max-w-3xl text-[clamp(2.75rem,6vw,5.8rem)] font-semibold leading-[0.96]">
              Clear plans before you start running the gym on Zook.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-[var(--text-secondary)]">
              Start with a 2-month free trial, then move into the plan that fits your members,
              branches, staff, trainers, inventory, messages, reports, and AI usage.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ZookButtonLink href={localizedPath("/start-gym", locale)} trailingIcon={<ArrowRight size={18} />}>
                Start free trial
              </ZookButtonLink>
              <ZookButtonLink href="mailto:support@zookfit.in" tone="secondary">
                Talk to Zook
              </ZookButtonLink>
            </div>
          </div>

          <GlassCard variant="strong" className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              What buyers get
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Owner dashboard and live command board",
                "Member app workflows and QR check-ins",
                "Desk payments, approvals, receipts, and invoices",
                "Trainer plans, shop inventory, campaigns, reports, and audit logs",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-strong)]" />
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {plans.map((plan) => (
            <GlassCard
              key={plan.tier}
              variant={plan.tier === "GROWTH" ? "strong" : "default"}
              className="flex flex-col p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Pill tone={plan.tier === "FREE" ? "lime" : plan.tier === "PRO" ? "blue" : "neutral"}>
                  {plan.name}
                </Pill>
                {plan.tier === "GROWTH" ? (
                  <span className="rounded-full bg-[var(--accent-fill)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-on-accent)]">
                    Popular
                  </span>
                ) : null}
              </div>
              <div className="mt-5">
                <span className="text-4xl font-semibold tracking-normal text-[var(--text-primary)]">
                  {planPrice(plan)}
                </span>
                <span className="ml-2 text-sm text-[var(--text-tertiary)]">{planPeriod(plan)}</span>
              </div>
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">{yearlyLine(plan)}</p>
              <p className="mt-5 min-h-14 text-sm leading-6 text-[var(--text-secondary)]">
                {plan.description}
              </p>

              <ul className="mt-5 grid gap-3">
                {tierHighlights[plan.tier].map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--accent-strong)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <details className="group mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
                <summary className="zook-focus cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">More details</span>
                  <span className="hidden group-open:inline">Hide details</span>
                </summary>
                <ul className="mt-4 grid gap-2 text-xs leading-5 text-[var(--text-secondary)]">
                  {detailsForPlan(plan).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>

              <ZookButtonLink
                href={localizedPath(plan.tier === "FREE" ? "/start-gym" : "/start-gym", locale)}
                className="mt-5 justify-center"
                tone={plan.tier === "GROWTH" ? "lime" : "secondary"}
              >
                {plan.tier === "FREE" ? "Start 2-month trial" : "Choose plan"}
              </ZookButtonLink>
            </GlassCard>
          ))}
        </section>

        <PublicFooter locale={locale} />
      </div>
    </main>
  );
}
