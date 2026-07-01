import Link from "next/link";
import { ChevronDown, Users, Zap } from "lucide-react";
import type { AuthSessionSummary } from "@zook/core";
import { prisma } from "@zook/db";
import { AppHandoffCard } from "@/components/app-handoff-card";
import { membershipPlanTypeLabel } from "@/components/dashboard/types";
import { GlassCard, Pill } from "@/components/glass-card";
import { MemberAutopayButton } from "@/components/member-autopay-button";
import { MemberContactCompletionPanel } from "@/components/member-contact-completion-panel";
import { MemberPrivateLink } from "@/components/member-private-link";
import { MemberRenewButton } from "@/components/member-renew-button";
import { MemberSubscriptionActions } from "@/components/member-subscription-actions";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { PublicNav } from "@/components/public/nav/public-nav";
import { destinationToUrl } from "@/lib/auth-destinations";
import { formatDate, formatInr } from "@/lib/format";
import { getOrigins } from "@/lib/origins";
import { localizedPath, type PublicLocale } from "@/lib/public-i18n";

const DAY_MS = 24 * 60 * 60 * 1000;

const membershipSurfaceCopy = {
  en: {
    myMembership: "My membership",
    membershipIntro: "Membership status, payments, and upcoming classes.",
    activeAt: "Active at",
    renewNow: "Renew now",
    renewalMethod: "Renewal method",
    manualRenewal: "Manual renewal",
    manageRenewal: "Manage renewal",
    autopayPrompt: "After payment: autopay",
    autopayFootnote: "Optional. Keep renewals automatic.",
    autopayDisclosure: "Enable it once after this renewal so the next payment is automatic. You can cancel it later from membership settings.",
    renewalPrompt: "Renew now to keep check-ins active.",
    privateId: "Private ID",
    autopayOn: "Autopay on",
    planValue: "Plan value",
    validUntil: "Valid until",
    visits: "Visits",
    unlimited: "Unlimited",
    remaining: "remaining",
    lastPayment: "Last payment",
    notAvailable: "Not available",
    viewGymPage: "View gym page",
    nextSevenDays: "Next 7 days",
    upcomingClasses: "Upcoming classes",
    upcomingClassesBody: "See published classes for your active gyms.",
    zookGym: "Zook gym",
    membershipPlan: "Membership plan",
    assignedTrainer: "Assigned trainer",
    waitlistInApp: "Waitlist in app",
    included: "Included",
    noUpcomingClasses: "No upcoming classes are published for your memberships this week.",
    manageClasses: "Manage classes in app",
    manageClassesBody: "Open Zook to reserve, waitlist, or cancel a class.",
    noMembership: "No membership",
    noMembershipBody: "Find your gym, choose a plan, and continue with payment.",
    findGym: "Find a gym",
    time: "Time",
    trainer: "Trainer",
    capacity: "Capacity",
    price: "Price",
    spotsLeft: "spots left",
    otherMemberships: "Other memberships",
    otherMembershipsCount: (count: number) => `${count} more`,
    classesCount: (count: number) => `${count} class${count === 1 ? "" : "es"}`,
  },
  hi: {
    myMembership: "मेरी सदस्यता",
    membershipIntro: "सदस्यता स्थिति, भुगतान और आने वाली क्लास.",
    activeAt: "यहां सक्रिय",
    renewNow: "अभी रिन्यू करें",
    renewalMethod: "रिन्यूअल तरीका",
    manualRenewal: "मैनुअल रिन्यूअल",
    manageRenewal: "रिन्यूअल मैनेज करें",
    autopayPrompt: "पेमेंट के बाद: ऑटो-पे",
    autopayFootnote: "वैकल्पिक. रिन्यूअल अपने-आप रखें.",
    autopayDisclosure: "इस रिन्यूअल के बाद इसे एक बार चालू करें ताकि अगला भुगतान अपने-आप हो. बाद में मेंबरशिप सेटिंग्स से इसे बंद कर सकते हैं.",
    renewalPrompt: "चेक-इन सक्रिय रखने के लिए अभी रिन्यू करें.",
    privateId: "प्राइवेट ID",
    autopayOn: "ऑटो-पे चालू",
    planValue: "प्लान वैल्यू",
    validUntil: "मान्य तक",
    visits: "विज़िट",
    unlimited: "असीमित",
    remaining: "बाकी",
    lastPayment: "पिछला भुगतान",
    notAvailable: "उपलब्ध नहीं",
    viewGymPage: "जिम पेज देखें",
    nextSevenDays: "अगले 7 दिन",
    upcomingClasses: "आने वाली क्लास",
    upcomingClassesBody: "अपने सक्रिय जिम की प्रकाशित क्लास देखें.",
    zookGym: "Zook जिम",
    membershipPlan: "सदस्यता प्लान",
    assignedTrainer: "असाइन किया ट्रेनर",
    waitlistInApp: "ऐप में वेटलिस्ट",
    included: "शामिल",
    noUpcomingClasses: "इस हफ्ते आपकी सदस्यताओं के लिए कोई आगामी क्लास प्रकाशित नहीं है.",
    manageClasses: "क्लास ऐप में मैनेज करें",
    manageClassesBody: "रिज़र्व, वेटलिस्ट या कैंसल करने के लिए Zook खोलें.",
    noMembership: "कोई सदस्यता नहीं",
    noMembershipBody: "अपना जिम खोजें, प्लान चुनें और भुगतान जारी रखें.",
    findGym: "जिम खोजें",
    time: "समय",
    trainer: "ट्रेनर",
    capacity: "क्षमता",
    price: "कीमत",
    spotsLeft: "सीट बाकी",
    otherMemberships: "बाकी सदस्यताएं",
    otherMembershipsCount: (count: number) => `${count} और`,
    classesCount: (count: number) => `${count} क्लास`,
  },
} as const;

function toneForMemberSubscriptionStatus(status: string | null | undefined) {
  if (status === "ACTIVE") return "blue";
  if (status === "PENDING" || status === "PENDING_PAYMENT" || status === "PAST_DUE") {
    return "amber";
  }
  if (["EXPIRED", "CANCELLED", "REJECTED", "FAILED", "REFUNDED"].includes(status ?? "")) {
    return "red";
  }
  return "blue";
}

function memberSubscriptionStatusLabel(status: string | null | undefined, locale: PublicLocale) {
  if (locale === "hi") {
    if (status === "ACTIVE") return "सक्रिय";
    if (status === "PENDING" || status === "PENDING_PAYMENT") return "भुगतान बाकी";
    if (status === "PAST_DUE") return "बकाया";
    if (status === "EXPIRED") return "समाप्त";
    if (status === "CANCELLED") return "रद्द";
    if (status === "REJECTED") return "अस्वीकृत";
    if (status === "FAILED") return "भुगतान विफल";
    if (status === "REFUNDED") return "रिफंड";
  }
  if (status === "ACTIVE") return "Active";
  if (status === "PENDING" || status === "PENDING_PAYMENT") return "Payment pending";
  if (status === "PAST_DUE") return "Past due";
  if (status === "EXPIRED") return "Expired";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "REJECTED") return "Rejected";
  if (status === "FAILED") return "Payment failed";
  if (status === "REFUNDED") return "Refunded";
  return "Membership";
}

function classEnrollmentStatusLabel(status: string | null | undefined, locale: PublicLocale) {
  if (locale === "hi") {
    if (status === "confirmed") return "बुक्ड";
    if (status === "pending_payment") return "भुगतान बाकी";
    if (status === "waitlisted") return "वेटलिस्ट";
    if (status === "cancelled") return "रद्द";
    return "एनरोल्ड";
  }
  if (status === "confirmed") return "Booked";
  if (status === "pending_payment") return "Payment pending";
  if (status === "waitlisted") return "Waitlisted";
  if (status === "cancelled") return "Cancelled";
  return "Enrolled";
}

function classTypeLabel(type: string | null | undefined) {
  const value = (type ?? "").trim();
  if (!value) return "Class";
  const key = value.toLowerCase();
  if (key === "hiit") return "HIIT";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function CompactFact({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/52">
      <span className="text-white/35">{label}</span>
      <span className="truncate font-medium text-white/78">{value}</span>
    </span>
  );
}

function membershipVisitsLabel(
  remainingVisits: number | null | undefined,
  copy: (typeof membershipSurfaceCopy)[PublicLocale],
) {
  return remainingVisits === null || remainingVisits === undefined
    ? copy.unlimited
    : `${remainingVisits} ${copy.remaining}`;
}

export async function renderMembershipSurface(
  session: AuthSessionSummary,
  locale: PublicLocale = "en",
) {
  const copy = membershipSurfaceCopy[locale];
  const origins = getOrigins();
  const memberPrivateUrl = session.user.slug
    ? destinationToUrl({ host: "public", path: `/m/${session.user.slug}` }, origins)
    : null;
  const subscriptions = await prisma.memberSubscription.findMany({
    where: { memberUserId: session.user.id },
    orderBy: [{ status: "asc" }, { endsAt: "desc" }, { createdAt: "desc" }],
    take: 20,
  });
  const [plans, organizations, latestPayments, mandates] = await Promise.all([
    prisma.membershipPlan.findMany({
      where: {
        OR: [
          { id: { in: subscriptions.map((subscription) => subscription.planId) } },
          { orgId: { in: subscriptions.map((subscription) => subscription.orgId) } },
        ],
      },
    }),
    prisma.organization.findMany({
      where: { id: { in: subscriptions.map((subscription) => subscription.orgId) } },
    }),
    prisma.payment.findMany({
      where: { userId: session.user.id },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
    prisma.paymentMandate.findMany({
      where: { userId: session.user.id, status: { in: ["ACTIVE", "AUTHENTICATED"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const memberOrgIds = Array.from(new Set(subscriptions.map((subscription) => subscription.orgId)));
  const primarySubscription = subscriptions[0] ?? null;
  const primaryPlan = primarySubscription
    ? plans.find((candidate) => candidate.id === primarySubscription.planId) ?? null
    : null;
  const primaryOrganization = primarySubscription
    ? organizations.find((candidate) => candidate.id === primarySubscription.orgId) ?? null
    : null;
  const primaryPayment = primarySubscription
    ? latestPayments.find((candidate) => candidate.id === primarySubscription.paymentId) ??
      latestPayments.find((candidate) => candidate.orgId === primarySubscription.orgId) ??
      null
    : null;
  const primaryAutopay = primarySubscription
    ? mandates.find(
        (mandate) =>
          mandate.sourceSubscriptionId === primarySubscription.id ||
          mandate.latestSubscriptionId === primarySubscription.id,
      )
    : null;
  const primaryIsRenewable = primarySubscription
    ? toneForMemberSubscriptionStatus(primarySubscription.status) === "red"
    : false;
  const secondarySubscriptions = primarySubscription
    ? subscriptions.filter((subscription) => subscription.id !== primarySubscription.id)
    : subscriptions;
  const shouldPromptPrimaryAutopay =
    Boolean(primarySubscription) &&
    primarySubscription?.status === "ACTIVE" &&
    !primaryAutopay &&
    !primaryIsRenewable;
  const now = new Date();
  const upcomingClasses = memberOrgIds.length
    ? await prisma.class.findMany({
        where: {
          orgId: { in: memberOrgIds },
          startTime: { gte: now, lte: new Date(now.getTime() + 7 * DAY_MS) },
          status: { not: "CANCELLED" },
        },
        orderBy: { startTime: "asc" },
        take: 12,
      })
    : [];
  const [classEnrollments, classBranches, classTrainers] = upcomingClasses.length
    ? await Promise.all([
        prisma.classEnrollment.findMany({
          where: {
            classId: { in: upcomingClasses.map((entry) => entry.id) },
            OR: [
              { memberId: session.user.id },
              { status: { in: ["confirmed", "pending_payment"] } },
            ],
          },
        }),
        prisma.branch.findMany({
          where: {
            id: { in: Array.from(new Set(upcomingClasses.map((entry) => entry.branchId))) },
          },
          select: { id: true, name: true },
        }),
        prisma.user.findMany({
          where: {
            id: { in: Array.from(new Set(upcomingClasses.map((entry) => entry.trainerId))) },
          },
          select: { id: true, name: true },
        }),
      ])
    : [[], [], []];
  const branchNames = new Map(classBranches.map((branch) => [branch.id, branch.name]));
  const trainerNames = new Map(classTrainers.map((trainer) => [trainer.id, trainer.name]));

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen px-5 py-5">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <PublicNav locale={locale} hideMarketingLinks>
          <AccountAwareNav locale={locale} />
        </PublicNav>

        <GlassCard variant="strong" className="p-5 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Pill>{copy.myMembership}</Pill>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                {primarySubscription ? copy.activeAt : copy.noMembership}
              </p>
              <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
                {primaryOrganization?.name ?? copy.myMembership}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/60">
                {primaryPlan?.name ?? copy.membershipIntro}
                {primaryPlan?.type ? ` · ${membershipPlanTypeLabel(primaryPlan.type)}` : ""}
              </p>
              {session.user.privateHandle ? (
                <p className="mt-3 text-xs text-white/38">
                  {copy.privateId}: <span className="font-medium text-white/56">{session.user.privateHandle}</span>
                </p>
              ) : null}
            </div>

            {primarySubscription ? (
              <div className="grid min-w-[min(100%,22rem)] gap-3 rounded-3xl border border-white/10 bg-black/18 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Pill tone={toneForMemberSubscriptionStatus(primarySubscription.status)}>
                    {memberSubscriptionStatusLabel(primarySubscription.status, locale)}
                  </Pill>
                  <p className="text-right text-xl font-semibold text-white">
                    {formatInr(primaryPlan?.pricePaise ?? primaryPayment?.amountPaise ?? 0)}
                  </p>
                </div>
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/[0.04] px-3 py-2">
                    <p className="leading-5 text-white/35">{copy.validUntil}</p>
                    <p className="mt-1 leading-5 font-semibold text-white/78">
                      {formatDate(primarySubscription.endsAt)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.04] px-3 py-2">
                    <p className="leading-5 text-white/35">{copy.visits}</p>
                    <p className="mt-1 leading-5 font-semibold text-white/78">
                      {membershipVisitsLabel(primarySubscription.remainingVisits, copy)}
                    </p>
                  </div>
                </div>
                {primaryAutopay ? (
                  <div className="rounded-2xl bg-white/[0.04] px-3 py-2 text-xs">
                    <p className="leading-5 text-white/35">{copy.renewalMethod}</p>
                    <p className="mt-1 leading-5 font-semibold text-white/78">
                      {copy.autopayOn}
                    </p>
                  </div>
                ) : null}
                {shouldPromptPrimaryAutopay ? (
                  <details className="group rounded-2xl border border-white/10 bg-black/20">
                    <summary className="zook-focus flex min-h-11 cursor-pointer list-none items-center gap-3 px-3 py-2">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-lime-200">
                        <Zap size={14} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold leading-5 text-white/78">
                          {copy.autopayPrompt}
                        </span>
                        <span className="block truncate text-xs leading-4 text-white/42">
                          {copy.autopayFootnote}
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-white/52">
                        <ChevronDown
                          size={14}
                          aria-hidden="true"
                          className="transition group-open:rotate-180"
                        />
                      </span>
                    </summary>
                    <div className="grid gap-2 border-t border-white/10 px-3 py-2.5 sm:grid-cols-[1fr_auto] sm:items-center">
                      <p className="text-xs leading-5 text-white/58">
                        {copy.autopayDisclosure}
                      </p>
                      <MemberAutopayButton
                        subscriptionId={primarySubscription.id}
                        locale={locale}
                      />
                    </div>
                  </details>
                ) : null}
                <div className="grid gap-2">
                  {primaryIsRenewable ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-white/42">
                        {copy.renewalPrompt}
                      </p>
                      <MemberRenewButton subscriptionId={primarySubscription.id} locale={locale} />
                    </div>
                  ) : null}
                  {primaryOrganization?.username ? (
                    <Link
                      href={localizedPath(`/g/${primaryOrganization.username}`, locale)}
                      className="zook-focus inline-flex min-h-9 w-fit items-center rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/68 transition hover:bg-white/8 hover:text-white"
                    >
                      {copy.viewGymPage}
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : memberPrivateUrl ? (
              <MemberPrivateLink url={memberPrivateUrl} />
            ) : null}
          </div>
        </GlassCard>

        {(!session.user.email || !session.user.phone) ? (
          <MemberContactCompletionPanel email={session.user.email} phone={session.user.phone} />
        ) : null}

        {subscriptions.length ? (
          <>
            {secondarySubscriptions.length ? (
            <details className="group rounded-[28px] border border-white/10 bg-white/[0.035] p-3">
              <summary className="zook-focus flex cursor-pointer list-none items-center gap-3 rounded-[22px] px-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{copy.otherMemberships}</span>
                  <span className="mt-0.5 block text-xs text-white/45">
                    {copy.otherMembershipsCount(secondarySubscriptions.length)}
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-white/55 transition group-open:rotate-180"
                />
              </summary>
            <section className="mt-3 grid gap-4">
              {secondarySubscriptions.map((subscription) => {
                const plan =
                  plans.find((candidate) => candidate.id === subscription.planId) ?? null;
                const organization =
                  organizations.find((candidate) => candidate.id === subscription.orgId) ?? null;
                const payment =
                  latestPayments.find((candidate) => candidate.id === subscription.paymentId) ??
                  latestPayments.find((candidate) => candidate.orgId === subscription.orgId) ??
                  null;
                const autopay = mandates.find(
                  (mandate) =>
                    mandate.sourceSubscriptionId === subscription.id ||
                    mandate.latestSubscriptionId === subscription.id,
                );
                const isRenewable = toneForMemberSubscriptionStatus(subscription.status) === "red";
                const isPrimarySubscription = subscription.id === primarySubscription?.id;
                const switchablePlans = plans
                  .filter((candidate) => candidate.orgId === subscription.orgId)
                  .filter((candidate) => candidate.active && candidate.id !== subscription.planId)
                  .map((candidate) => ({
                    id: candidate.id,
                    name: candidate.name,
                    pricePaise: candidate.pricePaise,
                  }));

                return (
                  <GlassCard key={subscription.id} className="p-5 md:p-6">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={toneForMemberSubscriptionStatus(subscription.status)}>
                            {memberSubscriptionStatusLabel(subscription.status, locale)}
                          </Pill>
                          {autopay ? <Pill tone="blue">{copy.autopayOn}</Pill> : null}
                        </div>
                        <h2 className="mt-3 text-xl font-semibold leading-tight text-white">
                          {organization?.name ?? copy.zookGym}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-white/50">
                          {plan?.name ?? copy.membershipPlan}
                          {plan?.type ? ` · ${membershipPlanTypeLabel(plan.type)}` : ""}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-xs text-white/45">{copy.planValue}</p>
                        <p className="mt-1 text-xl font-semibold text-white">
                          {formatInr(plan?.pricePaise ?? payment?.amountPaise ?? 0)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <CompactFact label={copy.validUntil} value={formatDate(subscription.endsAt)} />
                      <CompactFact
                        label={copy.visits}
                        value={
                          subscription.remainingVisits === null
                            ? copy.unlimited
                            : `${subscription.remainingVisits} ${copy.remaining}`
                        }
                      />
                      {payment ? (
                        <CompactFact
                          label={copy.lastPayment}
                          value={`${formatInr(payment.amountPaise)} · ${formatDate(payment.recordedAt)}`}
                        />
                      ) : null}
                    </div>

                    {(organization?.username && !isPrimarySubscription) ||
                    (isRenewable && !isPrimarySubscription) ? (
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        {organization?.username && !isPrimarySubscription ? (
                          <Link
                            href={localizedPath(`/g/${organization.username}`, locale)}
                            className="zook-focus inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/72 transition hover:bg-white/8 hover:text-white"
                          >
                            {copy.viewGymPage}
                          </Link>
                        ) : null}
                        {isRenewable && !isPrimarySubscription ? (
                          <MemberRenewButton subscriptionId={subscription.id} locale={locale} />
                        ) : null}
                      </div>
                    ) : null}

                    <MemberSubscriptionActions
                      subscriptionId={subscription.id}
                      status={subscription.status}
                      availablePlans={switchablePlans}
                      locale={locale}
                    />
                  </GlassCard>
                );
              })}
            </section>
            </details>
            ) : null}

            <details className="group rounded-[28px] border border-white/10 bg-white/[0.035] p-3">
              <summary className="zook-focus flex cursor-pointer list-none items-center gap-3 rounded-[22px] px-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                    {copy.nextSevenDays}
                  </span>
                  <span className="mt-1 block text-lg font-semibold text-white">
                    {copy.upcomingClasses}
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/55">
                  {copy.classesCount(upcomingClasses.length)}
                </span>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-white/55 transition group-open:rotate-180"
                />
              </summary>
              <section className="mt-3 grid gap-4">
                <p className="px-2 text-sm leading-6 text-white/55">
                  {copy.upcomingClassesBody}
                </p>
                {upcomingClasses.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                  {upcomingClasses.map((entry) => {
                    const org = organizations.find((candidate) => candidate.id === entry.orgId);
                    const enrolledCount = classEnrollments.filter(
                      (enrollment) =>
                        enrollment.classId === entry.id &&
                        ["confirmed", "pending_payment"].includes(enrollment.status),
                    ).length;
                    const myEnrollment = classEnrollments.find(
                      (enrollment) =>
                        enrollment.classId === entry.id && enrollment.memberId === session.user.id,
                    );
                    const remainingCapacity = Math.max(0, entry.maxCapacity - enrolledCount);

                    return (
                      <GlassCard key={entry.id} className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Pill>{classTypeLabel(entry.classType)}</Pill>
                              {myEnrollment ? (
                                <Pill tone="blue">
                                  {classEnrollmentStatusLabel(myEnrollment.status, locale)}
                                </Pill>
                              ) : null}
                            </div>
                            <h3 className="mt-3 text-lg font-semibold text-white">{entry.name}</h3>
                            <p className="mt-1 text-sm text-white/50">
                              {org?.name ?? copy.zookGym}
                              {branchNames.get(entry.branchId)
                                ? ` · ${branchNames.get(entry.branchId)}`
                                : ""}
                            </p>
                          </div>
                          <Users
                            className="mt-1 shrink-0 text-white/35"
                            size={18}
                            aria-hidden="true"
                          />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <CompactFact label={copy.time} value={formatDate(entry.startTime)} />
                          <CompactFact
                            label={copy.trainer}
                            value={trainerNames.get(entry.trainerId) ?? copy.assignedTrainer}
                          />
                          <CompactFact
                            label={copy.capacity}
                            value={
                              remainingCapacity > 0
                                ? `${remainingCapacity} ${copy.spotsLeft}`
                                : copy.waitlistInApp
                            }
                          />
                          <CompactFact
                            label={copy.price}
                            value={entry.pricePaise ? formatInr(entry.pricePaise) : copy.included}
                          />
                        </div>
                      </GlassCard>
                    );
                  })}
                  </div>
                ) : (
                  <GlassCard className="p-5">
                    <p className="text-sm leading-6 text-white/58">
                      {copy.noUpcomingClasses}
                    </p>
                  </GlassCard>
                )}

                <AppHandoffCard
                  title={copy.manageClasses}
                  description={copy.manageClassesBody}
                  deepLink="zook://classes"
                  getAppHref={localizedPath("/download", locale)}
                  compact
                />
              </section>
            </details>
          </>
        ) : (
          <GlassCard className="p-6 text-center">
            <h2 className="text-2xl font-semibold text-white">{copy.noMembership}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">
              {copy.noMembershipBody}
            </p>
            <Link
              href={localizedPath("/gyms", locale)}
              className="zook-focus mt-5 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
            >
              {copy.findGym}
            </Link>
          </GlassCard>
        )}
      </div>
    </main>
  );
}
