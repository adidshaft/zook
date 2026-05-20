import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { loginWithOtp, loginWithSessionCookie } from "./helpers";
import { requireDb } from "./helpers/db";

const seededAccounts = [
  { email: "owner@zook.local", path: /\/dashboard(?:$|[/?#])/ },
  { email: "admin@zook.local", path: /\/dashboard(?:$|[/?#])/ },
  { email: "reception@zook.local", path: /\/desk(?:$|[/?#])/ },
  { email: "trainer@zook.local", path: /\/coach(?:$|[/?#])/ },
  { email: "member@zook.local", path: /\/me(?:$|\/|[?#])/ },
  { email: "prospect@zook.local", path: /\/(?:gyms|me)(?:$|\/|[?#])/ },
  { email: "platform@zook.local", path: /\/platform(?:$|[/?#])/ },
] as const;

function base64Url(input: unknown) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

function invalidConfiguredJwt(audience = "com.zook.app") {
  return [
    base64Url({ alg: "none", kid: "invalid" }),
    base64Url({
      iss: "https://accounts.google.com",
      aud: audience,
      sub: "sso-smoke-user",
      exp: Math.floor(Date.now() / 1000) + 300,
      email: "sso-smoke@zook.local",
      email_verified: true,
    }),
    "signature",
  ].join(".");
}

test.describe("auth actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("seeded OTP login reaches every role home", async ({ page }) => {
    test.setTimeout(150_000);

    for (const account of seededAccounts) {
      await page.context().clearCookies();
      await loginWithOtp(page, account.email);
      await expect(page).toHaveURL(account.path, { timeout: 15_000 });

      const user = await prisma.user.findUniqueOrThrow({ where: { email: account.email } });
      await expect(
        prisma.userSession.findFirst({
          where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        }),
      ).resolves.toBeTruthy();
    }
  });

  test("wrong OTP stays on verification step and reports an inline error", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("member@zook.local");
    await page.getByTestId("login-send-code").click();
    await expect(page.getByTestId("login-otp")).toBeVisible();
    await page.getByTestId("login-otp").fill("999999");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      /invalid|incorrect|expired|unable/i,
    );
  });

  test("OTP request rate limit returns a lockout error when enabled", async ({ page }) => {
    test.setTimeout(150_000);
    const identifier = `rate-limit-${Date.now()}@zook.local`;
    const ip = `10.55.${Date.now() % 200}.8`;
    let limitedStatus = 0;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await page.request.post("/api/auth/request-otp", {
        headers: { "x-forwarded-for": ip, "x-zook-intent": "mutate" },
        data: { identifier },
      });
      if (response.status() === 429) {
        limitedStatus = response.status();
        await expect(response.headers()["retry-after"]).toBeTruthy();
        const body = await response.json();
        expect(JSON.stringify(body)).toMatch(/too many/i);
        break;
      }
    }

    expect(limitedStatus).toBe(429);
  });

  test("logout clears the session cookie and returns to login", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    await page.goto("/dashboard/profile");
    const accountMenu = page.getByTestId("dashboard-user-menu");
    await accountMenu.getByLabel(/account/i).click();
    const [logoutResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes("/api/auth/logout") &&
        response.request().method() === "POST",
      ),
      accountMenu.getByTestId("dashboard-sign-out").click(),
    ]);
    expect(logoutResponse.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/login/);
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === "zook_session")?.value ?? "").toBe("");
  });

  test("Google and Apple sign-in controls initiate configured SSO paths", async ({ page }) => {
    const invalidAppleToken = invalidConfiguredJwt("com.zook.app");
    await page.addInitScript((token) => {
      (window as unknown as Record<string, unknown>).AppleID = {
        auth: {
          init(options: unknown) {
            (window as unknown as Record<string, unknown>).__zookAppleInit = options;
          },
          async signIn() {
            return { authorization: { id_token: token } };
          },
        },
      };
    }, invalidAppleToken);
    await page.route("https://appleid.cdn-apple.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
    );

    await page.goto("/login");
    await expect(page.getByTestId("login-google")).toBeVisible();
    await expect(page.getByTestId("login-apple")).toBeVisible();

    const [googleRequest] = await Promise.all([
      page.waitForRequest((request) =>
        request.url().startsWith("https://accounts.google.com/o/oauth2/v2/auth"),
      ),
      page.getByTestId("login-google").click(),
    ]);
    const googleUrl = new URL(googleRequest.url());
    expect(googleUrl.searchParams.get("client_id")).toBeTruthy();
    expect(googleUrl.searchParams.get("redirect_uri")).toMatch(/\/login$/);
    expect(googleUrl.searchParams.get("response_type")).toBe("id_token");
    expect(googleUrl.searchParams.get("scope")).toContain("openid");
    expect(googleUrl.searchParams.get("state")).toBeTruthy();
    expect(googleUrl.searchParams.get("nonce")).toBeTruthy();

    await page.goto("/login");
    await page.getByTestId("login-apple").click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(/invalid sign-in token/i);
    const appleInit = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__zookAppleInit,
    );
    expect(appleInit).toMatchObject({
      clientId: expect.any(String),
      scope: "name email",
      usePopup: true,
    });
  });

  test("SSO callback endpoints are configured and reject malformed tokens as auth failures", async ({
    request,
  }) => {
    const google = await request.post("/api/auth/google/callback", {
      headers: { "x-zook-intent": "mutate" },
      data: { idToken: invalidConfiguredJwt("test-google-web.apps.googleusercontent.com") },
    });
    expect(google.status()).toBe(401);
    await expect(google.text()).resolves.toMatch(/invalid sign-in token/i);

    const apple = await request.post("/api/auth/apple/callback", {
      headers: { "x-zook-intent": "mutate" },
      data: { identityToken: invalidConfiguredJwt("com.zook.app") },
    });
    expect(apple.status()).toBe(401);
    await expect(apple.text()).resolves.toMatch(/invalid sign-in token/i);
  });
});
