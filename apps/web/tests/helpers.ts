import { expect, type APIResponse, type Page } from "@playwright/test";
import { AuthService } from "@zook/core/services";
import { prisma, type MembershipPlan, type Organization } from "@zook/db";

export async function expectApiOk<T = unknown>(response: APIResponse) {
  const payload = (await response.json()) as { ok?: boolean; data?: T; error?: { message?: string } };
  expect(response.ok(), payload.error?.message ?? `Expected ${response.status()} to be OK.`).toBeTruthy();
  expect(payload.ok).toBe(true);
  expect(payload.data).toBeDefined();
  return {
    ...payload,
    data: payload.data as T
  };
}

export function expectNoConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });

  return {
    assertClean() {
      expect(errors).toEqual([]);
    }
  };
}

export async function getLatestEmailOtpFromMockOrUseDevCode(page: Page, _email: string) {
  const fixedCode = process.env.OTP_FIXED_CODE_DEV?.trim();
  if (fixedCode) {
    return fixedCode;
  }

  const bodyText = (await page.locator("body").textContent()) ?? "";
  const match = bodyText.match(/Dev code is (\d{6})/);
  if (match?.[1]) {
    return match[1];
  }

  throw new Error(
    "No OTP_FIXED_CODE_DEV is configured and no dev OTP was exposed in the login UI. Set OTP_FIXED_CODE_DEV in `.env.test.local` or enable a mock OTP path for acceptance tests.",
  );
}

export async function loginWithOtp(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send OTP" }).click();
  const code = await getLatestEmailOtpFromMockOrUseDevCode(page, email);
  await page.getByLabel("OTP").fill(code);
  await Promise.all([
    page.waitForURL(/\/(?:dashboard|platform)(?:$|[/?#])/, { timeout: 10_000 }),
    page.getByRole("button", { name: "Verify and continue" }).click()
  ]);
}

export async function loginWithSessionCookie(page: Page, email: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const token = AuthService.createToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenHash: AuthService.hash(token),
      expiresAt
    }
  });
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: "zook_session",
      value: token,
      url: "http://127.0.0.1:3120",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(expiresAt.getTime() / 1000)
    }
  ]);
  return user;
}

export async function seedAndGetOrg(input: { username?: string; name?: string } = {}) {
  const org = await prisma.organization.findFirst({
    where: {
      ...(input.username ? { username: input.username } : {}),
      ...(input.name ? { name: input.name } : {})
    },
    orderBy: { createdAt: "asc" }
  });

  if (!org) {
    throw new Error(
      `Could not find a seeded organization${input.username ? ` for username "${input.username}"` : ""}. Run \`pnpm test:db:prepare\` first.`,
    );
  }

  return org;
}

export async function createMembershipPlan(
  page: Page,
  orgId: string,
  overrides: Partial<{
    name: string;
    type: "DURATION" | "VISIT_PACK" | "DATE_RANGE" | "HYBRID" | "TRIAL";
    pricePaise: number;
    durationDays: number;
    publicVisible: boolean;
  }> = {},
) {
  const response = await page.request.post(`/api/orgs/${orgId}/membership-plans`, {
    data: {
      name: overrides.name ?? `Playwright Plan ${Date.now()}`,
      type: overrides.type ?? "DURATION",
      pricePaise: overrides.pricePaise ?? 99900,
      durationDays: overrides.durationDays ?? 30,
      publicVisible: overrides.publicVisible ?? true
    }
  });

  const payload = await expectApiOk<{ plan: MembershipPlan }>(response);
  return payload.data?.plan;
}

export async function completeMockCheckout(page: Page, sessionId: string, status: "SUCCEEDED" | "FAILED" = "SUCCEEDED") {
  const response = await page.request.post(`/api/payments/mock/${sessionId}/complete`, {
    data: { status }
  });
  return expectApiOk(response);
}

export async function findLatestAuditLog(input: { orgId?: string; action?: string; actorUserId?: string }) {
  return prisma.auditLog.findFirst({
    where: {
      ...(input.orgId ? { orgId: input.orgId } : {}),
      ...(input.action ? { action: input.action } : {}),
      ...(input.actorUserId ? { actorUserId: input.actorUserId } : {})
    },
    orderBy: { createdAt: "desc" }
  });
}

export type SeededOrg = Organization;
