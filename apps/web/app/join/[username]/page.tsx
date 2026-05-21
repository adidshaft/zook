import Link from "next/link";
import { cookies } from "next/headers";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { resolvePlanName } from "@zook/ui";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { CouponApplyForm } from "@/components/coupon-apply-form";
import { JoinCheckoutButton } from "@/components/join-checkout-button";
import { InviteCodeForm, JoinRequestButton } from "@/components/join-request-controls";
import { PublicNav } from "@/components/public/nav/public-nav";
import { formatInr } from "@/lib/format";
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
          />
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
          />
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
          />
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
        />

        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <GlassCard variant="strong">
            <Pill tone="lime">{joinModeLabelForLocale(joinMode, locale)}</Pill>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
              {t("reviewMembership")}
            </h1>
            {data.plans.length > 1 ? (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  {t("choosePlan")}
                </p>
                <div
                  className="mt-3 grid gap-3 md:grid-cols-2"
                  role="radiogroup"
                  aria-label="Membership plan"
                >
                  {data.plans.map((plan) => {
                    const isSelected = plan.id === selectedPlan.id;
                    return (
                      <Link
                        key={plan.id}
                        href={joinPath(
                          org.username,
                          plan.handle,
                          referral,
                          couponPreview?.code,
                          locale,
                        )}
                        className={`zook-focus rounded-[22px] border p-4 transition ${
                          isSelected
                            ? "border-[var(--border-focus)] bg-[var(--surface-accent-soft)]"
                            : "border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--bg-sunken)]"
                        }`}
                        role="radio"
                        aria-checked={isSelected}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="truncate font-medium text-[var(--text-primary)]">
                              {resolvePlanName(plan)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                              {validityLabel(plan, locale)} · {visitLabel(plan.visitLimit, locale)}
                            </p>
                          </div>
                          <span className="font-semibold text-[var(--accent-strong)]">
                            {formatInr(plan.pricePaise)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="mt-6 grid gap-3">
              <Readout label="Gym" value={`${org.name} · ${org.city}`} />
              <Readout label={t("plan")} value={resolvePlanName(selectedPlan)} />
              <Readout label={t("duration")} value={validityLabel(selectedPlan, locale)} />
              <Readout label={t("visits")} value={visitLabel(selectedPlan.visitLimit, locale)} />
              <Readout
                label={t("referralDiscount")}
                value={
                  referral
                    ? `Referral ${referral.code} applied · -${formatInr(referralDiscountPaise)}`
                    : t("none")
                }
              />
              <Readout
                label={t("couponDiscount")}
                value={
                  couponPreview
                    ? `Coupon ${couponPreview.code} applied · -${formatInr(couponDiscountPaise)}`
                    : couponCode
                      ? `${couponCode} could not be validated for this plan`
                      : t("none")
                }
              />
            </div>
            <div className="mt-6 overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)]">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  <BreakdownRow label={t("plan")} value={formatInr(selectedPlan.pricePaise)} />
                  <BreakdownRow
                    label={t("referralDiscount")}
                    value={referral ? `-${formatInr(referralDiscountPaise)}` : t("none")}
                  />
                  <BreakdownRow
                    label={t("couponDiscount")}
                    value={couponPreview ? `-${formatInr(couponDiscountPaise)}` : t("none")}
                  />
                  <BreakdownRow label={t("finalAmount")} value={formatInr(finalAmount)} strong />
                </tbody>
              </table>
            </div>
            <CouponApplyForm
              orgId={org.id}
              username={org.username}
              planId={selectedPlan.id}
              referralCode={referral?.code ?? null}
              initialCouponCode={couponPreview?.code ?? null}
            />
          </GlassCard>

          <GlassCard>
            <p className="text-sm text-[var(--text-tertiary)]">{t("finalAmount")}</p>
            <p className="metric mt-2 text-5xl font-semibold text-[var(--accent)]">
              {formatInr(finalAmount)}
            </p>
            <div className="mt-6 grid gap-3">
              {[t("paymentDetails"), t("paymentConfirmed"), t("membershipActivates")].map(
                (step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4"
                  >
                    <CheckCircle2 className="text-[var(--accent)]" size={20} />
                    <p className="text-sm text-[var(--text-primary)]">
                      {index + 1}. {step}
                    </p>
                  </div>
                ),
              )}
            </div>
            <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[var(--surface-info-soft)] p-4">
              <div className="flex items-center gap-3">
                <LockKeyhole className="text-[var(--feedback-info)]" size={20} />
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {t("paymentActivation")}
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                {t("paymentMethod")}
              </p>
              <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">
                {t("razorpay")}
              </div>
            </div>
            {viewerJoinState?.activeSubscription ? (
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
            ) : data.connected ? (
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
              <>
                <div className="mt-6 rounded-[22px] border border-[var(--border)] bg-[var(--surface-warning-soft)] p-4 text-sm leading-6 text-[var(--text-primary)]">
                  {t("testMode")}
                </div>
                <Link
                  href={`/checkout/mock/demo?plan=${selectedPlan.id}${referral ? `&ref=${referral.code}` : ""}`}
                  className="zook-focus mt-4 inline-flex w-full justify-center rounded-full bg-[var(--accent-fill)] px-5 py-3 font-semibold text-[var(--text-on-accent)]"
                >
                  {t("simulatedPayment")}
                </Link>
              </>
            ) : (
              <div className="mt-6 rounded-[22px] border border-[var(--border)] bg-[var(--surface-warning-soft)] p-4 text-sm leading-6 text-[var(--text-primary)]">
                <p>{t("paymentUnavailable")}</p>
                <Link
                  href={joinPath(org.username, selectedPlan.handle, referral, couponPreview?.code, locale)}
                  className="zook-focus mt-4 inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] transition"
                >
                  {t("retry")}
                </Link>
              </div>
            )}
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

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-2 font-medium text-[var(--text-primary)]">{value}</p>
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
