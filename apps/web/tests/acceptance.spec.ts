import { test, expect } from "@playwright/test";
import { prisma } from "@zook/db";
import {
  completeMockCheckout,
  createMembershipPlan,
  expectApiOk,
  findLatestAuditLog,
  loginWithOtp,
  loginWithSessionCookie,
  seedAndGetOrg
} from "./helpers";

function requireDb() {
  if (process.env.RUN_DB_WEB_TESTS !== "1") {
    test.skip(true, "DB-gated tests run only when RUN_DB_WEB_TESTS=1.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "RUN_DB_WEB_TESTS=1 was set, but DATABASE_URL is missing from the Playwright environment. Create `.env.test.local` or `.env.test`, then rerun `pnpm test:db:prepare` and `RUN_DB_WEB_TESTS=1 pnpm test:web`.",
    );
  }
}

function todayWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

test("dashboard routes redirect unauthenticated users to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole("heading", { name: "Sign in to Zook" })).toBeVisible();
});

test("mock checkout page renders", async ({ page }) => {
  await page.goto("/checkout/mock/demo");
  await expect(page.getByText("Zook mock checkout")).toBeVisible();
});

test("QR display route is protected by the same auth guard", async ({ page }) => {
  await page.goto("/dashboard/attendance/qr-display");
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole("heading", { name: "Sign in to Zook" })).toBeVisible();
});

test("public gym and referral fallbacks render", async ({ page }) => {
  await page.goto("/g/iron-house");
  await expect(page.getByRole("heading", { name: "Iron House Fitness" })).toBeVisible();
  await page.goto("/r/NISHAFIT");
  await expect(page.getByText("Open Zook to join this gym")).toBeVisible();
});

test("owner login and membership plan creation use the live auth and api path", async ({ page }) => {
  requireDb();
  await loginWithOtp(page, "owner@zook.local");
  await expect(page).toHaveURL(/dashboard/);

  const orgsResponse = await page.request.get("/api/me/orgs");
  const orgsPayload = await expectApiOk<{
    activeOrgId?: string;
    organizations?: Array<{ orgId: string }>;
  }>(orgsResponse);
  const activeOrgId = orgsPayload.data?.activeOrgId ?? orgsPayload.data?.organizations?.[0]?.orgId;
  expect(activeOrgId).toBeTruthy();

  await createMembershipPlan(page, String(activeOrgId), {
    name: "Playwright Plan"
  });
});

test("default branch scope is explicit for plans, dashboard filters, and QR tokens", async ({ page }) => {
  requireDb();
  await loginWithSessionCookie(page, "owner@zook.local");

  const org = await seedAndGetOrg({ username: "iron-house" });
  const defaultBranch = await prisma.branch.findFirstOrThrow({
    where: { orgId: org.id, isDefault: true }
  });
  const secondaryBranch = await prisma.branch.create({
    data: {
      orgId: org.id,
      name: `Playwright Secondary ${Date.now()}`,
      address: org.address,
      city: org.city,
      state: org.state,
      pincode: org.pincode,
      active: true
    }
  });
  const otherOrg = await seedAndGetOrg({ username: "peaklab" });
  const otherOrgBranch = await prisma.branch.findFirstOrThrow({
    where: { orgId: otherOrg.id, isDefault: true }
  });

  const plan = await createMembershipPlan(page, org.id, {
    name: `Playwright Default Branch Plan ${Date.now()}`
  });
  expect(plan?.branchId).toBe(defaultBranch.id);

  const [defaultUser, secondaryUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: `branch-default-${Date.now()}@zook.local`,
        name: "Branch Default Member"
      }
    }),
    prisma.user.create({
      data: {
        email: `branch-secondary-${Date.now()}@zook.local`,
        name: "Branch Secondary Member"
      }
    })
  ]);
  const dateKey = new Date().toISOString().slice(0, 10);
  await prisma.attendanceRecord.createMany({
    data: [
      {
        orgId: org.id,
        branchId: defaultBranch.id,
        userId: defaultUser.id,
        dateKey,
        status: "APPROVED"
      },
      {
        orgId: org.id,
        branchId: secondaryBranch.id,
        userId: secondaryUser.id,
        dateKey,
        status: "APPROVED"
      }
    ]
  });
  const expectedDefaultBranchAttendance = await prisma.attendanceRecord.count({
    where: { orgId: org.id, branchId: defaultBranch.id, checkedInAt: { gte: todayWindow() } }
  });

  const dashboardPayload = await expectApiOk<{
    branchScope: {
      selectedBranch: { id: string; name: string; isDefault: boolean };
      inventoryScope: "ORG_WIDE";
    };
    summary: { todayAttendance: number };
  }>(await page.request.get(`/api/orgs/${org.id}/dashboard?branchId=${defaultBranch.id}`));
  expect(dashboardPayload.data.branchScope.selectedBranch.id).toBe(defaultBranch.id);
  expect(dashboardPayload.data.branchScope.selectedBranch.isDefault).toBe(true);
  expect(dashboardPayload.data.branchScope.inventoryScope).toBe("ORG_WIDE");
  expect(dashboardPayload.data.summary.todayAttendance).toBe(expectedDefaultBranchAttendance);

  const wrongOrgBranchResponse = await page.request.get(
    `/api/orgs/${org.id}/dashboard?branchId=${otherOrgBranch.id}`,
  );
  expect(wrongOrgBranchResponse.status()).toBe(404);

  await expectApiOk(await page.request.post(`/api/orgs/${org.id}/attendance/qr-token`));
  const qrToken = await prisma.attendanceQrToken.findFirstOrThrow({
    where: { orgId: org.id },
    orderBy: { issuedAt: "desc" }
  });
  expect(qrToken.branchId).toBe(defaultBranch.id);
});

test("member join request and tracking workout creation persist through api routes", async ({ page }) => {
  requireDb();
  const email = `playwright-join-${Date.now()}@zook.local`;
  await loginWithOtp(page, email);

  const peaklabProfile = await page.request.get("/api/orgs/public/peaklab");
  const peaklabPayload = await expectApiOk<{
    org: { id: string };
    plans: Array<{ id: string }>;
  }>(peaklabProfile);
  const peaklabOrgId = peaklabPayload.data.org.id as string;
  const peaklabPlanId = peaklabPayload.data.plans[0]?.id as string | undefined;

  const joinResponse = await page.request.post(`/api/orgs/${peaklabOrgId}/join-requests`, {
    data: {
      ...(peaklabPlanId ? { planId: peaklabPlanId } : {})
    }
  });
  await expectApiOk(joinResponse);

  const trackingResponse = await page.request.post("/api/me/tracking/workouts", {
    data: {
      title: "Playwright workout",
      workoutType: "strength",
      startedAt: new Date().toISOString(),
      endedAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      notes: "Created during acceptance coverage",
      exercises: [
        {
          exerciseName: "Goblet squat",
          orderIndex: 0,
          setsCompleted: 3,
          reps: 10,
          weightKg: 24,
          completed: true
        }
      ]
    }
  });
  await expectApiOk(trackingResponse);
});

test("public gym profile hides trainers not visible to members", async ({ page }) => {
  requireDb();
  const org = await seedAndGetOrg({ username: "iron-house" });
  const trainerRole = await prisma.organizationRoleAssignment.findFirstOrThrow({
    where: { orgId: org.id, role: "TRAINER" }
  });
  await prisma.trainerProfile.upsert({
    where: { orgId_userId: { orgId: org.id, userId: trainerRole.userId } },
    create: {
      orgId: org.id,
      userId: trainerRole.userId,
      bio: "Hidden public profile",
      visibleToMembers: false
    },
    update: {
      bio: "Hidden public profile",
      visibleToMembers: false
    }
  });

  const response = await page.request.get(`/api/orgs/public/${org.username}`);
  const payload = await expectApiOk<{ trainers: Array<{ userId: string; visibleToMembers: boolean }> }>(response);
  expect(payload.data.trainers.some((trainer) => trainer.userId === trainerRole.userId)).toBe(false);
});

test("public join page honors backend join mode instead of query overrides", async ({ page }) => {
  requireDb();
  const org = await seedAndGetOrg({ username: "iron-house" });
  await prisma.organization.update({
    where: { id: org.id },
    data: { joinMode: "APPROVAL_REQUIRED" }
  });

  await page.goto(`/join/${org.username}?mode=OPEN_JOIN`);
  await expect(page.getByRole("heading", { name: "Approval required" })).toBeVisible();
  await expect(page.getByText("Join request submitted")).toHaveCount(0);
  await expect(page.getByText("Hosted checkout handoff")).toHaveCount(0);
});

test("referral creation returns username-based web links", async ({ page }) => {
  requireDb();
  await loginWithSessionCookie(page, "member@zook.local");
  const org = await seedAndGetOrg({ username: "iron-house" });

  const response = await page.request.post(`/api/orgs/${org.id}/referrals`);
  const payload = await expectApiOk<{
    referral: { code: string };
    links: { web: string; short: string };
  }>(response);

  expect(payload.data.links.web).toBe(`/join/${org.username}?ref=${payload.data.referral.code}`);
  expect(payload.data.links.short).toBe(`/r/${payload.data.referral.code}`);
});

test("open join checkout activates membership and shop order success stays server-backed", async ({ page }) => {
  requireDb();
  const email = `playwright-shop-${Date.now()}@zook.local`;
  await loginWithOtp(page, email);

  const gymResponse = await page.request.get("/api/orgs/public/iron-house");
  const gymPayload = await expectApiOk<{
    org: { id: string };
    plans: Array<{ id: string }>;
  }>(gymResponse);
  const orgId = gymPayload.data.org.id as string;
  const planId = gymPayload.data.plans[0]?.id as string | undefined;
  expect(planId).toBeTruthy();
  await prisma.organization.update({
    where: { id: orgId },
    data: { joinMode: "OPEN_JOIN" }
  });

  const checkoutResponse = await page.request.post(`/api/orgs/${orgId}/subscriptions`, {
    data: { planId }
  });
  const checkoutPayload = await expectApiOk<{ session: { id: string } }>(checkoutResponse);
  const sessionId = String(checkoutPayload.data.session.id);

  await completeMockCheckout(page, sessionId);
  await completeMockCheckout(page, sessionId);
  await expect(
    prisma.payment.count({
      where: { sessionId }
    }),
  ).resolves.toBe(1);

  const membershipsResponse = await page.request.get("/api/me/memberships");
  const membershipsPayload = await expectApiOk<{
    subscriptions: Array<{ status: string; orgId: string }>;
  }>(membershipsResponse);
  expect(
    membershipsPayload.data.subscriptions.some((subscription: { status: string; orgId: string }) => subscription.status === "ACTIVE" && subscription.orgId === orgId),
  ).toBe(true);

  const productsResponse = await page.request.get(`/api/orgs/${orgId}/products`);
  const productsPayload = await expectApiOk<{ products: Array<{ id: string }> }>(productsResponse);
  const productId = productsPayload.data.products[0]?.id as string | undefined;
  expect(productId).toBeTruthy();

  const orderResponse = await page.request.post("/api/shop/orders", {
    data: {
      orgId,
      items: [{ productId, quantity: 1 }]
    }
  });
  const orderPayload = await expectApiOk<{ order: { paymentSessionId?: string | null }; checkoutUrl: string }>(orderResponse);
  const orderSessionId = String(orderPayload.data.order.paymentSessionId ?? orderPayload.data.checkoutUrl.split("/").pop());

  await completeMockCheckout(page, orderSessionId);
  await completeMockCheckout(page, orderSessionId);
  await expect(
    prisma.payment.count({
      where: { sessionId: orderSessionId }
    }),
  ).resolves.toBe(1);

  const ordersResponse = await page.request.get("/api/me/shop-orders");
  const ordersPayload = await expectApiOk<{
    orders: Array<{ id: string; orgId: string; status: string; pickupCode?: string | null }>;
  }>(ordersResponse);
  const readyOrder = ordersPayload.data.orders.find(
    (order) => order.orgId === orgId && order.status === "READY_FOR_PICKUP" && order.pickupCode,
  );
  expect(readyOrder).toBeTruthy();

  await loginWithSessionCookie(page, "reception@zook.local");
  const verifyPayload = await expectApiOk<{
    match: { type: string; valid: boolean; order?: { id: string } | null };
  }>(
    await page.request.post(`/api/orgs/${orgId}/reception/verify-code`, {
      data: { code: readyOrder?.pickupCode }
    }),
  );
  expect(verifyPayload.data.match?.type).toBe("pickup");
  expect(verifyPayload.data.match?.valid).toBe(true);
  expect(verifyPayload.data.match?.order?.id).toBe(readyOrder?.id);

  const fulfilledPayload = await expectApiOk<{ order: { id: string; status: string } }>(
    await page.request.post(`/api/orgs/${orgId}/shop/orders/${readyOrder?.id}/fulfill`),
  );
  expect(fulfilledPayload.data.order.status).toBe("FULFILLED");
  await expect(
    prisma.pickupCode.findUniqueOrThrow({
      where: { orderId: String(readyOrder?.id) },
      select: { status: true, fulfilledAt: true }
    }),
  ).resolves.toMatchObject({ status: "FULFILLED" });
  await expect(
    findLatestAuditLog({ orgId, action: "shop_order.fulfilled" }),
  ).resolves.toMatchObject({ entityId: readyOrder?.id });
});

test("payment sessions require owner or org payment access", async ({ page, request }) => {
  requireDb();
  await loginWithOtp(page, `playwright-session-access-${Date.now()}@zook.local`);

  const gymPayload = await expectApiOk<{
    org: { id: string };
    plans: Array<{ id: string }>;
  }>(await page.request.get("/api/orgs/public/iron-house"));
  const orgId = String(gymPayload.data.org.id);
  const planId = String(gymPayload.data.plans[0]?.id);
  await prisma.organization.update({
    where: { id: orgId },
    data: { joinMode: "OPEN_JOIN" }
  });

  const checkoutPayload = await expectApiOk<{ session: { id: string } }>(
    await page.request.post(`/api/orgs/${orgId}/subscriptions`, {
      data: { planId }
    }),
  );

  const unauthenticatedResponse = await request.get(`/api/payments/session/${checkoutPayload.data.session.id}`);
  expect(unauthenticatedResponse.status()).toBe(401);

  const ownedResponse = await page.request.get(`/api/payments/session/${checkoutPayload.data.session.id}`);
  await expectApiOk(ownedResponse);
});

test("platform admins cannot perform tenant operations through org routes", async ({ page }) => {
  requireDb();
  await loginWithSessionCookie(page, "platform@zook.local");

  const org = await seedAndGetOrg({ username: "iron-house" });
  const memberRole = await prisma.organizationRoleAssignment.findFirstOrThrow({
    where: { orgId: org.id, role: "MEMBER" }
  });

  const response = await page.request.post(`/api/orgs/${org.id}/attendance/manual`, {
    data: {
      memberUserId: memberRole.userId,
      reason: "Security regression check"
    }
  });

  expect(response.status()).toBe(403);
});

test("receptionist approval queue updates attendance notifications and audit", async ({ page }) => {
  requireDb();
  await loginWithSessionCookie(page, "reception@zook.local");

  const org = await seedAndGetOrg({ username: "iron-house" });
  const branch = await prisma.branch.findFirstOrThrow({
    where: { orgId: org.id, isDefault: true }
  });
  const [approvedUser, rejectedUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: `attendance-approve-${Date.now()}@zook.local`,
        name: "Attendance Approve Member"
      }
    }),
    prisma.user.create({
      data: {
        email: `attendance-reject-${Date.now()}@zook.local`,
        name: "Attendance Reject Member"
      }
    })
  ]);
  await prisma.organizationRoleAssignment.createMany({
    data: [
      { orgId: org.id, userId: approvedUser.id, role: "MEMBER" },
      { orgId: org.id, userId: rejectedUser.id, role: "MEMBER" }
    ],
    skipDuplicates: true
  });
  const dateKey = new Date().toISOString().slice(0, 10);
  const [approveRecord, rejectRecord] = await Promise.all([
    prisma.attendanceRecord.create({
      data: {
        orgId: org.id,
        branchId: branch.id,
        userId: approvedUser.id,
        dateKey,
        status: "PENDING_APPROVAL",
        source: "QR_SCAN",
        suspiciousFlags: ["acceptance_pending"]
      }
    }),
    prisma.attendanceRecord.create({
      data: {
        orgId: org.id,
        branchId: branch.id,
        userId: rejectedUser.id,
        dateKey,
        status: "PENDING_APPROVAL",
        source: "QR_SCAN",
        suspiciousFlags: ["acceptance_pending"]
      }
    })
  ]);

  const pendingPayload = await expectApiOk<{ records: Array<{ id: string }> }>(
    await page.request.get(`/api/orgs/${org.id}/attendance/pending`),
  );
  expect(pendingPayload.data.records.some((record) => record.id === approveRecord.id)).toBe(true);
  expect(pendingPayload.data.records.some((record) => record.id === rejectRecord.id)).toBe(true);

  await expectApiOk(await page.request.post(`/api/orgs/${org.id}/attendance/${approveRecord.id}/approve`));
  await expectApiOk(
    await page.request.post(`/api/orgs/${org.id}/attendance/${rejectRecord.id}/reject`, {
      data: { reason: "Photo did not match member profile" }
    }),
  );

  await expect(
    prisma.attendanceRecord.findUniqueOrThrow({
      where: { id: approveRecord.id },
      select: { status: true, approvedById: true }
    }),
  ).resolves.toMatchObject({ status: "APPROVED" });
  await expect(
    prisma.attendanceRecord.findUniqueOrThrow({
      where: { id: rejectRecord.id },
      select: { status: true, rejectionReason: true }
    }),
  ).resolves.toMatchObject({
    status: "REJECTED",
    rejectionReason: "Photo did not match member profile"
  });
  await expect(
    prisma.notificationRecipient.count({
      where: { userId: { in: [approvedUser.id, rejectedUser.id] } }
    }),
  ).resolves.toBeGreaterThanOrEqual(2);
  await expect(
    findLatestAuditLog({ orgId: org.id, action: "attendance.approved" }),
  ).resolves.toMatchObject({ entityId: approveRecord.id });
  await expect(
    findLatestAuditLog({ orgId: org.id, action: "attendance.rejected" }),
  ).resolves.toMatchObject({ entityId: rejectRecord.id });
});

test("generic checkout cannot claim membership or shop payment targets", async ({ page }) => {
  requireDb();
  await loginWithOtp(page, `playwright-payment-boundary-${Date.now()}@zook.local`);

  const gymPayload = await expectApiOk<{
    org: { id: string };
  }>(await page.request.get("/api/orgs/public/iron-house"));
  const orgId = String(gymPayload.data.org.id);

  const membershipResponse = await page.request.post("/api/payments/checkout", {
    data: {
      orgId,
      purpose: "MEMBERSHIP",
      amountPaise: 1000,
      metadata: { subscriptionId: "sub_forged" }
    }
  });
  expect(membershipResponse.status()).toBe(400);
  expect(await membershipResponse.text()).toContain("membership or shop checkout route");

  const shopResponse = await page.request.post("/api/payments/checkout", {
    data: {
      orgId,
      purpose: "PERSONAL_TRAINING",
      amountPaise: 1000,
      metadata: { shopOrderId: "order_forged" }
    }
  });
  expect(shopResponse.status()).toBe(400);
  expect(await shopResponse.text()).toContain("cannot directly reference membership or shop records");
});

test("expired mock checkout cannot be completed", async ({ page }) => {
  requireDb();
  const sessionId = `pw-expired-${Date.now()}`;
  await prisma.paymentSession.create({
    data: {
      id: sessionId,
      provider: "mock",
      purpose: "PERSONAL_TRAINING",
      amountPaise: 1000,
      currency: "INR",
      status: "CREATED",
      checkoutUrl: `/checkout/mock/${sessionId}`,
      expiresAt: new Date(Date.now() - 60_000),
      metadata: {}
    }
  });

  const response = await page.request.post(`/api/payments/mock/${sessionId}/complete`, {
    data: { status: "SUCCEEDED" }
  });
  expect(response.status()).toBe(409);
  expect(await response.text()).toContain("Payment session expired");

  await expect(
    prisma.paymentSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: { status: true }
    }),
  ).resolves.toEqual({ status: "CREATED" });
});

test("owner can create a persisted notification through the web session", async ({ page }) => {
  requireDb();
  await loginWithOtp(page, "owner@zook.local");

  const orgsResponse = await page.request.get("/api/me/orgs");
  const orgsPayload = await expectApiOk<{
    activeOrgId?: string;
    organizations?: Array<{ orgId: string }>;
  }>(orgsResponse);
  const activeOrgId = orgsPayload.data.activeOrgId ?? orgsPayload.data.organizations?.[0]?.orgId;

  const membersResponse = await page.request.get(`/api/orgs/${activeOrgId}/members`);
  const membersPayload = await expectApiOk<{
    members: Array<{ user?: { id?: string } }>;
  }>(membersResponse);
  const targetUserId = membersPayload.data.members[0]?.user?.id as string | undefined;
  expect(targetUserId).toBeTruthy();
  const targetUserIdValue = String(targetUserId);

  const notificationResponse = await page.request.post(`/api/orgs/${activeOrgId}/notifications`, {
    data: {
      type: "OPERATIONAL",
      title: "Playwright operational notice",
      body: "This is a backend-integrated acceptance test notification.",
      audience: "selected_members",
      selectedUserIds: [targetUserIdValue],
      pushEnabled: false,
      excludeMinors: false
    }
  });
  await expectApiOk(notificationResponse);
});

test("owner can configure pilot settings, export a report, and leave an audit trail", async ({ page }) => {
  requireDb();
  await loginWithOtp(page, "owner@zook.local");

  const orgsPayload = await expectApiOk<{
    activeOrgId?: string;
    organizations?: Array<{ orgId: string }>;
  }>(await page.request.get("/api/me/orgs"));
  const activeOrgId = String(orgsPayload.data.activeOrgId ?? orgsPayload.data.organizations?.[0]?.orgId);

  await expectApiOk(
    await page.request.patch(`/api/orgs/${activeOrgId}/location`, {
      data: {
        address: "Bund Garden Road, Pune",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        latitude: 18.5314,
        longitude: 73.8782
      }
    }),
  );

  const plan = await createMembershipPlan(page, activeOrgId, {
    name: `Pilot Owner Plan ${Date.now()}`
  });
  expect(plan?.id).toBeTruthy();

  const couponPayload = await expectApiOk<{ coupon: { id: string; code: string } }>(
    await page.request.post(`/api/orgs/${activeOrgId}/coupons`, {
      data: {
        code: `PW${Date.now().toString().slice(-6)}`,
        type: "FIXED_AMOUNT",
        valuePaise: 5000,
        applicablePlanId: plan?.id
      }
    }),
  );
  expect(couponPayload.data.coupon.code).toMatch(/^PW/);

  const referralPayload = await expectApiOk<{ referral: { id: string; code: string } }>(
    await page.request.post(`/api/orgs/${activeOrgId}/referrals`, { data: {} }),
  );
  expect(referralPayload.data.referral.code).toMatch(/^ZK/);

  await expectApiOk(
    await page.request.patch(`/api/orgs/${activeOrgId}/join-mode`, {
      data: { joinMode: "APPROVAL_REQUIRED" }
    }),
  );

  const summaryPayload = await expectApiOk(await page.request.get(`/api/orgs/${activeOrgId}/reports/summary`));
  expect(summaryPayload.data).toBeTruthy();

  const exportResponse = await page.request.get(`/api/orgs/${activeOrgId}/reports/attendance.csv`);
  expect(exportResponse.ok()).toBeTruthy();
  expect(exportResponse.headers()["content-type"]).toContain("text/csv");
  expect(await exportResponse.text()).toContain("generatedBy");

  const auditLog = await findLatestAuditLog({
    orgId: activeOrgId,
    action: "organization.join_mode_updated"
  });
  expect(auditLog?.entityId).toBe(activeOrgId);
});

test("member privacy export and deletion requests create jobs and audit trail", async ({ page }) => {
  requireDb();
  const email = `playwright-privacy-${Date.now()}@zook.local`;
  await loginWithOtp(page, email);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });

  const exportPayload = await expectApiOk<{
    request: { id: string; status: string; exportUrl?: string | null };
    job: { id: string; status: string; exportUrl?: string | null };
  }>(await page.request.post("/api/me/data-export-request"));
  expect(exportPayload.data.request.status).toBe("ready");
  expect(exportPayload.data.job.status).toBe("SUCCEEDED");
  expect(exportPayload.data.request.exportUrl).toBeTruthy();

  const deletionPayload = await expectApiOk<{
    request: { id: string; status: string; scheduledFor?: string | null };
    job: { id: string; status: string; scheduledFor?: string | null };
  }>(await page.request.post("/api/me/account-deletion-request"));
  expect(deletionPayload.data.request.status).toBe("requested");
  expect(deletionPayload.data.job.status).toBe("QUEUED");
  expect(deletionPayload.data.request.scheduledFor).toBeTruthy();

  const consentsPayload = await expectApiOk<{
    exportRequests: Array<{ id: string; status: string }>;
    deletionRequests: Array<{ id: string; status: string }>;
    exportJobs: Array<{ id: string; status: string }>;
    deletionJobs: Array<{ id: string; status: string }>;
  }>(await page.request.get("/api/me/consents"));
  expect(
    consentsPayload.data.exportRequests.some(
      (request) => request.id === exportPayload.data.request.id && request.status === "ready",
    ),
  ).toBe(true);
  expect(
    consentsPayload.data.deletionRequests.some(
      (request) => request.id === deletionPayload.data.request.id && request.status === "requested",
    ),
  ).toBe(true);
  expect(
    consentsPayload.data.exportJobs.some(
      (job) => job.id === exportPayload.data.job.id && job.status === "SUCCEEDED",
    ),
  ).toBe(true);
  expect(
    consentsPayload.data.deletionJobs.some(
      (job) => job.id === deletionPayload.data.job.id && job.status === "QUEUED",
    ),
  ).toBe(true);

  await expect(
    findLatestAuditLog({ actorUserId: user.id, action: "privacy.data_export_requested" }),
  ).resolves.toMatchObject({ entityId: exportPayload.data.request.id });
  await expect(
    findLatestAuditLog({ actorUserId: user.id, action: "privacy.account_deletion_requested" }),
  ).resolves.toMatchObject({ entityId: deletionPayload.data.request.id });
});

test("minor guardian web consent flow unblocks membership checkout", async ({ page }) => {
  requireDb();
  await loginWithOtp(page, "minor@zook.local");

  const ironHouse = await seedAndGetOrg({ username: "iron-house" });
  const publicGymPayload = await expectApiOk<{
    org: { id: string };
    plans: Array<{ id: string }>;
  }>(await page.request.get("/api/orgs/public/iron-house"));
  const planId = publicGymPayload.data.plans[0]?.id;
  expect(planId).toBeTruthy();

  const blockedResponse = await page.request.post(`/api/orgs/${ironHouse.id}/subscriptions`, {
    data: { planId }
  });
  test.skip(
    blockedResponse.status() === 409,
    "Seeded minor already has a membership in progress; reset the DB to exercise guardian blocking.",
  );
  expect(blockedResponse.status()).toBe(403);
  expect(await blockedResponse.text()).toContain("Guardian consent");

  const consentPayload = await expectApiOk<{
    challenges: Array<{ id: string; status: string }>;
  }>(await page.request.get("/api/me/guardian-consent"));
  const challengeId = consentPayload.data.challenges[0]?.id;
  expect(challengeId).toBeTruthy();
  const challengeIdValue = String(challengeId);

  await page.goto(`/guardian/consent/${challengeIdValue}`);
  await expect(page.getByText("Zook Guardian Consent")).toBeVisible();

  await expectApiOk(
    await page.request.post(`/api/guardian-consent/${challengeIdValue}/verify`, {
      data: { code: "000000" }
    }),
  );

  await prisma.organization.update({ where: { id: ironHouse.id }, data: { joinMode: "OPEN_JOIN" } });
  const checkoutPayload = await expectApiOk<{ session: { id: string } }>(
    await page.request.post(`/api/orgs/${ironHouse.id}/subscriptions`, {
      data: { planId }
    }),
  );
  await completeMockCheckout(page, checkoutPayload.data.session.id);

  const membershipsPayload = await expectApiOk<{
    subscriptions: Array<{ orgId: string; status: string }>;
  }>(await page.request.get("/api/me/memberships"));
  expect(
    membershipsPayload.data.subscriptions.some(
      (subscription) => subscription.orgId === ironHouse.id && subscription.status === "ACTIVE",
    ),
  ).toBe(true);
});

test("trainer AI draft requires assigned client, consent, review, and then assignment", async ({ page }) => {
  requireDb();
  await loginWithSessionCookie(page, "trainer@zook.local");

  const org = await seedAndGetOrg({ username: "iron-house" });
  const trainer = await prisma.user.findUniqueOrThrow({ where: { email: "trainer@zook.local" } });
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@zook.local" } });
  const assignment = await prisma.trainerAssignment.findFirstOrThrow({
    where: { orgId: org.id, trainerUserId: trainer.id, active: true }
  });

  await prisma.user.update({ where: { id: trainer.id }, data: { aiConsent: false } });
  try {
    const blockedConsent = await page.request.post("/api/ai/generate-plan", {
      data: {
        orgId: org.id,
        targetUserId: assignment.memberUserId,
        prompt: "Create a safe gym workout plan for strength.",
        title: "Consent blocked draft",
        type: "WORKOUT"
      }
    });
    expect(blockedConsent.status()).toBe(400);
    expect(await blockedConsent.text()).toContain("AI personalization consent");
    const blockedLog = await prisma.aIUsageLog.findFirst({
      where: { userId: trainer.id, responseSummary: { contains: "AI personalization consent" } },
      orderBy: { createdAt: "desc" }
    });
    expect(blockedLog?.quotaConsumed).toBe(0);
  } finally {
    await prisma.user.update({ where: { id: trainer.id }, data: { aiConsent: true } });
  }

  const blockedClient = await page.request.post("/api/ai/generate-plan", {
    data: {
      orgId: org.id,
      targetUserId: owner.id,
      prompt: "Create a safe gym workout plan for strength.",
      title: "Wrong client draft",
      type: "WORKOUT"
    }
  });
  expect(blockedClient.status()).toBe(403);
  expect(await blockedClient.text()).toContain("assigned clients");

  const draftPayload = await expectApiOk<{
    response: Record<string, unknown>;
    createdPlan: { id: string; reviewed: boolean; content: { days?: unknown[] } };
  }>(
    await page.request.post("/api/ai/generate-plan", {
      data: {
        orgId: org.id,
        targetUserId: assignment.memberUserId,
        prompt: "Create a safe gym workout plan for strength.",
        title: "Playwright AI draft",
        type: "WORKOUT"
      }
    }),
  );
  expect(draftPayload.data.createdPlan.reviewed).toBe(false);
  expect(draftPayload.data.createdPlan.content.days?.length).toBeGreaterThan(0);

  const assignBeforeReview = await page.request.post(
    `/api/orgs/${org.id}/plans/${draftPayload.data.createdPlan.id}/assign`,
    {
      data: { assignedToUserId: assignment.memberUserId, audience: "selected_member" }
    },
  );
  expect(assignBeforeReview.status()).toBe(409);
  expect(await assignBeforeReview.text()).toContain("reviewed before assignment");

  await expectApiOk(await page.request.post(`/api/orgs/${org.id}/plans/${draftPayload.data.createdPlan.id}/review`));
  await expectApiOk(
    await page.request.post(`/api/orgs/${org.id}/plans/${draftPayload.data.createdPlan.id}/assign`, {
      data: { assignedToUserId: assignment.memberUserId, audience: "selected_member" }
    }),
  );
  const planNotification = await prisma.notificationRecipient.findFirst({
    where: { userId: assignment.memberUserId },
    orderBy: { createdAt: "desc" }
  });
  expect(planNotification?.readAt).toBeNull();
});

test("member workout reports are assignment-scoped and visible to the trainer", async ({ page }) => {
  requireDb();
  const org = await seedAndGetOrg({ username: "iron-house" });
  const trainer = await prisma.user.findUniqueOrThrow({ where: { email: "trainer@zook.local" } });
  const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
  const minor = await prisma.user.findUniqueOrThrow({ where: { email: "minor@zook.local" } });
  const plan = await prisma.planContent.create({
    data: {
      orgId: org.id,
      creatorUserId: trainer.id,
      type: "WORKOUT",
      title: `Playwright report plan ${Date.now()}`,
      description: "Backend report visibility test.",
      content: {
        days: [
          {
            name: "Day 1",
            exercises: [{ name: "Goblet squat", sets: "3", reps: "10" }]
          }
        ]
      },
      reviewed: true,
      reviewedById: trainer.id,
      visibility: "assigned"
    }
  });
  const memberAssignment = await prisma.planAssignment.create({
    data: {
      orgId: org.id,
      planId: plan.id,
      assignedById: trainer.id,
      assignedToUserId: member.id,
      audience: "selected_member"
    }
  });
  const wrongAssignment = await prisma.planAssignment.create({
    data: {
      orgId: org.id,
      planId: plan.id,
      assignedById: trainer.id,
      assignedToUserId: minor.id,
      audience: "selected_member"
    }
  });

  await loginWithSessionCookie(page, "member@zook.local");
  const blockedWorkout = await page.request.post("/api/me/tracking/workouts", {
    data: {
      organizationId: org.id,
      planAssignmentId: wrongAssignment.id,
      title: "Cross assignment workout",
      workoutType: "strength",
      startedAt: new Date().toISOString(),
      visibility: "TRAINER_VISIBLE",
      exercises: []
    }
  });
  expect(blockedWorkout.status()).toBe(403);
  expect(await blockedWorkout.text()).toContain("does not belong");

  await expectApiOk(
    await page.request.post("/api/me/tracking/workouts", {
      data: {
        planAssignmentId: memberAssignment.id,
        title: "Assigned workout report",
        workoutType: "strength",
        startedAt: new Date().toISOString(),
        visibility: "TRAINER_VISIBLE",
        exercises: [
          {
            exerciseName: "Goblet squat",
            orderIndex: 0,
            setsCompleted: 3,
            reps: 10,
            completed: true
          }
        ]
      }
    }),
  );
  await expectApiOk(
    await page.request.post(`/api/me/plans/${memberAssignment.id}/complete`, {
      data: {
        feedback: "Felt strong, increase load next week.",
        exercises: [{ name: "Goblet squat", completed: true, setsCompleted: 3, reps: 10 }]
      }
    }),
  );

  await loginWithSessionCookie(page, "trainer@zook.local");
  const clientsPayload = await expectApiOk<{
    clients: Array<{
      memberUserId: string;
      summary?: {
        recentFeedback?: Array<{ feedback?: string | null; completionPct: number }>;
        recentWorkouts?: Array<{ title: string }>;
      };
    }>;
  }>(await page.request.get(`/api/orgs/${org.id}/trainers/${trainer.id}/clients`));
  const memberClient = clientsPayload.data.clients.find((client) => client.memberUserId === member.id);
  expect(memberClient?.summary?.recentFeedback?.[0]?.feedback).toContain("increase load");
  expect(memberClient?.summary?.recentWorkouts?.some((workout) => workout.title === "Assigned workout report")).toBe(true);
});

test("platform admin can inspect providers and suspend then reactivate an organization", async ({ page }) => {
  requireDb();
  await loginWithSessionCookie(page, "platform@zook.local");

  const orgsPayload = await expectApiOk<{ orgs: Array<{ id: string; status: string }> }>(
    await page.request.get("/api/platform/orgs"),
  );
  const targetOrgId = orgsPayload.data.orgs[0]?.id;
  expect(targetOrgId).toBeTruthy();
  const targetOrgIdValue = String(targetOrgId);

  const providerPayload = await expectApiOk<{
    providers: Record<string, { configured: boolean; selectedProvider: string }>;
  }>(await page.request.get("/api/platform/provider-status"));
  expect(providerPayload.data.providers.payment).toBeTruthy();
  expect(providerPayload.data.providers.push).toBeTruthy();

  await expectApiOk(
    await page.request.patch(`/api/platform/orgs/${targetOrgIdValue}/status`, {
      data: { status: "SUSPENDED" }
    }),
  );
  await expectApiOk(
    await page.request.patch(`/api/platform/orgs/${targetOrgIdValue}/status`, {
      data: { status: "ACTIVE" }
    }),
  );
});
