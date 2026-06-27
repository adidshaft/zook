import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { formatDateTime, formatInr } from "@/lib/format";
import { requireDashboardSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function TrainerDetailPage({
  params,
}: {
  params: Promise<{ trainerId: string }>;
}) {
  const session = await requireDashboardSession({
    expectedHost: "dashboard",
    redirectPath: "/dashboard/trainers",
  });
  if (!session.activeOrgId || !session.activeOrganization?.permissions.includes("TRAINERS_MANAGE")) {
    redirect("/dashboard");
  }
  const orgId = session.activeOrgId;
  const { trainerId } = await params;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [trainer, profile, assignments, upcomingClasses, sessionCount, payout] = await Promise.all([
    prisma.user.findUnique({ where: { id: trainerId } }),
    prisma.trainerProfile.findFirst({ where: { orgId, userId: trainerId } }),
    prisma.trainerAssignment.findMany({
      where: { orgId, trainerUserId: trainerId, active: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.class.findMany({
      where: { orgId, trainerId, status: "scheduled", startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      take: 10,
    }),
    prisma.personalTrainingSessionLog.count({ where: { orgId, trainerUserId: trainerId } }),
    prisma.trainerPayout.aggregate({
      where: { orgId, trainerId, createdAt: { gte: monthStart } },
      _sum: { totalPaise: true },
    }),
  ]);
  if (!trainer) redirect("/dashboard/trainers");
  const memberIds = assignments.map((assignment) => assignment.memberUserId);
  const members = memberIds.length
    ? await prisma.user.findMany({ where: { id: { in: memberIds } } })
    : [];
  const memberById = new Map(members.map((member) => [member.id, member]));

  return (
    <main className="mx-auto grid max-w-6xl gap-4 p-4 sm:p-6">
      <GlassCard variant="strong">
        <Link href="/dashboard/trainers" className="text-sm font-semibold text-[var(--accent-strong)]">
          Back to trainers
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{trainer.name}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{trainer.email}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {stringList(profile?.specialties).map((specialty) => <Pill key={specialty}>{specialty}</Pill>)}
          <Pill>{profile?.visibleToMembers ? "Public profile" : "Internal profile"}</Pill>
        </div>
        {profile?.bio ? (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{profile.bio}</p>
        ) : null}
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Assigned clients" value={assignments.length} />
        <Metric label="PT sessions" value={sessionCount} />
        <Metric label="This month payout" value={formatInr(payout._sum.totalPaise ?? 0)} />
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassCard>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Assigned clients</h2>
          <div className="mt-4 grid gap-2">
            {assignments.map((assignment) => {
              const member = memberById.get(assignment.memberUserId);
              return (
                <Link
                  key={assignment.id}
                  href={`/dashboard/trainers/${trainerId}/clients/${assignment.memberUserId}`}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3"
                >
                  <p className="font-semibold text-[var(--text-primary)]">{member?.name ?? "Member"}</p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    Assigned {formatDateTime(assignment.createdAt)}
                  </p>
                </Link>
              );
            })}
            {!assignments.length ? (
              <p className="text-sm text-[var(--text-secondary)]">No active client assignments.</p>
            ) : null}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Upcoming classes</h2>
          <div className="mt-4 grid gap-2">
            {upcomingClasses.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3">
                <p className="font-semibold text-[var(--text-primary)]">{entry.name}</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  {formatDateTime(entry.startTime)} · {entry.classType}
                </p>
              </div>
            ))}
            {!upcomingClasses.length ? (
              <p className="text-sm text-[var(--text-secondary)]">No upcoming classes.</p>
            ) : null}
          </div>
        </GlassCard>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <GlassCard>
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{value}</p>
    </GlassCard>
  );
}
