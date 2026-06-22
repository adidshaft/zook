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
});
