import Link from "next/link";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { CouponApplyForm } from "@/components/coupon-apply-form";
import { JoinCheckoutButton } from "@/components/join-checkout-button";
import { ZookLogo } from "@/components/zook-logo";
import { formatInr } from "@/lib/format";
import {
  joinModeLabelForLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
  type PublicLocale,
} from "@/lib/public-i18n";
import {
  getPublicCouponPreview,
  getPublicGymProfileData,
  type PublicGymReferral,
} from "@/server/public-gym-read-models";

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
  planId: string,
  referral?: PublicGymReferral | null,
  couponCode?: string,
  locale: PublicLocale = "en",
) {
  const query = new URLSearchParams({ plan: planId });
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
  const selectedPlan = data?.plans.find((plan) => plan.id === query.plan) ?? data?.plans[0];
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

  if (!org || !selectedPlan) {
    return <main className="p-8">{t("joinUnavailable")}</main>;
  }

  if (joinMode === "APPROVAL_REQUIRED") {
    return (
      <main
        lang={locale === "hi" ? "hi-IN" : "en-IN"}
        className="grid min-h-screen place-items-center px-5 py-8"
      >
        <div className="absolute left-5 top-5">
          <ZookLogo />
        </div>
        <GlassCard className="max-w-xl">
          <Pill tone="amber">{t("approvalRequired")}</Pill>
          <h1 className="mt-5 text-3xl font-semibold text-white">{t("approvalRequired")}</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">{t("approvalCopy")}</p>
          <Link
            href={loginRedirect(
              selectedPlan
                ? joinPath(org.username, selectedPlan.id, referral, couponPreview?.code, locale)
                : localizedPath(`/g/${org.username}`, locale),
              locale,
            )}
            className="zook-focus mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
          >
            {t("signInRequestAccess")}
          </Link>
          <Link
            href={localizedPath(`/g/${org.username}`, locale)}
            className="zook-focus ml-3 mt-6 inline-flex rounded-full border border-white/10 px-5 py-3 text-sm text-white/70"
          >
            {t("backToGym")}
          </Link>
        </GlassCard>
      </main>
    );
  }

  if (joinMode === "INVITE_ONLY" && !referral) {
    return (
      <main
        lang={locale === "hi" ? "hi-IN" : "en-IN"}
        className="grid min-h-screen place-items-center px-5 py-8"
      >
        <div className="absolute left-5 top-5">
          <ZookLogo />
        </div>
        <GlassCard className="max-w-xl">
          <Pill tone="red">{joinModeLabelForLocale(joinMode, locale)}</Pill>
          <h1 className="mt-5 text-3xl font-semibold text-white">{t("inviteRequired")}</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">{t("inviteCopy")}</p>
          <Link
            href={localizedPath(`/g/${org.username}`, locale)}
            className="zook-focus mt-6 inline-flex rounded-full border border-white/10 px-5 py-3 text-sm text-white/70"
          >
            {t("backToGym")}
          </Link>
        </GlassCard>
      </main>
    );
  }

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen px-5 py-5">
      <div className="mx-auto grid max-w-6xl gap-5">
        <header className="flex items-center justify-between">
          <ZookLogo />
          <Link
            href={localizedPath(`/g/${org.username}`, locale)}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
          >
            {t("gymProfile")}
          </Link>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <GlassCard variant="strong">
            <Pill tone="lime">{joinModeLabelForLocale(joinMode, locale)}</Pill>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">
              {t("reviewMembership")}
            </h1>
            {data.plans.length > 1 ? (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
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
                          plan.id,
                          referral,
                          couponPreview?.code,
                          locale,
                        )}
                        className={`zook-focus rounded-[22px] border p-4 transition ${
                          isSelected
                            ? "border-lime-300/45 bg-lime-300/12"
                            : "border-white/10 bg-black/20 hover:bg-white/8"
                        }`}
                        role="radio"
                        aria-checked={isSelected}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{plan.name}</p>
                            <p className="mt-1 text-xs text-white/45">
                              {validityLabel(plan, locale)} · {visitLabel(plan.visitLimit, locale)}
                            </p>
                          </div>
                          <span className="font-semibold text-lime-200">
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
              <Readout label={t("plan")} value={selectedPlan.name} />
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
            <CouponApplyForm
              orgId={org.id}
              username={org.username}
              planId={selectedPlan.id}
              referralCode={referral?.code ?? null}
              initialCouponCode={couponPreview?.code ?? null}
            />
          </GlassCard>

          <GlassCard>
            <p className="text-sm text-white/45">{t("finalAmount")}</p>
            <p className="metric mt-2 text-5xl font-semibold text-lime-200">
              {formatInr(finalAmount)}
            </p>
            <div className="mt-6 grid gap-3">
              {[t("paymentDetails"), t("paymentConfirmed"), t("membershipActivates")].map(
                (step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4"
                  >
                    <CheckCircle2 className="text-lime-200" size={20} />
                    <p className="text-sm text-white/75">
                      {index + 1}. {step}
                    </p>
                  </div>
                ),
              )}
            </div>
            <div className="mt-5 rounded-[22px] border border-sky-300/20 bg-sky-300/10 p-4">
              <div className="flex items-center gap-3">
                <LockKeyhole className="text-sky-100" size={20} />
                <p className="text-sm font-medium text-sky-50">
                  {t("paymentActivation")}
                </p>
              </div>
            </div>
            {data.connected ? (
              <JoinCheckoutButton
                orgId={org.id}
                planId={selectedPlan.id}
                couponCode={couponPreview?.code ?? null}
                referralCode={referral?.code ?? null}
                loginPath={loginRedirect(
                  joinPath(org.username, selectedPlan.id, referral, couponPreview?.code, locale),
                  locale,
                )}
              />
            ) : (
              <>
                <div className="mt-6 rounded-[22px] border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
                  {t("testMode")}
                </div>
                <Link
                  href={`/checkout/mock/demo?plan=${selectedPlan.id}${referral ? `&ref=${referral.code}` : ""}`}
                  className="zook-focus mt-4 inline-flex w-full justify-center rounded-full bg-lime-300 px-5 py-3 font-semibold text-black"
                >
                  {t("simulatedPayment")}
                </Link>
              </>
            )}
          </GlassCard>
        </section>
      </div>
    </main>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase text-white/35">{label}</p>
      <p className="mt-2 font-medium text-white">{value}</p>
    </div>
  );
}
