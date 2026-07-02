import { zookDemoFixtures } from "@zook/core/demo-fixtures";

function nowIso() {
  return new Date().toISOString();
}

function activeOrg() {
  return zookDemoFixtures.organizations[0];
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

function activeTrainingPlan() {
  return (
    zookDemoFixtures.trainingPlans.find((plan) => plan.id === "plan-push-day") ??
    zookDemoFixtures.trainingPlans[0] ??
    null
  );
}

function demoPlanAssignments() {
  return zookDemoFixtures.trainingPlans.map((trainingPlan) => ({
    id: trainingPlan.id,
    orgId: trainingPlan.orgId,
    planId: trainingPlan.id,
    assignedById: trainingPlan.trainerUserId,
    assignedToUserId: trainingPlan.memberUserId,
    audience: "selected_member",
    active: true,
    createdAt: nowIso(),
    plan: {
      id: trainingPlan.id,
      orgId: trainingPlan.orgId,
      creatorUserId: trainingPlan.trainerUserId,
      type: trainingPlan.type,
      title: trainingPlan.title,
      description: trainingPlan.durationLabel,
      content: { exercises: trainingPlan.exercises },
      aiGenerated: trainingPlan.aiGenerated,
      reviewed: trainingPlan.reviewed,
      status: trainingPlan.status,
      visibility: "assigned",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    progress: {
      id: `${trainingPlan.id}-progress`,
      orgId: trainingPlan.orgId,
      assignmentId: trainingPlan.id,
      userId: trainingPlan.memberUserId,
      progressJson: {
        completedExercises: trainingPlan.exercises.slice(0, 2).map((exercise) => exercise.name),
      },
      completionPct: 33,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  }));
}

type DemoWorkoutPlan = {
  id: string;
  orgId: string;
  creatorUserId: string | null;
  type: string;
  title: string;
  description: string | null;
  content: Record<string, unknown>;
  aiGenerated: boolean;
  reviewed: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const demoWorkoutPlans: DemoWorkoutPlan[] = zookDemoFixtures.trainingPlans.map((plan) => ({
  id: plan.id,
  orgId: plan.orgId,
  creatorUserId: plan.trainerUserId ?? null,
  type: plan.type,
  title: plan.title,
  description: plan.durationLabel ?? null,
  content: { exercises: plan.exercises },
  aiGenerated: plan.aiGenerated ?? false,
  reviewed: plan.reviewed ?? false,
  status: plan.status ?? "ACTIVE",
  createdAt: nowIso(),
  updatedAt: nowIso(),
}));


export function plansDemoResponse(pathname: string, method: string, init: { body?: unknown }) {
  if (pathname === "/me/plans") return { plans: demoPlanAssignments() };

  if (pathname.match(/^\/me\/plans\/[^/]+\/exercises$/)) {
    const assignmentId = pathname.split("/")[3];
    const assignment =
      demoPlanAssignments().find((candidate) => candidate.id === assignmentId) ??
      demoPlanAssignments()[0];
    const planRecord =
      zookDemoFixtures.trainingPlans.find((candidate) => candidate.id === assignment?.planId) ??
      activeTrainingPlan();
    return {
      assignment,
      plan: assignment?.plan ?? null,
      progress: assignment?.progress ?? null,
      exercises: (planRecord?.exercises ?? []).map((exercise, index) => ({
        ...exercise,
        id: `${planRecord?.id ?? "plan"}-${index}`,
        orderIndex: index,
        completed: false,
      })),
    };
  }

  if (pathname.match(/^\/me\/plans\/[^/]+\/complete$/)) {
    const body = (init.body ?? {}) as { exercises?: Array<{ completed?: boolean }> };
    const completed = body.exercises?.filter((exercise) => exercise.completed).length ?? 0;
    const total = Math.max(body.exercises?.length ?? completed, 1);
    return {
      progress: { completionPct: Math.round((completed / total) * 100), progressJson: init.body ?? {} },
      completedExercises: [],
    };
  }

  if (pathname.match(/^\/orgs\/[^/]+\/plan-feedback$/)) {
    return { ok: true };
  }

  {
    const planAssignMatch = pathname.match(/^\/orgs\/[^/]+\/plans\/([^/]+)\/assign$/);
    if (planAssignMatch && method === "POST") {
      const plan = demoWorkoutPlans.find((p) => p.id === planAssignMatch[1]);
      return {
        assignment: {
          id: `assign-${Date.now()}`,
          planId: planAssignMatch[1],
          plan: plan ?? null,
          active: true,
          createdAt: nowIso(),
        },
      };
    }
  }

  {
    const planReviewMatch = pathname.match(/^\/orgs\/[^/]+\/plans\/([^/]+)\/review$/);
    if (planReviewMatch && method === "POST") {
      const plan = demoWorkoutPlans.find((p) => p.id === planReviewMatch[1]);
      if (plan) plan.reviewed = true;
      return { plan: plan ?? { id: planReviewMatch[1], reviewed: true } };
    }
  }

  {
    const planEditMatch = pathname.match(/^\/orgs\/[^/]+\/plans\/([^/]+)$/);
    if (planEditMatch) {
      if (method === "DELETE") {
        const idx = demoWorkoutPlans.findIndex((p) => p.id === planEditMatch[1]);
        if (idx >= 0) demoWorkoutPlans.splice(idx, 1);
        return { ok: true };
      }
      if (method === "PATCH" || method === "PUT") {
        const idx = demoWorkoutPlans.findIndex((p) => p.id === planEditMatch[1]);
        const body = demoBody(init);
        const updated = idx >= 0
          ? Object.assign(demoWorkoutPlans[idx]!, body, { updatedAt: nowIso() })
          : { id: planEditMatch[1], ...body };
        if (idx >= 0) demoWorkoutPlans[idx] = updated as DemoWorkoutPlan;
        return { plan: updated };
      }
    }
  }

  if (pathname.match(/^\/orgs\/[^/]+\/plans$/)) {
    if (method === "POST") {
      const body = demoBody(init);
      const plan: DemoWorkoutPlan = {
        id: `plan-${Date.now()}`,
        orgId: activeOrg()?.id ?? "org-demo",
        creatorUserId: null,
        type: String(body.type ?? "WORKOUT"),
        title: String(body.title ?? "New plan"),
        description: body.description ? String(body.description) : null,
        content: (body.content as Record<string, unknown>) ?? {},
        aiGenerated: Boolean(body.aiGenerated ?? false),
        reviewed: false,
        status: "DRAFT",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      demoWorkoutPlans.unshift(plan);
      return { plan };
    }
    return { plans: demoWorkoutPlans };
  }

  return undefined;
}
