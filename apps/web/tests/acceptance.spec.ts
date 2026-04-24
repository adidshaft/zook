import { test, expect } from "@playwright/test";
import { completeMockCheckout, createMembershipPlan, expectApiOk, loginWithOtp } from "./helpers";

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
  const planId = gymPayload.data.plans[0].id as string;

  const checkoutResponse = await page.request.post(`/api/orgs/${orgId}/subscriptions`, {
    data: { planId }
  });
  const checkoutPayload = await expectApiOk<{ session: { id: string } }>(checkoutResponse);
  const sessionId = String(checkoutPayload.data.session.id);

  await completeMockCheckout(page, sessionId);

  const membershipsResponse = await page.request.get("/api/me/memberships");
  const membershipsPayload = await expectApiOk<{
    subscriptions: Array<{ status: string; orgId: string }>;
  }>(membershipsResponse);
  expect(
    membershipsPayload.data.subscriptions.some((subscription: { status: string; orgId: string }) => subscription.status === "ACTIVE" && subscription.orgId === orgId),
  ).toBe(true);

  const productsResponse = await page.request.get(`/api/orgs/${orgId}/products`);
  const productsPayload = await expectApiOk<{ products: Array<{ id: string }> }>(productsResponse);
  const productId = productsPayload.data.products[0].id as string;

  const orderResponse = await page.request.post("/api/shop/orders", {
    data: {
      orgId,
      items: [{ productId, quantity: 1 }]
    }
  });
  const orderPayload = await expectApiOk<{ order: { paymentSessionId?: string | null }; checkoutUrl: string }>(orderResponse);
  const orderSessionId = String(orderPayload.data.order.paymentSessionId ?? orderPayload.data.checkoutUrl.split("/").pop());

  await completeMockCheckout(page, orderSessionId);

  const ordersResponse = await page.request.get("/api/me/shop-orders");
  const ordersPayload = await expectApiOk<{
    orders: Array<{ orgId: string; status: string; pickupCode?: string | null }>;
  }>(ordersResponse);
  expect(
    ordersPayload.data.orders.some((order: { orgId: string; status: string; pickupCode?: string | null }) => order.orgId === orgId && order.status === "READY_FOR_PICKUP" && order.pickupCode),
  ).toBe(true);
});

test("owner can create a persisted notification through the web session", async ({ page }) => {
  requireDb();
  await loginWithOtp(page, "owner@zook.local");

  const orgsResponse = await page.request.get("/api/me/orgs");
  const orgsPayload = await expectApiOk<{
    activeOrgId?: string;
    organizations?: Array<{ orgId: string }>;
  }>(orgsResponse);
  const activeOrgId = orgsPayload.data?.activeOrgId ?? orgsPayload.data?.organizations?.[0]?.orgId;

  const membersResponse = await page.request.get(`/api/orgs/${activeOrgId}/members`);
  const membersPayload = await expectApiOk<{
    members: Array<{ user?: { id?: string } }>;
  }>(membersResponse);
  const targetUserId = membersPayload.data.members[0]?.user?.id as string | undefined;
  expect(targetUserId).toBeTruthy();

  const notificationResponse = await page.request.post(`/api/orgs/${activeOrgId}/notifications`, {
    data: {
      type: "OPERATIONAL",
      title: "Playwright operational notice",
      body: "This is a backend-integrated acceptance test notification.",
      audience: "selected_members",
      selectedUserIds: [targetUserId],
      pushEnabled: false,
      excludeMinors: false
    }
  });
  await expectApiOk(notificationResponse);
});
