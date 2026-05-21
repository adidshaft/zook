import Link from "next/link";
import { CalendarDays, CreditCard, Dumbbell, MapPin } from "lucide-react";
import type { AuthSessionSummary } from "@zook/core";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { MemberPrivateLink } from "@/components/member-private-link";
import { PublicNav } from "@/components/public-nav";
import { destinationToUrl } from "@/lib/auth-destinations";
import { formatDate, formatEnumLabel, formatInr } from "@/lib/format";
import { getOrigins } from "@/lib/origins";

export async function renderMembershipSurface(session: AuthSessionSummary) {
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
      where: { id: { in: subscriptions.map((subscription) => subscription.planId) } },
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

  return (
    <main className="min-h-screen px-5 py-5">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <PublicNav showLogin={false} />

        <GlassCard variant="strong" className="p-6 md:p-8">
          <Pill tone="lime">Member profile</Pill>
          {session.user.privateHandle ? (
            <Pill tone="blue" className="ml-2">
              Private ID: {session.user.privateHandle}
            </Pill>
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

        {subscriptions.length ? (
          <section className="grid gap-4">
            {subscriptions.map((subscription) => {
              const plan = plans.find((candidate) => candidate.id === subscription.planId) ?? null;
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
              return (
                <GlassCard key={subscription.id} className="p-5 md:p-6">
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={subscription.status === "ACTIVE" ? "lime" : "amber"}>
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
                      <p className="mt-1 text-2xl font-semibold text-lime-200">
                        {formatInr(plan?.pricePaise ?? payment?.amountPaise ?? 0)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <CalendarDays className="text-lime-200" size={18} />
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/35">
                        Valid until
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {formatDate(subscription.endsAt)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <Dumbbell className="text-lime-200" size={18} />
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
                      <CreditCard className="text-lime-200" size={18} />
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

                  {organization?.username ? (
                    <Link
                      href={`/g/${organization.username}`}
                      className="zook-focus mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/72 transition hover:bg-white/8 hover:text-white"
                    >
                      <MapPin size={16} aria-hidden="true" />
                      View gym page
                    </Link>
                  ) : null}
                </GlassCard>
              );
            })}
          </section>
        ) : (
          <GlassCard className="p-6 text-center">
            <h2 className="text-2xl font-semibold text-white">No membership yet</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">
              Find your gym, choose a plan, and continue with payment to see your membership here.
            </p>
            <Link
              href="/gyms"
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
