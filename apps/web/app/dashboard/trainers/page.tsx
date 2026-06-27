import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { formatDateTime, formatInr } from "@/lib/format";
import { requireDashboardSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function requireTrainerManage(session: Awaited<ReturnType<typeof requireDashboardSession>>) {
  if (!session.activeOrgId || !session.activeOrganization?.permissions.includes("TRAINERS_MANAGE")) {
    redirect("/dashboard");
  }
  return session.activeOrgId;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function TrainersPage() {
  const session = await requireDashboardSession({
    expectedHost: "dashboard",
    redirectPath: "/dashboard/trainers",
  });
  const orgId = requireTrainerManage(session);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const trainerAssignments = await prisma.organizationRoleAssignment.findMany({
    where: { orgId, role: "TRAINER" },
    select: { userId: true },
  });
  const trainerIds = trainerAssignments.map((assignment) => assignment.userId);
  const [users, profiles, assignments, classes, payouts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: trainerIds } }, orderBy: { name: "asc" } }),
    prisma.trainerProfile.findMany({ where: { orgId, userId: { in: trainerIds } } }),
    prisma.trainerAssignment.groupBy({
      by: ["trainerUserId"],
      where: { orgId, trainerUserId: { in: trainerIds }, active: true },
      _count: { _all: true },
    }),
    prisma.class.groupBy({
      by: ["trainerId"],
      where: { orgId, trainerId: { in: trainerIds }, status: "scheduled", startTime: { gte: new Date() } },
      _count: { _all: true },
    }),
    prisma.trainerPayout.groupBy({
      by: ["trainerId"],
      where: { orgId, trainerId: { in: trainerIds }, createdAt: { gte: monthStart } },
      _sum: { totalPaise: true },
    }),
  ]);
  const profileByUser = new Map(profiles.map((profile) => [profile.userId, profile]));
  const clientsByTrainer = new Map(assignments.map((row) => [row.trainerUserId, row._count._all]));
  const classesByTrainer = new Map(classes.map((row) => [row.trainerId, row._count._all]));
  const payoutByTrainer = new Map(payouts.map((row) => [row.trainerId, row._sum.totalPaise ?? 0]));

  return (
    <main className="mx-auto grid max-w-6xl gap-4 p-4 sm:p-6">
      <GlassCard variant="strong">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
          Trainers
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
          Trainer performance
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Review assigned clients, upcoming class load, and this-month payout totals.
        </p>
      </GlassCard>
      <div className="grid gap-3">
        {users.map((trainer) => {
          const profile = profileByUser.get(trainer.id);
          return (
            <Link key={trainer.id} href={`/dashboard/trainers/${trainer.id}`} className="block">
              <GlassCard>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[var(--text-primary)]">{trainer.name}</h2>
                      <Pill>{stringList(profile?.specialties).slice(0, 2).join(", ") || "Trainer"}</Pill>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{trainer.email}</p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      Joined {formatDateTime(trainer.createdAt)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Metric label="Clients" value={clientsByTrainer.get(trainer.id) ?? 0} />
                    <Metric label="Classes" value={classesByTrainer.get(trainer.id) ?? 0} />
                    <Metric label="Payout" value={formatInr(payoutByTrainer.get(trainer.id) ?? 0)} />
                  </div>
                </div>
              </GlassCard>
            </Link>
          );
        })}
        {!users.length ? (
          <GlassCard>
            <p className="text-sm text-[var(--text-secondary)]">No trainers are assigned yet.</p>
          </GlassCard>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-1 font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
