import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

async function createCoachingMember(orgId: string, email: string) {
  const user = await prisma.user.create({
    data: {
      email,
      emailVerifiedAt: new Date(),
      name: email.split("@")[0] ?? "Coaching Member",
    },
  });
  await prisma.organizationUser.create({
    data: { orgId, userId: user.id, status: "active" },
  });
  await prisma.organizationRoleAssignment.create({
    data: { orgId, userId: user.id, role: "MEMBER" },
  });
  return user;
}

async function createCoachingTrainer(orgId: string, email: string, assignedById?: string) {
  const user = await prisma.user.create({
    data: {
      email,
      emailVerifiedAt: new Date(),
      name: email.split("@")[0] ?? "Coaching Trainer",
    },
  });
  await prisma.organizationUser.create({
    data: { orgId, userId: user.id, status: "active" },
  });
  await prisma.organizationRoleAssignment.create({
    data: { orgId, userId: user.id, role: "TRAINER", ...(assignedById ? { assignedById } : {}) },
  });
  return user;
}

test.describe("member coaching actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("member coaching returns null payload when the member has no PT subscription", async ({
    page,
  }) => {
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const member = await createCoachingMember(org.id, `coaching-empty-${Date.now()}@zook.local`);

    await loginWithSessionCookie(page, member.email!);
    const payload = await expectApiOk<{
      subscription: null;
      trainer: null;
      plan: null;
      sessions: [];
    }>(await page.request.get(`/api/me/coaching?orgId=${org.id}`));

    expect(payload.data).toEqual({ subscription: null, trainer: null, plan: null, sessions: [] });
  });

  test("member coaching returns active PT subscription, trainer, plan, and recent sessions", async ({
    page,
  }) => {
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const trainerAssignment = await prisma.organizationRoleAssignment.findFirstOrThrow({
      where: { orgId: org.id, role: "TRAINER" },
    });
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@zook.local" } });
    const member = await createCoachingMember(org.id, `coaching-active-${Date.now()}@zook.local`);
    const plan = await prisma.personalTrainingPlan.create({
      data: {
        orgId: org.id,
        trainerUserId: trainerAssignment.userId,
        name: "Playwright PT Plan",
        description: "Strength and mobility",
        sessionCount: 8,
        pricePaise: 120000,
      },
    });
    const subscription = await prisma.personalTrainingSubscription.create({
      data: {
        orgId: org.id,
        memberUserId: member.id,
        trainerUserId: trainerAssignment.userId,
        ptPlanId: plan.id,
        status: "ACTIVE",
        startsAt: new Date(Date.now() - 24 * 60 * 60_000),
        endsAt: new Date(Date.now() + 29 * 24 * 60 * 60_000),
        totalSessions: 8,
        remainingSessions: 6,
        amountPaise: 120000,
        paymentMode: "CASH",
        recordedById: owner.id,
      },
    });
    const sessionAt = new Date(Date.now() - 60 * 60_000);
    const session = await prisma.personalTrainingSessionLog.create({
      data: {
        orgId: org.id,
        subscriptionId: subscription.id,
        trainerUserId: trainerAssignment.userId,
        memberUserId: member.id,
        sessionAt,
        notes: "Deadlift technique",
      },
    });

    await loginWithSessionCookie(page, member.email!);
    const payload = await expectApiOk<{
      subscription: {
        id: string;
        status: string;
        planName: string | null;
        totalSessions: number | null;
        remainingSessions: number | null;
        amountPaise: number;
        startsAt: string | null;
        endsAt: string | null;
      };
      trainer: { id: string; name: string } | null;
      plan: { id: string; name: string; description: string | null; sessionCount: number | null } | null;
      sessions: Array<{ id: string; sessionAt: string; notes: string | null }>;
    }>(await page.request.get(`/api/me/coaching?orgId=${org.id}`));

    expect(payload.data.subscription).toMatchObject({
      id: subscription.id,
      status: "ACTIVE",
      planName: plan.name,
      totalSessions: 8,
      remainingSessions: 6,
      amountPaise: 120000,
    });
    expect(payload.data.trainer).toMatchObject({ id: trainerAssignment.userId });
    expect(payload.data.plan).toEqual({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      sessionCount: plan.sessionCount,
    });
    expect(payload.data.sessions).toEqual([
      expect.objectContaining({ id: session.id, notes: "Deadlift technique" }),
    ]);
  });

  test("member requests a PT plan and assigned trainer approves it", async ({ page }) => {
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@zook.local" } });
    const member = await createCoachingMember(org.id, `coaching-request-${Date.now()}@zook.local`);
    const trainer = await createCoachingTrainer(
      org.id,
      `coaching-trainer-${Date.now()}@zook.local`,
      owner.id,
    );
    const otherTrainer = await createCoachingTrainer(
      org.id,
      `coaching-other-trainer-${Date.now()}@zook.local`,
      owner.id,
    );
    const plan = await prisma.personalTrainingPlan.create({
      data: {
        orgId: org.id,
        trainerUserId: trainer.id,
        name: "Member Browse PT",
        description: "Visible in org-wide plan browse",
        sessionCount: 6,
        durationDays: 30,
        pricePaise: 900000,
      },
    });

    await loginWithSessionCookie(page, member.email!);
    const browse = await expectApiOk<{
      plans: Array<{ id: string; trainerName: string | null }>;
    }>(await page.request.get(`/api/orgs/${org.id}/pt-plans`));
    expect(browse.data.plans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: plan.id, trainerName: trainer.name }),
      ]),
    );

    const requested = await expectApiOk<{
      subscription: { id: string; status: string; trainerUserId: string; totalSessions: number };
    }>(
      await page.request.post(`/api/me/pt-subscriptions/request?orgId=${org.id}`, {
        data: { ptPlanId: plan.id },
      }),
    );
    expect(requested.data.subscription).toMatchObject({
      status: "PENDING_APPROVAL",
      trainerUserId: trainer.id,
      totalSessions: plan.sessionCount,
    });

    const coaching = await expectApiOk<{
      subscription: { id: string; status: string } | null;
    }>(await page.request.get(`/api/me/coaching?orgId=${org.id}`));
    expect(coaching.data.subscription).toMatchObject({
      id: requested.data.subscription.id,
      status: "PENDING_APPROVAL",
    });

    await loginWithSessionCookie(page, otherTrainer.email!);
    const forbidden = await page.request.post(
      `/api/orgs/${org.id}/pt-subscriptions/${requested.data.subscription.id}/approve`,
    );
    expect(forbidden.status()).toBe(403);

    await loginWithSessionCookie(page, trainer.email!);
    const approved = await expectApiOk<{
      subscription: { id: string; status: string; startsAt: string | null };
    }>(
      await page.request.post(
        `/api/orgs/${org.id}/pt-subscriptions/${requested.data.subscription.id}/approve`,
      ),
    );
    expect(approved.data.subscription).toMatchObject({
      id: requested.data.subscription.id,
      status: "ACTIVE",
    });
    expect(approved.data.subscription.startsAt).toBeTruthy();
  });

  test("member cancellation is owner-scoped and writes an audit log", async ({ page }) => {
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true },
    });
    const plan = await prisma.membershipPlan.findFirstOrThrow({
      where: { orgId: org.id, active: true },
    });
    const member = await createCoachingMember(org.id, `cancel-owner-${Date.now()}@zook.local`);
    const otherMember = await createCoachingMember(
      org.id,
      `cancel-other-${Date.now()}@zook.local`,
    );
    const subscription = await prisma.memberSubscription.create({
      data: {
        orgId: org.id,
        branchId: branch.id,
        memberUserId: member.id,
        planId: plan.id,
        status: "ACTIVE",
        startsAt: new Date(Date.now() - 24 * 60 * 60_000),
        endsAt: new Date(Date.now() + 29 * 24 * 60 * 60_000),
        remainingVisits: 10,
      },
    });

    await loginWithSessionCookie(page, otherMember.email!);
    const notMine = await page.request.post(
      `/api/me/memberships/${subscription.id}/cancel`,
    );
    expect(notMine.status()).toBe(404);

    await loginWithSessionCookie(page, member.email!);
    const cancelled = await expectApiOk<{
      subscription: { id: string; status: string };
    }>(await page.request.post(`/api/me/memberships/${subscription.id}/cancel`));
    expect(cancelled.data.subscription).toMatchObject({
      id: subscription.id,
      status: "CANCELLED",
    });
    await expect(
      prisma.auditLog.findFirst({
        where: {
          orgId: org.id,
          actorUserId: member.id,
          action: "membership.cancelled_by_member",
          entityId: subscription.id,
        },
      }),
    ).resolves.toBeTruthy();
  });
});
