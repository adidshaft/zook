import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { CheckCircle2, Circle, LockKeyhole, MapPin, Building } from "lucide-react";
import { resolvePlanName } from "@zook/ui";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { CouponApplyForm } from "@/components/coupon-apply-form";
import { JoinCheckoutButton } from "@/components/join-checkout-button";
import { InviteCodeForm, JoinRequestButton } from "@/components/join-request-controls";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { PublicNav } from "@/components/public/nav/public-nav";
import { formatInr } from "@/lib/format";
import { PlanSelector } from "@/components/plan-selector";
import {
  alternatePublicLocale,
  joinModeLabelForLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
  type PublicLocale,
} from "@/lib/public-i18n";
import { sessionCookieName } from "@/server/context";
import {
  getPublicCouponPreview,
  getPublicGymProfileData,
  type PublicGymReferral,
} from "@/server/public-gym-read-models";
import { resolveSessionSummaryFromToken } from "@/server/session";
import { publicAbsoluteUrl } from "@/lib/public-metadata";

function discountFor(referral: PublicGymReferral | null, planPricePaise: number) {
  if (!referral || referral.status !== "active") {
    return 0;
  }
  if (referral.discountPaise > 0) {
    return referral.discountPaise;
  }
  if (referral.discountPercentBps) {
    return Math.floor((planPricePaise * referral.discountPercentBps) / 10_000);
  }
  return 0;
}

function joinPath(
  username: string,
  planHandle: string,
  referral?: PublicGymReferral | null,
  couponCode?: string,
  locale: PublicLocale = "en",
) {
  const query = new URLSearchParams({ plan: planHandle });
  if (referral) {
    query.set("ref", referral.code);
  }
  if (couponCode) {
    query.set("coupon", couponCode);
  }
  if (locale === "hi") {
    query.set("lang", "hi");
  }
  return `/join/${username}?${query.toString()}`;
}

function loginRedirect(path: string, locale: PublicLocale = "en") {
  const query = new URLSearchParams({ redirect: path });
  if (locale === "hi") {
    query.set("lang", "hi");
  }
  return `/login?${query.toString()}`;
}

function validityLabel(plan: { durationDays: number | null; type: string }, locale: PublicLocale) {
  if (plan.durationDays) {
    return locale === "hi" ? `${plan.durationDays} दिन` : `${plan.durationDays} days`;
  }
  if (plan.type === "TRIAL") {
    return locale === "hi" ? "ट्रायल एक्सेस" : "Trial access";
  }
  return locale === "hi" ? "विज़िट पैक" : "Visit pack";
}

function visitLabel(visitLimit: number | null, locale: PublicLocale) {
  if (!visitLimit) {
    return locale === "hi" ? "असीमित विज़िट" : "Unlimited visits";
  }
  return locale === "hi"
    ? `${visitLimit} विज़िट`
    : `${visitLimit} ${visitLimit === 1 ? "visit" : "visits"}`;
}

async function getViewerJoinState(orgId: string) {
  try {
    const cookieStore = await cookies();
    const session = await resolveSessionSummaryFromToken(
      cookieStore.get(sessionCookieName)?.value,
      orgId,
    );
    if (!session) {
      return null;
    }

    const [activeSubscription, pendingJoinRequest, approvedJoinRequest] = await Promise.all([
      prisma.memberSubscription.findFirst({
        where: {
          orgId,
          memberUserId: session.user.id,
          status: { in: ["PENDING_PAYMENT", "ACTIVE"] },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
      }),
      prisma.membershipJoinRequest.findFirst({
        where: { orgId, userId: session.user.id, status: "pending" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      }),
      prisma.membershipJoinRequest.findFirst({
        where: { orgId, userId: session.user.id, status: "approved" },
        orderBy: { reviewedAt: "desc" },
        select: { id: true },
      }),
    ]);

    return { session, activeSubscription, pendingJoinRequest, approvedJoinRequest };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await getPublicGymProfileData(username).catch(() => null);
  if (!data) {
    return {
      title: "Join gym | Zook",
      description: "Continue your membership signup in Zook.",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `Join ${data.org.name} | Zook`,
    description: `Continue membership signup for ${data.org.name} in ${data.org.city}.`,
    alternates: { canonical: `/join/${data.org.username}` },
    robots: { index: false, follow: false },
    openGraph: {
      title: `Join ${data.org.name} | Zook`,
      description: `Continue membership signup for ${data.org.name}.`,
      type: "website",
      images: [
        {
          url:
            data.org.coverImageUrl ??
            publicAbsoluteUrl(`/g/${data.org.username}/opengraph-image`),
          alt: `Join ${data.org.name} on Zook`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Join ${data.org.name} | Zook`,
      description: `Continue membership signup for ${data.org.name}.`,
      images: [
        data.org.coverImageUrl ??
          publicAbsoluteUrl(`/g/${data.org.username}/opengraph-image`),
      ],
    },
  };
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ coupon?: string; plan?: string; ref?: string; lang?: string }>;
}) {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const locale = resolvePublicLocale(query);
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const data = await getPublicGymProfileData(username, query.ref);
  const org = data?.org;
  const viewerJoinState = org ? await getViewerJoinState(org.id) : null;
  const selectedPlan =
    data?.plans.find((plan) => plan.handle === query.plan || plan.id === query.plan) ??
    data?.plans[0];
  const referral = data?.referral?.status === "active" ? data.referral : null;
  const couponCode = query.coupon?.trim().toUpperCase() || undefined;
  const couponPreview =
    org && selectedPlan && couponCode && data?.connected
      ? await getPublicCouponPreview({
          orgId: org.id,
          planId: selectedPlan.id,
          couponCode,
          amountPaise: selectedPlan.pricePaise,
        }).catch(() => null)
      : null;
  const referralDiscountPaise = discountFor(referral, selectedPlan?.pricePaise ?? 0);
  const couponDiscountPaise = couponPreview?.discountPaise ?? 0;
  const finalAmount = Math.max(
    0,
    (selectedPlan?.pricePaise ?? 0) - referralDiscountPaise - couponDiscountPaise,
  );
  const joinMode = org?.joinMode ?? "OPEN_JOIN";
  const nextLocale = alternatePublicLocale(locale);
  const checkoutSteps = [
    { label: "Pay", state: "current" as const },
    { label: "Confirm", state: "upcoming" as const },
    { label: "Activate", state: "upcoming" as const },
  ];

  if (!org || !selectedPlan) {
    return (
      <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen py-1">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6">
          <PublicNav
            locale={locale}
            languageHref={localizedPath(`/join/${username}`, nextLocale)}
            languageLabel={t("languageSwitch")}
            backHref={localizedPath("/gyms", locale)}
            backLabel={t("findGym")}
          >
            <AccountAwareNav locale={locale} />
          </PublicNav>
          <GlassCard className="mx-auto max-w-xl text-center">
            <Pill tone="amber">{t("joinUnavailable")}</Pill>
            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{t("joinUnavailable")}</p>
            <Link
              href={localizedPath("/gyms", locale)}
              className="zook-focus mt-6 inline-flex rounded-full bg-[var(--accent-fill)] px-5 py-3 text-sm font-semibold text-[var(--text-on-accent)]"
            >
              {t("findGym")}
            </Link>
          </GlassCard>
        </div>
      </main>
    );
  }

  if (joinMode === "APPROVAL_REQUIRED" && !viewerJoinState?.approvedJoinRequest) {
    const membershipPath = viewerJoinState?.session?.user.slug
      ? `/m/${viewerJoinState.session.user.slug}`
      : viewerJoinState?.session?.user.privateHandle
        ? `/me/${viewerJoinState.session.user.privateHandle}`
        : "/me";
    return (
      <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen py-1">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6">
          <PublicNav
            locale={locale}
            languageHref={localizedPath(`/join/${org.username}`, nextLocale, {
              plan: selectedPlan.handle,
              ref: referral?.code,
              coupon: couponPreview?.code,
            })}
            languageLabel={t("languageSwitch")}
            backHref={localizedPath(`/g/${org.username}`, locale)}
            backLabel={t("backToGym")}
          >
            <AccountAwareNav locale={locale} />
          </PublicNav>
        <GlassCard className="mx-auto max-w-xl">
          <Pill tone="amber">{t("approvalRequired")}</Pill>
          <h1 className="mt-5 text-3xl font-semibold text-[var(--text-primary)]">{t("approvalRequired")}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{t("approvalCopy")}</p>
          {viewerJoinState?.activeSubscription ? (
            <MembershipStateNotice
              title={t("membershipInProgressTitle")}
              copy={t("membershipInProgressCopy")}
              href={membershipPath}
              cta={t("viewMembership")}
              tone="lime"
            />
          ) : viewerJoinState?.pendingJoinRequest ? (
            <MembershipStateNotice
              title={t("pendingApprovalTitle")}
              copy={t("pendingApprovalCopy")}
              href={localizedPath(`/g/${org.username}`, locale)}
              cta={t("backToGym")}
              tone="amber"
            />
          ) : (
            <JoinRequestButton
              orgId={org.id}
              planId={selectedPlan.id}
              referralCode={referral?.code}
              loginPath={loginRedirect(
                selectedPlan
                  ? joinPath(org.username, selectedPlan.handle, referral, couponPreview?.code, locale)
                  : localizedPath(`/g/${org.username}`, locale),
                locale,
              )}
              labels={{
                submit: t("requestAccess"),
                submitting: t("requestingAccess"),
                success: t("joinRequestSubmitted"),
                defaultError: t("joinRequestError"),
              }}
            />
          )}
          <Link
            href={localizedPath(`/g/${org.username}`, locale)}
            className="zook-focus ml-3 mt-6 inline-flex rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] transition"
          >
            {t("backToGym")}
          </Link>
        </GlassCard>
        </div>
      </main>
    );
  }

  if (joinMode === "INVITE_ONLY" && !referral) {
    return (
      <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen py-1">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6">
          <PublicNav
            locale={locale}
            languageHref={localizedPath(`/join/${org.username}`, nextLocale)}
            languageLabel={t("languageSwitch")}
            backHref={localizedPath(`/g/${org.username}`, locale)}
            backLabel={t("backToGym")}
          >
            <AccountAwareNav locale={locale} />
          </PublicNav>
        <GlassCard className="mx-auto max-w-xl">
          <Pill tone="red">{joinModeLabelForLocale(joinMode, locale)}</Pill>
          <h1 className="mt-5 text-3xl font-semibold text-[var(--text-primary)]">{t("inviteRequired")}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{t("inviteCopy")}</p>
          <InviteCodeForm
            actionPath={`/join/${org.username}`}
            planHandle={selectedPlan.handle}
            locale={locale}
            labels={{
              label: t("inviteCodeLabel"),
              placeholder: t("inviteCodePlaceholder"),
              submit: t("applyInviteCode"),
            }}
          />
          <Link
            href={localizedPath(`/g/${org.username}`, locale)}
            className="zook-focus mt-6 inline-flex rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] transition"
          >
            {t("backToGym")}
          </Link>
        </GlassCard>
        </div>
      </main>
    );
  }

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen py-1">
      <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6">
        <PublicNav
          locale={locale}
          languageHref={joinPath(org.username, selectedPlan.handle, referral, couponPreview?.code, nextLocale)}
          languageLabel={t("languageSwitch")}
          backHref={localizedPath(`/g/${org.username}`, locale)}
          backLabel={t("gymProfile")}
        >
          <AccountAwareNav locale={locale} />
        </PublicNav>

        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <GlassCard variant="strong">
            <Pill tone="lime">{joinModeLabelForLocale(joinMode, locale)}</Pill>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
              {t("reviewMembership")}
            </h1>

            {/* Elegant Gym Identity Card */}
            <div className="relative mt-5 overflow-hidden rounded-3xl border border-[var(--border-focus)]/25 bg-gradient-to-br from-[var(--surface-raised)]/90 to-[var(--bg-sunken)]/90 p-5 md:p-6 shadow-md transition-all duration-300 hover:shadow-lg">
              {/* Decorative radial ambient glow behind the logo */}
              <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-[var(--accent-soft)]/20 blur-3xl pointer-events-none" />
              
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                {org.logoUrl ? (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-inner">
                    <img
                      src={org.logoUrl}
                      alt={`${org.name} logo`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--accent-soft)]/30 to-[var(--accent-fill)]/20 text-2xl font-bold text-[var(--accent-strong)]">
                    {org.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-strong)] bg-[var(--surface-accent-soft)] px-2 py-0.5 rounded-md">
                      {org.gymType || "Fitness Center"}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                    {org.name}
                  </h2>
                  {org.tagline && (
                    <p className="text-xs text-[var(--text-secondary)] italic font-medium leading-relaxed max-w-xl">
                      "{org.tagline}"
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-5 grid gap-3 border-t border-[var(--border-subtle)] pt-4 text-xs sm:grid-cols-2 text-[var(--text-secondary)]">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-[var(--accent-strong)] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    {org.address}, {org.city}, {org.state}
                  </span>
                </div>
                {org.openingHoursSummary && (
                  <div className="flex items-center gap-2.5">
                    <Building size={16} className="text-[var(--accent-strong)] shrink-0" />
                    <span>{org.openingHoursSummary}</span>
                  </div>
                )}
              </div>
            </div>

            {data.plans.length > 1 ? (
              <PlanSelector
                plans={data.plans}
                selectedPlanId={selectedPlan.id}
                username={org.username}
                referralCode={referral?.code ?? null}
                couponCode={couponPreview?.code ?? null}
                locale={locale}
                choosePlanLabel={t("choosePlan")}
                changingPlanLabel={t("changingPlan")}
              />
            ) : (
              <div className="mt-6 rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Selected Plan
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">
                      {resolvePlanName(selectedPlan)}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {validityLabel(selectedPlan, locale)} · {visitLabel(selectedPlan.visitLimit, locale)}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-[var(--accent-strong)]">
                    {formatInr(selectedPlan.pricePaise)}
                  </span>
                </div>
              </div>
            )}
          </GlassCard>

          <GlassCard className="flex flex-col justify-between h-full">
            <div>
              <p className="text-sm text-[var(--text-tertiary)]">{t("finalAmount")}</p>
              <p className="metric mt-1 text-5xl font-bold tracking-tight text-[var(--accent-strong)]">
                {formatInr(finalAmount)}
              </p>

              {/* Secure Checkout CTA high-up for immediate visibility */}
              <div className="mt-4 space-y-4">
                {viewerJoinState?.activeSubscription && (
                  <MembershipStateNotice
                    title={t("membershipInProgressTitle")}
                    copy={t("membershipInProgressCopy")}
                    href={
                      viewerJoinState.session.user.slug
                        ? `/m/${viewerJoinState.session.user.slug}`
                        : viewerJoinState.session.user.privateHandle
                          ? `/me/${viewerJoinState.session.user.privateHandle}`
                          : "/me"
                    }
                    cta={t("viewMembership")}
                    tone="lime"
                  />
                )}
                {data.connected ? (
                  <JoinCheckoutButton
                    orgId={org.id}
                    planId={selectedPlan.id}
                    couponCode={couponPreview?.code ?? null}
                    referralCode={referral?.code ?? null}
                    loginPath={loginRedirect(
                      joinPath(org.username, selectedPlan.handle, referral, couponPreview?.code, locale),
                      locale,
                    )}
                  />
                ) : process.env.NODE_ENV === "development" ? (
                  <div className="grid gap-3">
                    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-warning-soft)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
                      {t("testMode")}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-warning-soft)] p-4 text-xs leading-5 text-[var(--text-secondary)]">
                    <p>{t("paymentUnavailable")}</p>
                    <Link
                      href={joinPath(org.username, selectedPlan.handle, referral, couponPreview?.code, locale)}
                      className="zook-focus mt-3 inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] transition"
                    >
                      {t("retry")}
                    </Link>
                  </div>
                )}
              </div>

              {/* Pricing breakdown table moved here */}
              <div className="mt-5 overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)]">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    <tr className="bg-[var(--bg-sunken)]/40">
                      <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)] w-1/3">
                        Gym
                      </th>
                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                        {org.name} · {org.city}
                      </td>
                    </tr>
                    <tr>
                      <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                        {t("plan")}
                      </th>
                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                        {resolvePlanName(selectedPlan)} ({validityLabel(selectedPlan, locale)} · {visitLabel(selectedPlan.visitLimit, locale)})
                      </td>
                    </tr>
                    <BreakdownRow label="Base Price" value={formatInr(selectedPlan.pricePaise)} />
                    {referral && (
                      <BreakdownRow
                        label={`${t("referralDiscount")} (${referral.code})`}
                        value={`-${formatInr(referralDiscountPaise)}`}
                      />
                    )}
                    {couponPreview && (
                      <BreakdownRow
                        label={`${t("couponDiscount")} (${couponPreview.code})`}
                        value={`-${formatInr(couponDiscountPaise)}`}
                      />
                    )}
                    <BreakdownRow label={t("finalAmount")} value={formatInr(finalAmount)} strong />
                  </tbody>
                </table>
              </div>

              {/* Coupon form moved here */}
              <CouponApplyForm
                orgId={org.id}
                username={org.username}
                planId={selectedPlan.id}
                referralCode={referral?.code ?? null}
                initialCouponCode={couponPreview?.code ?? null}
              />

              {/* High-density, professional checkout summary block */}
              <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4 text-xs leading-tight">
                {/* Payment Method */}
                <div className="flex items-center justify-between font-medium text-[var(--text-secondary)]">
                  <span>{t("paymentMethod")}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{t("razorpay")}</span>
                </div>
                
                {/* Checkout Progress Steps in a neat horizontal bar */}
                <div className="mt-4 flex items-center justify-between gap-1 border-t border-[var(--border-subtle)] pt-4 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                  {checkoutSteps.map((step, index) => {
                    const isCurrent = step.state === "current";
                    const Icon = isCurrent ? CheckCircle2 : Circle;

                    return (
                      <div key={step.label} className="contents">
                        <span
                          className={`flex items-center gap-1 ${
                            isCurrent
                              ? "font-semibold text-[var(--accent-strong)]"
                              : "text-[var(--text-tertiary)]"
                          }`}
                        >
                          <Icon size={12} className="shrink-0" /> {step.label}
                        </span>
                        {index < checkoutSteps.length - 1 ? (
                          <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Secure Payment warning inline */}
                <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-4 text-[11px] text-[var(--text-secondary)]">
                  <LockKeyhole className="text-[var(--accent-strong)] shrink-0" size={14} />
                  <span>{t("paymentActivation")}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </section>
      </div>
    </main>
  );
}

function MembershipStateNotice({
  copy,
  cta,
  href,
  title,
  tone,
}: {
  copy: string;
  cta: string;
  href: string;
  title: string;
  tone: "amber" | "lime";
}) {
  const toneClass =
    tone === "lime"
      ? "border-[var(--border)] bg-[var(--surface-accent-soft)] text-[var(--text-primary)]"
      : "border-[var(--border)] bg-[var(--surface-warning-soft)] text-[var(--text-primary)]";

  return (
    <div className={`mt-6 rounded-[22px] border px-4 py-3 ${toneClass}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
      <Link
        href={href}
        className="zook-focus mt-4 inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] transition"
      >
        {cta}
      </Link>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <tr>
      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
        {label}
      </th>
      <td className={`px-4 py-3 text-right ${strong ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
        {value}
      </td>
    </tr>
  );
}
