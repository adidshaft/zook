import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { PublicFooter } from "@/components/public/footer";
import { PublicNav } from "@/components/public/nav/public-nav";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookButtonLink } from "@/components/zook-button";
import { formatEnumLabel, formatInr, formatUsageLimit } from "@/lib/format";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { publicSocialImage } from "@/lib/public-metadata";
import {
  defaultSaasPlanCatalog,
  type SaasPlanDefinition,
  type SaasTier,
} from "@/server/domains/billing/saas-plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare Zook pricing for gyms: two-month free trial, Starter, Growth, and Pro plans.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Zook pricing",
    description:
      "Compare Zook pricing for gyms: free trial, Starter, Growth, and Pro plans.",
    type: "website",
    images: [{ url: publicSocialImage(), alt: "Zook pricing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zook pricing",
    description:
      "Compare Zook pricing for gyms: free trial, Starter, Growth, and Pro plans.",
    images: [publicSocialImage()],
  },
};

const tierOrder: SaasTier[] = ["FREE", "STARTER", "GROWTH", "PRO"];

const pricingCopy = {
  en: {
    heroTitle: "Clear plans before you start running the gym on Zook.",
    heroBody:
      "Start with a 2-month free trial, then move into the plan that fits your members, branches, staff, trainers, inventory, messages, and reporting needs.",
    startTrial: "Start free trial",
    talkToZook: "Talk to Zook",
    buyersGet: "What buyers get",
    recommendedPath: "Recommended path",
    recommendedTitle: "Start free, then keep Growth ready for billing.",
    recommendedBody:
      "Most gyms should launch the 2-month trial first, add staff and members, then switch on billing from the plan that fits usage. No long setup before the gym can start using Zook.",
    recommendedPrimary: "Start free",
    recommendedSecondary: "View Growth",
    comparePaths: "Pick by gym stage",
    stageHint: "Tap a stage to start with that plan.",
    popular: "Popular",
    choosePlan: "Choose plan",
    startTwoMonthTrial: "Start 2-month trial",
    fullPlanDetails: "Full plan details",
    hideDetails: "Hide details",
    freePeriod: "for 2 months",
    monthlyPeriod: "/ month",
    afterTrial: "After trial, choose Starter, Growth, or Pro.",
    yearly: "/ year",
    yearlyEquivalentPrefix: "Approx.",
    yearlyEquivalentSuffix: "/ month when billed yearly",
  },
  hi: {
    heroTitle: "Zook पर जिम चलाने से पहले साफ़ प्लान चुनें.",
    heroBody:
      "2 महीने के मुफ़्त ट्रायल से शुरू करें, फिर सदस्यों, ब्रांच, स्टाफ, ट्रेनर, स्टॉक, मैसेज और रिपोर्ट की ज़रूरत के हिसाब से सही प्लान लें.",
    startTrial: "मुफ़्त ट्रायल शुरू करें",
    talkToZook: "Zook से बात करें",
    buyersGet: "आपको क्या मिलेगा",
    recommendedPath: "सुझाया गया रास्ता",
    recommendedTitle: "पहले मुफ़्त शुरू करें, फिर Growth को बिलिंग के लिए तैयार रखें.",
    recommendedBody:
      "ज़्यादातर जिम के लिए सही रास्ता है: 2 महीने का ट्रायल शुरू करें, स्टाफ और सदस्य जोड़ें, फिर वास्तविक उपयोग के हिसाब से बिलिंग चालू करें. Zook इस्तेमाल करने से पहले लंबा सेटअप नहीं चाहिए.",
    recommendedPrimary: "मुफ़्त शुरू करें",
    recommendedSecondary: "Growth देखें",
    comparePaths: "जिम की स्थिति के हिसाब से चुनें",
    stageHint: "अपनी स्थिति चुनकर उसी प्लान से शुरू करें.",
    popular: "लोकप्रिय",
    choosePlan: "प्लान चुनें",
    startTwoMonthTrial: "2 महीने का ट्रायल शुरू करें",
    fullPlanDetails: "पूरा प्लान विवरण",
    hideDetails: "विवरण छिपाएं",
    freePeriod: "2 महीने के लिए",
    monthlyPeriod: "/ माह",
    afterTrial: "ट्रायल के बाद Starter, Growth या Pro चुनें.",
    yearly: "/ साल",
    yearlyEquivalentPrefix: "लगभग",
    yearlyEquivalentSuffix: "/ माह, सालाना बिलिंग पर",
  },
} satisfies Record<ReturnType<typeof resolvePublicLocale>, Record<string, string>>;

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
    "Expanded reports, referrals, notifications, and campaign tools",
    "Best for teams running daily front-desk and trainer workflows",
  ],
  PRO: [
    "Unlimited members, branches, staff, trainers, and products",
    "Premium support, custom reports/referrals, API access, and launch support",
    "Best for multi-branch operators and serious scale",
  ],
};

const localizedTierHighlights = {
  en: tierHighlights,
  hi: {
    FREE: [
      "नए जिम के लिए 2 महीने का मुफ़्त ट्रायल",
      "सदस्यता, QR एंट्री, डेस्क काम और पब्लिक प्रोफाइल",
      "बिलिंग शुरू होने से पहले एक ब्रांच पर Zook परखने की जगह",
    ],
    STARTER: [
      "एक ब्रांच वाले जिम के लिए ऑपरेटिंग सिस्टम",
      "सदस्यता, अटेंडेंस, भुगतान, रिपोर्ट, स्टाफ और शॉप की बुनियादी चीज़ें",
      "स्प्रेडशीट से निकल रहे जिम के लिए सही",
    ],
    GROWTH: [
      "सदस्य, ब्रांच, ट्रेनर, स्टॉक और कैंपेन क्षमता ज़्यादा",
      "रिपोर्ट, रेफरल, नोटिफिकेशन और कैंपेन टूल्स ज़्यादा",
      "रोज़ फ्रंट डेस्क और ट्रेनर का काम चलाने वाली टीमों के लिए",
    ],
    PRO: [
      "असीमित सदस्य, ब्रांच, स्टाफ, ट्रेनर और प्रोडक्ट",
      "प्रीमियम सपोर्ट, कस्टम रिपोर्ट/रेफरल, API एक्सेस और लॉन्च सपोर्ट",
      "मल्टी-ब्रांच ऑपरेटर और बड़े स्केल के लिए",
    ],
  },
} satisfies Record<ReturnType<typeof resolvePublicLocale>, Record<SaasTier, string[]>>;

const planDescriptions = {
  en: {
    FREE: "Trial access for new gyms while billing setup is completed.",
    STARTER: "For single-branch gyms starting with digital memberships and attendance.",
    GROWTH: "For growing gyms with larger teams, shop inventory, and advanced campaigns.",
    PRO: "For multi-branch operators that need higher limits and premium support.",
  },
  hi: {
    FREE: "बिलिंग सेटअप पूरा होने तक नए जिम के लिए ट्रायल एक्सेस.",
    STARTER: "डिजिटल सदस्यता और अटेंडेंस शुरू कर रहे एक-ब्रांच जिम के लिए.",
    GROWTH: "बड़ी टीम, शॉप स्टॉक और एडवांस कैंपेन वाले बढ़ते जिम के लिए.",
    PRO: "ज़्यादा लिमिट और प्रीमियम सपोर्ट चाहिए वाले मल्टी-ब्रांच ऑपरेटर के लिए.",
  },
} satisfies Record<ReturnType<typeof resolvePublicLocale>, Record<SaasTier, string>>;

const localizedPlanNames = {
  en: {
    FREE: "Trial",
    STARTER: "Starter",
    GROWTH: "Growth",
    PRO: "Pro",
  },
  hi: {
    FREE: "ट्रायल",
    STARTER: "Starter",
    GROWTH: "Growth",
    PRO: "Pro",
  },
} satisfies Record<ReturnType<typeof resolvePublicLocale>, Record<SaasTier, string>>;

const buyerItems = {
  en: [
    "Owner dashboard and command board",
    "Member app workflows and QR check-ins",
    "Desk payments, approvals, receipts, and invoices",
    "Trainer plans, shop inventory, campaigns, reports, and audit logs",
  ],
  hi: [
    "ओनर डैशबोर्ड और कमांड बोर्ड",
    "मेंबर ऐप का काम और QR चेक-इन",
    "डेस्क भुगतान, मंज़ूरी, रसीद और इनवॉइस",
    "ट्रेनर प्लान, शॉप स्टॉक, कैंपेन, रिपोर्ट और ऑडिट लॉग",
  ],
} satisfies Record<ReturnType<typeof resolvePublicLocale>, string[]>;

const decisionPath = {
  en: [
    {
      title: "Trying Zook with one branch",
      body: "Start the free trial, invite staff, publish your join link, and run live desk workflows before billing starts.",
      tier: "FREE",
    },
    {
      title: "Replacing spreadsheets",
      body: "Pick Starter when one location needs memberships, attendance, payment records, and shop basics in one place.",
      tier: "STARTER",
    },
    {
      title: "Running a busy front desk",
      body: "Pick Growth when approvals, trainers, reports, inventory, referrals, and messages are part of daily operations.",
      tier: "GROWTH",
    },
    {
      title: "Scaling branches or support",
      body: "Pick Pro when the team needs unlimited capacity, API access, premium support, and launch help.",
      tier: "PRO",
    },
  ],
  hi: [
    {
      title: "एक ब्रांच पर Zook आज़माना",
      body: "ट्रायल शुरू करें, स्टाफ जोड़ें, जॉइन लिंक प्रकाशित करें, और बिलिंग से पहले असली डेस्क काम चला कर देखें.",
      tier: "FREE",
    },
    {
      title: "स्प्रेडशीट से शिफ्ट करना",
      body: "एक लोकेशन को सदस्यता, अटेंडेंस, भुगतान रिकॉर्ड और शॉप की बुनियादी चीज़ें एक जगह चाहिए तो Starter ठीक है.",
      tier: "STARTER",
    },
    {
      title: "व्यस्त फ्रंट डेस्क चलाना",
      body: "मंज़ूरी, ट्रेनर, रिपोर्ट, स्टॉक, रेफरल और मैसेज रोज़ के काम का हिस्सा हैं तो Growth चुनें.",
      tier: "GROWTH",
    },
    {
      title: "ब्रांच या सपोर्ट स्केल करना",
      body: "असीमित क्षमता, API एक्सेस, प्रीमियम सपोर्ट और लॉन्च मदद चाहिए तो Pro सही है.",
      tier: "PRO",
    },
  ],
} satisfies Record<
  ReturnType<typeof resolvePublicLocale>,
  Array<{
    title: string;
    body: string;
    tier: SaasTier;
  }>
>;

function planPrice(plan: SaasPlanDefinition) {
  if (plan.tier === "FREE") {
    return "₹0";
  }
  return formatInr(plan.monthly);
}

function planPeriod(plan: SaasPlanDefinition, copy: (typeof pricingCopy)["en"]) {
  return plan.tier === "FREE" ? copy.freePeriod : copy.monthlyPeriod;
}

function yearlyLine(plan: SaasPlanDefinition, copy: (typeof pricingCopy)["en"]) {
  if (plan.tier === "FREE") {
    return copy.afterTrial;
  }
  return `${formatInr(plan.yearly)} ${copy.yearly}`;
}

function yearlyMonthlyEquivalent(plan: SaasPlanDefinition, copy: (typeof pricingCopy)["en"]) {
  if (plan.tier === "FREE") {
    return null;
  }
  return `${copy.yearlyEquivalentPrefix} ${formatInr(Math.round(plan.yearly / 12))} ${copy.yearlyEquivalentSuffix}`;
}

const enumLabels: Record<ReturnType<typeof resolvePublicLocale>, Record<string, string>> = {
  en: {
    unlimited: "unlimited",
    unknown: "Unknown",
    basic: "Basic",
    standard: "Standard",
    advanced: "Advanced",
    premium: "Premium",
    selfServe: "Self serve",
    guided: "Guided",
    dedicated: "Dedicated",
  },
  hi: {
    unlimited: "unlimited",
    unknown: "मालूम नहीं",
    basic: "Basic",
    standard: "Standard",
    advanced: "Advanced",
    premium: "Premium",
    selfServe: "Self-serve",
    guided: "Guided",
    dedicated: "Dedicated",
  },
};

function localizedEnumLabel(value: string | null | undefined, locale: ReturnType<typeof resolvePublicLocale>) {
  if (!value) {
    return enumLabels[locale].unknown;
  }
  const key = value.toLowerCase().replace(/_([a-z])/g, (_, character: string) => character.toUpperCase());
  return enumLabels[locale][key] ?? formatEnumLabel(value);
}

function detailsForPlan(plan: SaasPlanDefinition, locale: ReturnType<typeof resolvePublicLocale>) {
  const e = plan.entitlements;
  const unlimitedLabel = enumLabels[locale].unlimited;
  const labels =
    locale === "hi"
      ? {
          members: "Members",
          branches: "Branches",
          staff: "Staff users",
          trainers: "Trainers",
          products: "Products",
          notifications: "Notifications/माह",
          reports: "Reports",
          referrals: "Referrals",
          support: "Support",
          onboarding: "Onboarding",
          multiBranch: "मल्टी-ब्रांच कंट्रोल शामिल",
          singleBranch: "एक-ब्रांच जिम पर केंद्रित",
          apiIncluded: "API एक्सेस शामिल",
          apiMissing: "API एक्सेस शामिल नहीं",
          ai: "AI टूल्स लॉन्च के बाद अलग से आएंगे.",
        }
      : {
          members: "Members",
          branches: "Branches",
          staff: "Staff users",
          trainers: "Trainers",
          products: "Products",
          notifications: "Notifications/month",
          reports: "Reports",
          referrals: "Referrals",
          support: "Support",
          onboarding: "Onboarding",
          multiBranch: "Multi-branch controls included",
          singleBranch: "Single-branch focused",
          apiIncluded: "API access included",
          apiMissing: "API access not included",
          ai: "AI tools roll out separately after launch.",
        };
  const usageLimitOptions = unlimitedLabel ? { unlimitedLabel } : {};
  const details = [
    `${labels.members}: ${formatUsageLimit(e.memberLimit, usageLimitOptions)}`,
    `${labels.branches}: ${formatUsageLimit(e.branchLimit, usageLimitOptions)}`,
    `${labels.staff}: ${formatUsageLimit(e.staffLimit, usageLimitOptions)}`,
    `${labels.trainers}: ${formatUsageLimit(e.trainerLimit, usageLimitOptions)}`,
    `${labels.products}: ${formatUsageLimit(e.productLimit, usageLimitOptions)}`,
    `${labels.notifications}: ${formatUsageLimit(e.notificationMonthlyLimit, usageLimitOptions)}`,
    `${labels.reports}: ${localizedEnumLabel(e.reports, locale)}`,
    `${labels.referrals}: ${localizedEnumLabel(e.referrals, locale)}`,
    `${labels.support}: ${localizedEnumLabel(e.support, locale)}`,
    `${labels.onboarding}: ${localizedEnumLabel(e.onboarding, locale)}`,
    e.multiBranch ? labels.multiBranch : labels.singleBranch,
    e.apiAccess ? labels.apiIncluded : labels.apiMissing,
  ];
  if (e.aiTextMonthlyLimit > 0 || e.aiImageMonthlyLimit > 0) {
    details.push(labels.ai);
  }
  return details;
}

function startGymHrefForTier(tier: SaasTier, locale: ReturnType<typeof resolvePublicLocale>) {
  if (tier === "FREE") {
    return localizedPath("/start-gym", locale);
  }
  return localizedPath("/start-gym", locale, { tier: tier.toLowerCase() });
}

function planDisplayName(tier: SaasTier, locale: ReturnType<typeof resolvePublicLocale>) {
  return localizedPlanNames[locale][tier];
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const copy = pricingCopy[locale];
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
            <h1 className="max-w-3xl text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.1]">
              {copy.heroTitle}
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-[var(--text-secondary)]">
              {copy.heroBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ZookButtonLink href={localizedPath("/start-gym", locale)} trailingIcon={<ArrowRight size={18} />}>
                {copy.startTrial}
              </ZookButtonLink>
              <ZookButtonLink href="mailto:support@zookfit.in" tone="secondary">
                {copy.talkToZook}
              </ZookButtonLink>
            </div>
          </div>

          <GlassCard variant="strong" className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              {copy.buyersGet}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {buyerItems[locale].map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-strong)]" />
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <GlassCard variant="strong" className="p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
              <Sparkles className="h-4 w-4" />
              {copy.recommendedPath}
            </div>
            <h2 className="mt-4 max-w-xl text-2xl font-semibold leading-tight text-[var(--text-primary)]">
              {copy.recommendedTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {copy.recommendedBody}
            </p>
          </GlassCard>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-end justify-between gap-2 px-1">
              <div>
                <p
                  className={`text-xs font-bold tracking-[0.16em] text-[var(--text-tertiary)] ${
                    locale === "hi" ? "" : "uppercase"
                  }`}
                >
                  {copy.comparePaths}
                </p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">{copy.stageHint}</p>
              </div>
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-strong)]">
                {copy.startTrial}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {decisionPath[locale].map((item, index) => (
                <a
                  key={item.tier}
                  href={startGymHrefForTier(item.tier, locale)}
                  className="zook-focus group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--border-focus)] hover:bg-[var(--surface-raised)]"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] text-xs font-semibold text-[var(--accent-strong)]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-[var(--accent-strong)]">
                      {planDisplayName(item.tier, locale)}
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold leading-5 text-[var(--text-primary)]">
                      {item.title}
                    </span>
                    <span className="sr-only">{item.body}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--accent-strong)] transition group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {plans.map((plan) => (
            <GlassCard
              key={plan.tier}
              variant={plan.tier === "GROWTH" ? "strong" : "default"}
              className="flex flex-col p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Pill>{planDisplayName(plan.tier, locale)}</Pill>
                {plan.tier === "GROWTH" ? (
                  <span className="rounded-full bg-[var(--accent-fill)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-on-accent)]">
                    {copy.popular}
                  </span>
                ) : null}
              </div>
              <div className="mt-5">
                <span className="text-4xl font-semibold tracking-normal text-[var(--text-primary)]">
                  {planPrice(plan)}
                </span>
                <span className="ml-2 text-sm text-[var(--text-tertiary)]">{planPeriod(plan, copy)}</span>
              </div>
              <div className="mt-2 grid gap-1">
                <p className="text-xs text-[var(--text-tertiary)]">{yearlyLine(plan, copy)}</p>
                {yearlyMonthlyEquivalent(plan, copy) ? (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {yearlyMonthlyEquivalent(plan, copy)}
                  </p>
                ) : null}
              </div>
              <p className="mt-5 min-h-14 text-sm leading-6 text-[var(--text-secondary)]">
                {planDescriptions[locale][plan.tier]}
              </p>

              <ul className="mt-5 grid gap-3">
                {localizedTierHighlights[locale][plan.tier].map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--accent-strong)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <ZookButtonLink
                href={startGymHrefForTier(plan.tier, locale)}
                className="mt-5 justify-center"
                tone={plan.tier === "GROWTH" ? "lime" : "secondary"}
              >
                {plan.tier === "FREE" ? copy.startTwoMonthTrial : copy.choosePlan}
              </ZookButtonLink>

              <details className="group mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
                <summary className="zook-focus cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">{copy.fullPlanDetails}</span>
                  <span className="hidden group-open:inline">{copy.hideDetails}</span>
                </summary>
                <ul className="mt-4 grid gap-2 text-xs leading-5 text-[var(--text-secondary)]">
                  {detailsForPlan(plan, locale).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            </GlassCard>
          ))}
        </section>

        <PublicFooter locale={locale} />
      </div>
    </main>
  );
}
