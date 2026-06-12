import { CoachPage as CoachOverviewPage } from "@/components/coach/coach-page";
import { requireDashboardSession } from "@/lib/server-auth";
import { prisma } from "@zook/db";

export const metadata = {
  title: "Coach | Zook",
  robots: { index: false, follow: false },
};

export default async function CoachPage() {
  const session = await requireDashboardSession({
    expectedHost: "dashboard",
    redirectPath: "/coach",
  });
  const firstName = (session.user.name ?? "Coach").trim().split(/\s+/)[0] ?? "Coach";
  const orgId = session.activeOrganization?.orgId ?? session.activeOrgId;

  const assignments = orgId
    ? await prisma.trainerAssignment.findMany({
        where: { orgId, trainerUserId: session.user.id, active: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const memberUserIds = assignments.map((assignment) => assignment.memberUserId);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const progressWindowStart = new Date();
  progressWindowStart.setDate(progressWindowStart.getDate() - 30);

  const [users, profiles, planAssignments, sessionsThisWeek, progressNotes, recentWorkouts] =
    orgId && memberUserIds.length
      ? await Promise.all([
          prisma.user.findMany({
            where: { id: { in: memberUserIds } },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              fitnessGoal: true,
              profilePhotoUrl: true,
            },
          }),
          prisma.memberProfile.findMany({
            where: { orgId, userId: { in: memberUserIds } },
            select: { userId: true, profilePhotoUrl: true, notes: true },
          }),
          prisma.planAssignment.findMany({
            where: { orgId, assignedToUserId: { in: memberUserIds }, active: true },
            select: { assignedToUserId: true },
          }),
          prisma.personalTrainingSessionLog.count({
            where: { orgId, trainerUserId: session.user.id, sessionAt: { gte: weekStart } },
          }),
          prisma.planProgress.count({
            where: {
              orgId,
              userId: { in: memberUserIds },
              feedback: { not: null },
              updatedAt: { gte: progressWindowStart },
            },
          }),
          prisma.workoutSession.findMany({
            where: {
              organizationId: orgId,
              userId: { in: memberUserIds },
              visibility: "TRAINER_VISIBLE",
              deletedAt: null,
            },
            orderBy: { startedAt: "desc" },
            select: { userId: true, title: true, startedAt: true },
            take: Math.max(memberUserIds.length * 2, 4),
          }),
        ])
      : [[], [], [], 0, 0, []] as const;

  const planCountsByMember = new Map<string, number>();
  for (const assignment of planAssignments) {
    if (!assignment.assignedToUserId) continue;
    planCountsByMember.set(
      assignment.assignedToUserId,
      (planCountsByMember.get(assignment.assignedToUserId) ?? 0) + 1,
    );
  }
  const profilesByMember = new Map(profiles.map((profile) => [profile.userId, profile]));
  const workoutsByMember = new Map<string, string>();
  for (const workout of recentWorkouts) {
    if (!workoutsByMember.has(workout.userId)) {
      workoutsByMember.set(
        workout.userId,
        `${workout.title} · ${workout.startedAt.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })}`,
      );
    }
  }

  const stats = {
    assignedClients: assignments.length,
    plansAssigned: planAssignments.length,
    sessionsThisWeek,
    progressNotes,
  };

  const clients = assignments.map((assignment) => {
    const user = users.find((candidate) => candidate.id === assignment.memberUserId);
    const profile = profilesByMember.get(assignment.memberUserId);
    return {
      id: assignment.memberUserId,
      name: user?.name ?? user?.email ?? "Member",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      goal: user?.fitnessGoal ?? "Goal capture pending",
      profilePhotoUrl: profile?.profilePhotoUrl ?? user?.profilePhotoUrl ?? null,
      activePlans: planCountsByMember.get(assignment.memberUserId) ?? 0,
      recentActivity: workoutsByMember.get(assignment.memberUserId) ?? "No recent trainer-visible workout",
    };
  });

  return <CoachOverviewPage firstName={firstName} stats={stats} clients={clients} />;
}
