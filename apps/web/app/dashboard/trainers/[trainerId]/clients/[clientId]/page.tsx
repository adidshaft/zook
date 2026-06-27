import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { formatDateTime } from "@/lib/format";
import { requireDashboardSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function displayDecimal(value: unknown) {
  return value && typeof value === "object" && "toString" in value ? value.toString() : String(value ?? "-");
}

export default async function TrainerClientPage({
  params,
}: {
  params: Promise<{ trainerId: string; clientId: string }>;
}) {
  const session = await requireDashboardSession({
    expectedHost: "dashboard",
    redirectPath: "/dashboard/trainers",
  });
  if (!session.activeOrgId || !session.activeOrganization?.permissions.includes("TRAINERS_MANAGE")) {
    redirect("/dashboard");
  }
  const orgId = session.activeOrgId;
  const { trainerId, clientId } = await params;
  const assignment = await prisma.trainerAssignment.findFirst({
    where: { orgId, trainerUserId: trainerId, memberUserId: clientId, active: true },
  });
  if (!assignment) redirect(`/dashboard/trainers/${trainerId}`);
  const [trainer, member, profile, subscription, progress, workouts] = await Promise.all([
    prisma.user.findUnique({ where: { id: trainerId } }),
    prisma.user.findUnique({ where: { id: clientId } }),
    prisma.memberProfile.findUnique({ where: { orgId_userId: { orgId, userId: clientId } } }),
    prisma.memberSubscription.findFirst({
      where: { orgId, memberUserId: clientId, status: { in: ["ACTIVE", "PENDING_PAYMENT"] } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bodyProgressEntry.findMany({
      where: { organizationId: orgId, userId: clientId },
      orderBy: { measuredAt: "desc" },
      take: 5,
    }),
    prisma.workoutSession.findMany({
      where: {
        organizationId: orgId,
        userId: clientId,
        deletedAt: null,
        visibility: "TRAINER_VISIBLE",
      },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
  ]);
  if (!member) redirect(`/dashboard/trainers/${trainerId}`);

  return (
    <main className="mx-auto grid max-w-6xl gap-4 p-4 sm:p-6">
      <GlassCard variant="strong">
        <Link href={`/dashboard/trainers/${trainerId}`} className="text-sm font-semibold text-[var(--accent-strong)]">
          Back to {trainer?.name ?? "trainer"}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{member.name}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{member.email}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill>{subscription?.status ?? "No active membership"}</Pill>
          {profile?.notes ? <Pill>{profile.notes}</Pill> : null}
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Membership</h2>
          <div className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)]">
            <p>Status: <span className="text-[var(--text-primary)]">{subscription?.status ?? "-"}</span></p>
            <p>Ends: <span className="text-[var(--text-primary)]">{subscription?.endsAt ? formatDateTime(subscription.endsAt) : "-"}</span></p>
            <p>Remaining visits: <span className="text-[var(--text-primary)]">{subscription?.remainingVisits ?? "-"}</span></p>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Recent progress</h2>
          <div className="mt-4 grid gap-2">
            {progress.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3">
                <p className="font-semibold text-[var(--text-primary)]">{formatDateTime(entry.measuredAt)}</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Weight {displayDecimal(entry.weightKg)} kg · Body fat {displayDecimal(entry.bodyFatPercent)}%
                </p>
              </div>
            ))}
            {!progress.length ? <p className="text-sm text-[var(--text-secondary)]">No progress entries yet.</p> : null}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Recent workouts</h2>
        <div className="mt-4 grid gap-2">
          {workouts.map((workout) => (
            <div key={workout.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3">
              <p className="font-semibold text-[var(--text-primary)]">{workout.title}</p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                {formatDateTime(workout.startedAt)}
                {workout.durationMinutes ? ` · ${workout.durationMinutes} min` : ""}
              </p>
            </div>
          ))}
          {!workouts.length ? <p className="text-sm text-[var(--text-secondary)]">No trainer-visible workouts yet.</p> : null}
        </div>
      </GlassCard>
    </main>
  );
}
