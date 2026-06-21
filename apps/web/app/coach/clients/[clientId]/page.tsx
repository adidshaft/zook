import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHandoffCard } from "@/components/app-handoff-card";
import { CoachClientWorkspace } from "@/components/coach/coach-client-workspace";
import { GlassCard } from "@/components/glass-card";
import { requireDashboardSession } from "@/lib/server-auth";
import { prisma } from "@zook/db";

export const dynamic = "force-dynamic";

function parseTrainerNote(notes: string | null | undefined) {
  if (!notes) return "";
  try {
    const parsed = JSON.parse(notes) as { trainerNote?: unknown };
    return typeof parsed.trainerNote === "string" ? parsed.trainerNote : "";
  } catch {
    return "";
  }
}

export default async function CoachClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await requireDashboardSession({
    expectedHost: "dashboard",
    redirectPath: "/coach",
  });
  const orgId = session.activeOrganization?.orgId ?? session.activeOrgId;
  if (!orgId) notFound();

  const { clientId } = await params;
  const assignment = await prisma.trainerAssignment.findFirst({
    where: {
      orgId,
      trainerUserId: session.user.id,
      memberUserId: clientId,
      active: true,
    },
  });
  if (!assignment) notFound();

  const [client, profile, bodyEntries, planAssignments, planProgress, workouts] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          fitnessGoal: true,
          dateOfBirth: true,
        },
      }),
      prisma.memberProfile.findUnique({
        where: { orgId_userId: { orgId, userId: clientId } },
        select: { notes: true, profilePhotoUrl: true },
      }),
      prisma.bodyProgressEntry.findMany({
        where: { organizationId: orgId, userId: clientId },
        orderBy: { measuredAt: "desc" },
        take: 5,
      }),
      prisma.planAssignment.findMany({
        where: { orgId, assignedToUserId: clientId, active: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.planProgress.findMany({
        where: {
          orgId,
          userId: clientId,
          OR: [{ feedback: { not: null } }, { completionPct: { gt: 0 } }],
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.workoutSession.findMany({
        where: {
          organizationId: orgId,
          userId: clientId,
          visibility: "TRAINER_VISIBLE",
          deletedAt: null,
        },
        orderBy: { startedAt: "desc" },
        take: 5,
      }),
    ]);

  if (!client) notFound();

  const planRows = planAssignments.length
    ? await prisma.planContent.findMany({
        where: { orgId, id: { in: planAssignments.map((assignment) => assignment.planId) } },
        select: { id: true, title: true, type: true, status: true },
      })
    : [];
  const plansById = new Map(planRows.map((plan) => [plan.id, plan]));
  const displayName = client.name ?? client.email ?? "Member";

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/coach" className="text-sm font-semibold text-[var(--accent)] hover:underline">
          {"<-"} Back to coach
        </Link>
      </div>

      <GlassCard className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
          Client workspace
        </p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              {displayName}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {client.email ?? "No email"} · {client.phone ?? "No phone"} ·{" "}
              {client.fitnessGoal ?? "Goal capture pending"}
            </p>
          </div>
        </div>
      </GlassCard>

      <AppHandoffCard
        title="Coach this client in the Zook app"
        description="Editing diet plans, logging sessions, and assigning workouts are mobile-first trainer flows."
        deepLink={`zook://trainer/clients/${client.id}`}
      />

      <CoachClientWorkspace
        clientId={client.id}
        initialNote={parseTrainerNote(profile?.notes)}
        bodyProgress={bodyEntries.map((entry) => ({
          id: entry.id,
          measuredAt: entry.measuredAt.toISOString(),
          weightKg: entry.weightKg ? Number(entry.weightKg) : null,
          waistCm: entry.waistCm ? Number(entry.waistCm) : null,
          bodyFatPercent: entry.bodyFatPercent ? Number(entry.bodyFatPercent) : null,
          notes: entry.notes,
        }))}
        activePlans={planAssignments.map((assignment) => ({
          id: assignment.id,
          assignedAt: assignment.createdAt.toISOString(),
          title: plansById.get(assignment.planId)?.title ?? "Assigned plan",
          type: plansById.get(assignment.planId)?.type ?? "WORKOUT",
          status: plansById.get(assignment.planId)?.status ?? "PUBLISHED",
        }))}
        recentFeedback={planProgress.map((entry) => ({
          id: entry.id,
          updatedAt: entry.updatedAt.toISOString(),
          completionPct: entry.completionPct,
          feedback: entry.feedback,
        }))}
        recentWorkouts={workouts.map((workout) => ({
          id: workout.id,
          title: workout.title,
          workoutType: workout.workoutType,
          startedAt: workout.startedAt.toISOString(),
          durationMinutes: workout.durationMinutes,
          notes: workout.notes,
        }))}
      />
    </div>
  );
}
