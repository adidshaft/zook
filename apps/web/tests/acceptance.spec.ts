import { test, expect, type Page } from "@playwright/test";

async function loginWithOtp(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send OTP" }).click();
  await page.getByLabel("OTP").fill("000000");
  await page.getByRole("button", { name: "Verify and continue" }).click();
}

function requireDb() {
  test.skip(
    process.env.RUN_DB_WEB_TESTS !== "1" || !process.env.DATABASE_URL,
    "Requires local PostgreSQL seed data and DATABASE_URL in the Playwright web server environment."
  );
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
  const orgsPayload = await orgsResponse.json();
  const activeOrgId = orgsPayload.data?.activeOrgId ?? orgsPayload.data?.organizations?.[0]?.orgId;
  expect(activeOrgId).toBeTruthy();

  const createResponse = await page.request.post(`/api/orgs/${activeOrgId}/membership-plans`, {
    data: {
      name: "Playwright Plan",
      type: "DURATION",
      pricePaise: 99900,
      durationDays: 30,
      publicVisible: true
    }
  });
  expect(createResponse.status()).toBe(200);
});

test("member join request and tracking workout creation persist through api routes", async ({ page }) => {
  requireDb();
  const email = `playwright-join-${Date.now()}@zook.local`;
  await loginWithOtp(page, email);

  const peaklabProfile = await page.request.get("/api/orgs/public/peaklab");
  const peaklabPayload = await peaklabProfile.json();
  const peaklabOrgId = peaklabPayload.data.org.id as string;
  const peaklabPlanId = peaklabPayload.data.plans[0]?.id as string | undefined;

  const joinResponse = await page.request.post(`/api/orgs/${peaklabOrgId}/join-requests`, {
    data: {
      ...(peaklabPlanId ? { planId: peaklabPlanId } : {})
    }
  });
  expect(joinResponse.status()).toBe(200);

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
  expect(trackingResponse.status()).toBe(200);
});

test("open join checkout activates membership and shop order success stays server-backed", async ({ page }) => {
  requireDb();
  const email = `playwright-shop-${Date.now()}@zook.local`;
  await loginWithOtp(page, email);

  const gymResponse = await page.request.get("/api/orgs/public/iron-house");
  const gymPayload = await gymResponse.json();
  const orgId = gymPayload.data.org.id as string;
  const planId = gymPayload.data.plans[0].id as string;

  const checkoutResponse = await page.request.post(`/api/orgs/${orgId}/subscriptions`, {
    data: { planId }
  });
  expect(checkoutResponse.status()).toBe(200);
  const checkoutPayload = await checkoutResponse.json();
  const sessionId = String(checkoutPayload.data.session.id);

  const paymentComplete = await page.request.post(`/api/payments/mock/${sessionId}/complete`, {
    data: { status: "SUCCEEDED" }
  });
  expect(paymentComplete.status()).toBe(200);

  const membershipsResponse = await page.request.get("/api/me/memberships");
  const membershipsPayload = await membershipsResponse.json();
  expect(
    membershipsPayload.data.subscriptions.some((subscription: { status: string; orgId: string }) => subscription.status === "ACTIVE" && subscription.orgId === orgId),
  ).toBe(true);

  const productsResponse = await page.request.get(`/api/orgs/${orgId}/products`);
  const productsPayload = await productsResponse.json();
  const productId = productsPayload.data.products[0].id as string;

  const orderResponse = await page.request.post("/api/shop/orders", {
    data: {
      orgId,
      items: [{ productId, quantity: 1 }]
    }
  });
  expect(orderResponse.status()).toBe(200);
  const orderPayload = await orderResponse.json();
  const orderSessionId = String(orderPayload.data.order.paymentSessionId ?? orderPayload.data.checkoutUrl.split("/").pop());

  const orderComplete = await page.request.post(`/api/payments/mock/${orderSessionId}/complete`, {
    data: { status: "SUCCEEDED" }
  });
  expect(orderComplete.status()).toBe(200);

  const ordersResponse = await page.request.get("/api/me/shop-orders");
  const ordersPayload = await ordersResponse.json();
  expect(
    ordersPayload.data.orders.some((order: { orgId: string; status: string; pickupCode?: string | null }) => order.orgId === orgId && order.status === "READY_FOR_PICKUP" && order.pickupCode),
  ).toBe(true);
});

test("owner can create a persisted notification through the web session", async ({ page }) => {
  requireDb();
  await loginWithOtp(page, "owner@zook.local");

  const orgsResponse = await page.request.get("/api/me/orgs");
  const orgsPayload = await orgsResponse.json();
  const activeOrgId = orgsPayload.data?.activeOrgId ?? orgsPayload.data?.organizations?.[0]?.orgId;

  const membersResponse = await page.request.get(`/api/orgs/${activeOrgId}/members`);
  const membersPayload = await membersResponse.json();
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
  expect(notificationResponse.status()).toBe(200);
});
