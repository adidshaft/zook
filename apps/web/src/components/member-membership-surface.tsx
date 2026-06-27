import Link from "next/link";
import { CalendarDays, CreditCard, Dumbbell, MapPin, Users } from "lucide-react";
import type { AuthSessionSummary } from "@zook/core";
import { prisma } from "@zook/db";
import { AppHandoffCard } from "@/components/app-handoff-card";
import { GlassCard, Pill } from "@/components/glass-card";
import { MemberContactCompletionPanel } from "@/components/member-contact-completion-panel";
import { MemberPrivateLink } from "@/components/member-private-link";
import { MemberRenewButton } from "@/components/member-renew-button";
import { MemberSubscriptionActions } from "@/components/member-subscription-actions";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { PublicNav } from "@/components/public/nav/public-nav";
import { destinationToUrl } from "@/lib/auth-destinations";
import { formatDate, formatEnumLabel, formatInr } from "@/lib/format";
import { getOrigins } from "@/lib/origins";
import { localizedPath, type PublicLocale } from "@/lib/public-i18n";

const DAY_MS = 24 * 60 * 60 * 1000;

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

export async function renderMembershipSurface(
  session: AuthSessionSummary,
  locale: PublicLocale = "en",
) {
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
        <PublicNav locale={locale}>
          <AccountAwareNav locale={locale} />
        </PublicNav>

        <GlassCard variant="strong" className="p-6 md:p-8">
          {session.user.privateHandle ? (
            <Pill>Private ID: {session.user.privateHandle}</Pill>
          ) : null}
          {memberPrivateUrl ? <MemberPrivateLink url={memberPrivateUrl} /> : null}
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            My membership
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
            A simple view of your gym membership on web. Check-ins, workouts, progress, and trainer
            updates stay in the Zook app.
          </p>
        </GlassCard>

        <MemberContactCompletionPanel email={session.user.email} phone={session.user.phone} />

        {subscriptions.length ? (
          <>
            <section className="grid gap-4">
              {subscriptions.map((subscription) => {
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
                    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={toneForMemberSubscriptionStatus(subscription.status)}>
                            {formatEnumLabel(subscription.status)}
                          </Pill>
                          {autopay ? <Pill tone="blue">Autopay on</Pill> : null}
                        </div>
                        <h2 className="mt-4 text-2xl font-semibold text-white">
                          {organization?.name ?? "Zook gym"}
                        </h2>
                        <p className="mt-2 text-sm text-white/50">
                          {plan?.name ?? "Membership plan"}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-sm text-white/45">Plan value</p>
                        <p className="mt-1 text-2xl font-semibold text-white">
                          {formatInr(plan?.pricePaise ?? payment?.amountPaise ?? 0)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <CalendarDays className="text-white/45" size={18} />
                        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/35">
                          Valid until
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {formatDate(subscription.endsAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <Dumbbell className="text-white/45" size={18} />
                        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/35">
                          Visits
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {subscription.remainingVisits === null
                            ? "Unlimited"
                            : `${subscription.remainingVisits} remaining`}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <CreditCard className="text-white/45" size={18} />
                        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/35">
                          Last payment
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {payment
                            ? `${formatInr(payment.amountPaise)} · ${formatDate(payment.recordedAt)}`
                            : "Not available"}
                        </p>
                      </div>
                    </div>

                    {organization?.username || isRenewable ? (
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        {organization?.username ? (
                          <Link
                            href={localizedPath(`/g/${organization.username}`, locale)}
                            className="zook-focus inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/72 transition hover:bg-white/8 hover:text-white"
                          >
                            <MapPin size={16} aria-hidden="true" />
                            View gym page
                          </Link>
                        ) : null}
                        {isRenewable ? (
                          <MemberRenewButton subscriptionId={subscription.id} />
                        ) : null}
                      </div>
                    ) : null}

                    <MemberSubscriptionActions
                      subscriptionId={subscription.id}
                      status={subscription.status}
                      availablePlans={switchablePlans}
                    />
                  </GlassCard>
                );
              })}
            </section>

            <section className="grid gap-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                    Next 7 days
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Upcoming classes</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                    View your gym schedule here. Booking, waitlists, and cancellations continue in
                    the Zook app.
                  </p>
                </div>
              </div>

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
                              <Pill>{formatEnumLabel(entry.classType)}</Pill>
                              {myEnrollment ? (
                                <Pill tone="blue">{formatEnumLabel(myEnrollment.status)}</Pill>
                              ) : null}
                            </div>
                            <h3 className="mt-3 text-lg font-semibold text-white">{entry.name}</h3>
                            <p className="mt-1 text-sm text-white/50">
                              {org?.name ?? "Zook gym"}
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
                        <div className="mt-4 grid gap-3 text-sm text-white/58 sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                              Time
                            </p>
                            <p className="mt-1 font-medium text-white">
                              {formatDate(entry.startTime)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                              Trainer
                            </p>
                            <p className="mt-1 font-medium text-white">
                              {trainerNames.get(entry.trainerId) ?? "Assigned trainer"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                              Capacity
                            </p>
                            <p className="mt-1 font-medium text-white">
                              {remainingCapacity > 0
                                ? `${remainingCapacity} spots left`
                                : "Waitlist available in app"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                              Price
                            </p>
                            <p className="mt-1 font-medium text-white">
                              {entry.pricePaise ? formatInr(entry.pricePaise) : "Included"}
                            </p>
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              ) : (
                <GlassCard className="p-5">
                  <p className="text-sm leading-6 text-white/58">
                    No upcoming classes are published for your memberships this week.
                  </p>
                </GlassCard>
              )}

              <AppHandoffCard
                title="Book or manage classes"
                description="Open Zook to reserve a spot, join a waitlist, or cancel an existing booking."
                deepLink="zook://classes"
                getAppHref={localizedPath("/download", locale)}
                compact
              />
            </section>
          </>
        ) : (
          <GlassCard className="p-6 text-center">
            <h2 className="text-2xl font-semibold text-white">No membership</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">
              Find your gym, choose a plan, and continue with payment.
            </p>
            <Link
              href={localizedPath("/gyms", locale)}
              className="zook-focus mt-5 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
            >
              Find a gym
            </Link>
          </GlassCard>
        )}
      </div>
    </main>
  );
}
