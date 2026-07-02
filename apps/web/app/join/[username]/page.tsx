import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronDown, ShieldCheck } from "lucide-react";
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
import { publicJoinHref } from "@/lib/public-join-url";
import { planNameLabel, planValidityLabel, planVisitLabel } from "@/lib/public-plan-labels";
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
  return publicJoinHref({
    username,
    plan: planHandle,
    referralCode: referral?.code,
    couponCode,
    locale,
  });
}

function loginRedirect(path: string, locale: PublicLocale = "en") {
  const query = new URLSearchParams({ redirect: path });
  if (locale === "hi") {
    query.set("lang", "hi");
  }
  return `/login?${query.toString()}`;
}

function defaultJoinPlan<T extends { type: string }>(plans: T[]) {
  return plans.find((plan) => plan.type !== "TRIAL") ?? plans[0];
}

function localityFromAddress(address?: string | null, city?: string | null) {
  const cityValue = city?.trim().toLowerCase();
  const laneLike = /^(lane|road|rd|street|st|plot|shop|unit|floor|fl|no\.?|#)\b/i;
  return (
    address
      ?.split(",")
      .map((part) => part.trim())
      .find((part) => part && part.toLowerCase() !== cityValue && !laneLike.test(part)) ??
    address
      ?.split(",")
      .map((part) => part.trim())
      .find((part) => part && part.toLowerCase() !== cityValue) ??
    null
  );
}

function gymLocationLine(org: { address?: string | null; city?: string | null; state?: string | null }) {
  const locality = localityFromAddress(org.address, org.city);
  const city = org.city?.trim() || null;
  if (locality && city && locality.toLowerCase() !== city.toLowerCase()) {
    return `${locality}, ${city}`;
  }
  return city ?? locality ?? org.state ?? "";
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
  const t = (
    key: Parameters<typeof publicT>[1],
    replacements?: Parameters<typeof publicT>[2],
  ) => publicT(locale, key, replacements);
  const data = await getPublicGymProfileData(username, query.ref);
  const org = data?.org;
  const viewerJoinState = org ? await getViewerJoinState(org.id) : null;
  const selectedPlan =
    data?.plans.find((plan) => plan.handle === query.plan || plan.id === query.plan) ??
    (data?.plans.length ? defaultJoinPlan(data.plans) : undefined);
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
  const orgLocationLine = org ? gymLocationLine(org) : "";
  const paymentMethodLabel = data?.connected ? t("razorpay") : t("paymentUnavailableShort");

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
            hideMarketingLinks
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
            hideMarketingLinks
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
              tone="blue"
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
            hideMarketingLinks
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
          hideMarketingLinks
        >
          <AccountAwareNav locale={locale} />
        </PublicNav>

        <section className="mx-auto grid w-full max-w-xl gap-5">
          <GlassCard className="h-fit">
            <div>
              <div className="mb-4 flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  {org.logoUrl ? (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-inner">
                      <img
                        src={org.logoUrl}
                        alt={`${org.name} logo`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-sm font-bold text-[var(--accent-strong)]">
                      {org.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 text-left">
                    <h1 className="line-clamp-2 text-base font-semibold leading-tight text-[var(--text-primary)]">
                      {org.name}
                    </h1>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-tertiary)]">
                      {orgLocationLine}
                    </p>
                  </div>
                </div>
                <Pill tone="blue" className="shrink-0">
                  {joinModeLabelForLocale(joinMode, locale)}
                </Pill>
              </div>
              <div className="rounded-[22px] border border-[var(--border-focus)]/30 bg-[var(--bg-sunken)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      {t("selectedMembership")}
                    </p>
                    <p className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-[var(--text-primary)]">
                      {planNameLabel(resolvePlanName(selectedPlan), locale)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {planValidityLabel(selectedPlan, locale)} · {planVisitLabel(selectedPlan.visitLimit, locale)}
                    </p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-xs text-[var(--text-tertiary)]">{t("dueToday")}</p>
                    <p className="metric mt-0.5 text-3xl font-bold tracking-tight text-[var(--accent-strong)]">
                      {formatInr(finalAmount)}
                    </p>
                  </div>
                </div>
                {referral || couponPreview ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      ...(referral
                        ? [{ label: t("referralDiscount") }]
                        : []),
                      ...(couponPreview
                        ? [{ label: t("couponDiscount") }]
                        : []),
                    ].map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs"
                    >
                      <span className="font-semibold text-[var(--text-primary)]">{item.label}</span>
                    </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 space-y-3">
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
                    tone="blue"
                  />
                )}
                {viewerJoinState?.activeSubscription ? null : data.connected ? (
                  <JoinCheckoutButton
                    orgId={org.id}
                    planId={selectedPlan.id}
                    couponCode={couponPreview?.code ?? null}
                    referralCode={referral?.code ?? null}
                    className="mt-0"
                    labels={{
                      idle: data.connected
                        ? t("payAmountNow", { amount: formatInr(finalAmount) })
                        : t("paymentUnavailable"),
                      busy: t("startingPayment"),
                      started: t("paymentStarted"),
                      unavailable: t("paymentUnavailable"),
                      unable: t("unableStartPayment"),
                    }}
                    loginPath={loginRedirect(
                      joinPath(org.username, selectedPlan.handle, referral, couponPreview?.code, locale),
                      locale,
                    )}
                  />
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

              <details className="group mt-3 overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
                <summary className="zook-focus flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl text-sm font-semibold text-[var(--text-primary)]">
                  <span className="min-w-0">{t("checkoutDetails")}</span>
                  <span className="inline-flex min-w-0 shrink items-center gap-1.5 text-right text-xs font-semibold text-[var(--text-tertiary)]">
                    <span className="truncate">{paymentMethodLabel}</span>
                    <ChevronDown size={14} aria-hidden className="shrink-0 transition group-open:rotate-180" />
                  </span>
                </summary>
                <div className="mt-3 grid gap-3">
                  {viewerJoinState?.activeSubscription ? null : (
                    <div className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2.5 text-xs leading-5 text-[var(--text-secondary)]">
                      <p className="flex items-start gap-2">
                        <ShieldCheck
                          size={14}
                          className="mt-0.5 shrink-0 text-[var(--feedback-success)]"
                          aria-hidden="true"
                        />
                        <span>{t("paymentActivation")}</span>
                      </p>
                    </div>
                  )}
                  <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
                    <table className="w-full text-left text-xs">
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        <BreakdownRow label={t("basePrice")} value={formatInr(selectedPlan.pricePaise)} />
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
                        <BreakdownRow label={t("dueToday")} value={formatInr(finalAmount)} strong />
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
              <details
                className="group mt-3 overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2"
              >
                <summary className="zook-focus flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl text-sm font-semibold text-[var(--text-primary)]">
                  <span className="min-w-0">{t("planAndOffers")}</span>
                  <span className="inline-flex min-w-0 shrink items-center gap-1.5 text-right text-xs font-semibold text-[var(--text-tertiary)]">
                    <span className="truncate">
                      {couponPreview ? couponPreview.code : t("changePlan")}
                    </span>
                    <ChevronDown size={14} aria-hidden className="shrink-0 transition group-open:rotate-180" />
                  </span>
                </summary>
                <div className="mt-3 grid gap-3 border-t border-[var(--border-subtle)] pt-3">
                  {data.plans.length > 1 ? (
                    <PlanSelector
                      plans={data.plans}
                      selectedPlanId={selectedPlan.id}
                      username={org.username}
                      referralCode={referral?.code ?? null}
                      couponCode={couponPreview?.code ?? null}
                      locale={locale}
                      choosePlanLabel={t("changePlan")}
                      changingPlanLabel={t("changingPlan")}
                    />
                  ) : null}
                  <CouponApplyForm
                    orgId={org.id}
                    username={org.username}
                    planId={selectedPlan.id}
                    referralCode={referral?.code ?? null}
                    initialCouponCode={couponPreview?.code ?? null}
                    variant="inline"
                    labels={{
                      addCoupon: t("addCoupon"),
                      applyCoupon: t("applyCoupon"),
                      applyingCoupon: t("applyingCoupon"),
                      couponApplied: t("couponApplied"),
                      couponCode: t("couponCode"),
                      couponInvalid: t("couponInvalid"),
                      couponRequired: t("couponRequired"),
                      couponWillApply: t("couponWillApply"),
                      enterCoupon: t("enterCoupon"),
                    }}
                  />
                </div>
              </details>

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
  tone: "amber" | "blue";
}) {
  const toneClass =
    tone === "blue"
      ? "border-[var(--border)] bg-[var(--surface-info-soft)] text-[var(--text-primary)]"
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
      <th className="px-3 py-2 text-xs font-medium text-[var(--text-tertiary)]">
        {label}
      </th>
      <td className={`px-3 py-2 text-right ${strong ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
        {value}
      </td>
    </tr>
  );
}
