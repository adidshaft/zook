import { expect, test, type Page } from "@playwright/test";
import { prisma, type Organization, type User } from "@zook/db";
import {
  completeMockCheckout,
  createMembershipPlan,
  expectApiOk,
  loginWithSessionCookie,
  seedAndGetOrg,
} from "./helpers";
import { requireDb, withFreshSeed } from "./helpers/db";
import { runMaestro, type MaestroResult } from "./helpers/maestro";

const ORG_USERNAME = "aarogya-strength";
const OTHER_ORG_USERNAME = "peaklab";
const OPEN_LINK_SCREEN_FLOW = "apps/mobile/.maestro/integration/open-link-screen.yaml";
const OPEN_LINK_ASSERT_FLOW = "apps/mobile/.maestro/integration/open-link-assert.yaml";

type MembershipCheckoutPayload = {
  subscription: { id: string; status: string; couponRedemptionId?: string | null };
  session: { id: string; amountPaise: number };
};

type QrTokenPayload = {
  qrPayload: string;
  checkInCode: string;
  expiresAt: string;
};

function uniqueSuffix() {
  return `${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
}

test.setTimeout(150_000);
test.describe.configure({ mode: "serial" });

test.describe("cross-system integration scenarios", () => {
  test.beforeEach(async () => {
    requireDb();
    await withFreshSeed();
    await expectMobileBackendHealthy();
  });

  test("member join request on iOS can be approved on web and activated for mobile", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await getPrimaryOrg();
    await setJoinMode(org, "APPROVAL_REQUIRED");
    const planName = `Phase3 Approval ${uniqueSuffix()}`;
    const plan = await createMembershipPlan(page, org.id, {
      name: planName,
      pricePaise: 149900,
      publicVisible: true,
    });

    await expectMaestroPassed(
      await runMaestro("apps/mobile/.maestro/integration/member-join-request.yaml", {
        email: "prospect@zook.local",
        home_id: "onboarding-role-question-screen",
        username: ORG_USERNAME,
      }),
    );

    const prospect = await prisma.user.findUniqueOrThrow({
      where: { email: "prospect@zook.local" },
    });
    const joinRequest = await prisma.membershipJoinRequest.findFirstOrThrow({
      where: { orgId: org.id, userId: prospect.id, status: "pending" },
      orderBy: { createdAt: "desc" },
    });

    await loginWithSessionCookie(page, "owner@zook.local");
    await expectApiOk(
      await page.request.post(`/api/orgs/${org.id}/join-requests/${joinRequest.id}/approve`),
    );
    await page.goto("/dashboard/members");
    await expect(page.getByRole("heading", { name: /Members/i })).toBeVisible();

    await buyMembership(page, prospect.email!, org, plan.id);
    await expectMaestroPassed(
      await runOpenLinkAssert({
        email: prospect.email!,
        home_id: "member-home-screen",
        link: "zook:///",
        screen_id: "member-home-screen",
        expected_text: "Active Membership",
      }),
    );

    await expect(
      prisma.memberSubscription.findFirst({
        where: { orgId: org.id, memberUserId: prospect.id, status: "ACTIVE", planId: plan.id },
      }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.auditLog.findFirst({
        where: {
          orgId: org.id,
          actorUserId: (await getOwner()).id,
          action: "membership_join_request.approved",
        },
      }),
    ).resolves.toBeTruthy();
  });

  test("owner publishes a plan, member buys it, and web reports include the revenue", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await getPrimaryOrg();
    await setJoinMode(org, "OPEN_JOIN");
    const planName = `Phase3 Revenue ${uniqueSuffix()}`;
    const plan = await createMembershipPlan(page, org.id, {
      name: planName,
      pricePaise: 299900,
      publicVisible: true,
    });

    const prospect = await prisma.user.findUniqueOrThrow({
      where: { email: "prospect@zook.local" },
    });
    await buyMembership(page, prospect.email!, org, plan.id);
    await expectMaestroPassed(
      await runOpenLinkAssert({
        email: prospect.email!,
        home_id: "member-home-screen",
        link: "zook:///",
        screen_id: "member-home-screen",
        expected_text: "Active Membership",
      }),
    );

    await loginWithSessionCookie(page, "owner@zook.local");
    await page.goto("/dashboard/reports");
    await expect(page.getByRole("heading", { name: /Reports/i })).toBeVisible({ timeout: 20_000 });
    const revenue = await prisma.payment.aggregate({
      where: { orgId: org.id, status: "SUCCEEDED", amountPaise: 299900 },
      _sum: { amountPaise: true },
    });
    expect(revenue._sum.amountPaise).toBe(299900);
  });

  test("owner QR generation can be scanned by member and appears in attendance", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await getPrimaryOrg();
    const member = await ensureMemberCanScan("member@zook.local", org);

    const qr = await expectApiOk<QrTokenPayload>(
      await page.request.post(`/api/orgs/${org.id}/attendance/qr-token`),
    );
    await expectMaestroPassed(
      await runOpenLinkScreen({
        email: member.email!,
        home_id: "member-home-screen",
        link: "zook:///scan",
        screen_id: "scan-screen",
      }),
    );

    await loginWithSessionCookie(page, member.email!);
    const scan = await expectApiOk<{ status: string }>(
      await page.request.post("/api/attendance/scan", {
        data: { qrPayload: qr.data.qrPayload, deviceId: `phase3-ios-${Date.now()}` },
      }),
    );
    expect(scan.data.status).toBe("APPROVED");

    await loginWithSessionCookie(page, "owner@zook.local");
    await page.goto("/dashboard/attendance");
    await expect(page.getByRole("heading", { name: /Attendance/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      prisma.attendanceRecord.findFirst({
        where: { orgId: org.id, userId: member.id, source: "QR_SCAN", status: "APPROVED" },
        orderBy: { createdAt: "desc" },
      }),
    ).resolves.toBeTruthy();
  });

  test("mobile shop checkout can be fulfilled from the reception surface", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await getPrimaryOrg();
    const product = await expectApiOk<{ product: { id: string; stock: number } }>(
      await page.request.post(`/api/orgs/${org.id}/products`, {
        data: {
          name: `Phase3 Pickup ${uniqueSuffix()}`,
          category: "SHAKER",
          pricePaise: 39900,
          stock: 5,
          lowStockThreshold: 1,
          active: true,
        },
      }),
    );
    expect(product.data.product.stock).toBe(5);

    const startedAt = new Date();
    await expectMaestroPassed(
      await runMaestro("apps/mobile/.maestro/integration/member-shop-checkout.yaml", {
        email: "member@zook.local",
      }),
    );

    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const order = await prisma.shopOrder.findFirstOrThrow({
      where: { orgId: org.id, userId: member.id, createdAt: { gte: startedAt } },
      orderBy: { createdAt: "desc" },
    });
    expect(order.status).toBe("READY_FOR_PICKUP");

    await loginWithSessionCookie(page, "reception@zook.local");
    await expectApiOk(
      await page.request.post(`/api/orgs/${org.id}/shop/orders/${order.id}/fulfill`, {
        data: { pickupCodeSkipped: true, skipReason: "Verified in Phase 3 integration" },
      }),
    );
    await expectMaestroPassed(
      await runOpenLinkScreen({
        email: "member@zook.local",
        home_id: "member-home-screen",
        link: "zook:///shop",
        screen_id: "shop-shop-screen",
      }),
    );

    await expect(prisma.shopOrder.findUnique({ where: { id: order.id } })).resolves.toMatchObject({
      status: "FULFILLED",
    });
    await expect(
      prisma.notification.findFirst({
        where: { orgId: org.id, metadata: { path: ["shopOrderId"], equals: order.id } },
      }),
    ).resolves.toBeTruthy();
  });

  test("trainer draft assignment on web appears for the member on mobile", async ({ page }) => {
    await loginWithSessionCookie(page, "trainer@zook.local");
    const org = await getPrimaryOrg();
    const trainer = await prisma.user.findUniqueOrThrow({ where: { email: "trainer@zook.local" } });
    const assignment = await prisma.trainerAssignment.findFirstOrThrow({
      where: { orgId: org.id, trainerUserId: trainer.id, active: true },
    });
    const title = `P3-${uniqueSuffix()}`;
    const notificationTitle = `New plan assigned: ${title}`;

    const draft = await expectApiOk<{ plan: { id: string; reviewed: boolean } }>(
      await page.request.post(`/api/orgs/${org.id}/plans`, {
        data: {
          title,
          type: "WORKOUT",
          visibility: "assigned",
          content: {
            days: [{ name: "Day 1", exercises: [{ name: "Squat", sets: "3", reps: "8" }] }],
          },
        },
      }),
    );
    expect(draft.data.plan.reviewed).toBe(false);
    await expectApiOk(
      await page.request.post(`/api/orgs/${org.id}/plans/${draft.data.plan.id}/review`),
    );
    await expectApiOk(
      await page.request.post(`/api/orgs/${org.id}/plans/${draft.data.plan.id}/assign`, {
        data: { assignedToUserId: assignment.memberUserId, audience: "selected_member" },
      }),
    );

    const member = await prisma.user.findUniqueOrThrow({ where: { id: assignment.memberUserId } });
    await expectMaestroPassed(
      await runOpenLinkAssert({
        email: member.email!,
        home_id: "member-home-screen",
        link: "zook:///notifications",
        screen_id: "notifications-screen",
        expected_text: notificationTitle,
      }),
    );
    await expect(
      prisma.notification.findFirst({
        where: { orgId: org.id, title: notificationTitle },
      }),
    ).resolves.toBeTruthy();
  });

  test("web coupon is applied to mobile-backed checkout math", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await getPrimaryOrg();
    await setJoinMode(org, "OPEN_JOIN");
    const plan = await createMembershipPlan(page, org.id, {
      name: `Phase3 Coupon ${uniqueSuffix()}`,
      pricePaise: 300000,
      publicVisible: true,
    });
    const couponCode = `SAVE30${Date.now().toString().slice(-5)}`;
    await expectApiOk(
      await page.request.post(`/api/orgs/${org.id}/coupons`, {
        data: {
          code: couponCode,
          type: "PERCENTAGE",
          valuePercentBps: 3000,
          maxRedemptions: 20,
          applicablePlanId: plan.id,
        },
      }),
    );

    const checkout = await buyMembership(page, "prospect@zook.local", org, plan.id, {
      couponCode,
    });
    expect(checkout.session.amountPaise).toBe(210000);
    await expectMaestroPassed(
      await runOpenLinkAssert({
        email: "prospect@zook.local",
        home_id: "member-home-screen",
        link: "zook:///",
        screen_id: "member-home-screen",
        expected_text: plan.name,
      }),
    );

    await expect(
      prisma.couponRedemption.findFirst({
        where: { orgId: org.id, paymentSessionId: checkout.session.id, discountPaise: 90000 },
      }),
    ).resolves.toBeTruthy();
  });

  test("web notification broadcast appears in the mobile notifications inbox", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await getPrimaryOrg();
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const title = `Phase3 Holiday ${uniqueSuffix()}`;
    const notification = await expectApiOk<{
      notification: { id: string };
      recipientCount: number;
    }>(
      await page.request.post(`/api/orgs/${org.id}/notifications`, {
        data: {
          title,
          body: "Holiday hours updated for the pilot group.",
          type: "OPERATIONAL",
          audience: "selected_members",
          selectedUserIds: [member.id],
          pushEnabled: false,
        },
      }),
    );
    expect(notification.data.recipientCount).toBe(1);

    await expectMaestroPassed(
      await runOpenLinkAssert({
        email: member.email!,
        home_id: "member-home-screen",
        link: "zook:///notifications",
        screen_id: "notifications-screen",
        expected_text: title,
      }),
    );
    await expect(
      prisma.notificationRecipient.findUnique({
        where: {
          notificationId_userId: {
            notificationId: notification.data.notification.id,
            userId: member.id,
          },
        },
      }),
    ).resolves.toBeTruthy();
  });

  test("web referral generation can be redeemed by a mobile prospect", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await getPrimaryOrg();
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const code = `P3REF${uniqueSuffix().toUpperCase()}`;
    const referral = await expectApiOk<{ referral: { id: string; code: string } }>(
      await page.request.post(`/api/orgs/${org.id}/referrals`, {
        data: {
          referrerUserId: member.id,
          code,
          createdByRole: "OWNER",
          displayName: "Phase 3 referral",
        },
      }),
    );
    expect(referral.data.referral.code).toBe(code);

    await expectMaestroPassed(
      await runOpenLinkAssert({
        email: "prospect@zook.local",
        home_id: "onboarding-role-question-screen",
        link: `zook:///r/${code}`,
        screen_id: "find-gyms-screen",
        expected_text: "Referral code applied",
      }),
    );

    await loginWithSessionCookie(page, "prospect@zook.local");
    await expectApiOk(await page.request.post(`/api/referrals/${code}/redeem`));
    await expect(
      prisma.referralRedemption.findFirst({
        where: { orgId: org.id, referralCodeId: referral.data.referral.id },
      }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.referralCode.findUnique({ where: { id: referral.data.referral.id } }),
    ).resolves.toMatchObject({ redemptionCount: 1 });
  });

  test("tenant boundaries reject cross-org resource reads and mutations across surfaces", async ({
    page,
  }) => {
    const org = await getPrimaryOrg();
    const otherOrg = await seedAndGetOrg({ username: OTHER_ORG_USERNAME });
    const isolatedOwnerEmail = await createIsolatedOwner(org.id);
    await loginWithSessionCookie(page, isolatedOwnerEmail);

    const forbiddenRead = await page.request.get(`/api/orgs/${otherOrg.id}/members`);
    expect([403, 404]).toContain(forbiddenRead.status());
    const forbiddenMutation = await page.request.post(`/api/orgs/${otherOrg.id}/products`, {
      data: {
        name: `Cross tenant ${uniqueSuffix()}`,
        category: "OTHER",
        pricePaise: 1000,
        stock: 1,
      },
    });
    expect([403, 404]).toContain(forbiddenMutation.status());

    await expectMaestroPassed(
      await runOpenLinkScreen({
        email: "member@zook.local",
        home_id: "member-home-screen",
        link: `zook:///gym/${ORG_USERNAME}`,
        screen_id: "gym-profile-screen",
      }),
    );
    await expect(
      prisma.product.findFirst({
        where: { orgId: otherOrg.id, name: { startsWith: "Cross tenant" } },
      }),
    ).resolves.toBeNull();
    expect(org.id).not.toBe(otherOrg.id);
  });
});

async function getPrimaryOrg() {
  return seedAndGetOrg({ username: ORG_USERNAME });
}

async function expectMobileBackendHealthy() {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await fetch("http://127.0.0.1:3000/api/auth/sessions").catch(() => null);
    lastStatus = response?.status ?? 0;
    if (lastStatus === 401) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  expect(lastStatus).toBe(401);
}

async function getOwner() {
  return prisma.user.findUniqueOrThrow({ where: { email: "owner@zook.local" } });
}

async function createIsolatedOwner(orgId: string) {
  const suffix = uniqueSuffix();
  const user = await prisma.user.create({
    data: {
      email: `phase3-tenant-owner-${suffix}@zook.local`,
      name: "Phase 3 Tenant Owner",
    },
  });
  await prisma.organizationUser.create({
    data: { orgId, userId: user.id },
  });
  await prisma.organizationRoleAssignment.create({
    data: { orgId, userId: user.id, role: "OWNER" },
  });
  return user.email!;
}

async function setJoinMode(org: Organization, joinMode: Organization["joinMode"]) {
  await prisma.organization.update({
    where: { id: org.id },
    data: { joinMode, status: "ACTIVE", visibility: "PUBLIC" },
  });
}

async function buyMembership(
  page: Page,
  email: string,
  org: Organization,
  planId: string,
  extras: { couponCode?: string; referralCode?: string } = {},
) {
  await loginWithSessionCookie(page, email);
  const checkout = await expectApiOk<MembershipCheckoutPayload>(
    await page.request.post(`/api/orgs/${org.id}/subscriptions`, {
      data: { planId, ...extras },
    }),
  );
  await completeMockCheckout(page, checkout.data.session.id);
  return checkout.data;
}

async function ensureMemberCanScan(email: string, org: Organization): Promise<User> {
  const member = await prisma.user.findUniqueOrThrow({ where: { email } });
  const branch = await prisma.branch.findFirstOrThrow({ where: { orgId: org.id } });
  const plan = await prisma.membershipPlan.findFirstOrThrow({
    where: { orgId: org.id, active: true },
    orderBy: { createdAt: "asc" },
  });
  const subscription = await prisma.memberSubscription.findFirst({
    where: { orgId: org.id, memberUserId: member.id, status: "ACTIVE" },
  });
  if (!subscription) {
    await prisma.memberSubscription.create({
      data: {
        orgId: org.id,
        branchId: branch.id,
        memberUserId: member.id,
        planId: plan.id,
        status: "ACTIVE",
        startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        remainingVisits: 12,
        activatedById: (await getOwner()).id,
      },
    });
  }
  const profilePhotoUrl = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400";
  await prisma.user.update({ where: { id: member.id }, data: { profilePhotoUrl } });
  await prisma.memberProfile.upsert({
    where: { orgId_userId: { orgId: org.id, userId: member.id } },
    update: { profilePhotoUrl },
    create: {
      orgId: org.id,
      userId: member.id,
      profilePhotoUrl,
    },
  });
  return member;
}

function runOpenLinkScreen(env: Record<string, string>) {
  return runMaestro(OPEN_LINK_SCREEN_FLOW, env);
}

function runOpenLinkAssert(env: Record<string, string>) {
  return runMaestro(OPEN_LINK_ASSERT_FLOW, env);
}

async function expectMaestroPassed(result: MaestroResult) {
  expect(result.exitCode, [result.stdout, result.stderr].filter(Boolean).join("\n")).toBe(0);
}
